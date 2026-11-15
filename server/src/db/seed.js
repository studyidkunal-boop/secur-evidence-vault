const { getClient, pool } = require('./index');
const { GENESIS_HASH, computeAuditEntryHash } = require('../utils/crypto');

/**
 * Database Initialization Script
 * Strictly provisions schema and cryptographic genesis block.
 * ZERO demo or dummy users are seeded. All accounts must be registered via /api/auth/signup.
 */
async function seedDatabase() {
  console.log('🌱 Initiating Database Initialization (No Dummy Users)...');
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Initialize Genesis Audit Log Entry if audit_logs is empty
    const auditCountRes = await client.query('SELECT COUNT(*) FROM audit_logs');
    const count = parseInt(auditCountRes.rows[0].count, 10);

    if (count === 0) {
      console.log('⛓️ Initializing Cryptographic Audit Log Genesis Block...');
      const genesisTimestamp = new Date().toISOString();
      const genesisAction = 'SYSTEM_GENESIS';
      const genesisMetadata = {
        description: 'Initial cryptographic genesis block anchored for evidence vault.',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
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
        `INSERT INTO audit_logs (timestamp, user_id, role, action, evidence_id, ip_address, user_agent, metadata, prev_hash, entry_hash)
         VALUES ($1, NULL, 'SYSTEM', $2, NULL, '127.0.0.1', 'SYSTEM_INIT', $3, $4, $5)`,
        [genesisTimestamp, genesisAction, JSON.stringify(genesisMetadata), GENESIS_HASH, genesisEntryHash]
      );
      console.log(`   🔗 Genesis Hash: ${genesisEntryHash}`);
    } else {
      console.log(`   ℹ️ Audit log already contains ${count} entries. Genesis block preserved.`);
    }

    await client.query('COMMIT');
    console.log('✅ Initialization completed. Zero demo users created (pure DB signup enabled).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Initialization failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
