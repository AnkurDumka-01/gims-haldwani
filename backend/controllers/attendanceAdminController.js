const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { logAction } = require('../utils/auditLog');
const generateAttendancePdf = require('../utils/generateAttendancePdf');
const generateAnnualReportPdf = require('../utils/generateAnnualReportPdf');
const { getStudentAttendanceSummary } = require('../utils/attendanceSummary');
const { getDepartmentMonthlyReport } = require('../utils/departmentMonthlyReport');
const generateDepartmentMonthlyReportPdf = require('../utils/generateDepartmentMonthlyReportPdf');

const ATTENDANCE_SELECT = `
  SELECT a.*, s.name AS student_name, s.roll_number, s.subject_name AS student_subject_name,
         p.name AS professor_name, r.name AS reviewed_by_name
  FROM attendance_records a
  JOIN pg_students s ON s.id = a.student_id
  JOIN users p ON p.id = a.professor_id
  LEFT JOIN users r ON r.id = a.reviewed_by
`;

const listAttendance = asyncHandler(async (req, res) => {
  const { status, professor_id, subject_name, month, year } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (professor_id) {
    params.push(professor_id);
    conditions.push(`a.professor_id = $${params.length}`);
  }
  if (subject_name) {
    params.push(subject_name);
    conditions.push(`s.subject_name = $${params.length}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`a.month = $${params.length}`);
  }
  if (year) {
    params.push(year);
    conditions.push(`a.year = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `${ATTENDANCE_SELECT} ${where} ORDER BY a.created_at DESC`,
    params
  );
  res.json(result.rows);
});

const getAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`${ATTENDANCE_SELECT} WHERE a.id = $1`, [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Attendance record not found.' });
  }
  res.json(result.rows[0]);
});

const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    total_working_days, days_present,
    cl_days, academic_leave_days, special_leave_days, absent_days, remarks,
  } = req.body;

  const existing = await pool.query('SELECT status FROM attendance_records WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ message: 'Attendance record not found.' });
  }
  if (existing.rows[0].status !== 'hod_approved') {
    return res.status(400).json({ message: 'Only HoD-approved records can be edited by admin. Approve/reject stands as the final state.' });
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
  await logAction(req.user.id, 'edit_attendance', 'attendance_record', id, req.body);
  res.json(result.rows[0]);
});

const approveAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE attendance_records
     SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP,
         rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND status = 'hod_approved'
     RETURNING *`,
    [req.user.id, id]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ message: 'Record not found or not in hod_approved status.' });
  }
  await logAction(req.user.id, 'approve_attendance', 'attendance_record', id, {});
  res.json(result.rows[0]);
});

const rejectAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: 'A rejection reason is required.' });
  }

  const result = await pool.query(
    `UPDATE attendance_records
     SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP,
         rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND status = 'hod_approved'
     RETURNING *`,
    [req.user.id, reason, id]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ message: 'Record not found or not in hod_approved status.' });
  }
  await logAction(req.user.id, 'reject_attendance', 'attendance_record', id, { reason });
  res.json(result.rows[0]);
});

const downloadAttendancePdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`${ATTENDANCE_SELECT} WHERE a.id = $1`, [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Attendance record not found.' });
  }
  const record = result.rows[0];
  if (record.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved attendance records can be downloaded as PDF.' });
  }
  generateAttendancePdf(record, res);
});

const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const summary = await getStudentAttendanceSummary(id);
  if (!summary) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  res.json(summary);
});

const downloadAttendanceSummaryPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const summary = await getStudentAttendanceSummary(id);
  if (!summary) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  generateAnnualReportPdf(summary, res);
});

const getMonthlyReport = asyncHandler(async (req, res) => {
  const { subject_name, month, year } = req.query;
  if (!subject_name || !month || !year) {
    return res.status(400).json({ message: 'subject_name, month and year are required.' });
  }
  const report = await getDepartmentMonthlyReport(subject_name, Number(month), Number(year));
  res.json(report);
});

const downloadMonthlyReportPdf = asyncHandler(async (req, res) => {
  const { subject_name, month, year } = req.query;
  if (!subject_name || !month || !year) {
    return res.status(400).json({ message: 'subject_name, month and year are required.' });
  }
  const report = await getDepartmentMonthlyReport(subject_name, Number(month), Number(year));
  generateDepartmentMonthlyReportPdf(report, res);
});

module.exports = {
  listAttendance,
  getAttendance,
  updateAttendance,
  approveAttendance,
  rejectAttendance,
  downloadAttendancePdf,
  getAttendanceSummary,
  downloadAttendanceSummaryPdf,
  getMonthlyReport,
  downloadMonthlyReportPdf,
  ATTENDANCE_SELECT,
};
