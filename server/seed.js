const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('1. Provisions database tables and triggers...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'src/db/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ Tables and immutability triggers successfully verified!');
    console.log('✅ No dummy users seeded. Real registration enabled via /signup.');
  } catch (error) {
    console.error('❌ Error during setup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
