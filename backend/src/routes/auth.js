const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { httpError } = require('../utils/httpError');
const { isUniqueViolation } = require('../utils/dbErrors');
const { createUser, findUserByEmail } = require('../models/users');

const router = express.Router();

const credentialsSchema = z.object({
  email: z.email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

function validateCredentials(req, res, next) {
  const result = credentialsSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return next(httpError(400, 'VALIDATION_ERROR', message));
  }
  req.body = result.data;
  next();
}

router.post('/register', validateCredentials, async (req, res, next) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await createUser(email, hashedPassword);
    res.status(201).json(user);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return next(httpError(409, 'EMAIL_ALREADY_EXISTS', 'Email déjà utilisé'));
    }
    next(err);
  }
});

router.post('/login', validateCredentials, async (req, res, next) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return next(httpError(401, 'INVALID_CREDENTIALS', 'Identifiants invalides'));
  }

  const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  res.json({ accessToken });
});

router.post('/refresh', (req, res) => {
  //
});

module.exports = router;
