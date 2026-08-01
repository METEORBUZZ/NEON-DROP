![NEON DROP screenshot](img/NEo%20game.png)

# NEON DROP
A dark retro-themed arcade Tetris game. Players type a name (no accounts, no
login), play in the browser, and submit their score to a global leaderboard.

```
neon-drop/
├── client/            static frontend — no build step
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── tetrominoes.js
│       ├── game.js
│       ├── api.js
│       └── ui.js
├── server/            Express REST API
│   ├── server.js
│   ├── config/db.js
│   ├── controllers/scoreController.js
│   ├── routes/scoreRoutes.js
│   ├── middleware/validate.js
│   └── package.json
├── schema.sql          PostgreSQL migration (MySQL notes included)
└── README.md
```

## 1. Database setup (PostgreSQL)

Requires a local PostgreSQL install with `createdb`/`psql` on your `PATH`.

```bash
createdb neon_drop
psql -d neon_drop -f schema.sql
```

This creates the `scores` table, an index on `score DESC`, and a `top_scores`
convenience view. MySQL-equivalent DDL is included as comments at the bottom
of `schema.sql` if you ever need to port off Postgres.

## 2. Backend setup (Express API)

```bash
cd server
cp .env.example .env   # then edit .env with your real DB credentials
npm install
npm start               # or: npm run dev  (auto-restarts on file changes)
```

The API listens on `PORT` from `.env` (default `4000`). Confirm it's up:

```bash
curl http://localhost:4000/api/health
```

### Endpoints

| Method | Path               | Description                          |
|--------|--------------------|---------------------------------------|
| GET    | `/api/health`      | Health check                          |
| GET    | `/api/scores/top`  | Top 10 scores, highest first          |
| POST   | `/api/scores`      | Submit a score (see body shape below) |

`POST /api/scores` body:

```json
{
  "player_name": "ACE",
  "score": 12000,
  "level": 4,
  "lines_cleared": 32
}
```

`player_name` must be 1-20 characters (letters, numbers, spaces, `-`, `_`
only); `score`, `level`, and `lines_cleared` must be non-negative integers.
Invalid input returns `422` with details on which field failed.

## 3. Frontend setup

The client is static — no bundler, no npm install. Serve the `client/`
folder with any static file server, for example:

```bash
npx serve client
```

That typically serves on `http://localhost:3000` — check your terminal
output for the exact port it picks.

## 4. Making the two sides match

Two settings have to agree across the frontend and backend, or requests
will fail with a CORS error or a failed fetch:

- **`client/js/api.js`** → `API_BASE_URL` must point at wherever the
  Express server is actually running (e.g. `http://localhost:4000`).
- **`server/.env`** → `CLIENT_ORIGIN` must exactly match the origin the
  frontend is served from (protocol + host + port), e.g.
  `http://localhost:3000`.

If either one is wrong, open the browser console — CORS and network
errors there will point at exactly which side is misconfigured.

## Gameplay

- Type a name at the top (required before **Start Game** is enabled) —
  it's remembered in `localStorage` for next time.
- **Controls:** ← → move · ↓ soft drop · ↑ rotate · Space hard drop.
  On small screens, on-screen touch buttons appear instead.
- 7 standard tetrominoes, basic wall-kicks on rotation, NES-style scoring
  (40/100/300/1200 × level for a single/double/triple/tetris), and a
  level-up (with faster drop speed) every 10 lines.
- When the game ends, edit your name if needed and submit your score —
  the Top 10 leaderboard refreshes automatically.

## Notes on the "no accounts" design

There's no JWT, no password hashing, and no `users` table — this is
intentional. Score submission is arcade-cabinet style ("enter your
initials"), not an account system, so anyone can post a score under any
name at any time.

That openness means the submission endpoint is spam-able. It's not
rate-limited by default, but it's built to make adding that easy later —
see the comment in `server/routes/scoreRoutes.js` for a drop-in
`express-rate-limit` example when you're ready to add it.
