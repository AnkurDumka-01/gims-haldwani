const pool = require('../db');
const {
  CL_ANNUAL_CAP,
  ACADEMIC_LEAVE_ANNUAL_CAP,
  SPECIAL_LEAVE_TOTAL_CAP,
  EXAM_ELIGIBILITY_PRESENT_DAYS,
  TENURE_REQUIRED_DAYS,
  CL_TENURE_CAP,
  ACADEMIC_LEAVE_TENURE_CAP,
} = require('./leaveRules');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

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

const emptyBucket = () => ({
  cl_days: 0, academic_leave_days: 0, special_leave_days: 0, absent_days: 0,
  days_present: 0, total_working_days: 0, drpPeriods: [],
});

// Percentage is computed on demand (not stored on the bucket itself) so callers that don't
// need it -- e.g. generateAnnualReportPdf's existing columns -- are unaffected by this field.
function percentageOf(bucket) {
  if (!bucket || !bucket.total_working_days) return null;
  return Math.round((bucket.days_present / bucket.total_working_days) * 10000) / 100;
}

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
    `SELECT year, month, cl_days, academic_leave_days, special_leave_days, absent_days, days_present, total_working_days,
            is_drp, drp_from_date, drp_to_date, reviewed_at
     FROM attendance_records
     WHERE student_id = $1 AND status = ANY($2)
     ORDER BY year, month`,
    [studentId, statuses]
  );

  const yearsMap = {};
  let latestApprovedAt = null;
  for (const r of recordsResult.rows) {
    const trainingYear = computeTrainingYear(student.date_of_joining, r.year, r.month);
    if (!yearsMap[trainingYear]) yearsMap[trainingYear] = { year: trainingYear, ...emptyBucket() };
    const bucket = yearsMap[trainingYear];
    bucket.cl_days += r.cl_days;
    bucket.academic_leave_days += r.academic_leave_days;
    bucket.special_leave_days += r.special_leave_days;
    bucket.absent_days += r.absent_days;
    bucket.days_present += r.days_present;
    bucket.total_working_days += r.total_working_days;
    if (r.is_drp) bucket.drpPeriods.push({ from: r.drp_from_date, to: r.drp_to_date });
    if (r.reviewed_at && (!latestApprovedAt || r.reviewed_at > latestApprovedAt)) {
      latestApprovedAt = r.reviewed_at;
    }
  }

  const years = Object.values(yearsMap)
    .map((y) => ({ ...y, percentage: percentageOf(y) }))
    .sort((a, b) => a.year - b.year);
  const grandTotal = years.reduce(
    (acc, y) => ({
      cl_days: acc.cl_days + y.cl_days,
      academic_leave_days: acc.academic_leave_days + y.academic_leave_days,
      special_leave_days: acc.special_leave_days + y.special_leave_days,
      absent_days: acc.absent_days + y.absent_days,
      days_present: acc.days_present + y.days_present,
      total_working_days: acc.total_working_days + y.total_working_days,
      drpPeriods: [...acc.drpPeriods, ...y.drpPeriods],
    }),
    emptyBucket()
  );
  grandTotal.percentage = percentageOf(grandTotal);
  const hasDrp = grandTotal.drpPeriods.length > 0;

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
  if (grandTotal.cl_days > CL_TENURE_CAP) {
    warnings.push(`Total Casual Leave across the tenure (${grandTotal.cl_days} days) exceeds the tenure-wide cap of ${CL_TENURE_CAP}.`);
  }
  if (grandTotal.academic_leave_days > ACADEMIC_LEAVE_TENURE_CAP) {
    warnings.push(`Total Academic Leave across the tenure (${grandTotal.academic_leave_days} days) exceeds the tenure-wide cap of ${ACADEMIC_LEAVE_TENURE_CAP}.`);
  }

  const examEligible = grandTotal.days_present >= EXAM_ELIGIBILITY_PRESENT_DAYS;

  // JR fellowship tenure: 365 x 3 = 1095 days required to complete it. CL and Academic
  // Leave count toward that total (they're entitled leave, not time away from service),
  // but only up to their tenure-wide caps (60 CL / 15 AL) -- "counting maximum of 60 CL
  // ... and 15 AL" per the institution's rule. Special Leave and Absent days never count,
  // and neither does CL/AL beyond its cap, so any of those push the shortfall up and the
  // tenure's completion date back by exactly that many days.
  const creditedClDays = Math.min(grandTotal.cl_days, CL_TENURE_CAP);
  const creditedAcademicLeaveDays = Math.min(grandTotal.academic_leave_days, ACADEMIC_LEAVE_TENURE_CAP);
  const tenureDaysServed = grandTotal.days_present + creditedClDays + creditedAcademicLeaveDays;
  const tenureShortfallDays = Math.max(0, TENURE_REQUIRED_DAYS - tenureDaysServed);
  const tenureCompleted = tenureShortfallDays === 0;
  const nominalTenureEndDate = student.date_of_joining ? addYears(student.date_of_joining, 3) : null;
  const extendedTenureEndDate = nominalTenureEndDate ? addDays(nominalTenureEndDate, tenureShortfallDays) : null;

  const tenure = {
    requiredDays: TENURE_REQUIRED_DAYS,
    daysServed: tenureDaysServed,
    daysPresent: grandTotal.days_present,
    creditedClDays,
    creditedAcademicLeaveDays,
    shortfallDays: tenureShortfallDays,
    completed: tenureCompleted,
    nominalEndDate: nominalTenureEndDate,
    extendedEndDate: extendedTenureEndDate,
    clTenureCap: CL_TENURE_CAP,
    academicLeaveTenureCap: ACADEMIC_LEAVE_TENURE_CAP,
  };

  return {
    student, years, grandTotal, warnings, examEligible, examEligibilityThreshold: EXAM_ELIGIBILITY_PRESENT_DAYS,
    tenure, hasDrp, latestApprovedAt,
  };
}

module.exports = { getStudentAttendanceSummary, computeTrainingYear };
