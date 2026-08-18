// "Implement a leave register option for admin, where he can select any student or batch
// or department and leave record will be generated in form of PDF" -- matches the
// institution's paper "LEAVE REGISTER" form: one row per student, that student's own Year 1
// totals next to their cumulative Grand Total, for whichever selection the admin makes.
const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { getStudentAttendanceSummary } = require('../utils/attendanceSummary');
const { generateLeaveRegisterPdf, zeroBucket } = require('../utils/generateLeaveRegisterPdf');
const { sortByDepartmentBatchName } = require('../utils/reportSort');

// Exactly one of student_id / batch / subject_name selects the student set. Precedence
// (student > batch > department) only matters if a caller sends more than one -- the
// frontend UI never does, since it only shows one dropdown at a time.
async function resolveStudents({ studentId, batch, subjectName }) {
  if (studentId) {
    const result = await pool.query(`SELECT id, name FROM pg_students WHERE id = $1`, [studentId]);
    return { mode: 'student', rows: result.rows };
  }
  if (batch) {
    const result = await pool.query(
      `SELECT id, name FROM pg_students WHERE is_active = TRUE AND batch = $1 ORDER BY name ASC`,
      [batch]
    );
    return { mode: 'batch', rows: result.rows };
  }
  if (subjectName) {
    const result = await pool.query(
      `SELECT id, name FROM pg_students WHERE is_active = TRUE AND subject_name = $1 ORDER BY name ASC`,
      [subjectName]
    );
    return { mode: 'department', rows: result.rows };
  }
  return { mode: null, rows: [] };
}

// When rows span more than one department/batch (e.g. a batch selection where different
// students study different subjects), the header can't show one value truthfully.
function uniformOrMultiple(values) {
  const distinct = [...new Set(values.filter(Boolean))];
  if (distinct.length === 0) return '';
  if (distinct.length === 1) return distinct[0];
  return 'Multiple';
}

async function buildLeaveRegister(query) {
  const studentId = query.student_id ? Number(query.student_id) : null;
  const batch = query.batch || null;
  const subjectName = query.subject_name || null;
  const academicSession = query.academic_session || '';

  const { mode, rows: studentRows } = await resolveStudents({ studentId, batch, subjectName });

  const summaries = await Promise.all(studentRows.map((s) => getStudentAttendanceSummary(s.id)));
  const unsortedRows = summaries
    .filter(Boolean)
    .map((summary) => ({
      student: summary.student,
      yearOne: summary.years.find((y) => y.year === 1) || { year: 1, ...zeroBucket() },
      grandTotal: summary.grandTotal,
    }));
  // GIMS's standard report order: department-wise, then batch-wise, then alphabetical name.
  const rows = sortByDepartmentBatchName(unsortedRows, {
    department: (r) => r.student.subject_name,
    batch: (r) => r.student.batch,
    name: (r) => r.student.name,
  });

  const department = mode === 'department' ? subjectName : uniformOrMultiple(rows.map((r) => r.student.subject_name));
  const resolvedBatch = mode === 'batch' ? batch : uniformOrMultiple(rows.map((r) => r.student.batch));

  const dateOfPreparation = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

  return { mode, department, batch: resolvedBatch, academicSession, dateOfPreparation, rows };
}

function validateSelection(query, res) {
  if (!query.student_id && !query.batch && !query.subject_name) {
    res.status(400).json({ message: 'Select a student, batch, or department.' });
    return false;
  }
  return true;
}

const getLeaveRegister = asyncHandler(async (req, res) => {
  if (!validateSelection(req.query, res)) return;
  const data = await buildLeaveRegister(req.query);
  res.json(data);
});

const downloadLeaveRegisterPdf = asyncHandler(async (req, res) => {
  if (!validateSelection(req.query, res)) return;
  const data = await buildLeaveRegister(req.query);
  generateLeaveRegisterPdf(data, res);
});

module.exports = { getLeaveRegister, downloadLeaveRegisterPdf };
