require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { runMigrations } = require('./migrate');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const professorRoutes = require('./routes/professorRoutes');
const hodRoutes = require('./routes/hodRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api/hod', hodRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

// Migrations run here (at boot, with the app's normal runtime DB access) rather than at
// Render's build step -- the build container couldn't reach the database, which is exactly
// why migrations/0006 (the PHMS columns) silently never applied and every student edit
// started 500-ing. A migration failure is logged loudly but doesn't stop the server from
// starting, since most of the app still works fine even if one migration is lagging.
runMigrations()
  .catch((err) => {
    console.error('Startup migration failed -- some newer features may not work until this is resolved:', err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`GMC, HALDWANI backend listening on port ${PORT}`);
    });
  });
