import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';
import apiClient from '../../api/client';
import { downloadAttendancePdf } from '../../api/downloadPdf';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

export default function IndividualStipendReport() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/students').then(({ data }) => setStudents(data));
  }, []);

  const buildParams = () => ({
    student_id: studentId,
    from_month: fromMonth, from_year: fromYear,
    to_month: toMonth, to_year: toYear,
  });

  const handleGenerate = async () => {
    if (!studentId) {
      toast.error('Select a student first.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/salary/individual-report', { params: buildParams() });
      setReport(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const query = new URLSearchParams(buildParams()).toString();
      await downloadAttendancePdf(
        `/admin/salary/individual-report/pdf?${query}`,
        `individual_stipend_${report?.student?.roll_number}.pdf`
      );
    } catch (err) {
      toast.error('Failed to download PDF.');
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Individual Stipend Report</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <div className="flex gap-1">
            <select value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm w-20" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <div className="flex gap-1">
            <select value={toMonth} onChange={(e) => setToMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={toYear} onChange={(e) => setToYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm w-20" />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Loading...' : 'Generate'}
        </button>
        {report && (
          <button onClick={handleDownload}
            className="flex items-center gap-1 bg-gray-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-800">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        )}
      </div>

      {report && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 text-sm text-gray-600">
            <div className="font-semibold text-gray-800 mb-1">{report.student.name} ({report.student.roll_number})</div>
            <div>{report.student.subject_name} · Rate: Rs. {report.rate}/month · Account: {report.student.account_number || '-'}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Month</th>
                  <th className="px-4 py-2">Days Payable</th>
                  <th className="px-4 py-2">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyBreakdown.map((m, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2">{MONTHS[m.month - 1]} {m.year}</td>
                    <td className="px-4 py-2">{m.days_payable}</td>
                    <td className="px-4 py-2">{m.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {report.monthlyBreakdown.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No payable months in this range.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">Total Stipend</div>
              <div className="text-lg font-semibold text-gray-800">Rs. {report.totalStipend.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">Income Tax @10%</div>
              <div className="text-lg font-semibold text-gray-800">Rs. {report.incomeTax.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-500">Net Payable</div>
              <div className="text-lg font-semibold text-green-700">Rs. {report.netPayable.toFixed(2)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
