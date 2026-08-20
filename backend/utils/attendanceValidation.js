// Shared day-total consistency check, used by the professor's submit endpoint and the
// HoD's/admin's edit endpoints alike: the month's Total Working Days must equal the sum of
// every category a day can fall into -- Present, CL, Academic Leave, Special Leave, and
// Absent -- so every day in the month is accounted for exactly once. A mismatch is treated
// as a data-entry error (not a soft policy cap like the leave-cap warnings elsewhere in this
// codebase), so it's rejected outright rather than just warned about.
function validateDayTotals({ total_working_days, days_present, cl_days, academic_leave_days, special_leave_days, absent_days }) {
  const total = Number(total_working_days);
  const sum =
    Number(days_present || 0) +
    Number(cl_days || 0) +
    Number(academic_leave_days || 0) +
    Number(special_leave_days || 0) +
    Number(absent_days || 0);

  if (total !== sum) {
    return `Total Days in Month (${total}) must equal Days Present + CL + Academic Leave + Special Leave + Absent (these currently add up to ${sum}).`;
  }
  return null;
}

module.exports = { validateDayTotals };
