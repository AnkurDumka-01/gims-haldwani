const asyncHandler = require('express-async-handler');
const pool = require('../db');
const { computeStipendForRange } = require('../utils/stipendCalculator');
const { computeTrainingYear } = require('../utils/attendanceSummary');
const numberToWordsIndian = require('../utils/numberToWordsIndian');
const generateIndividualStipendReportPdf = require('../utils/generateIndividualStipendReportPdf');
const generateBatchStipendReportPdf = require('../utils/generateBatchStipendReportPdf');
const { INCOME_TAX_RATE } = require('../utils/salaryRules');

const getStudentById = async (id) => {
  const result = await pool.query(
    `SELECT s.*, u.name AS professor_name
     FROM pg_students s
     LEFT JOIN users u ON u.id = s.professor_id
     WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const buildIndividualReport = async (studentId, fromYear, fromMonth, toYear, toMonth) => {
  const student = await getStudentById(studentId);
  if (!student) return null;

  const { monthlyBreakdown, totalStipend, incomeTax, netPayable, rate } =
    await computeStipendForRange(student, fromYear, fromMonth, toYear, toMonth);
  const trainingYear = computeTrainingYear(student.date_of_joining, fromYear, fromMonth);
  const amountInWords = numberToWordsIndian(totalStipend);

  return { student, monthlyBreakdown, totalStipend, incomeTax, netPayable, rate, trainingYear, amountInWords };
};

const getIndividualReport = asyncHandler(async (req, res) => {
  const { student_id, from_month, from_year, to_month, to_year } = req.query;
  if (!student_id || !from_month || !from_year || !to_month || !to_year) {
    return res.status(400).json({ message: 'student_id, from_month, from_year, to_month and to_year are required.' });
  }
  const report = await buildIndividualReport(student_id, Number(from_year), Number(from_month), Number(to_year), Number(to_month));
  if (!report) return res.status(404).json({ message: 'Student not found.' });
  res.json(report);
});

const downloadIndividualReportPdf = asyncHandler(async (req, res) => {
  const { student_id, from_month, from_year, to_month, to_year } = req.query;
  if (!student_id || !from_month || !from_year || !to_month || !to_year) {
    return res.status(400).json({ message: 'student_id, from_month, from_year, to_month and to_year are required.' });
  }
  const report = await buildIndividualReport(student_id, Number(from_year), Number(from_month), Number(to_year), Number(to_month));
  if (!report) return res.status(404).json({ message: 'Student not found.' });
  generateIndividualStipendReportPdf(report, res);
});

const buildBatchReport = async (batch, year, month) => {
  const studentsResult = await pool.query(
    `SELECT * FROM pg_students WHERE batch = $1 AND is_active = TRUE ORDER BY name ASC`,
    [batch]
  );

  const students = [];
  for (const student of studentsResult.rows) {
    const { monthlyBreakdown, rate } = await computeStipendForRange(student, year, month, year, month);
    if (monthlyBreakdown.length === 0) continue;
    const amount = monthlyBreakdown[0].amount;
    const incomeTax = Math.round(amount * INCOME_TAX_RATE);
    const netPayable = amount - incomeTax;
    students.push({
      name: student.name,
      subject_name: student.subject_name,
      date_of_joining: student.date_of_joining,
      account_number: student.account_number,
      days_payable: monthlyBreakdown[0].days_payable,
      amount,
      incomeTax,
      netPayable,
      rate,
    });
  }

  const grandTotal = students.reduce(
    (acc, s) => ({
      amount: acc.amount + s.amount,
      totalStipend: acc.totalStipend + s.amount,
      incomeTax: acc.incomeTax + s.incomeTax,
      netPayable: acc.netPayable + s.netPayable,
    }),
    { amount: 0, totalStipend: 0, incomeTax: 0, netPayable: 0 }
  );
  Object.keys(grandTotal).forEach((k) => { grandTotal[k] = Math.round(grandTotal[k] * 100) / 100; });

  const trainingYear = students.length > 0
    ? computeTrainingYear(studentsResult.rows[0].date_of_joining, year, month)
    : 1;
  const amountInWords = numberToWordsIndian(grandTotal.totalStipend);

  return { batch, month, year, trainingYear, students, grandTotal, amountInWords };
};

const getBatchReport = asyncHandler(async (req, res) => {
  const { batch, month, year } = req.query;
  if (!batch || !month || !year) {
    return res.status(400).json({ message: 'batch, month and year are required.' });
  }
  const report = await buildBatchReport(batch, Number(year), Number(month));
  res.json(report);
});

const downloadBatchReportPdf = asyncHandler(async (req, res) => {
  const { batch, month, year } = req.query;
  if (!batch || !month || !year) {
    return res.status(400).json({ message: 'batch, month and year are required.' });
  }
  const report = await buildBatchReport(batch, Number(year), Number(month));
  generateBatchStipendReportPdf(report, res);
});

module.exports = {
  getIndividualReport,
  downloadIndividualReportPdf,
  getBatchReport,
  downloadBatchReportPdf,
};
