// Bulk Excel import for PG students -- admin downloads a template (matching exactly what
// createStudent in adminController.js accepts), fills it in, uploads it back. Each row is
// validated and inserted independently so one bad row doesn't sink the whole batch; the
// response reports per-row success/failure the same way a human would want to review it.
const asyncHandler = require('express-async-handler');
const ExcelJS = require('exceljs');
const pool = require('../db');
const { logAction } = require('../utils/auditLog');
const { DEPARTMENTS } = require('../constants/departments');

const TEMPLATE_COLUMNS = [
  { header: 'Name', key: 'name', width: 24, required: true },
  { header: "Father's Name", key: 'father_name', width: 24 },
  { header: 'Roll Number', key: 'roll_number', width: 18, required: true },
  { header: 'Subject Name (Department)', key: 'subject_name', width: 26, required: true },
  { header: 'Batch', key: 'batch', width: 12 },
  { header: 'Date of Admission (DD/MM/YYYY)', key: 'date_of_admission', width: 24 },
  { header: 'Date of Joining / Dept. Reporting (DD/MM/YYYY)', key: 'date_of_joining', width: 30 },
  { header: 'Professor Name (optional, must already exist)', key: 'professor_name', width: 30 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Mobile No.', key: 'phone', width: 16 },
  { header: 'Bank Account No.', key: 'account_number', width: 22 },
  { header: 'Monthly Stipend (Rs.)', key: 'monthly_stipend_rate', width: 18 },
  { header: 'Service End Date (DD/MM/YYYY, optional)', key: 'service_end_date', width: 26 },
];

const downloadTemplate = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GIMS Haldwani Portal';

  const sheet = workbook.addWorksheet('Students');
  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    name: 'Shiv Shankar Dhanuki', father_name: 'Kiran Dhanuki', roll_number: '24661042922',
    subject_name: 'Anatomy', batch: '2024', date_of_admission: '30/01/2025', date_of_joining: '30/01/2025',
    professor_name: '', email: 'sdhanuki36@gmail.com', phone: '8076669237',
    account_number: '50100662715815', monthly_stipend_rate: '69800', service_end_date: '',
  });
  sheet.getRow(2).font = { italic: true, color: { argb: 'FF888888' } };

  const deptSheet = workbook.addWorksheet('Valid Departments');
  deptSheet.columns = [{ header: 'Subject Name (Department)', key: 'd', width: 34 }];
  deptSheet.getRow(1).font = { bold: true };
  DEPARTMENTS.forEach((d) => deptSheet.addRow({ d }));

  const infoSheet = workbook.addWorksheet('Instructions');
  infoSheet.columns = [{ key: 'text', width: 100 }];
  [
    'Fill in the "Students" sheet -- row 1 is the header (do not change it), row 2 is an example (delete or overwrite it).',
    'Required columns: Name, Roll Number, Subject Name. Every other column is optional.',
    'Subject Name must exactly match one of the values on the "Valid Departments" sheet.',
    'Dates may be entered as DD/MM/YYYY, DD/MM/YY, or as real Excel date cells.',
    'Professor Name (if given) must exactly match an existing professor\'s name in this system, or the row will still be created but left unassigned.',
    'Roll Number must be unique -- a row whose roll number already exists will be rejected (reported in the results), not overwritten.',
    'Save as .xlsx and upload it back via Import Students > Upload.',
  ].forEach((text) => infoSheet.addRow({ text }));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="gims-student-import-template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

// Accepts DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, or an Excel Date object. Where day/month can't
// be disambiguated (both <=12), DD/MM is assumed -- matches this institution's convention
// (see the source spreadsheets this feature was built to import).
function parseFlexibleDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, a, b, y] = m;
  a = parseInt(a, 10); b = parseInt(b, 10);
  let year = parseInt(y, 10);
  if (y.length === 2) year += year < 70 ? 2000 : 1900;
  let day, month;
  if (a > 12 && b <= 12) { day = a; month = b; }
  else if (b > 12 && a <= 12) { day = b; month = a; }
  else { day = a; month = b; }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function cellText(cell) {
  if (cell == null) return '';
  if (typeof cell === 'object' && cell.text != null) return String(cell.text).trim(); // rich text
  if (typeof cell === 'object' && cell.result != null) return String(cell.result).trim(); // formula
  return String(cell).trim();
}

const importStudents = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded. Attach an .xlsx file as "file".' });

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ message: 'Could not read that file -- is it a valid .xlsx workbook?' });
  }

  const sheet = workbook.getWorksheet('Students') || workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: 'No worksheet found in the uploaded file.' });

  // Map header text -> column index, tolerant of the exact template wording changing slightly.
  const headerRow = sheet.getRow(1);
  const colIndex = {};
  const HEADER_ALIASES = {
    name: ['name'], father_name: ["father's name", 'father name', "father'sname"],
    roll_number: ['roll number', 'roll no', 'roll no.'],
    subject_name: ['subject name (department)', 'subject name', 'department'],
    batch: ['batch'],
    date_of_admission: ['date of admission (dd/mm/yyyy)', 'date of admission'],
    date_of_joining: ['date of joining / dept. reporting (dd/mm/yyyy)', 'date of joining', 'department reporting date', 'reporting date'],
    professor_name: ['professor name (optional, must already exist)', 'professor name', 'professor'],
    email: ['email', 'email id'],
    phone: ['mobile no.', 'mobile no', 'phone', 'mobile'],
    account_number: ['bank account no.', 'bank account no', 'account number'],
    monthly_stipend_rate: ['monthly stipend (rs.)', 'monthly stipend', 'stipend'],
    service_end_date: ['service end date (dd/mm/yyyy, optional)', 'service end date'],
  };
  headerRow.eachCell((cell, i) => {
    const norm = cellText(cell.value).toLowerCase();
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) colIndex[key] = i;
    }
  });
  if (!colIndex.name || !colIndex.roll_number || !colIndex.subject_name) {
    return res.status(400).json({ message: 'The header row must include at least Name, Roll Number and Subject Name columns.' });
  }

  const professorsRes = await pool.query(`SELECT id, name FROM users WHERE role = 'professor'`);
  const professorsByName = new Map(professorsRes.rows.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const departmentsLower = new Map(DEPARTMENTS.map((d) => [d.toLowerCase(), d]));

  const results = [];
  let created = 0;

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    if (row.cellCount === 0 || row.values.every((v) => v == null || v === '')) continue; // blank row

    const get = (key) => (colIndex[key] ? cellText(row.getCell(colIndex[key]).value) : '');
    const name = get('name');
    const roll_number = get('roll_number');
    const subjectRaw = get('subject_name');

    if (!name || !roll_number || !subjectRaw) {
      results.push({ row: rowNum, name: name || '(blank)', status: 'error', message: 'Name, Roll Number and Subject Name are all required.' });
      continue;
    }
    const subject_name = departmentsLower.get(subjectRaw.toLowerCase());
    if (!subject_name) {
      results.push({ row: rowNum, name, status: 'error', message: `"${subjectRaw}" is not a recognised department (see the Valid Departments sheet).` });
      continue;
    }

    let professor_id = null;
    let professorWarning = null;
    const profName = get('professor_name');
    if (profName) {
      professor_id = professorsByName.get(profName.trim().toLowerCase()) || null;
      if (!professor_id) professorWarning = `Professor "${profName}" not found -- left unassigned.`;
    }

    const date_of_admission = parseFlexibleDate(get('date_of_admission'));
    const date_of_joining = parseFlexibleDate(get('date_of_joining'));
    const service_end_date = parseFlexibleDate(get('service_end_date'));
    const stipendRaw = get('monthly_stipend_rate');
    const monthly_stipend_rate = stipendRaw ? Number(stipendRaw.replace(/[^0-9.]/g, '')) : null;

    try {
      const inserted = await pool.query(
        `INSERT INTO pg_students
          (name, father_name, roll_number, subject_name, batch, professor_id, phone, email,
           date_of_admission, date_of_joining, account_number, monthly_stipend_rate, service_end_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          name, get('father_name') || null, roll_number, subject_name, get('batch') || null, professor_id,
          get('phone') || null, get('email') || null, date_of_admission, date_of_joining,
          get('account_number') || null, Number.isFinite(monthly_stipend_rate) ? monthly_stipend_rate : null,
          service_end_date, req.user.id,
        ]
      );
      created += 1;
      const studentId = inserted.rows[0].id;
      // audit_log.entity_id is NOT NULL -- one row per created student (matching every other
      // logAction call in this codebase), not a single summary row with no real entity.
      await logAction(req.user.id, 'bulk_import_student', 'pg_student', studentId, { roll_number, source_row: rowNum });
      results.push({ row: rowNum, name, status: 'created', message: professorWarning || 'OK', studentId });
    } catch (err) {
      if (err.code === '23505') {
        results.push({ row: rowNum, name, status: 'error', message: `Roll number "${roll_number}" already exists -- skipped.` });
      } else {
        results.push({ row: rowNum, name, status: 'error', message: 'Unexpected database error on this row.' });
      }
    }
  }

  res.json({ total: results.length, created, errors: results.length - created, results });
});

module.exports = { downloadTemplate, importStudents };
