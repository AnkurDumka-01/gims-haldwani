// Bonafide-cum-Stipend Payment Certificate -- matches the college's official letterhead
// format (GMC_Haldwani_Bonafide_cum_Stipend_Paid_Certificate_English). Real data is filled
// in wherever the institution's own records supply it (name, father's name, subject, batch,
// per-month stipend figures); fields the system has no source of truth for (the "No." file
// reference the registry hand-assigns, and the submission recipient) are left blank with
// underscores exactly as the paper template does, rather than guessed.
const PDFDocument = require('pdfkit');
const { INCOME_TAX_RATE } = require('./salaryRules');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function blank(len) {
  return '_'.repeat(len);
}

function generateStipendCertificatePdf(report, res) {
  const { student, monthlyBreakdown } = report;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const WIDTH = doc.page.width - 100; // usable width inside the 50pt margins

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=stipend_certificate_${student.roll_number}.pdf`);
  doc.pipe(res);

  // ---------- Letterhead ----------
  doc.font('Helvetica-Bold').fontSize(14).text('OFFICE OF THE PRINCIPAL', { align: 'center' });
  doc.fontSize(16).text('GOVERNMENT MEDICAL COLLEGE, HALDWANI', { align: 'center' });
  doc.fontSize(11).text('District Nainital, Uttarakhand', { align: 'center' });
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(9);
  const contactLine1Y = doc.y;
  doc.text('Telephone: 05946-282578, 255255', 50, contactLine1Y, { width: WIDTH / 2, align: 'left', lineBreak: false });
  doc.text('Fax: 05946-282578', 50, contactLine1Y, { width: WIDTH, align: 'right', lineBreak: false });
  const contactLine2Y = contactLine1Y + 14;
  doc.text('Email: principal-gmchld-uk@gov.in', 50, contactLine2Y, { width: WIDTH / 2, align: 'left', lineBreak: false });
  doc.text('Website: gmchld.com/org.', 50, contactLine2Y, { width: WIDTH, align: 'right', lineBreak: false });
  doc.y = contactLine2Y + 14;
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(50 + WIDTH, doc.y).stroke();
  doc.moveDown(0.6);

  // ---------- Reference / date ----------
  // The file/dispatch number is assigned by the registry by hand -- left blank, not guessed.
  const now = new Date();
  const refY = doc.y;
  doc.font('Helvetica').fontSize(10).text(`No.: ${blank(4)}/GMC-HLD/PG/${blank(4)}/${now.getFullYear()}`, 50, refY, { width: WIDTH / 2, lineBreak: false });
  doc.text(`Date: ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`, 50, refY, { width: WIDTH, align: 'right', lineBreak: false });
  doc.y = refY + 16;
  doc.moveDown(0.8);

  // ---------- Title ----------
  doc.font('Helvetica-Bold').fontSize(13).text('BONAFIDE-CUM-STIPEND PAYMENT CERTIFICATE', { align: 'center', underline: true });
  doc.moveDown(0.8);

  // ---------- Body ----------
  doc.font('Helvetica').fontSize(11);
  doc.text(
    `This is to certify that Dr. ${student.name || blank(30)}, S/o / D/o / W/o ${student.father_name || blank(30)}, ` +
    `is a bonafide Post-Graduate student of M.D./M.S. in ${student.subject_name || blank(20)} at Government Medical ` +
    `College, Haldwani, District Nainital, Uttarakhand.`,
    { width: WIDTH, align: 'justify' }
  );
  doc.moveDown(0.6);
  doc.text(
    `The candidate was admitted during the academic session ${student.batch || blank(10)} and is currently pursuing ` +
    `the prescribed Post-Graduate course/training at this institution. As per the official records of the ` +
    `institution, the stipend payable to the candidate for the period mentioned below has been paid as per the ` +
    `applicable Government rules/orders.`,
    { width: WIDTH, align: 'justify' }
  );
  doc.moveDown(0.8);

  // ---------- Stipend table ----------
  const COLUMNS = [
    { label: 'Sl.\nNo.', width: 35, align: 'center' },
    { label: 'Month', width: 130, align: 'center' },
    { label: 'Gross Stipend\n(Rs.)', width: 110, align: 'center' },
    { label: 'Less Deduction\n(Rs.)', width: 110, align: 'center' },
    { label: 'Net Stipend Paid\n(Rs.)', width: 110, align: 'center' },
  ];
  const drawTableRow = (y, values, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    let x = 50;
    const rowHeight = Math.max(...COLUMNS.map((c, i) => doc.heightOfString(String(values[i] ?? ''), { width: c.width - 8 }) + 10));
    COLUMNS.forEach((col, i) => {
      doc.rect(x, y, col.width, rowHeight).stroke();
      doc.text(String(values[i] ?? ''), x + 4, y + 5, { width: col.width - 8, align: col.align });
      x += col.width;
    });
    return rowHeight;
  };

  let y = doc.y;
  y += drawTableRow(y, COLUMNS.map((c) => c.label), true);

  // A row per month actually payable in the requested period; the paper form only sketches
  // 3 blank rows as an example, but a real certificate should show every month it covers.
  if (monthlyBreakdown.length === 0) {
    y += drawTableRow(y, ['-', 'No payable months in the selected period', '-', '-', '-'], false);
  } else {
    monthlyBreakdown.forEach((m, i) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const gross = m.amount;
      const deduction = Math.round(gross * INCOME_TAX_RATE);
      const net = gross - deduction;
      y += drawTableRow(y, [
        i + 1, `${MONTH_NAMES[m.month - 1]} ${m.year}`,
        gross.toFixed(2), deduction.toFixed(2), net.toFixed(2),
      ], false);
    });
  }

  doc.y = y + 20;

  // ---------- Closing ----------
  doc.font('Helvetica').fontSize(11).text(
    "The certificate is issued as confirmation of the candidate's bona fide student status and payment of " +
    'stipend for the period specified above.',
    50, doc.y, { width: WIDTH, align: 'justify' }
  );
  doc.moveDown(0.6);
  doc.text(
    `This certificate is issued on the request of the candidate for submission to ${blank(40)} and for official use.`,
    { width: WIDTH, align: 'justify' }
  );
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').fontSize(10).text('REMARKS:', 50, doc.y);
  doc.moveDown(0.2);
  doc.font('Helvetica-Oblique').fontSize(9).text(
    'The candidate is under the obligation to serve the State for the period stipulated under the bond executed ' +
    'by the candidate with the Government of Uttarakhand, wherever applicable.',
    60, doc.y, { width: WIDTH - 10, underline: true }
  );

  // ---------- Signature ----------
  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(11).text('PRINCIPAL', 50, doc.y, { width: WIDTH, align: 'right' });
  doc.text('Government Medical College, Haldwani', 50, doc.y, { width: WIDTH, align: 'right' });

  doc.moveDown(2);
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('gray').text(
    'Issued on the basis of official institutional records.',
    50, doc.y, { width: WIDTH, align: 'center' }
  );
  doc.fillColor('black');

  doc.end();
}

module.exports = generateStipendCertificatePdf;
