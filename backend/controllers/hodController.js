const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { logAction } = require('../utils/auditLog');
const { getDepartmentMonthlyReport } = require('../utils/departmentMonthlyReport');
const generateDepartmentMonthlyReportPdf = require('../utils/generateDepartmentMonthlyReportPdf');
const { validateDrpFields, normalizeDrpFields } = require('../utils/drpValidation');
const { validateDayTotals } = require('../utils/attendanceValidation');

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

  const existing = await pool.query(
    `SELECT status, is_drp, drp_from_date, drp_to_date,
            total_working_days, days_present, cl_days, academic_leave_days, special_leave_days, absent_days
     FROM attendance_records WHERE id = $1`,
    [id]
  );
  if (existing.rows[0].status !== 'pending') {
    return res.status(400).json({ message: 'Only pending records can be edited.' });
  }

  // DRP fields are hard-set (not COALESCE'd like the fields above) because unchecking DRP
  // needs to actually clear the dates, which COALESCE can never do (it only ever keeps the
  // existing value or replaces it, never nulls it back out). Merging onto the existing row
  // first means an edit that doesn't touch DRP at all (is_drp absent from the request body)
  // leaves it exactly as it was.
  const mergedDrp = {
    is_drp: req.body.is_drp !== undefined ? req.body.is_drp : existing.rows[0].is_drp,
    drp_from_date: req.body.drp_from_date !== undefined ? req.body.drp_from_date : existing.rows[0].drp_from_date,
    drp_to_date: req.body.drp_to_date !== undefined ? req.body.drp_to_date : existing.rows[0].drp_to_date,
  };
  const drpError = validateDrpFields(mergedDrp);
  if (drpError) return res.status(400).json({ message: drpError });
  const { is_drp, drp_from_date, drp_to_date } = normalizeDrpFields(mergedDrp);

  // Same merge-then-validate approach for the day-total check: an edit that only touches,
  // say, remarks shouldn't need to resend every day-count field just to pass validation.
  const mergedTotals = {
    total_working_days: total_working_days ?? existing.rows[0].total_working_days,
    days_present: days_present ?? existing.rows[0].days_present,
    cl_days: cl_days ?? existing.rows[0].cl_days,
    academic_leave_days: academic_leave_days ?? existing.rows[0].academic_leave_days,
    special_leave_days: special_leave_days ?? existing.rows[0].special_leave_days,
    absent_days: absent_days ?? existing.rows[0].absent_days,
  };
  const totalsError = validateDayTotals(mergedTotals);
  if (totalsError) return res.status(400).json({ message: totalsError });

  const result = await pool.query(
    `UPDATE attendance_records
     SET total_working_days = COALESCE($1, total_working_days),
         days_present = COALESCE($2, days_present),
         cl_days = COALESCE($3, cl_days),
         academic_leave_days = COALESCE($4, academic_leave_days),
         special_leave_days = COALESCE($5, special_leave_days),
         absent_days = COALESCE($6, absent_days),
         remarks = COALESCE($7, remarks),
         is_drp = $8, drp_from_date = $9, drp_to_date = $10,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $11
     RETURNING *`,
    [
      total_working_days, days_present, cl_days, academic_leave_days, special_leave_days, absent_days, remarks,
      is_drp, drp_from_date, drp_to_date, id,
    ]
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
