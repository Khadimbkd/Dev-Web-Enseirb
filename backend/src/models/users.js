const pool = require('../db/pool');

const UNIQUE_VIOLATION = '23505';

// Les emails sont stockés et recherchés en minuscules : "A@b.c" et "a@b.c" désignent le même compte.
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Vue publique d'un utilisateur : n'inclut jamais le hash du mot de passe.
function toUser(row) {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

async function createUser(email, passwordHash) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [normalizeEmail(email), passwordHash]
    );
    return toUser(rows[0]);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      const error = new Error('Email already used');
      error.status = 409;
      error.code = 'EMAIL_ALREADY_USED';
      throw error;
    }
    throw err;
  }
}

// Renvoie aussi le hash du mot de passe : uniquement destiné à la vérification du login.
async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [normalizeEmail(email)]
  );
  if (rows.length === 0) return null;
  return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
}

async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows.length === 0 ? null : toUser(rows[0]);
}

module.exports = { createUser, findUserByEmail, findUserById };
