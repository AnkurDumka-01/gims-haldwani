const PDFDocument = require('pdfkit');

function formatDateMMDDYYYY(date) {
  if (!date) return '-';
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

const COLUMNS = [
  { key: 'label', label: 'Year', width: 70 },
  { key: 'cl_days', label: 'CL', width: 60 },
  { key: 'absent_days', label: 'Absent', width: 65 },
  { key: 'special_leave_days', label: 'Special Leave\n(Mat/Pat)', width: 95 },
  { key: 'academic_leave_days', label: 'Academic\nLeave', width: 95 },
  { key: 'days_present', label: 'Total Days\nPresent', width: 110 },
];
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const ROW_HEIGHT = 30;
const LEFT = 50;

function drawRow(doc, y, values, { bold = false, fill = null } = {}) {
  let x = LEFT;
  if (fill) {
    doc.rect(LEFT, y, TABLE_WIDTH, ROW_HEIGHT).fill(fill);
    doc.fillColor('black');
  }
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
  COLUMNS.forEach((col, i) => {
    doc.rect(x, y, col.width, ROW_HEIGHT).stroke();
    doc.text(String(values[i] ?? ''), x + 4, y + 8, { width: col.width - 8, align: i === 0 ? 'left' : 'center' });
    x += col.width;
  });
}

function generateAnnualReportPdf(summary, res) {
  const { student, years, grandTotal, examEligible, examEligibilityThreshold } = summary;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=leave_register_${student.roll_number}.pdf`
  );
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GMC, HALDWANI', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('PG Student Leave Register', { align: 'center' });
  doc.moveDown(1.2);

  const row = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(11).text(label, 50, doc.y, { continued: true, width: 180 });
    doc.font('Helvetica').text(value ?? '-');
    doc.moveDown(0.3);
  };

  // Two fields sharing a line: label/value, spacing, label/value.
  const rowPair = (label1, value1, label2, value2) => {
    doc.font('Helvetica-Bold').fontSize(11).text(label1, 50, doc.y, { continued: true });
    doc.font('Helvetica').text(`${value1 ?? '-'}     `, { continued: true });
    doc.font('Helvetica-Bold').text(label2, { continued: true });
    doc.font('Helvetica').text(String(value2 ?? '-'));
    doc.moveDown(0.3);
  };

  rowPair('Student Name:', student.name, "Father's Name:", student.father_name);
  row('Subject Name:', student.subject_name);
  row('Batch:', student.batch);
  rowPair('Date of Admission:', formatDateMMDDYYYY(student.date_of_admission), 'Date of Joining:', formatDateMMDDYYYY(student.date_of_joining));
  doc.moveDown(0.8);

  let y = doc.y;
  drawRow(doc, y, COLUMNS.map((c) => c.label), { bold: true, fill: '#f0f0f0' });
  y += ROW_HEIGHT;

  years.forEach((yr) => {
    drawRow(doc, y, [`Year ${yr.year}`, yr.cl_days, yr.absent_days, yr.special_leave_days, yr.academic_leave_days, yr.days_present]);
    y += ROW_HEIGHT;
  });

  drawRow(
    doc, y,
    ['Grand Total', grandTotal.cl_days, grandTotal.absent_days, grandTotal.special_leave_days, grandTotal.academic_leave_days, grandTotal.days_present],
    { bold: true, fill: '#fdf3d7' }
  );
  y += ROW_HEIGHT;

  // Drawn as two independently-positioned text runs rather than pdfkit's `continued: true`
  // flow -- continued text estimates where the second run starts from the first run's
  // measured width, and that estimate was landing short (partly because "≥", which standard
  // Helvetica/WinAnsi can't render, was throwing the measurement off), so "NOT ELIGIBLE" was
  // overlapping the label instead of sitting after it. Measuring the label's actual rendered
  // width with doc.widthOfString and placing the badge explicitly to the right of it removes
  // the guesswork entirely -- it can never overlap regardless of label length.
  doc.y = y + 20;
  const eligibilityLabel = `Exam Eligibility (>=80% attendance, i.e. >= ${examEligibilityThreshold} days present): `;
  doc.font('Helvetica-Bold').fontSize(11);
  const eligibilityLabelWidth = doc.widthOfString(eligibilityLabel);
  const eligibilityY = doc.y;
  doc.text(eligibilityLabel, 50, eligibilityY, { lineBreak: false });
  doc.fillColor(examEligible ? 'green' : 'red')
    .text(examEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE', 50 + eligibilityLabelWidth + 6, eligibilityY, { lineBreak: false });
  doc.fillColor('black');
  doc.y = eligibilityY + 20;

  doc.moveDown(2);
  doc.fontSize(9).font('Helvetica-Oblique').text(
    'Only approved monthly attendance submissions are reflected in this summary. This is a system-generated document.',
    50, doc.y, { width: TABLE_WIDTH, align: 'center' }
  );

  doc.end();
}

module.exports = generateAnnualReportPdf;
