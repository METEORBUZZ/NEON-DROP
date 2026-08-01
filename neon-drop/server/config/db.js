const { Pool } = require('pg');

// A single shared connection pool for the whole app. `pg` reads PGHOST,
// PGPORT, PGDATABASE, PGUSER, PGPASSWORD from process.env automatically,
// but we pass them explicitly here so the source of config is obvious.
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'neon_drop',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // Errors on idle clients (e.g. connection dropped) should not crash the
  // whole process — log and let the pool recover on next checkout.
  console.error('[db] Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
