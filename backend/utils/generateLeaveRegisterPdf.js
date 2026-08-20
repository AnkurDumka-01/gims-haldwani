const PDFDocument = require('pdfkit');
const { DRP_DISCLAIMER } = require('./leaveRules');

// Matches the institution's own "LEAVE REGISTER" paper form: one row per student, a
// "1st Year Total" column-group (that student's own Year 1 attendance, from date of
// joining) next to a "Total" column-group (their cumulative Grand Total to date) --
// deliberately two fixed groups regardless of how many training years a batch spans,
// mirroring the paper form exactly rather than growing a column per year.

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function fmtPct(value) {
  return value === null || value === undefined ? '-' : `${value.toFixed(2)}%`;
}

// Base (non-grouped) columns, each spanning both header rows.
const BASE_COLUMNS = [
  { key: 'sl', label: 'S.\nNo.', width: 22, align: 'center' },
  { key: 'name', label: 'Name of\nStudent', width: 105, align: 'left' },
  { key: 'father_name', label: "Father's\nName", width: 90, align: 'left' },
  { key: 'date_of_admission', label: 'Date of\nAdmission', width: 52, align: 'center' },
  { key: 'date_of_joining', label: 'Date of\nJoining', width: 52, align: 'center' },
];
// Repeated for both the "1st Year Total" and "Total" groups.
const GROUP_SUBCOLUMNS = [
  { key: 'days_present', label: 'Total Days\nPresent', width: 40, align: 'center' },
  { key: 'cl_days', label: 'Total\nCL', width: 30, align: 'center' },
  { key: 'absent_days', label: 'Total\nAbsent', width: 34, align: 'center' },
  { key: 'special_leave_days', label: 'Total Spl.\nLeaves', width: 36, align: 'center' },
  { key: 'academic_leave_days', label: 'Total\nAcademic', width: 38, align: 'center' },
  { key: 'percentage', label: 'Total %\nof Attend.', width: 40, align: 'center' },
];
const REMARKS_COLUMN = { key: 'remarks', label: 'Remarks', width: 60, align: 'left' };

const GROUP_WIDTH = GROUP_SUBCOLUMNS.reduce((s, c) => s + c.width, 0);
const TABLE_WIDTH =
  BASE_COLUMNS.reduce((s, c) => s + c.width, 0) + GROUP_WIDTH * 2 + REMARKS_COLUMN.width;
const LEFT = 36;
const HEADER_ROW_HEIGHT = 28;
// Tall enough for a two-line wrapped name/father's-name at 8pt without spilling past the
// row's bottom border -- most rows only use one line, but long names need the room.
const BODY_ROW_HEIGHT = 30;

function zeroBucket() {
  return { days_present: 0, cl_days: 0, absent_days: 0, special_leave_days: 0, academic_leave_days: 0, percentage: null, drpPeriods: [] };
}

function drawHeader(doc, y) {
  let x = LEFT;
  const groupLabels = ['1st Year Total', 'Total'];

  // Group title row (base + remarks columns stay blank here -- they're merged downward
  // into the sub-header row below via a single tall rect drawn in the second pass).
  doc.font('Helvetica-Bold').fontSize(8);
  BASE_COLUMNS.forEach((col) => {
    doc.rect(x, y, col.width, HEADER_ROW_HEIGHT * 2).stroke();
    x += col.width;
  });
  groupLabels.forEach((label) => {
    doc.rect(x, y, GROUP_WIDTH, HEADER_ROW_HEIGHT).fillAndStroke('#f0f0f0', 'black');
    doc.fillColor('black').text(label, x, y + 8, { width: GROUP_WIDTH, align: 'center' });
    x += GROUP_WIDTH;
  });
  doc.rect(x, y, REMARKS_COLUMN.width, HEADER_ROW_HEIGHT * 2).stroke();

  // Base + remarks column labels, vertically centered across the merged two-row height.
  x = LEFT;
  doc.fontSize(7.5);
  BASE_COLUMNS.forEach((col) => {
    doc.text(col.label, x + 2, y + 10, { width: col.width - 4, align: col.align });
    x += col.width;
  });

  // Sub-header row for both groups.
  const subY = y + HEADER_ROW_HEIGHT;
  [0, 1].forEach(() => {
    GROUP_SUBCOLUMNS.forEach((col) => {
      doc.rect(x, subY, col.width, HEADER_ROW_HEIGHT).stroke();
      doc.text(col.label, x + 1, subY + 4, { width: col.width - 2, align: 'center' });
      x += col.width;
    });
  });
  doc.text(REMARKS_COLUMN.label, LEFT + TABLE_WIDTH - REMARKS_COLUMN.width + 2, y + 10, {
    width: REMARKS_COLUMN.width - 4,
    align: REMARKS_COLUMN.align,
  });

  return y + HEADER_ROW_HEIGHT * 2;
}

function drawRow(doc, y, row, sl) {
  let x = LEFT;
  doc.font('Helvetica').fontSize(8);
  const base = [
    sl,
    row.student.name,
    row.student.father_name || '-',
    formatDate(row.student.date_of_admission),
    formatDate(row.student.date_of_joining),
  ];
  BASE_COLUMNS.forEach((col, i) => {
    doc.rect(x, y, col.width, BODY_ROW_HEIGHT).stroke();
    doc.text(String(base[i] ?? '-'), x + 2, y + 6, { width: col.width - 4, align: col.align });
    x += col.width;
  });

  [row.yearOne, row.grandTotal].forEach((bucket) => {
    const values = [
      bucket.days_present,
      bucket.cl_days,
      bucket.absent_days,
      bucket.special_leave_days,
      bucket.academic_leave_days,
      fmtPct(bucket.percentage),
    ];
    GROUP_SUBCOLUMNS.forEach((col, i) => {
      doc.rect(x, y, col.width, BODY_ROW_HEIGHT).stroke();
      doc.text(String(values[i] ?? '-'), x + 1, y + 10, { width: col.width - 2, align: 'center' });
      x += col.width;
    });
  });

  doc.rect(x, y, REMARKS_COLUMN.width, BODY_ROW_HEIGHT).stroke();
  if (row.grandTotal.drpPeriods.length > 0) {
    doc.fillColor('red').fontSize(7).text('DRP*', x + 2, y + 6, { width: REMARKS_COLUMN.width - 4, align: REMARKS_COLUMN.align });
    doc.fillColor('black');
  }
}

function generateLeaveRegisterPdf({ department, batch, academicSession, dateApproved, hasDrp, rows }, res) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: LEFT });

  const filenamePart = rows.length === 1 ? rows[0].student.roll_number : (batch || department || 'register');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=leave_register_${filenamePart}.pdf`.replace(/\s+/g, '_'));
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('LEAVE REGISTER', { align: 'center' });
  doc.moveDown(0.6);

  const field = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(10).text(label, LEFT, doc.y, { continued: true });
    doc.font('Helvetica').text(` ${value || '................................................'}`);
    doc.moveDown(0.2);
  };
  field('Department of:', department);
  field('Attendance Details [Leave Register] of Batch:', batch);
  field('Academic Session:', academicSession);
  field('Date Approved:', dateApproved);
  doc.moveDown(0.6);

  let y = doc.y;
  y = drawHeader(doc, y);

  if (rows.length === 0) {
    doc.rect(LEFT, y, TABLE_WIDTH, BODY_ROW_HEIGHT).stroke();
    doc.font('Helvetica').fontSize(9).text('No students found for this selection.', LEFT + 4, y + 6);
    y += BODY_ROW_HEIGHT;
  } else {
    rows.forEach((row, i) => {
      if (y > 520) {
        doc.addPage();
        y = LEFT;
        y = drawHeader(doc, y);
      }
      drawRow(doc, y, row, i + 1);
      y += BODY_ROW_HEIGHT;
    });
  }

  doc.y = y + 16;
  doc.font('Helvetica-Bold').fontSize(9).text('Calculation of Attendance', LEFT, doc.y);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(8).text(
    'Total % of Attendance = (Total Days Present ÷ Total Attendance/Working Days from Date of Joining) × 100',
    LEFT, doc.y, { width: TABLE_WIDTH }
  );
  doc.moveDown(0.2);
  doc.font('Helvetica-Oblique').fontSize(8).text(
    'The attendance percentage shall be calculated from the individual Date of Joining of each student. Only approved monthly attendance submissions are reflected. This is a system-generated document.',
    LEFT, doc.y, { width: TABLE_WIDTH }
  );
  if (hasDrp) {
    doc.moveDown(0.3);
    doc.fillColor('red').text(`* DRP: ${DRP_DISCLAIMER}`, LEFT, doc.y, { width: TABLE_WIDTH });
    doc.fillColor('black');
  }
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(9).text('Certification', LEFT, doc.y);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9).text(
    'Certified that the above attendance/leave details have been verified from the relevant attendance and leave records.',
    LEFT, doc.y, { width: TABLE_WIDTH }
  );
  doc.moveDown(1.2);
  doc.text('In-charge/HOD: ..................................................', LEFT, doc.y);
  doc.moveDown(0.6);
  doc.text('Date: ...............................................................', LEFT, doc.y);
  doc.moveDown(0.6);
  doc.text('Official Seal: ........................................................', LEFT, doc.y);

  doc.end();
}

module.exports = { generateLeaveRegisterPdf, zeroBucket };
