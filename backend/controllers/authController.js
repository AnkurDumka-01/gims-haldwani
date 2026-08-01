const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../db');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const result = await pool.query(
    'SELECT id, name, email, password_hash, role, department, is_active FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
  });
});

const me = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, role, department, phone FROM users WHERE id = $1',
    [req.user.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }
  res.json(result.rows[0]);
});

module.exports = { login, me };
