const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { logAction } = require('../utils/auditLog');
const generateAttendancePdf = require('../utils/generateAttendancePdf');
const generateAnnualReportPdf = require('../utils/generateAnnualReportPdf');
const { getStudentAttendanceSummary } = require('../utils/attendanceSummary');

const myStudents = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM pg_students WHERE professor_id = $1 AND is_active = TRUE ORDER BY name ASC`,
    [req.user.id]
  );
  res.json(result.rows);
});

const submitAttendance = asyncHandler(async (req, res) => {
  const {
    student_id, month, year, total_working_days, days_present,
    cl_days, academic_leave_days, special_leave_days, absent_days, remarks, date_of_joining,
  } = req.body;

  if (!student_id || !month || !year || total_working_days == null || days_present == null) {
    return res.status(400).json({
      message: 'student_id, month, year, total_working_days and days_present are required.',
    });
  }

  const student = await pool.query(
    'SELECT id FROM pg_students WHERE id = $1 AND professor_id = $2',
    [student_id, req.user.id]
  );
  if (student.rows.length === 0) {
    return res.status(403).json({ message: 'This student is not mapped to you.' });
  }

  // Date of Joining drives training-year (Year 1/2/3) calculations across every report --
  // normally admin-set, but a professor submitting attendance is well-placed to notice it's
  // missing or wrong, so it's editable right here rather than requiring an admin round-trip.
  if (date_of_joining) {
    await pool.query(
      `UPDATE pg_students SET date_of_joining = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [date_of_joining, student_id]
    );
    await logAction(req.user.id, 'update_student_date_of_joining', 'pg_student', student_id, { date_of_joining });
  }

  try {
    const result = await pool.query(
      `INSERT INTO attendance_records
        (student_id, professor_id, submitted_by, month, year, total_working_days, days_present,
         cl_days, academic_leave_days, special_leave_days, absent_days, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        student_id, req.user.id, req.user.id, month, year, total_working_days, days_present,
        cl_days || 0, academic_leave_days || 0, special_leave_days || 0, absent_days || 0, remarks || null,
      ]
    );
    await logAction(req.user.id, 'submit_attendance', 'attendance_record', result.rows[0].id, { student_id, month, year });

    const summary = await getStudentAttendanceSummary(student_id, { statuses: ['pending', 'approved'] });
    res.status(201).json({ ...result.rows[0], warnings: summary?.warnings || [] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Attendance for this student and month has already been submitted.' });
    }
    throw err;
  }
});

const myAttendance = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const params = [req.user.id];
  let where = 'a.professor_id = $1';
  if (status) {
    params.push(status);
    where += ` AND a.status = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT a.*, s.name AS student_name, s.roll_number, s.subject_name AS student_subject_name
     FROM attendance_records a
     JOIN pg_students s ON s.id = a.student_id
     WHERE ${where}
     ORDER BY a.created_at DESC`,
    params
  );
  res.json(result.rows);
});

const downloadAttendancePdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT a.*, s.name AS student_name, s.roll_number, s.subject_name AS student_subject_name,
            p.name AS professor_name, r.name AS reviewed_by_name
     FROM attendance_records a
     JOIN pg_students s ON s.id = a.student_id
     JOIN users p ON p.id = a.professor_id
     LEFT JOIN users r ON r.id = a.reviewed_by
     WHERE a.id = $1 AND a.professor_id = $2`,
    [id, req.user.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Attendance record not found.' });
  }
  const record = result.rows[0];
  if (record.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved attendance records can be downloaded as PDF.' });
  }
  generateAttendancePdf(record, res);
});

const assertOwnStudent = async (studentId, professorId) => {
  const result = await pool.query(
    'SELECT id FROM pg_students WHERE id = $1 AND professor_id = $2',
    [studentId, professorId]
  );
  return result.rows.length > 0;
};

const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!(await assertOwnStudent(id, req.user.id))) {
    return res.status(403).json({ message: 'This student is not mapped to you.' });
  }
  const summary = await getStudentAttendanceSummary(id);
  if (!summary) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  res.json(summary);
});

const downloadAttendanceSummaryPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!(await assertOwnStudent(id, req.user.id))) {
    return res.status(403).json({ message: 'This student is not mapped to you.' });
  }
  const summary = await getStudentAttendanceSummary(id);
  if (!summary) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  generateAnnualReportPdf(summary, res);
});

module.exports = {
  myStudents,
  submitAttendance,
  myAttendance,
  downloadAttendancePdf,
  getAttendanceSummary,
  downloadAttendanceSummaryPdf,
};
