const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const healthRoutes = require('./routes/health');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/health', healthRoutes);
app.use('/auth', healthRoutes);
app.use('/me', healthRoutes);
app.use('/movies', healthRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
