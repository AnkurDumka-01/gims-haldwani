// GIMS-wide report ordering: "a single department should be represented with all students
// as per their batch followed by alphabetical name" -- department, then batch within that
// department, then alphabetical name within that batch. One shared implementation so every
// report (Attendance Threshold, Leave Register, Department Monthly, Batch Stipend, ...)
// applies exactly the same rule instead of each re-implementing its own comparator.
// department/batch/name may be a plain key (for flat rows, e.g. Attendance Threshold's
// student objects) or an accessor function (for nested rows, e.g. Leave Register's
// { student: { subject_name, batch, name } }).
function fieldGetter(spec) {
  return typeof spec === 'function' ? spec : (item) => item[spec];
}

function sortByDepartmentBatchName(items, { department = 'subject_name', batch = 'batch', name = 'name' } = {}) {
  const getDept = fieldGetter(department);
  const getBatch = fieldGetter(batch);
  const getName = fieldGetter(name);
  return [...items].sort((a, b) => {
    const deptCmp = String(getDept(a) || '').localeCompare(String(getDept(b) || ''), undefined, { sensitivity: 'base' });
    if (deptCmp !== 0) return deptCmp;
    const batchCmp = String(getBatch(a) || '').localeCompare(String(getBatch(b) || ''), undefined, { numeric: true, sensitivity: 'base' });
    if (batchCmp !== 0) return batchCmp;
    return String(getName(a) || '').localeCompare(String(getName(b) || ''), undefined, { sensitivity: 'base' });
  });
}

module.exports = { sortByDepartmentBatchName };
