require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { scoreRouter, healthCheck } = require('./routes/scoreRoutes');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// --- Core middleware ---
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());

// --- Routes ---
app.get('/api/health', healthCheck);
app.use('/api/scores', scoreRouter);

// --- 404 handler (no matching route) ---
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `No route for ${req.method} ${req.originalUrl}`,
  });
});

// --- Central error handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Something went wrong on the server.',
  });
});

app.listen(PORT, () => {
  console.log(`[server] NEON DROP API listening on port ${PORT}`);
  console.log(`[server] Allowing CORS from ${CLIENT_ORIGIN}`);
});
