const PDFDocument = require('pdfkit');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const COLUMNS = [
  { label: 'S.No.', width: 30, align: 'center' },
  { label: 'Name of Doctors', width: 150, align: 'left' },
  { label: 'Batch', width: 40, align: 'center' },
  { label: 'Post', width: 45, align: 'center' },
  { label: 'CL', width: 35, align: 'center' },
  { label: 'Absent', width: 45, align: 'center' },
  { label: 'Total Present Days', width: 95, align: 'center' },
  { label: 'Remarks', width: 55, align: 'left' },
];
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const LEFT = 50;

function drawRow(doc, y, values, { bold = false, minHeight = 24 } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);

  const heights = COLUMNS.map((col, i) =>
    doc.heightOfString(String(values[i] ?? ''), { width: col.width - 8 })
  );
  const rowHeight = Math.max(minHeight, ...heights.map((h) => h + 10));

  let x = LEFT;
  COLUMNS.forEach((col, i) => {
    doc.rect(x, y, col.width, rowHeight).stroke();
    doc.text(String(values[i] ?? ''), x + 4, y + 5, { width: col.width - 8, align: col.align });
    x += col.width;
  });
  return rowHeight;
}

function generateDepartmentMonthlyReportPdf(report, res) {
  const { subject_name, month, year, hod_name, records } = report;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=monthly_report_${subject_name.replace(/\s+/g, '_')}_${month}_${year}.pdf`
  );
  doc.pipe(res);

  doc.fontSize(14).font('Helvetica-Bold').text('DEPARTMENT OF ' + subject_name.toUpperCase(), { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(
    'GOVERNMENT MEDICAL COLLEGE & ASSOCIATED DR. SUSHEELA TIWARI GOVERNMENT HOSPITAL, HALDWANI - NAINITAL (UTTARAKHAND)',
    { align: 'center' }
  );
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(50 + TABLE_WIDTH, doc.y).stroke();
  doc.moveDown(1);

  const today = new Date();
  doc.fontSize(10).text(`Dated: ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`, { align: 'right' });
  doc.moveDown(0.5);
  doc.text('To,');
  doc.text('The Principal & Dean');
  doc.text('Government Medical College');
  doc.text('Haldwani-Nainital');
  doc.moveDown(1);

  const startDate = `01/${String(month).padStart(2, '0')}/${year}`;
  const endDate = `${lastDayOfMonth(year, month)}/${String(month).padStart(2, '0')}/${year}`;
  doc.font('Helvetica-Bold').text(
    `Subject: Attendance of PG Students (Stipend) for ${MONTH_NAMES[month - 1]} ${year} (${startDate} to ${endDate})`
  );
  doc.moveDown(1);

  let y = doc.y;
  y += drawRow(doc, y, COLUMNS.map((c) => c.label), { bold: true });

  records.forEach((r, i) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
      y += drawRow(doc, y, COLUMNS.map((c) => c.label), { bold: true });
    }
    y += drawRow(doc, y, [
      i + 1,
      r.student_name,
      r.batch,
      r.post,
      r.cl_days || '---',
      r.absent_days || '---',
      r.total_present_label,
      r.remarks,
    ]);
  });

  if (records.length === 0) {
    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(10).text('No approved attendance records for this department and month.');
  }

  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(10).text(`(${hod_name || 'HoD not assigned'})`, LEFT, doc.y, { width: TABLE_WIDTH, align: 'right' });
  doc.text('Professor & HOD', { width: TABLE_WIDTH, align: 'right' });
  doc.text(`Department of ${subject_name}`, { width: TABLE_WIDTH, align: 'right' });
  doc.text('Govt. Medical College', { width: TABLE_WIDTH, align: 'right' });

  doc.end();
}

module.exports = generateDepartmentMonthlyReportPdf;
