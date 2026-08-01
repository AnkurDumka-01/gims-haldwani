const { Pool } = require('pg');
require('dotenv').config();

// Hosted Postgres providers (Neon, Render Postgres, etc.) hand out a single
// connection string and require SSL; local dev uses discrete DB_* vars.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

module.exports = pool;
