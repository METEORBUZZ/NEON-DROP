const pool = require('../config/db');

// GET /api/scores/top
// Returns the top 10 scores, highest first. No auth required.
async function getTopScores(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, player_name, score, level, lines_cleared, created_at
       FROM scores
       ORDER BY score DESC, created_at ASC
       LIMIT 10`
    );
    res.status(200).json({ scores: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/scores
// Body: { player_name, score, level, lines_cleared }
// Validation already ran in middleware — this assumes clean input.
async function submitScore(req, res, next) {
  try {
    const { player_name, score } = req.body;
    const level = req.body.level ?? 1;
    const lines_cleared = req.body.lines_cleared ?? 0;

    const result = await pool.query(
      `INSERT INTO scores (player_name, score, level, lines_cleared)
       VALUES ($1, $2, $3, $4)
       RETURNING id, player_name, score, level, lines_cleared, created_at`,
      [player_name, score, level, lines_cleared]
    );

    res.status(201).json({ score: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/health
function healthCheck(req, res) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}

module.exports = { getTopScores, submitScore, healthCheck };
