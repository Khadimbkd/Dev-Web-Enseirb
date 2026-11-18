// 404 : route inconnue
function notFound(req, res) {
  res.status(404).json({ error: { message: 'Route introuvable', code: 'NOT_FOUND' } });
}

// Gestion centralisée des erreurs, réponses JSON homogènes
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: status === 500 ? 'Erreur serveur' : err.message,
      code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR'),
    },
  });
}

module.exports = { notFound, errorHandler };
