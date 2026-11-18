// Code d'erreur PostgreSQL pour une violation de contrainte UNIQUE (ex. doublon d'email).
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err) {
  return err.code === UNIQUE_VIOLATION;
}

module.exports = { isUniqueViolation };
