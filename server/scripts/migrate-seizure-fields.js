const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, pool } = require('../src/db');

async function runMigration() {
  console.log('[Migration] Applying legal seizure fields to evidence table...');
  try {
    await query(`
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS seizure_address TEXT;
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS witness_name VARCHAR(255);
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS witness_contact VARCHAR(100);

      UPDATE evidence SET category = 'Digital' WHERE category IS NULL;
      UPDATE evidence SET seizure_address = 'Official Police Station / Field Seizure' WHERE seizure_address IS NULL;
      UPDATE evidence SET witness_name = 'Official Police Witness' WHERE witness_name IS NULL;
    `);
    console.log('[Migration] Successfully added category, serial_number, seizure_address, witness_name, witness_contact to evidence table.');
  } catch (err) {
    console.error('[Migration Error]:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

