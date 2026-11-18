// Development / demo only: DROPS all tables, then recreates them from schema.sql.
// Usage: npm run db:reset
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset is disabled when NODE_ENV=production');
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();

  try {
    const { rows } = await client.query('SELECT current_database() AS name');
    console.log(`Resetting database "${rows[0].name}"...`);

    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS favorites, media, users CASCADE');
    await client.query(schema);
    await client.query('COMMIT');

    console.log('Tables dropped and recreated from schema.sql.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

reset()
  .catch((err) => {
    console.error('db:reset failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
