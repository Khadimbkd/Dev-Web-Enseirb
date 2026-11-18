require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL: copy .env.example to .env and fill it in');
}

// A single shared pool for the whole application.
// Always use parameterized queries: pool.query('... WHERE id = $1', [id])
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
