require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

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
app.listen(PORT, () => {
  console.log(`GMC, HALDWANI backend listening on port ${PORT}`);
});
