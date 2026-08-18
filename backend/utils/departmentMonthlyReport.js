const pool = require('../db');
const { computeTrainingYear } = require('./attendanceSummary');

// Only 'approved' (final, admin-signed-off) records are salary-eligible and shown here.
async function getDepartmentMonthlyReport(subjectName, month, year) {
  const hodResult = await pool.query(
    "SELECT name FROM users WHERE role = 'hod' AND department = $1 AND is_active = TRUE LIMIT 1",
    [subjectName]
  );
  const hodName = hodResult.rows[0]?.name || null;

  // GIMS's standard report order: this report is already scoped to a single department, so
  // the remaining sort keys are batch-wise, then alphabetical name within each batch.
  const recordsResult = await pool.query(
    `SELECT a.cl_days, a.absent_days, a.academic_leave_days, a.special_leave_days,
            a.days_present, a.total_working_days, a.remarks,
            s.name AS student_name, s.batch, s.date_of_joining
     FROM attendance_records a
     JOIN pg_students s ON s.id = a.student_id
     WHERE s.subject_name = $1 AND a.month = $2 AND a.year = $3 AND a.status = 'approved'
     ORDER BY s.batch ASC, LOWER(s.name) ASC`,
    [subjectName, month, year]
  );

  const records = recordsResult.rows.map((r) => {
    const trainingYear = computeTrainingYear(r.date_of_joining, year, month);
    const noLeaveTaken = r.cl_days === 0 && r.absent_days === 0 && r.academic_leave_days === 0 && r.special_leave_days === 0;
    return {
      student_name: r.student_name,
      batch: r.batch || '-',
      post: `JR-0${trainingYear}`,
      cl_days: r.cl_days,
      absent_days: r.absent_days,
      total_present_label: noLeaveTaken ? 'Full Days Present' : `${r.days_present} Days Present`,
      remarks: r.remarks || '',
    };
  });

  return { subject_name: subjectName, month, year, hod_name: hodName, records };
}

module.exports = { getDepartmentMonthlyReport };
