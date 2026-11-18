const jwt = require('jsonwebtoken');
const { httpError } = require('../utils/httpError');

// Protège une route : exige un header "Authorization: Bearer <accessToken>".
// Si le token est valide, place l'id de l'utilisateur dans req.user.id.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(httpError(401, 'UNAUTHORIZED', 'Authentification requise'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch {
    // Token invalide, modifié ou expiré
    next(httpError(401, 'INVALID_TOKEN', 'Token invalide ou expiré'));
  }
}

module.exports = requireAuth;
