// Leave rules per GMC Haldwani leave format. Caps are soft (warnings only), never block submission/approval.
module.exports = {
  CL_ANNUAL_CAP: 20,
  ACADEMIC_LEAVE_ANNUAL_CAP: 5,
  SPECIAL_LEAVE_TOTAL_CAP: 180,
  EXAM_ELIGIBILITY_PRESENT_DAYS: 751, // ~80% of a 3-year PG program (measured on working days, not calendar days)

  // Full JR (Junior Resident) fellowship tenure: a student must accumulate 365 x 3 = 1095
  // days to complete it. This is a calendar-day total, distinct from
  // EXAM_ELIGIBILITY_PRESENT_DAYS above (which is measured against ~80% of working days,
  // not full calendar days) -- the two are separate thresholds for separate purposes.
  // Days present count toward this total, and so does CL and Academic Leave -- but only up
  // to these tenure-wide caps (entitled leave is normal service, not time away from it).
  // Special Leave, Absent days, and any CL/AL taken beyond its cap do NOT count, so taking
  // those pushes the tenure's completion date back by exactly that many days.
  TENURE_REQUIRED_DAYS: 365 * 3, // 1095
  CL_TENURE_CAP: 60,             // 20/year x 3 years
  ACADEMIC_LEAVE_TENURE_CAP: 15, // 5/year x 3 years

  // Printed on every report that includes a DRP (District Residency Programme)-flagged
  // record -- see migrations/0007_add_drp_fields.sql for why.
  DRP_DISCLAIMER: 'Subject to verification of working days and absent from DRP completion certificate issued by competent authority.',
};
