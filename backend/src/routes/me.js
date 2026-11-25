const express = require('express');
const { z } = require('zod');
const requireAuth = require('../middlewares/requireAuth');
const { httpError } = require('../utils/httpError');
const { isUniqueViolation } = require('../utils/dbErrors');
const { listFavorites, addFavorite, removeFavorite } = require('../models/favorites');

const router = express.Router();

// Limite du type INTEGER de PostgreSQL : au-delà, la base renverrait une erreur 500.
const MAX_INT = 2147483647;

const favoriteInputSchema = z.strictObject({
  tmdbId: z.number().int().positive().max(MAX_INT),
  type: z.enum(['movie', 'tv']),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(500).optional(),
});

// Les paramètres d'URL sont des chaînes : seuls les entiers positifs écrits en chiffres sont acceptés.
const favoriteIdSchema = z
  .string()
  .regex(/^\d+$/, 'Identifiant invalide')
  .transform(Number)
  .pipe(z.number().int().positive().max(MAX_INT));

function validationError(zodError) {
  const message = zodError.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ');
  return httpError(400, 'VALIDATION_ERROR', message);
}

function validateFavoriteInput(req, res, next) {
  const result = favoriteInputSchema.safeParse(req.body);
  if (!result.success) return next(validationError(result.error));
  req.body = result.data;
  next();
}

function validateFavoriteId(req, res, next) {
  const result = favoriteIdSchema.safeParse(req.params.id);
  if (!result.success) return next(validationError(result.error));
  req.favoriteId = result.data;
  next();
}

// Toutes les routes /me sont protégées : req.user.id est disponible dans les handlers.
router.use(requireAuth);

router.get('/favorites', async (req, res) => {
  const favorites = await listFavorites(req.user.id);
  res.json(favorites);
});

router.post('/favorites', validateFavoriteInput, async (req, res, next) => {
  try {
    const favorite = await addFavorite(req.user.id, req.body);
    res.status(201).json(favorite);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return next(httpError(409, 'FAVORITE_ALREADY_EXISTS', 'Ce favori existe déjà'));
    }
    next(err);
  }
});

// 404 aussi quand le favori appartient à un autre utilisateur : on ne révèle pas son existence.
router.delete('/favorites/:id', validateFavoriteId, async (req, res, next) => {
  const removed = await removeFavorite(req.favoriteId, req.user.id);
  if (!removed) {
    return next(httpError(404, 'FAVORITE_NOT_FOUND', 'Favori introuvable'));
  }
  res.status(204).end();
});

module.exports = router;
