// Development / demo only: inserts the demo account and a few favorites.
// Safe to run several times (idempotent). Usage: npm run db:seed
const bcrypt = require('bcrypt');
const pool = require('./pool');

const BCRYPT_ROUNDS = 12;

const DEMO_USER = { email: 'alice@example.org', password: 'Passw0rd!' };

// Well-known TMDB ids used for the demo data.
const DEMO_MEDIA = [
  { tmdbId: 603, type: 'movie' }, // The Matrix
  { tmdbId: 27205, type: 'movie' }, // Inception
  { tmdbId: 1396, type: 'tv' }, // Breaking Bad
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:seed is disabled when NODE_ENV=production');
  }

  const passwordHash = await bcrypt.hash(DEMO_USER.password, BCRYPT_ROUNDS);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // The hash is only stored the first time: an existing account is left untouched.
    await client.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [DEMO_USER.email, passwordHash]
    );
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [DEMO_USER.email]
    );
    const userId = userRows[0].id;

    for (const media of DEMO_MEDIA) {
      await client.query(
        `INSERT INTO media (tmdb_id, type)
         VALUES ($1, $2)
         ON CONFLICT (tmdb_id, type) DO NOTHING`,
        [media.tmdbId, media.type]
      );
      await client.query(
        `INSERT INTO favorites (user_id, media_id)
         SELECT $1, id FROM media WHERE tmdb_id = $2 AND type = $3
         ON CONFLICT (user_id, media_id) DO NOTHING`,
        [userId, media.tmdbId, media.type]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded demo account ${DEMO_USER.email} with ${DEMO_MEDIA.length} favorites.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .catch((err) => {
    console.error('db:seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
