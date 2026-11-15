/**
 * DEV-ONLY Database Reset Script
 * Drops existing tables, triggers, and audit logs cleanly and recreates the entire schema.
 * Strictly forbidden in production environments.
 * 
 * Usage:
 *   node server/scripts/reset-dev-db.js
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const { GENESIS_HASH, computeAuditEntryHash } = require('../src/utils/crypto');

// 1. Strict Production Guard
if (process.env.NODE_ENV === 'production') {
  console.error('❌ FORBIDDEN: Database reset script is strictly blocked in production (NODE_ENV=production).');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function resetDevDatabase() {
  console.log('⚠️  [DEV-RESET] Starting complete development database wipe & re-initialization...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Drop immutability triggers first (which would otherwise block drop/delete)
    console.log('   Removing immutability triggers...');
    await client.query(`
      DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_logs;
      DROP TRIGGER IF EXISTS trg_prevent_evidence_hard_delete ON evidence;
    `);

    // 3. Drop tables cleanly
    console.log('   Dropping existing tables and enums...');
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS evidence CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS evidence_status CASCADE;
    `);

    // 4. Re-apply schema.sql
    console.log('   Applying fresh database schema...');
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '../src/db/schema.sql'),
      'utf8'
    );
    await client.query(schemaSql);

    // 5. Initialize fresh Genesis Block in audit_logs
    console.log('   Anchoring cryptographic genesis root block...');
    const genesisTimestamp = new Date().toISOString();
    const genesisAction = 'SYSTEM_GENESIS';
    const genesisMetadata = {
      description: 'Clean cryptographic genesis block initialized after development database reset.',
      environment: process.env.NODE_ENV || 'development',
      resetAt: genesisTimestamp,
    };

    const genesisEntryHash = computeAuditEntryHash({
      prevHash: GENESIS_HASH,
      timestamp: genesisTimestamp,
      userId: null,
      action: genesisAction,
      evidenceId: null,
      metadata: genesisMetadata,
    });

    await client.query(
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
      ) VALUES ($1, NULL, 'SYSTEM', $2, NULL, '127.0.0.1', 'DEV_RESET_SCRIPT', $3, $4, $5)`,
      [genesisTimestamp, genesisAction, JSON.stringify(genesisMetadata), GENESIS_HASH, genesisEntryHash]
    );

    await client.query('COMMIT');
    console.log('✅ [DEV-RESET] Database reset complete!');
    console.log('   • All dummy/demo users wiped.');
    console.log('   • Fresh schema and immutability triggers active.');
    console.log(`   • Cryptographic Genesis Hash: ${genesisEntryHash}`);
    console.log('   • Ready for real user signup at /signup.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [DEV-RESET ERROR]:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  resetDevDatabase();
}

module.exports = resetDevDatabase;

