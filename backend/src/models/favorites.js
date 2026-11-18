const pool = require('../db/pool');

const UNIQUE_VIOLATION = '23505';

function toFavorite(row) {
  return {
    id: row.id,
    tmdbId: row.tmdb_id,
    type: row.type,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

async function listFavorites(userId) {
  const { rows } = await pool.query(
    `SELECT f.id, m.tmdb_id, m.type, f.rating, f.comment, f.created_at
     FROM favorites f
     JOIN media m ON m.id = f.media_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC, f.id DESC`,
    [userId]
  );
  return rows.map(toFavorite);
}

// Transaction : le média est retrouvé ou créé, puis le favori est inséré.
async function addFavorite(userId, { tmdbId, type, rating = null, comment = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Le DO UPDATE factice permet à RETURNING de renvoyer l'id même si le média existe déjà.
    const media = await client.query(
      `INSERT INTO media (tmdb_id, type)
       VALUES ($1, $2)
       ON CONFLICT (tmdb_id, type) DO UPDATE SET tmdb_id = EXCLUDED.tmdb_id
       RETURNING id`,
      [tmdbId, type]
    );
    const favorite = await client.query(
      `INSERT INTO favorites (user_id, media_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, media.rows[0].id, rating, comment]
    );

    await client.query('COMMIT');
    return {
      id: favorite.rows[0].id,
      tmdbId,
      type,
      rating,
      comment,
      createdAt: favorite.rows[0].created_at,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === UNIQUE_VIOLATION) {
      const error = new Error('Favorite already exists');
      error.status = 409;
      error.code = 'FAVORITE_ALREADY_EXISTS';
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
}

// Le filtre sur user_id empêche de supprimer le favori d'un autre utilisateur.
async function removeFavorite(favoriteId, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM favorites WHERE id = $1 AND user_id = $2',
    [favoriteId, userId]
  );
  return rowCount > 0;
}

module.exports = { listFavorites, addFavorite, removeFavorite };
