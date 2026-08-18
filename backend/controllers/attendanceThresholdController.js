// "Dashboard should include another feature to download students having attendance based on
// criteria selected by admin and generate report of students having attendance greater than
// or equal to the selected attendance criteria." Attendance % is computed from approved
// attendance_records (days_present / total_working_days, summed across the whole period or
// an optional date range), not tied to the fixed exam-eligibility threshold used elsewhere --
// the admin picks the cutoff here.
const asyncHandler = require('express-async-handler');
const pool = require('../db');
const generateAttendanceThresholdReportPdf = require('../utils/generateAttendanceThresholdReportPdf');
const { sortByDepartmentBatchName } = require('../utils/reportSort');

async function buildThresholdReport({ minPercent, fromMonth, fromYear, toMonth, toYear, batch }) {
  const params = [];
  const joinClauses = [`ar.status = 'approved'`];
  if (fromMonth && fromYear) {
    params.push(fromYear * 12 + fromMonth);
    joinClauses.push(`(ar.year * 12 + ar.month) >= $${params.length}`);
  }
  if (toMonth && toYear) {
    params.push(toYear * 12 + toMonth);
    joinClauses.push(`(ar.year * 12 + ar.month) <= $${params.length}`);
  }

  const whereClauses = [`s.is_active = TRUE`];
  if (batch) {
    params.push(batch);
    whereClauses.push(`s.batch = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT s.id, s.name, s.roll_number, s.subject_name, s.batch,
            SUM(ar.days_present) AS days_present,
            SUM(ar.total_working_days) AS total_working_days
     FROM pg_students s
     JOIN attendance_records ar ON ar.student_id = s.id AND ${joinClauses.join(' AND ')}
     WHERE ${whereClauses.join(' AND ')}
     GROUP BY s.id, s.name, s.roll_number, s.subject_name, s.batch
     HAVING SUM(ar.total_working_days) > 0
     ORDER BY s.name ASC`,
    params
  );

  return result.rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      roll_number: r.roll_number,
      subject_name: r.subject_name,
      batch: r.batch,
      days_present: Number(r.days_present),
      total_working_days: Number(r.total_working_days),
      percentage: Math.round((Number(r.days_present) / Number(r.total_working_days)) * 10000) / 100,
    }))
    .filter((r) => r.percentage >= minPercent)
    .sort((a, b) => b.percentage - a.percentage);
}

function parseQuery(query) {
  const { min_percent, from_month, from_year, to_month, to_year, batch } = query;
  const minPercent = Number(min_percent);
  return {
    minPercent,
    fromMonth: from_month ? Number(from_month) : null,
    fromYear: from_year ? Number(from_year) : null,
    toMonth: to_month ? Number(to_month) : null,
    toYear: to_year ? Number(to_year) : null,
    batch: batch ? String(batch) : null,
  };
}

const getAttendanceThresholdReport = asyncHandler(async (req, res) => {
  const opts = parseQuery(req.query);
  if (!req.query.min_percent || Number.isNaN(opts.minPercent) || opts.minPercent < 0 || opts.minPercent > 100) {
    return res.status(400).json({ message: 'min_percent (0-100) is required.' });
  }
  const students = await buildThresholdReport(opts);
  res.json({ minPercent: opts.minPercent, batch: opts.batch, students });
});

// On-screen list stays ranked by percentage (buildThresholdReport's own sort) so the admin
// sees highest/lowest attendance first; the downloaded PDF follows GIMS's standard report
// order instead (see reportSort.js) -- department-wise, then batch-wise, then name.
const downloadAttendanceThresholdReportPdf = asyncHandler(async (req, res) => {
  const opts = parseQuery(req.query);
  if (!req.query.min_percent || Number.isNaN(opts.minPercent) || opts.minPercent < 0 || opts.minPercent > 100) {
    return res.status(400).json({ message: 'min_percent (0-100) is required.' });
  }
  const students = sortByDepartmentBatchName(await buildThresholdReport(opts));
  generateAttendanceThresholdReportPdf({ minPercent: opts.minPercent, students, period: opts }, res);
});

module.exports = { getAttendanceThresholdReport, downloadAttendanceThresholdReportPdf };
