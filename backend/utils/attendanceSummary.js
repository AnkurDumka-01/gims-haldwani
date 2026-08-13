const pool = require('../db');
const {
  CL_ANNUAL_CAP,
  ACADEMIC_LEAVE_ANNUAL_CAP,
  SPECIAL_LEAVE_TOTAL_CAP,
  EXAM_ELIGIBILITY_PRESENT_DAYS,
} = require('./leaveRules');

// PG training year is a fixed 12-month window from date_of_joining (Year 1, Year 2, Year 3, ...).
// Students without a recorded date_of_joining fall back to Year 1 for all their records.
function computeTrainingYear(dateOfJoining, year, month) {
  if (!dateOfJoining) return 1;
  // node-postgres parses DATE columns into a Date at local midnight, so read back
  // local components here (not UTC) to recover the original calendar date correctly.
  const joining = new Date(dateOfJoining);
  const joiningYear = joining.getFullYear();
  const joiningMonth = joining.getMonth() + 1;
  const monthIndex = (year - joiningYear) * 12 + (month - joiningMonth);
  if (monthIndex < 0) return 1;
  return Math.floor(monthIndex / 12) + 1;
}

const emptyBucket = () => ({ cl_days: 0, academic_leave_days: 0, special_leave_days: 0, absent_days: 0, days_present: 0 });

async function getStudentAttendanceSummary(studentId, { statuses = ['approved'] } = {}) {
  const studentResult = await pool.query(
    `SELECT s.id, s.name, s.father_name, s.roll_number, s.subject_name, s.batch, s.date_of_admission, s.date_of_joining, u.name AS professor_name
     FROM pg_students s
     LEFT JOIN users u ON u.id = s.professor_id
     WHERE s.id = $1`,
    [studentId]
  );
  if (studentResult.rows.length === 0) return null;
  const student = studentResult.rows[0];

  const recordsResult = await pool.query(
    `SELECT year, month, cl_days, academic_leave_days, special_leave_days, absent_days, days_present
     FROM attendance_records
     WHERE student_id = $1 AND status = ANY($2)
     ORDER BY year, month`,
    [studentId, statuses]
  );

  const yearsMap = {};
  for (const r of recordsResult.rows) {
    const trainingYear = computeTrainingYear(student.date_of_joining, r.year, r.month);
    if (!yearsMap[trainingYear]) yearsMap[trainingYear] = { year: trainingYear, ...emptyBucket() };
    const bucket = yearsMap[trainingYear];
    bucket.cl_days += r.cl_days;
    bucket.academic_leave_days += r.academic_leave_days;
    bucket.special_leave_days += r.special_leave_days;
    bucket.absent_days += r.absent_days;
    bucket.days_present += r.days_present;
  }

  const years = Object.values(yearsMap).sort((a, b) => a.year - b.year);
  const grandTotal = years.reduce(
    (acc, y) => ({
      cl_days: acc.cl_days + y.cl_days,
      academic_leave_days: acc.academic_leave_days + y.academic_leave_days,
      special_leave_days: acc.special_leave_days + y.special_leave_days,
      absent_days: acc.absent_days + y.absent_days,
      days_present: acc.days_present + y.days_present,
    }),
    emptyBucket()
  );

  const warnings = [];
  years.forEach((y) => {
    if (y.cl_days > CL_ANNUAL_CAP) {
      warnings.push(`Year ${y.year}: Casual Leave (${y.cl_days} days) exceeds the annual cap of ${CL_ANNUAL_CAP}.`);
    }
    if (y.academic_leave_days > ACADEMIC_LEAVE_ANNUAL_CAP) {
      warnings.push(`Year ${y.year}: Academic Leave (${y.academic_leave_days} days) exceeds the annual cap of ${ACADEMIC_LEAVE_ANNUAL_CAP}.`);
    }
  });
  if (grandTotal.special_leave_days > SPECIAL_LEAVE_TOTAL_CAP) {
    warnings.push(`Special Leave (Maternity/Paternity) total (${grandTotal.special_leave_days} days) exceeds the overall cap of ${SPECIAL_LEAVE_TOTAL_CAP}.`);
  }

  const examEligible = grandTotal.days_present >= EXAM_ELIGIBILITY_PRESENT_DAYS;

  return { student, years, grandTotal, warnings, examEligible, examEligibilityThreshold: EXAM_ELIGIBILITY_PRESENT_DAYS };
}

module.exports = { getStudentAttendanceSummary, computeTrainingYear };
