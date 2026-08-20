// Shared DRP (District Residency Programme) field validation, used by the professor's
// submit endpoint and the HoD's/admin's edit endpoints alike -- same rule everywhere:
// checking DRP requires both dates; unchecked, the normal attendance flow is untouched.
function validateDrpFields({ is_drp, drp_from_date, drp_to_date }) {
  if (!is_drp) return null;
  if (!drp_from_date || !drp_to_date) {
    return 'DRP From Date and To Date are both required when DRP is checked.';
  }
  if (new Date(drp_to_date) < new Date(drp_from_date)) {
    return 'DRP To Date cannot be before DRP From Date.';
  }
  return null;
}

// Normalizes the DRP date pair down to null/null whenever is_drp is falsy, so a stray
// leftover from_date/to_date in the request body can never get stored against a
// non-DRP record.
function normalizeDrpFields({ is_drp, drp_from_date, drp_to_date }) {
  return {
    is_drp: !!is_drp,
    drp_from_date: is_drp ? drp_from_date : null,
    drp_to_date: is_drp ? drp_to_date : null,
  };
}

module.exports = { validateDrpFields, normalizeDrpFields };
