/**
 * api.js
 * Thin wrapper around the backend REST API. Change API_BASE_URL to match
 * wherever the Express server is actually running (see README.md).
 */

const API_BASE_URL = 'http://localhost:4000';

const NeonDropAPI = {
  /** Fetches the top 10 scores. Returns an array (empty on failure). */
  async fetchTopScores() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/scores/top`);
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = await res.json();
      return data.scores || [];
    } catch (err) {
      console.error('[api] Failed to fetch leaderboard:', err);
      return [];
    }
  },

  /**
   * Submits a finished game's score.
   * Returns { ok: true, score } on success or { ok: false, message } on
   * failure — callers use this to show a friendly error instead of a crash.
   */
  async submitScore({ player_name, score, level, lines_cleared }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name, score, level, lines_cleared }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.details?.[0]?.message || data?.message || 'Submission failed.';
        return { ok: false, message };
      }
      return { ok: true, score: data.score };
    } catch (err) {
      console.error('[api] Failed to submit score:', err);
      return { ok: false, message: 'Could not reach the server. Try again.' };
    }
  },
};

window.NeonDropAPI = NeonDropAPI;
