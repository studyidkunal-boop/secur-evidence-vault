const fs = require('fs');
const path = require('path');
const { getClient, pool } = require('./index');

async function runMigration() {
  console.log('🔄 Initiating Database Migration...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await getClient();
  try {
    await client.query('BEGIN');
    console.log('📄 Executing schema.sql definitions...');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

