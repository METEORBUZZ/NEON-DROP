/**
 * ui.js
 * Wires the DOM (buttons, name field, HUD, leaderboard, game-over overlay,
 * touch controls) to the game engine (game.js) and the API client (api.js).
 */

(() => {
  const STORAGE_KEY = 'neondrop_player_name';

  // --- Element references -------------------------------------------------
  const nameInput = document.getElementById('player-name-input');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const restartBtn = document.getElementById('restart-btn');
  const submitBtn = document.getElementById('submit-score-btn');

  const canvas = document.getElementById('game-canvas');
  const nextCanvas = document.getElementById('next-canvas');

  const scoreValue = document.getElementById('score-value');
  const levelValue = document.getElementById('level-value');
  const linesValue = document.getElementById('lines-value');

  const leaderboardBody = document.getElementById('leaderboard-body');

  const overlay = document.getElementById('game-over-overlay');
  const finalScoreValue = document.getElementById('final-score-value');
  const overlayNameInput = document.getElementById('game-over-name-input');
  const submitFeedback = document.getElementById('submit-feedback');

  let lastResult = null; // { score, level, lines } from the most recent game

  // --- Name persistence ----------------------------------------------------

  function loadSavedName() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) nameInput.value = saved;
    refreshStartButtonState();
  }

  function saveName(name) {
    localStorage.setItem(STORAGE_KEY, name);
  }

  function refreshStartButtonState() {
    startBtn.disabled = nameInput.value.trim().length === 0;
  }

  nameInput.addEventListener('input', refreshStartButtonState);

  // --- HUD -------------------------------------------------------------

  function updateStats({ score, level, lines }) {
    scoreValue.textContent = score;
    levelValue.textContent = level;
    linesValue.textContent = lines;
  }

  // --- Leaderboard -----------------------------------------------------

  async function refreshLeaderboard() {
    const scores = await NeonDropAPI.fetchTopScores();
    renderLeaderboard(scores);
  }

  function renderLeaderboard(scores) {
    leaderboardBody.innerHTML = '';

    if (scores.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3" class="empty-row">NO SCORES YET — BE THE FIRST</td>`;
      leaderboardBody.appendChild(row);
      return;
    }

    scores.forEach((entry, index) => {
      const row = document.createElement('tr');
      const rank = index + 1;
      row.innerHTML = `
        <td class="rank-cell rank-${rank <= 3 ? rank : 'other'}">${rank}</td>
        <td class="name-cell">${escapeHtml(entry.player_name)}</td>
        <td class="score-cell">${Number(entry.score).toLocaleString()}</td>
      `;
      leaderboardBody.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Game flow ---------------------------------------------------------

  function handleStart() {
    const name = nameInput.value.trim();
    if (!name) {
      refreshStartButtonState();
      return;
    }
    saveName(name);

    overlay.classList.add('hidden');
    submitFeedback.textContent = '';
    submitBtn.disabled = true;

    NeonDrop.start();

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'PAUSE';
    restartBtn.disabled = false;
    canvas.focus();
  }

  function handlePauseToggle() {
    NeonDrop.togglePause();
    pauseBtn.textContent = NeonDrop.isPaused() ? 'RESUME' : 'PAUSE';
  }

  function handleRestart() {
    overlay.classList.add('hidden');
    submitFeedback.textContent = '';
    submitBtn.disabled = true;
    NeonDrop.restart();
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'PAUSE';
  }

  function handleGameOver(result) {
    lastResult = result;
    finalScoreValue.textContent = result.score;
    overlayNameInput.value = nameInput.value.trim();
    overlay.classList.remove('hidden');

    pauseBtn.disabled = true;
    submitBtn.disabled = false;
    submitFeedback.textContent = '';
  }

  async function handleSubmitScore() {
    if (!lastResult) return;
    const player_name = overlayNameInput.value.trim();
    if (!player_name) {
      submitFeedback.textContent = 'Enter a name first.';
      submitFeedback.className = 'submit-feedback error';
      return;
    }

    submitBtn.disabled = true;
    submitFeedback.textContent = 'Submitting…';
    submitFeedback.className = 'submit-feedback';

    const result = await NeonDropAPI.submitScore({
      player_name,
      score: lastResult.score,
      level: lastResult.level,
      lines_cleared: lastResult.lines,
    });

    if (result.ok) {
      submitFeedback.textContent = 'Score submitted!';
      submitFeedback.className = 'submit-feedback success';
      saveName(player_name);
      await refreshLeaderboard();
    } else {
      submitFeedback.textContent = result.message;
      submitFeedback.className = 'submit-feedback error';
      submitBtn.disabled = false; // let them fix the name and retry
    }
  }

  // --- Touch controls (mobile) --------------------------------------------

  function wireTouchButton(id, action, repeatable) {
    const el = document.getElementById(id);
    if (!el) return;
    let intervalId = null;

    const fire = () => {
      if (NeonDrop.isRunning()) action();
    };

    const start = (e) => {
      e.preventDefault();
      fire();
      if (repeatable) {
        intervalId = setInterval(fire, 120);
      }
    };
    const stop = (e) => {
      e.preventDefault();
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', stop, { passive: false });
    el.addEventListener('touchcancel', stop, { passive: false });
    // Also support mouse for desktop testing of the touch layout.
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', stop);
    el.addEventListener('mouseleave', stop);
  }

  function wireTouchControls() {
    wireTouchButton('touch-left', NeonDrop.moveLeft, true);
    wireTouchButton('touch-right', NeonDrop.moveRight, true);
    wireTouchButton('touch-down', NeonDrop.softDrop, true);
    wireTouchButton('touch-rotate', NeonDrop.rotate, false);
    wireTouchButton('touch-drop', NeonDrop.hardDrop, false);
  }

  // --- Init ------------------------------------------------------------

  function init() {
    NeonDrop.init({
      canvas,
      nextCanvas,
      callbacks: {
        onStatsChange: updateStats,
        onGameOver: handleGameOver,
      },
    });

    loadSavedName();
    refreshLeaderboard();
    wireTouchControls();

    startBtn.addEventListener('click', handleStart);
    pauseBtn.addEventListener('click', handlePauseToggle);
    restartBtn.addEventListener('click', handleRestart);
    submitBtn.addEventListener('click', handleSubmitScore);

    pauseBtn.disabled = true;
    restartBtn.disabled = true;
    submitBtn.disabled = true;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
