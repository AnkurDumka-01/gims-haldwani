const PDFDocument = require('pdfkit');

const MONTH_ABBR = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

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
  { label: 'Sl.\nNo.', width: 24, align: 'center' },
  { label: 'Name', width: 100, align: 'left' },
  { label: 'Department', width: 85, align: 'left' },
  { label: 'DOJ', width: 48, align: 'center' },
  { label: 'Account\nNumber', width: 95, align: 'center' },
  { label: 'Total\nStipend', width: 65, align: 'center' },
  { label: 'Income Tax\n@10%', width: 62, align: 'center' },
  { label: 'Net\nPayable', width: 62, align: 'center' },
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

function generateIndividualStipendReportPdf(report, res) {
  const { student, monthlyBreakdown, totalStipend, incomeTax, netPayable, rate, trainingYear, amountInWords } = report;
  const doc = new PDFDocument({ size: 'A4', margin: LEFT });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=individual_stipend_${student.roll_number}.pdf`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GOVERNMENT MEDICAL COLLEGE ,HALDWANI', { align: 'center' });
  doc.fontSize(12).text(`STIPEND FOR ${ordinal(trainingYear).toUpperCase()} YEAR  (MD/MS) STUDENT'S (BATCH-${student.batch || '-'})`, { align: 'center' });

  const first = monthlyBreakdown[0];
  const last = monthlyBreakdown[monthlyBreakdown.length - 1];
  const fromLabel = first ? `${MONTH_ABBR[first.month - 1].toUpperCase()}-${String(first.year).slice(-2)}` : '-';
  const toLabel = last ? `${MONTH_ABBR[last.month - 1].toUpperCase()}-${String(last.year).slice(-2)}` : '-';
  doc.text(`FOR THE MONTH OF ${fromLabel} TO ${toLabel}`, { align: 'center' });
  doc.moveDown(1);

  let y = doc.y;
  y += drawRow(doc, y, COLUMNS.map((c) => c.label), { bold: true });

  y += drawRow(doc, y, [
    1, student.name, student.subject_name, formatDDMMYY(student.date_of_joining),
    student.account_number || '-', totalStipend.toFixed(2), incomeTax.toFixed(2), netPayable.toFixed(2),
  ]);

  doc.font('Helvetica').fontSize(9).text(`Stipend @Rs. ${rate}/- Per Month`, LEFT, y + 4);
  y = doc.y + 4;

  monthlyBreakdown.forEach((m) => {
    if (y > 740) {
      doc.addPage();
      y = LEFT;
    }
    doc.text(`${MONTH_ABBR[m.month - 1]}-${String(m.year).slice(-2)}  Rs. ${rate}/- (${m.days_payable} DAYS)`, LEFT, y);
    y = doc.y + 2;
  });

  y += 6;
  y += drawRow(doc, y, ['', 'Total Amount (Rs)', '', '', '', totalStipend.toFixed(2), incomeTax.toFixed(2), netPayable.toFixed(2)], { bold: true });

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(10).text(
    `Pass for Rs. ${totalStipend.toFixed(2)}/- (Rs. ${amountInWords} ONLY)`,
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

module.exports = generateIndividualStipendReportPdf;
