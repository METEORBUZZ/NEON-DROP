const { body, validationResult } = require('express-validator');

// Rules for POST /api/scores.
// player_name: 1-20 chars, letters/numbers/spaces/hyphen/underscore only.
// score / level / lines_cleared: non-negative integers.
const validateScoreSubmission = [
  body('player_name')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('player_name must be 1-20 characters long')
    .matches(/^[A-Za-z0-9 _-]+$/)
    .withMessage('player_name may only contain letters, numbers, spaces, - and _'),

  body('score')
    .isInt({ min: 0 })
    .withMessage('score must be a non-negative integer')
    .toInt(),

  body('level')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('level must be a non-negative integer')
    .toInt(),

  body('lines_cleared')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('lines_cleared must be a non-negative integer')
    .toInt(),
];

// Central place to turn express-validator's error bag into a clean 422.
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'ValidationError',
      message: 'One or more fields are invalid.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validateScoreSubmission, handleValidationErrors };
