const express = require('express');
const { z } = require('zod');

const router = express.Router();

const credentialsSchema = z.object({
  email: z.email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

function validateCredentials(req, res, next) {
  const result = credentialsSchema.safeParse(req.body);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }
  req.body = result.data;
  next();
}

router.post('/register', validateCredentials, (req, res) => {
  const { email, password } = req.body;
  //
});

router.post('/login', validateCredentials, (req, res) => {
  const { email, password } = req.body;
  //
});

router.post('/refresh', (req, res) => {
  //
});

module.exports = router;
