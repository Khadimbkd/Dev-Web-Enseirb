const express = require('express');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

// Toutes les routes /me sont protégées : req.user.id est disponible dans les handlers.
router.use(requireAuth);

router.get('/favorites', (req, res) => {
  //
});

router.post('/favorites', (req, res) => {
  //
});

router.delete('/favorites/:id', (req, res) => {
  //
});

module.exports = router;
