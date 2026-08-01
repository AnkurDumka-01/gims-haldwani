const PDFDocument = require('pdfkit');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDDMMYY(date) {
  if (!date) return '-';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

const COLUMNS = [
  { label: 'Sl.\nNo.', width: 20, align: 'center' },
  { label: 'Name', width: 75, align: 'left' },
  { label: 'Department', width: 63, align: 'left' },
  { label: 'DOJ', width: 45, align: 'center' },
  { label: 'Account\nNumber', width: 75, align: 'center' },
  { label: 'No of\nDays', width: 40, align: 'center' },
  { label: 'Amount\n(Rs)', width: 55, align: 'center' },
  { label: 'Total\nStipend', width: 55, align: 'center' },
  { label: 'Income Tax\n@10%', width: 55, align: 'center' },
  { label: 'Net\nPayable', width: 55, align: 'center' },
];
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const LEFT = 30;

function drawRow(doc, y, values, { bold = false, minHeight = 22 } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
  const heights = COLUMNS.map((col, i) => doc.heightOfString(String(values[i] ?? ''), { width: col.width - 6 }));
  const rowHeight = Math.max(minHeight, ...heights.map((h) => h + 8));

  let x = LEFT;
  COLUMNS.forEach((col, i) => {
    doc.rect(x, y, col.width, rowHeight).stroke();
    doc.text(String(values[i] ?? ''), x + 3, y + 4, { width: col.width - 6, align: col.align });
    x += col.width;
  });
  return rowHeight;
}

function generateBatchStipendReportPdf(report, res) {
  const { batch, month, year, trainingYear, students, grandTotal, amountInWords } = report;
  const doc = new PDFDocument({ size: 'A4', margin: LEFT });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=batch_stipend_${batch}_${month}_${year}.pdf`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GOVERNMENT MEDICAL COLLEGE ,HALDWANI', { align: 'center' });
  doc.fontSize(12).text(`STIPEND FOR ${ordinal(trainingYear).toUpperCase()} YEAR  (MD/MS) STUDENT'S (BATCH-${batch})`, { align: 'center' });
  doc.text(`FOR THE MONTH OF ${MONTH_NAMES[month - 1].toUpperCase()}-${year}`, { align: 'center' });
  doc.moveDown(1);

  let y = doc.y;

  // Merged month-year header spanning the "No of Days" / "Amount (Rs)" columns.
  const daysColX = LEFT + COLUMNS.slice(0, 5).reduce((s, c) => s + c.width, 0);
  const monthSpanWidth = COLUMNS[5].width + COLUMNS[6].width;
  doc.rect(daysColX, y, monthSpanWidth, 16).stroke();
  doc.font('Helvetica-Bold').fontSize(8).text(`${MONTH_NAMES[month - 1].slice(0, 4).toUpperCase()}-${year}`, daysColX, y + 4, { width: monthSpanWidth, align: 'center' });
  y += 16;

  y += drawRow(doc, y, COLUMNS.map((c) => c.label), { bold: true });

  students.forEach((s, i) => {
    if (y > 700) {
      doc.addPage();
      y = LEFT;
    }
    y += drawRow(doc, y, [
      i + 1, s.name, s.subject_name, formatDDMMYY(s.date_of_joining), s.account_number || '-',
      s.days_payable, s.amount.toFixed(2), s.amount.toFixed(2), s.incomeTax.toFixed(2), s.netPayable.toFixed(2),
    ]);
    doc.font('Helvetica').fontSize(8).text(`Stipend @Rs. ${s.rate}/- Per Month`, LEFT, y + 2);
    y = doc.y + 4;
  });

  y += drawRow(
    doc, y,
    ['', '', '', '', 'Total Amount (Rs)', '', grandTotal.amount.toFixed(2), grandTotal.totalStipend.toFixed(2), grandTotal.incomeTax.toFixed(2), grandTotal.netPayable.toFixed(2)],
    { bold: true }
  );

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(10).text(
    `Pass for Rs. ${grandTotal.totalStipend.toFixed(2)}/- (Rs. ${amountInWords} ONLY)`,
    LEFT, doc.y, { width: TABLE_WIDTH }
  );

  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(10);
  const sigY = doc.y;
  doc.text('PG CELL', LEFT, sigY);
  doc.text('Principal', LEFT, sigY, { width: TABLE_WIDTH, align: 'right' });
  doc.text('Government Medical College', LEFT, doc.y, { width: TABLE_WIDTH, align: 'right' });
  doc.text('Haldwani', LEFT, doc.y, { width: TABLE_WIDTH, align: 'right' });

  doc.end();
}

module.exports = generateBatchStipendReportPdf;
