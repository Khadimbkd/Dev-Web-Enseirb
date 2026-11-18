require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquante : copiez .env.example vers .env et renseignez-la');
}

// Un seul pool de connexions partagé par toute l'application.
// Toujours utiliser des requêtes paramétrées : pool.query('... WHERE id = $1', [id])
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
