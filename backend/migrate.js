require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

// Every file in migrations/ uses IF NOT EXISTS-style guards, so re-running the full set is
// always safe -- this can be (and is, from server.js) called on every server startup.
async function runMigrations() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
    }
    console.log('All migrations completed successfully.');
  } finally {
    // Release the client back to the pool, but leave the pool itself open -- server.js keeps
    // using it for the life of the process. Only the CLI entry point below owns closing it.
    client.release();
  }
}

// `npm run migrate` (a one-off CLI run, e.g. for a manual check) still works exactly as
// before: run once, then close the pool and exit.
if (require.main === module) {
  runMigrations()
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { runMigrations };
