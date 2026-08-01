const pool = require('../db');
const { INCOME_TAX_RATE } = require('./salaryRules');

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function monthKey(year, month) {
  return year * 12 + month;
}

// Iterates every calendar month in [fromYear/fromMonth, toYear/toMonth], clipped to the
// student's actual service window (date_of_joining .. service_end_date if set), pro-rating
// the boundary months and deducting only approved Absent days from the rest.
async function computeStipendForRange(student, fromYear, fromMonth, toYear, toMonth) {
  const rate = Number(student.monthly_stipend_rate) || 0;
  const joining = student.date_of_joining ? new Date(student.date_of_joining) : null;
  const serviceEnd = student.service_end_date ? new Date(student.service_end_date) : null;

  const attendanceResult = await pool.query(
    `SELECT month, year, absent_days FROM attendance_records
     WHERE student_id = $1 AND status = 'approved'
       AND (year * 12 + month) BETWEEN $2 AND $3`,
    [student.id, monthKey(fromYear, fromMonth), monthKey(toYear, toMonth)]
  );
  const absentByMonth = new Map();
  attendanceResult.rows.forEach((r) => {
    absentByMonth.set(monthKey(r.year, r.month), r.absent_days);
  });

  const monthlyBreakdown = [];
  let totalStipend = 0;

  const startKey = joining ? Math.max(monthKey(fromYear, fromMonth), monthKey(joining.getFullYear(), joining.getMonth() + 1)) : monthKey(fromYear, fromMonth);
  const endKey = serviceEnd ? Math.min(monthKey(toYear, toMonth), monthKey(serviceEnd.getFullYear(), serviceEnd.getMonth() + 1)) : monthKey(toYear, toMonth);

  for (let key = startKey; key <= endKey; key += 1) {
    const year = Math.floor((key - 1) / 12);
    const month = key - year * 12;
    const totalDaysInMonth = daysInMonth(year, month);

    let startDay = 1;
    let endDay = totalDaysInMonth;
    if (joining && joining.getFullYear() === year && joining.getMonth() + 1 === month) {
      startDay = joining.getDate();
    }
    if (serviceEnd && serviceEnd.getFullYear() === year && serviceEnd.getMonth() + 1 === month) {
      endDay = serviceEnd.getDate();
    }

    const inServiceDays = Math.max(0, endDay - startDay + 1);
    const absentDays = absentByMonth.get(key) || 0;
    const payableDays = Math.max(0, inServiceDays - absentDays);

    const dailyRate = totalDaysInMonth > 0 ? rate / totalDaysInMonth : 0;
    // Rounded to the nearest whole rupee per month (not 2 decimal places) to match
    // the institution's actual passbook rounding convention.
    const amount = Math.round(dailyRate * payableDays);

    monthlyBreakdown.push({ year, month, days_payable: payableDays, amount });
    totalStipend += amount;
  }

  totalStipend = Math.round(totalStipend);
  const incomeTax = Math.round(totalStipend * INCOME_TAX_RATE);
  const netPayable = totalStipend - incomeTax;

  return { monthlyBreakdown, totalStipend, incomeTax, netPayable, rate };
}

module.exports = { computeStipendForRange, daysInMonth };
