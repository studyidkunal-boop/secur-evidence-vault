const { getClient, query } = require('../db');
const { GENESIS_HASH, computeAuditEntryHash, constantTimeCompare } = require('../utils/crypto');

// Advisory lock identifier to serialize audit log additions and prevent chain forks under concurrency
const AUDIT_CHAIN_LOCK_ID = 849201948;

/**
 * Extracts client IP address safely, respecting reverse proxies (Render / Cloudflare)
 */
function extractClientIP(req) {
  if (!req) return '127.0.0.1';
  if (req.headers && req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Extracts client User-Agent string
 */
function extractUserAgent(req) {
  if (!req || !req.headers) return 'SYSTEM_AUTOMATION';
  return req.headers['user-agent'] || 'UNKNOWN';
}

/**
 * Appends a tamper-evident, hash-chained log entry to `audit_logs`
 * 
 * @param {Object} params
 * @param {Object} [params.req] - Express request object for IP and User-Agent extraction
 * @param {string|null} [params.userId] - UUID of the acting user
 * @param {string|null} [params.role] - Role of the acting user (INSPECTOR, DCP, JUDGE, SYSTEM)
 * @param {string} params.action - Categorical action name (e.g. LOGIN_SUCCESS, EVIDENCE_UPLOAD)
 * @param {string|null} [params.evidenceId] - UUID of associated evidence record (if any)
 * @param {Object} [params.metadata] - Additional contextual forensics (e.g. filename, hashes)
 * @returns {Promise<Object>} The persisted audit record
 */
async function logEvent({
  req = null,
  userId = null,
  role = null,
  action,
  evidenceId = null,
  metadata = {},
}) {
  const ipAddress = extractClientIP(req);
  const userAgent = extractUserAgent(req);
  const normalizedAction = String(action || 'UNKNOWN_ACTION').trim().toUpperCase();

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Acquire transaction-level advisory lock to serialize inserts and prevent chain race conditions
    await client.query('SELECT pg_advisory_xact_lock($1)', [AUDIT_CHAIN_LOCK_ID]);

    // 2. Fetch the latest entry_hash to anchor the chain
    const lastEntryRes = await client.query(
      'SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1'
    );

    const prevHash =
      lastEntryRes.rows.length > 0
        ? lastEntryRes.rows[0].entry_hash.trim().toLowerCase()
        : GENESIS_HASH;

    // 3. Capture timestamp and compute entry hash
    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();

    const entryHash = computeAuditEntryHash({
      prevHash,
      timestamp: isoTimestamp,
      userId,
      action: normalizedAction,
      evidenceId,
      metadata,
    });

    // 4. Insert immutable audit entry
    const insertRes = await client.query(
      `INSERT INTO audit_logs (
        timestamp,
        user_id,
        role,
        action,
        evidence_id,
        ip_address,
        user_agent,
        metadata,
        prev_hash,
        entry_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        isoTimestamp,
        userId || null,
        role || null,
        normalizedAction,
        evidenceId || null,
        ipAddress,
        userAgent,
        JSON.stringify(metadata || {}),
        prevHash,
        entryHash,
      ]
    );

    await client.query('COMMIT');
    return insertRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[AuditService.logEvent Failure]:', err.message);
    // Never allow logging failure to silently fail without notice
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Validates the cryptographic integrity of an arbitrary array of audit records.
 * Can be used by the DB verifier or standalone testing suites.
 * 
 * @param {Array} rows - Chronologically sorted audit log entries (by id ASC)
 * @returns {{ verified: boolean, totalChecked: number, brokenAtId?: number, reason?: string, details?: any }}
 */
function verifyAuditLogChain(rows = []) {
  if (!rows || rows.length === 0) {
    return {
      verified: true,
      totalChecked: 0,
      message: 'Audit log is empty. Chain is trivially valid.',
    };
  }

  for (let i = 0; i < rows.length; i++) {
    const current = rows[i];
    const prev = i > 0 ? rows[i - 1] : null;

    const currentPrevHash = current.prev_hash.trim().toLowerCase();
    const currentEntryHash = current.entry_hash.trim().toLowerCase();

    // 1. Verify prev_hash linkage
    if (i === 0) {
      if (currentPrevHash !== GENESIS_HASH) {
        return {
          verified: false,
          totalChecked: i,
          brokenAtId: current.id,
          reason: 'Genesis block prev_hash does not match standard GENESIS_HASH root.',
          storedPrevHash: currentPrevHash,
          expectedPrevHash: GENESIS_HASH,
        };
      }
    } else {
      const expectedPrevHash = prev.entry_hash.trim().toLowerCase();
      if (!constantTimeCompare(currentPrevHash, expectedPrevHash)) {
        return {
          verified: false,
          totalChecked: i,
          brokenAtId: current.id,
          reason: `Chain broken at entry ID ${current.id}: prev_hash does not match previous entry's entry_hash.`,
          storedPrevHash: currentPrevHash,
          expectedPrevHash,
        };
      }
    }

    // 2. Recompute expected entry_hash from raw fields
    const recomputedHash = computeAuditEntryHash({
      prevHash: currentPrevHash,
      timestamp: current.timestamp,
      userId: current.user_id,
      action: current.action,
      evidenceId: current.evidence_id,
      metadata: current.metadata,
    });

    // 3. Constant-time comparison of recomputed entry_hash against stored entry_hash
    if (!constantTimeCompare(currentEntryHash, recomputedHash)) {
      return {
        verified: false,
        totalChecked: i,
        brokenAtId: current.id,
        reason: `Cryptographic tampering detected at entry ID ${current.id}: payload content has been altered.`,
        storedEntryHash: currentEntryHash,
        recomputedHash,
        entryDetails: {
          id: current.id,
          action: current.action,
          timestamp: current.timestamp,
          userId: current.user_id,
        },
      };
    }
  }

  return {
    verified: true,
    totalChecked: rows.length,
    firstEntryId: rows[0].id,
    latestEntryId: rows[rows.length - 1].id,
    latestEntryHash: rows[rows.length - 1].entry_hash.trim().toLowerCase(),
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Recomputes the entire audit log chain from PostgreSQL and reports whether integrity is intact
 * 
 * @returns {Promise<Object>} Chain verification status report
 */
async function verifyDatabaseAuditChain() {
  const result = await query(
    'SELECT id, timestamp, user_id, role, action, evidence_id, ip_address, user_agent, metadata, prev_hash, entry_hash FROM audit_logs ORDER BY id ASC'
  );

  return verifyAuditLogChain(result.rows);
}

/**
 * Retrieve paginated audit trail logs for forensic review
 */
async function getAuditLogs({ page = 1, limit = 50, action = null, userId = null, evidenceId = null } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;
  const conditions = [];
  const params = [];

  if (action) {
    params.push(action.toUpperCase());
    conditions.push(`action = $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    conditions.push(`user_id = $${params.length}`);
  }

  if (evidenceId) {
    params.push(evidenceId);
    conditions.push(`evidence_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
  const totalCountRes = await query(countQuery, params);
  const total = parseInt(totalCountRes.rows[0].count, 10);

  const dataQuery = `
    SELECT 
      a.id,
      a.timestamp,
      a.user_id,
      a.role,
      a.action,
      a.evidence_id,
      a.ip_address,
      a.user_agent,
      a.metadata,
      a.prev_hash,
      a.entry_hash,
      u.name AS user_name,
      u.badge_id AS user_badge
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(limit, offset);
  const logsRes = await query(dataQuery, params);

  return {
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.ceil(total / limit),
    logs: logsRes.rows,
  };
}

/**
 * Retrieve global system audit logs
 * Joined with users and evidence tables, ordered newest first, limited to 100 entries.
 */
async function getGlobalAuditLogs(limit = 100) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 100), 100);
  const dataQuery = `
    SELECT 
      a.id,
      a.timestamp,
      a.user_id,
      a.role,
      a.action,
      a.evidence_id,
      a.ip_address,
      a.user_agent,
      a.metadata,
      a.prev_hash,
      a.entry_hash,
      COALESCE(u.name, 'System') AS officer_name,
      u.email AS officer_email,
      u.badge_id AS officer_badge,
      u.role AS user_role,
      e.case_number,
      e.title AS evidence_title,
      e.file_name AS evidence_file_name,
      e.status AS evidence_status,
      e.sha256_hash AS evidence_sha256
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN evidence e ON a.evidence_id = e.id
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT $1
  `;
  const result = await query(dataQuery, [safeLimit]);
  return result.rows;
}

module.exports = {
  logEvent,
  verifyAuditLogChain,
  verifyDatabaseAuditChain,
  getAuditLogs,
  getGlobalAuditLogs,
};

