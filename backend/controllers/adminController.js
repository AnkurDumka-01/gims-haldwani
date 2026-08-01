const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { logAction } = require('../utils/auditLog');

// ---- Professors ----

const createProfessor = asyncHandler(async (req, res) => {
  const { name, email, password, department, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required.' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'A user with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, department, phone)
     VALUES ($1, $2, $3, 'professor', $4, $5)
     RETURNING id, name, email, role, department, phone, is_active, created_at`,
    [name, email, passwordHash, department || null, phone || null]
  );

  await logAction(req.user.id, 'create_professor', 'user', result.rows[0].id, { email });
  res.status(201).json(result.rows[0]);
});

const listProfessors = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, department, phone, is_active, created_at
     FROM users WHERE role = 'professor' ORDER BY name ASC`
  );
  res.json(result.rows);
});

const updateProfessorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const result = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND role = 'professor'
     RETURNING id, name, email, is_active`,
    [is_active, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Professor not found.' });
  }
  await logAction(req.user.id, 'update_professor_status', 'user', id, { is_active });
  res.json(result.rows[0]);
});

// ---- Heads of Department ----

const createHod = asyncHandler(async (req, res) => {
  const { name, email, password, department, phone } = req.body;
  if (!name || !email || !password || !department) {
    return res.status(400).json({ message: 'name, email, password and department are required.' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'A user with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, department, phone)
     VALUES ($1, $2, $3, 'hod', $4, $5)
     RETURNING id, name, email, role, department, phone, is_active, created_at`,
    [name, email, passwordHash, department, phone || null]
  );

  await logAction(req.user.id, 'create_hod', 'user', result.rows[0].id, { email });
  res.status(201).json(result.rows[0]);
});

const listHods = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, department, phone, is_active, created_at
     FROM users WHERE role = 'hod' ORDER BY name ASC`
  );
  res.json(result.rows);
});

const updateHodStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const result = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND role = 'hod'
     RETURNING id, name, email, is_active`,
    [is_active, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'HoD not found.' });
  }
  await logAction(req.user.id, 'update_hod_status', 'user', id, { is_active });
  res.json(result.rows[0]);
});

// ---- PG Students ----

const createStudent = asyncHandler(async (req, res) => {
  const {
    name, father_name, roll_number, subject_name, batch, professor_id, phone, email,
    date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date,
  } = req.body;
  if (!name || !roll_number || !subject_name) {
    return res.status(400).json({ message: 'name, roll_number and subject_name are required.' });
  }

  if (professor_id) {
    const prof = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'professor'", [professor_id]);
    if (prof.rows.length === 0) {
      return res.status(400).json({ message: 'professor_id does not refer to a valid professor.' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO pg_students
        (name, father_name, roll_number, subject_name, batch, professor_id, phone, email,
         date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        name, father_name || null, roll_number, subject_name, batch || null, professor_id || null, phone || null, email || null,
        date_of_admission || null, date_of_joining || null, account_number || null, monthly_stipend_rate || null, service_end_date || null,
        req.user.id,
      ]
    );
    await logAction(req.user.id, 'create_student', 'pg_student', result.rows[0].id, { roll_number });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A student with this roll number already exists.' });
    }
    throw err;
  }
});

const listStudents = asyncHandler(async (req, res) => {
  const { subject_name, professor_id } = req.query;
  const conditions = [];
  const params = [];

  if (subject_name) {
    params.push(subject_name);
    conditions.push(`s.subject_name = $${params.length}`);
  }
  if (professor_id) {
    params.push(professor_id);
    conditions.push(`s.professor_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT s.*, u.name AS professor_name
     FROM pg_students s
     LEFT JOIN users u ON u.id = s.professor_id
     ${where}
     ORDER BY s.name ASC`,
    params
  );
  res.json(result.rows);
});

const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name, father_name, subject_name, batch, phone, email, is_active,
    date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date,
  } = req.body;

  const result = await pool.query(
    `UPDATE pg_students
     SET name = COALESCE($1, name),
         father_name = COALESCE($2, father_name),
         subject_name = COALESCE($3, subject_name),
         batch = COALESCE($4, batch),
         phone = COALESCE($5, phone),
         email = COALESCE($6, email),
         is_active = COALESCE($7, is_active),
         date_of_admission = COALESCE($8, date_of_admission),
         date_of_joining = COALESCE($9, date_of_joining),
         account_number = COALESCE($10, account_number),
         monthly_stipend_rate = COALESCE($11, monthly_stipend_rate),
         service_end_date = COALESCE($12, service_end_date),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $13
     RETURNING *`,
    [
      name, father_name, subject_name, batch, phone, email, is_active, date_of_admission, date_of_joining,
      account_number, monthly_stipend_rate, service_end_date, id,
    ]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  await logAction(req.user.id, 'update_student', 'pg_student', id, req.body);
  res.json(result.rows[0]);
});

const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM pg_students WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  await logAction(req.user.id, 'delete_student', 'pg_student', id, {});
  res.json({ message: 'Student deleted.' });
});

const assignProfessor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { professor_id } = req.body;

  if (professor_id) {
    const prof = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'professor'", [professor_id]);
    if (prof.rows.length === 0) {
      return res.status(400).json({ message: 'professor_id does not refer to a valid professor.' });
    }
  }

  const result = await pool.query(
    `UPDATE pg_students SET professor_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [professor_id || null, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  await logAction(req.user.id, 'assign_professor', 'pg_student', id, { professor_id });
  res.json(result.rows[0]);
});

module.exports = {
  createProfessor,
  listProfessors,
  updateProfessorStatus,
  createHod,
  listHods,
  updateHodStatus,
  createStudent,
  listStudents,
  updateStudent,
  deleteStudent,
  assignProfessor,
};
