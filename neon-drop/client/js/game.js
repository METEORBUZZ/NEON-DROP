/**
 * game.js
 * Self-contained Tetris engine. Owns the board state, the falling piece,
 * scoring/leveling, the render loop, and input handling. Talks to the rest
 * of the app only through the callbacks passed into NeonDrop.init().
 *
 * No build step: everything hangs off `window.NeonDrop`.
 */

const COLS = 10;
const ROWS = 20;
const CELL = 30; // px — matches the 300x600 canvas

// NES-style base scores for 1/2/3/4 lines, multiplied by level.
const LINE_SCORES = { 1: 40, 2: 100, 3: 300, 4: 1200 };

// Basic wall-kick offsets tried in order after a rotation collides.
// [dx, dy] — dy is rarely needed but included for the I-piece edge case.
const WALL_KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
];

const NeonDrop = (() => {
  let canvas, ctx, nextCanvas, nextCtx;
  let board = createEmptyBoard();
  let current = null;
  let currentX = 0;
  let currentY = 0;
  let next = null;

  let score = 0;
  let level = 1;
  let lines = 0;

  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  let rafId = null;

  let state = 'idle'; // idle | running | paused | gameover

  // Callbacks supplied by ui.js
  let callbacks = {
    onStatsChange: () => {},
    onGameOver: () => {},
  };

  function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }

  // --- Setup -----------------------------------------------------------

  function init(options) {
    canvas = options.canvas;
    ctx = canvas.getContext('2d');
    nextCanvas = options.nextCanvas;
    nextCtx = nextCanvas.getContext('2d');
    callbacks = { ...callbacks, ...options.callbacks };

    attachKeyboardControls();
    drawBoard(); // paint the empty grid before the first game starts
  }

  function start() {
    board = createEmptyBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = speedForLevel(level);
    dropCounter = 0;
    lastTime = 0;
    state = 'running';

    next = createRandomPiece();
    spawnPiece();
    reportStats();

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function restart() {
    start();
  }

  function pause() {
    if (state !== 'running') return;
    state = 'paused';
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'running';
    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === 'running') pause();
    else if (state === 'paused') resume();
  }

  function isRunning() {
    return state === 'running';
  }

  function isPaused() {
    return state === 'paused';
  }

  // --- Piece lifecycle ---------------------------------------------------

  function spawnPiece() {
    current = next;
    next = createRandomPiece();
    const width = current.matrix[0].length;
    currentX = Math.floor((COLS - width) / 2);
    currentY = -getTopPadding(current.matrix); // start just above the board

    if (collides(current.matrix, currentX, currentY)) {
      gameOver();
      return;
    }
    drawNext();
  }

  // How many empty rows sit above the first filled row — lets tall/narrow
  // spawn orientations start fully off-screen without looking sunken.
  function getTopPadding(matrix) {
    for (let r = 0; r < matrix.length; r++) {
      if (matrix[r].some((cell) => cell)) return r;
    }
    return 0;
  }

  function collides(matrix, offsetX, offsetY) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const boardX = offsetX + c;
        const boardY = offsetY + r;
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
        if (boardY >= 0 && board[boardY][boardX]) return true;
      }
    }
    return false;
  }

  function merge() {
    const matrix = current.matrix;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const boardY = currentY + r;
        const boardX = currentX + c;
        if (boardY >= 0) board[boardY][boardX] = current.color;
      }
    }
  }

  // --- Movement ------------------------------------------------------------

  function moveLeft() {
    if (state !== 'running') return;
    if (!collides(current.matrix, currentX - 1, currentY)) currentX -= 1;
  }

  function moveRight() {
    if (state !== 'running') return;
    if (!collides(current.matrix, currentX + 1, currentY)) currentX += 1;
  }

  function softDrop() {
    if (state !== 'running') return;
    if (!collides(current.matrix, currentX, currentY + 1)) {
      currentY += 1;
      score += 1; // small reward for manual soft-dropping, NES-style
      reportStats();
    } else {
      lockPiece();
    }
    dropCounter = 0;
  }

  function hardDrop() {
    if (state !== 'running') return;
    let dropped = 0;
    while (!collides(current.matrix, currentX, currentY + 1)) {
      currentY += 1;
      dropped += 1;
    }
    score += dropped * 2; // hard drop worth more per row than soft drop
    lockPiece();
    dropCounter = 0;
    reportStats();
  }

  function rotate() {
    if (state !== 'running') return;
    const rotated = rotateMatrix(current.matrix);
    for (const [dx, dy] of WALL_KICKS) {
      if (!collides(rotated, currentX + dx, currentY + dy)) {
        current.matrix = rotated;
        currentX += dx;
        currentY += dy;
        return;
      }
    }
    // No kick worked — rotation is rejected, piece stays as-is.
  }

  function lockPiece() {
    merge();
    const cleared = clearLines();
    if (cleared > 0) applyScoring(cleared);
    spawnPiece();
    reportStats();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(null));
        cleared += 1;
        r += 1; // re-check this row index since rows shifted down
      }
    }
    return cleared;
  }

  function applyScoring(clearedCount) {
    const base = LINE_SCORES[clearedCount] || LINE_SCORES[4];
    score += base * level;
    lines += clearedCount;

    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel !== level) {
      level = newLevel;
      dropInterval = speedForLevel(level);
    }
  }

  // Classic NES-style speed curve, floored so it never gets absurd.
  function speedForLevel(lvl) {
    return Math.max(100, 1000 - (lvl - 1) * 75);
  }

  function gameOver() {
    state = 'gameover';
    if (rafId) cancelAnimationFrame(rafId);
    callbacks.onGameOver({ score, level, lines });
  }

  function reportStats() {
    callbacks.onStatsChange({ score, level, lines });
  }

  // --- Loop & rendering ------------------------------------------------

  function loop(time) {
    if (state === 'running') {
      const delta = time - (lastTime || time);
      lastTime = time;
      dropCounter += delta;
      if (dropCounter > dropInterval) {
        dropCounter = 0;
        if (!collides(current.matrix, currentX, currentY + 1)) {
          currentY += 1;
        } else {
          lockPiece();
        }
      }
      draw();
    } else if (state === 'paused') {
      lastTime = time;
      draw();
      drawPauseOverlay();
    }
    if (state === 'running' || state === 'paused') {
      rafId = requestAnimationFrame(loop);
    }
  }

  function draw() {
    drawBoard();
    drawGhost();
    drawPiece(ctx, current.matrix, currentX, currentY, current.color, CELL);
  }

  function drawBoard() {
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = board[r][c];
        if (color) drawCell(ctx, c, r, color, CELL);
      }
    }
  }

  function drawGhost() {
    let ghostY = currentY;
    while (!collides(current.matrix, currentX, ghostY + 1)) ghostY += 1;
    if (ghostY === currentY) return;
    drawPiece(ctx, current.matrix, currentX, ghostY, current.color, CELL, true);
  }

  function drawPiece(context, matrix, offsetX, offsetY, color, cellSize, ghost = false) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const y = offsetY + r;
        if (y < 0) continue; // hide cells still above the visible board
        drawCell(context, offsetX + c, y, color, cellSize, ghost);
      }
    }
  }

  function drawCell(context, col, row, color, cellSize, ghost = false) {
    const x = col * cellSize;
    const y = row * cellSize;
    if (ghost) {
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      return;
    }
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    context.lineWidth = 1;
    context.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    // little glow highlight, top-left
    context.fillStyle = 'rgba(255, 255, 255, 0.25)';
    context.fillRect(x + 2, y + 2, cellSize - 4, 3);
  }

  function drawNext() {
    nextCtx.fillStyle = '#020617';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!next) return;
    const size = 24;
    const matrix = next.matrix;
    const w = matrix[0].length * size;
    const h = matrix.length * size;
    const offsetX = Math.floor((nextCanvas.width - w) / 2 / size);
    const offsetY = Math.floor((nextCanvas.height - h) / 2 / size);
    drawPiece(nextCtx, matrix, offsetX, offsetY, next.color, size);
  }

  function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#22d3ee';
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  }

  // --- Input ---------------------------------------------------------------

  function attachKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      if (state !== 'running') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        default:
          break;
      }
    });
  }

  return {
    init,
    start,
    restart,
    pause,
    resume,
    togglePause,
    isRunning,
    isPaused,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotate,
  };
})();

window.NeonDrop = NeonDrop;
