const PDFDocument = require('pdfkit');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Column widths must sum to <= the usable page width (A4 is 595pt wide; with the 50pt
// margins used below that leaves ~495pt) -- the first version of this table didn't respect
// that and ran the last column off the edge of the page.
const COLUMNS = [
  { key: 'sl', label: 'Sl.\nNo.', width: 25, align: 'center' },
  { key: 'name', label: 'Name', width: 110, align: 'left' },
  { key: 'roll_number', label: 'Roll No.', width: 85, align: 'left' },
  { key: 'subject_name', label: 'Subject', width: 85, align: 'left' },
  { key: 'batch', label: 'Batch', width: 45, align: 'center' },
  { key: 'days_present', label: 'Days\nPresent', width: 45, align: 'center' },
  { key: 'total_working_days', label: 'Total\nDays', width: 45, align: 'center' },
  { key: 'percentage', label: 'Attendance\n%', width: 55, align: 'center' },
];
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const LEFT = 50;

function drawRow(doc, y, values, { bold = false } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
  const heights = COLUMNS.map((col, i) => doc.heightOfString(String(values[i] ?? ''), { width: col.width - 8 }));
  const rowHeight = Math.max(24, ...heights.map((h) => h + 10));
  let x = LEFT;
  COLUMNS.forEach((col, i) => {
    doc.rect(x, y, col.width, rowHeight).stroke();
    doc.text(String(values[i] ?? ''), x + 4, y + 5, { width: col.width - 8, align: col.align });
    x += col.width;
  });
  return rowHeight;
}

function generateAttendanceThresholdReportPdf({ minPercent, students, period }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: LEFT });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_threshold_${minPercent}pct.pdf`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GMC, HALDWANI', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Students with Attendance >= ${minPercent}%`, { align: 'center' });
  if (period?.batch) {
    doc.fontSize(10).text(`Batch: ${period.batch}`, { align: 'center' });
  }
  if (period?.fromMonth && period?.fromYear && period?.toMonth && period?.toYear) {
    doc.fontSize(10).text(
      `Period: ${MONTH_NAMES[period.fromMonth - 1]} ${period.fromYear} to ${MONTH_NAMES[period.toMonth - 1]} ${period.toYear}`,
      { align: 'center' }
    );
  }
  doc.moveDown(1);

  let y = doc.y;
  y += drawRow(doc, y, COLUMNS.map((c) => c.label), { bold: true });

  if (students.length === 0) {
    y += drawRow(doc, y, ['-', 'No students meet this attendance criteria', '-', '-', '-', '-', '-', '-']);
  } else {
    students.forEach((s, i) => {
      if (y > 740) {
        doc.addPage();
        y = LEFT;
      }
      y += drawRow(doc, y, [
        i + 1, s.name, s.roll_number, s.subject_name, s.batch || '-',
        s.days_present, s.total_working_days, `${s.percentage.toFixed(2)}%`,
      ]);
    });
  }

  doc.y = y + 20;
  doc.font('Helvetica').fontSize(9).fillColor('gray').text(
    `Total students meeting criteria: ${students.length}. Only approved monthly attendance submissions are reflected. This is a system-generated document.`,
    LEFT, doc.y, { width: TABLE_WIDTH, align: 'center' }
  );
  doc.fillColor('black');

  doc.end();
}

module.exports = generateAttendanceThresholdReportPdf;
