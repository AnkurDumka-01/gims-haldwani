import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';
import apiClient from '../../api/client';
import { downloadAttendancePdf } from '../../api/downloadPdf';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

export default function BatchStipendReport() {
  const [students, setStudents] = useState([]);
  const [batch, setBatch] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/students').then(({ data }) => setStudents(data));
  }, []);

  const batches = useMemo(
    () => [...new Set(students.map((s) => s.batch).filter(Boolean))].sort(),
    [students]
  );

  const buildParams = () => ({ batch, month, year });

  const handleGenerate = async () => {
    if (!batch) {
      toast.error('Select a batch first.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/salary/batch-report', { params: buildParams() });
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
        `/admin/salary/batch-report/pdf?${query}`,
        `batch_stipend_${batch}_${month}_${year}.pdf`
      );
    } catch (err) {
      toast.error('Failed to download PDF.');
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Batch-wise Stipend Report</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Batch</label>
          <select value={batch} onChange={(e) => setBatch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select batch</option>
            {batches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24" />
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
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600">
            Batch-{report.batch} · {MONTHS[report.month - 1]} {report.year}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Sl.No.</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Account Number</th>
                <th className="px-4 py-2">Days</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Income Tax</th>
                <th className="px-4 py-2">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {report.students.map((s, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.subject_name}</td>
                  <td className="px-4 py-2">{s.account_number || '-'}</td>
                  <td className="px-4 py-2">{s.days_payable}</td>
                  <td className="px-4 py-2">{s.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{s.incomeTax.toFixed(2)}</td>
                  <td className="px-4 py-2">{s.netPayable.toFixed(2)}</td>
                </tr>
              ))}
              {report.students.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No students payable in this batch/month.</td></tr>
              )}
              <tr className="border-t border-gray-200 bg-amber-50 font-semibold">
                <td className="px-4 py-2" colSpan={5}>Total Amount (Rs)</td>
                <td className="px-4 py-2">{report.grandTotal.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{report.grandTotal.incomeTax.toFixed(2)}</td>
                <td className="px-4 py-2">{report.grandTotal.netPayable.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
