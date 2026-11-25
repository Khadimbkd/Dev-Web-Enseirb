// Développement / démo uniquement : SUPPRIME toutes les tables puis les recrée depuis schema.sql.
// Usage : npm run db:reset
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset est désactivé quand NODE_ENV=production');
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();

  try {
    const { rows } = await client.query('SELECT current_database() AS name');
    console.log(`Réinitialisation de la base "${rows[0].name}"...`);

    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS favorites, media, users CASCADE');
    await client.query(schema);
    await client.query('COMMIT');

    console.log('Tables supprimées puis recréées depuis schema.sql.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

reset()
  .catch((err) => {
    console.error('db:reset a échoué :', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
