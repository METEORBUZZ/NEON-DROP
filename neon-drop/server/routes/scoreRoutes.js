const express = require('express');
const { getTopScores, submitScore, healthCheck } = require('../controllers/scoreController');
const { validateScoreSubmission, handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// NOTE ON RATE LIMITING:
// This endpoint is intentionally open (no auth, arcade-style "enter your
// initials" scoring). To deter spam submissions in production, consider
// adding `express-rate-limit` here, e.g.:
//
//   const rateLimit = require('express-rate-limit');
//   const submitLimiter = rateLimit({ windowMs: 60_000, max: 5 });
//   router.post('/', submitLimiter, validateScoreSubmission, handleValidationErrors, submitScore);
//
// Not implemented by default — added as a future hardening step.

router.get('/top', getTopScores);
router.post('/', validateScoreSubmission, handleValidationErrors, submitScore);

module.exports = { scoreRouter: router, healthCheck };
