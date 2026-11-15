const crypto = require('crypto');

const GENESIS_HASH = '0'.repeat(64);

/**
 * Computes SHA-256 hash of a Buffer or string
 * @param {Buffer|string} data 
 * @returns {string} 64-character lowercase hexadecimal hash
 */
function computeSHA256(data) {
  return crypto.createHash('sha256').update(data).digest('hex').toLowerCase();
}

/**
 * Constant-time comparison of two cryptographic hashes to prevent timing attacks.
 * Never trust a client-supplied hash or use standard `===` operator.
 * @param {string} hashA 
 * @param {string} hashB 
 * @returns {boolean} True if hashes match exactly
 */
function constantTimeCompare(hashA, hashB) {
  if (typeof hashA !== 'string' || typeof hashB !== 'string') {
    return false;
  }

  // Canonicalize to lowercase
  const normalizedA = hashA.trim().toLowerCase();
  const normalizedB = hashB.trim().toLowerCase();

  const bufA = Buffer.from(normalizedA, 'utf-8');
  const bufB = Buffer.from(normalizedB, 'utf-8');

  // Both buffers must be the same length for timingSafeEqual
  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Deterministically sorts an object's keys for consistent JSON stringification
 * @param {any} obj 
 * @returns {any}
 */
function canonicalizeJSON(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeJSON);
  }
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = canonicalizeJSON(obj[key]);
      return sorted;
    }, {});
}

/**
 * Computes the cryptographic hash for an audit log entry.
 * Formula: SHA-256(prev_hash + timestamp + user_id + action + evidence_id + canonical_metadata)
 * 
 * @param {Object} params
 * @param {string} params.prevHash
 * @param {string|Date} params.timestamp
 * @param {string|null} [params.userId]
 * @param {string} params.action
 * @param {string|null} [params.evidenceId]
 * @param {Object|null} [params.metadata]
 * @returns {string} 64-character hexadecimal entry hash
 */
function computeAuditEntryHash({ prevHash, timestamp, userId, action, evidenceId, metadata }) {
  const normalizedPrevHash = (prevHash || GENESIS_HASH).trim().toLowerCase();
  const normalizedTimestamp = new Date(timestamp).toISOString();
  const normalizedUserId = userId ? String(userId).trim() : '';
  const normalizedAction = String(action || '').trim().toUpperCase();
  const normalizedEvidenceId = evidenceId ? String(evidenceId).trim() : '';
  const canonicalMetadata = JSON.stringify(canonicalizeJSON(metadata || {}));

  const payload = [
    normalizedPrevHash,
    normalizedTimestamp,
    normalizedUserId,
    normalizedAction,
    normalizedEvidenceId,
    canonicalMetadata
  ].join('|');

  return computeSHA256(payload);
}

module.exports = {
  GENESIS_HASH,
  computeSHA256,
  constantTimeCompare,
  canonicalizeJSON,
  computeAuditEntryHash,
};

