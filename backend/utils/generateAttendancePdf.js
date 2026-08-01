const PDFDocument = require('pdfkit');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function generateAttendancePdf(record, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=attendance_${record.roll_number}_${record.month}_${record.year}.pdf`
  );
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('GIMS Haldwani', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('PG Student Attendance Certificate', { align: 'center' });
  doc.moveDown(1.5);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  const row = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(11).text(label, 50, doc.y, { continued: true, width: 180 });
    doc.font('Helvetica').text(value ?? '-');
    doc.moveDown(0.4);
  };

  row('Student Name:', record.student_name);
  row('Roll Number:', record.roll_number);
  row('Subject Name:', record.student_subject_name);
  row('Supervising Professor:', record.professor_name);
  row('Month / Year:', `${MONTH_NAMES[record.month - 1]} ${record.year}`);

  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);

  row('Total Working Days:', String(record.total_working_days));
  row('Days Present:', String(record.days_present));
  row('Casual Leave:', String(record.cl_days));
  row('Academic Leave:', String(record.academic_leave_days));
  row('Special Leave (Mat/Pat):', String(record.special_leave_days));
  row('Absent:', String(record.absent_days));
  if (record.remarks) row('Remarks:', record.remarks);

  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);

  row('Status:', record.status.toUpperCase());
  row('Approved By:', record.reviewed_by_name);
  row('Approved On:', record.reviewed_at ? new Date(record.reviewed_at).toLocaleDateString('en-IN') : '-');

  doc.moveDown(3);
  doc.fontSize(10).font('Helvetica-Oblique').text(
    'This is a system-generated document confirming approved attendance for salary/stipend processing.',
    { align: 'center' }
  );

  doc.end();
}

module.exports = generateAttendancePdf;
