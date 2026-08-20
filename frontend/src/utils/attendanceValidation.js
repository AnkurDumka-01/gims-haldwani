// Mirrors backend/utils/attendanceValidation.js: Total Days in Month must equal every day
// accounted for exactly once (Present + CL + Academic Leave + Special Leave + Absent). This
// client-side copy exists purely to catch a mismatch before the round-trip -- the backend
// check is the authoritative one.
export function dayTotalsSum({ days_present, cl_days, academic_leave_days, special_leave_days, absent_days }) {
  return (
    Number(days_present || 0) + Number(cl_days || 0) + Number(academic_leave_days || 0) +
    Number(special_leave_days || 0) + Number(absent_days || 0)
  );
}

export function validateDayTotals(form) {
  if (form.total_working_days === '' || form.total_working_days == null) return null;
  const sum = dayTotalsSum(form);
  if (Number(form.total_working_days) !== sum) {
    return `Total Days in Month (${form.total_working_days}) must equal Days Present + CL + Academic Leave + Special Leave + Absent (currently ${sum}).`;
  }
  return null;
}
