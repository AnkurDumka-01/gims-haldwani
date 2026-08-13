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

// Full-details edit (name/email/department/phone, optionally a new password) -- the status
// patch above only ever touched is_active; admins had no way to correct a typo'd email or
// reassign a professor to a different department without deleting and recreating the login.
const updateProfessor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, department, phone, password } = req.body;
  const blankToNull = (v) => (v === '' ? null : v);
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         department = COALESCE($3, department),
         phone = COALESCE($4, phone),
         password_hash = COALESCE($5, password_hash),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND role = 'professor'
       RETURNING id, name, email, department, phone, is_active, created_at`,
      [blankToNull(name), blankToNull(email), blankToNull(department), blankToNull(phone), passwordHash, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Professor not found.' });
    }
    await logAction(req.user.id, 'update_professor', 'user', id, { name, email, department, phone });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }
    throw err;
  }
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

const updateHod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, department, phone, password } = req.body;
  const blankToNull = (v) => (v === '' ? null : v);
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         department = COALESCE($3, department),
         phone = COALESCE($4, phone),
         password_hash = COALESCE($5, password_hash),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND role = 'hod'
       RETURNING id, name, email, department, phone, is_active, created_at`,
      [blankToNull(name), blankToNull(email), blankToNull(department), blankToNull(phone), passwordHash, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'HoD not found.' });
    }
    await logAction(req.user.id, 'update_hod', 'user', id, { name, email, department, phone });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }
    throw err;
  }
});

// ---- PG Students ----

const createStudent = asyncHandler(async (req, res) => {
  const {
    name, father_name, roll_number, subject_name, batch, professor_id, phone, email,
    date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date,
    phms, stipend_from_college,
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

  // stipend_from_college only means anything while phms is true -- normalising it to null
  // here (rather than trusting whatever the client sent) keeps a phms=false row from ever
  // carrying a stale/contradictory stipend_from_college value.
  const phmsFlag = phms === true || phms === 'true';
  const stipendFromCollege = phmsFlag ? (stipend_from_college === true || stipend_from_college === 'true') : null;

  try {
    const result = await pool.query(
      `INSERT INTO pg_students
        (name, father_name, roll_number, subject_name, batch, professor_id, phone, email,
         date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date,
         phms, stipend_from_college, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        name, father_name || null, roll_number, subject_name, batch || null, professor_id || null, phone || null, email || null,
        date_of_admission || null, date_of_joining || null, account_number || null, monthly_stipend_rate || null, service_end_date || null,
        phmsFlag, stipendFromCollege,
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
  const { subject_name, professor_id, batch, is_active, search } = req.query;
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
  if (batch) {
    params.push(batch);
    conditions.push(`s.batch = $${params.length}`);
  }
  if (is_active === 'true' || is_active === 'false') {
    params.push(is_active === 'true');
    conditions.push(`s.is_active = $${params.length}`);
  }
  // Free-text search across the fields an admin would actually type into a search box --
  // name, roll number, father's name, email, phone. One ILIKE pattern reused across all of
  // them rather than five separate query params.
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(s.name ILIKE ${p} OR s.roll_number ILIKE ${p} OR s.father_name ILIKE ${p} OR s.email ILIKE ${p} OR s.phone ILIKE ${p})`
    );
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
    name, father_name, roll_number, subject_name, batch, phone, email, is_active,
    date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date,
    phms, stipend_from_college,
  } = req.body;

  // The edit form always sends every field, including ones the admin left blank (e.g. no
  // date_of_admission on file) -- as '' rather than omitting the key. COALESCE below treats
  // that as "no change" (same "blank means leave as-is" convention createStudent already
  // uses with its own `|| null`), and '' would otherwise fail Postgres's date parser outright.
  const blankToNull = (v) => (v === '' ? null : v);

  // phms/stipend_from_college can't use that same COALESCE-keeps-old-value trick: when an
  // admin flips PHMS from Yes to No, stipend_from_college needs to actually clear to NULL,
  // not silently keep whatever it was before. Resolved against the current row (so a caller
  // that omits these two fields entirely still leaves them untouched) and written with a
  // direct, unconditional SET below instead of COALESCE.
  const current = await pool.query('SELECT phms, stipend_from_college FROM pg_students WHERE id = $1', [id]);
  if (current.rows.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  const phmsFlag = phms === undefined ? current.rows[0].phms : (phms === true || phms === 'true');
  const stipendFromCollege = phmsFlag
    ? (stipend_from_college === undefined ? current.rows[0].stipend_from_college : (stipend_from_college === true || stipend_from_college === 'true'))
    : null;

  try {
    const result = await pool.query(
      `UPDATE pg_students
       SET name = COALESCE($1, name),
           father_name = COALESCE($2, father_name),
           roll_number = COALESCE($3, roll_number),
           subject_name = COALESCE($4, subject_name),
           batch = COALESCE($5, batch),
           phone = COALESCE($6, phone),
           email = COALESCE($7, email),
           is_active = COALESCE($8, is_active),
           date_of_admission = COALESCE($9, date_of_admission),
           date_of_joining = COALESCE($10, date_of_joining),
           account_number = COALESCE($11, account_number),
           monthly_stipend_rate = COALESCE($12, monthly_stipend_rate),
           service_end_date = COALESCE($13, service_end_date),
           phms = $14,
           stipend_from_college = $15,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        blankToNull(name), blankToNull(father_name), blankToNull(roll_number), blankToNull(subject_name),
        blankToNull(batch), blankToNull(phone), blankToNull(email), is_active,
        blankToNull(date_of_admission), blankToNull(date_of_joining), blankToNull(account_number),
        blankToNull(monthly_stipend_rate), blankToNull(service_end_date),
        phmsFlag, stipendFromCollege, id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    await logAction(req.user.id, 'update_student', 'pg_student', id, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A student with this roll number already exists.' });
    }
    throw err;
  }
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
  updateProfessor,
  createHod,
  listHods,
  updateHodStatus,
  updateHod,
  createStudent,
  listStudents,
  updateStudent,
  deleteStudent,
  assignProfessor,
};
