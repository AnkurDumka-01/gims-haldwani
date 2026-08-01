const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { logAction } = require('../utils/auditLog');
const { getDepartmentMonthlyReport } = require('../utils/departmentMonthlyReport');
const generateDepartmentMonthlyReportPdf = require('../utils/generateDepartmentMonthlyReportPdf');

const ATTENDANCE_SELECT = `
  SELECT a.*, s.name AS student_name, s.roll_number, s.subject_name AS student_subject_name,
         p.name AS professor_name
  FROM attendance_records a
  JOIN pg_students s ON s.id = a.student_id
  JOIN users p ON p.id = a.professor_id
`;

const listAttendance = asyncHandler(async (req, res) => {
  const { status, month, year } = req.query;
  const conditions = ['s.subject_name = $1'];
  const params = [req.user.department];

  params.push(status || 'pending');
  conditions.push(`a.status = $${params.length}`);

  if (month) {
    params.push(month);
    conditions.push(`a.month = $${params.length}`);
  }
  if (year) {
    params.push(year);
    conditions.push(`a.year = $${params.length}`);
  }

  const result = await pool.query(
    `${ATTENDANCE_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY a.created_at DESC`,
    params
  );
  res.json(result.rows);
});

const assertOwnDepartmentRecord = async (id, department) => {
  const result = await pool.query(
    `SELECT a.id FROM attendance_records a
     JOIN pg_students s ON s.id = a.student_id
     WHERE a.id = $1 AND s.subject_name = $2`,
    [id, department]
  );
  return result.rows.length > 0;
};

const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    total_working_days, days_present,
    cl_days, academic_leave_days, special_leave_days, absent_days, remarks,
  } = req.body;

  if (!(await assertOwnDepartmentRecord(id, req.user.department))) {
    return res.status(403).json({ message: 'This record is not in your department.' });
  }

  const existing = await pool.query('SELECT status FROM attendance_records WHERE id = $1', [id]);
  if (existing.rows[0].status !== 'pending') {
    return res.status(400).json({ message: 'Only pending records can be edited.' });
  }

  const result = await pool.query(
    `UPDATE attendance_records
     SET total_working_days = COALESCE($1, total_working_days),
         days_present = COALESCE($2, days_present),
         cl_days = COALESCE($3, cl_days),
         academic_leave_days = COALESCE($4, academic_leave_days),
         special_leave_days = COALESCE($5, special_leave_days),
         absent_days = COALESCE($6, absent_days),
         remarks = COALESCE($7, remarks),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [total_working_days, days_present, cl_days, academic_leave_days, special_leave_days, absent_days, remarks, id]
  );
  await logAction(req.user.id, 'hod_edit_attendance', 'attendance_record', id, req.body);
  res.json(result.rows[0]);
});

const approveAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!(await assertOwnDepartmentRecord(id, req.user.department))) {
    return res.status(403).json({ message: 'This record is not in your department.' });
  }

  const result = await pool.query(
    `UPDATE attendance_records
     SET status = 'hod_approved', hod_reviewed_by = $1, hod_reviewed_at = CURRENT_TIMESTAMP,
         hod_rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [req.user.id, id]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ message: 'Record not found or not in pending status.' });
  }
  await logAction(req.user.id, 'hod_approve_attendance', 'attendance_record', id, {});
  res.json(result.rows[0]);
});

const rejectAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: 'A rejection reason is required.' });
  }
  if (!(await assertOwnDepartmentRecord(id, req.user.department))) {
    return res.status(403).json({ message: 'This record is not in your department.' });
  }

  const result = await pool.query(
    `UPDATE attendance_records
     SET status = 'hod_rejected', hod_reviewed_by = $1, hod_reviewed_at = CURRENT_TIMESTAMP,
         hod_rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [req.user.id, reason, id]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ message: 'Record not found or not in pending status.' });
  }
  await logAction(req.user.id, 'hod_reject_attendance', 'attendance_record', id, { reason });
  res.json(result.rows[0]);
});

const getMonthlyReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: 'month and year are required.' });
  }
  const report = await getDepartmentMonthlyReport(req.user.department, Number(month), Number(year));
  res.json(report);
});

const downloadMonthlyReportPdf = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: 'month and year are required.' });
  }
  const report = await getDepartmentMonthlyReport(req.user.department, Number(month), Number(year));
  generateDepartmentMonthlyReportPdf(report, res);
});

module.exports = {
  listAttendance,
  updateAttendance,
  approveAttendance,
  rejectAttendance,
  getMonthlyReport,
  downloadMonthlyReportPdf,
};
