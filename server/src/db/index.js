const { Pool } = require('pg');
const env = require('../config/env');

const poolConfig = {
  connectionString: env.DATABASE_URL,
};

// Enable SSL when explicitly configured or when connecting to remote cloud databases (Render / Supabase)
if (env.DB_SSL || env.NODE_ENV === 'production' || env.DATABASE_URL.includes('supabase.co') || env.DATABASE_URL.includes('render.com')) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  if (env.NODE_ENV !== 'test') {
    // Connection established
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Execute parameterized query against the database pool
 * @param {string} text - SQL query with parameter placeholders ($1, $2)
 * @param {Array} params - Array of parameter values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for multi-statement transactions
 */
const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};

