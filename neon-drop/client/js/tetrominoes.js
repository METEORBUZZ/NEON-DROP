/**
 * tetrominoes.js
 * Static shape data for the 7 standard tetrominoes, plus a small matrix
 * rotation helper. Each shape is defined as its "spawn" orientation; other
 * orientations are produced at runtime by rotateMatrix().
 */

// Standard guideline colors.
const TETROMINO_COLORS = {
  I: '#00f0f0', // cyan
  O: '#f0f000', // yellow
  T: '#a000f0', // purple
  S: '#00f000', // green
  Z: '#f00000', // red
  J: '#2050f0', // blue
  L: '#f0a000', // orange
};

// Spawn-orientation matrices. 1 = filled cell, 0 = empty.
const TETROMINO_SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const TETROMINO_TYPES = Object.keys(TETROMINO_SHAPES);

/**
 * Rotates an NxN matrix 90 degrees clockwise, returning a new matrix.
 * Works for any square matrix (2x2 for O, 3x3, or 4x4 for I).
 */
function rotateMatrix(matrix) {
  const n = matrix.length;
  const result = [];
  for (let row = 0; row < n; row++) {
    result.push(new Array(n).fill(0));
  }
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      result[col][n - 1 - row] = matrix[row][col];
    }
  }
  return result;
}

/** Deep-clones a shape matrix so pieces never share references. */
function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

/** Returns a fresh, randomly-typed piece object ready to spawn. */
function createRandomPiece() {
  const type = TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
  return {
    type,
    color: TETROMINO_COLORS[type],
    matrix: cloneMatrix(TETROMINO_SHAPES[type]),
  };
}

// Exposed as globals — this project intentionally has no build step / bundler.
window.TETROMINO_COLORS = TETROMINO_COLORS;
window.TETROMINO_SHAPES = TETROMINO_SHAPES;
window.TETROMINO_TYPES = TETROMINO_TYPES;
window.rotateMatrix = rotateMatrix;
window.cloneMatrix = cloneMatrix;
window.createRandomPiece = createRandomPiece;
