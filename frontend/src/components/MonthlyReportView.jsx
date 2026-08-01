import { useState } from 'react';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';
import apiClient from '../api/client';
import { downloadAttendancePdf } from '../api/downloadPdf';
import { DEPARTMENTS } from '../constants/departments';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

export default function MonthlyReportView({ baseUrl, departmentSelectable }) {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [subjectName, setSubjectName] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const buildParams = () => {
    const params = { month, year };
    if (departmentSelectable) params.subject_name = subjectName;
    return params;
  };

  const handleGenerate = async () => {
    if (departmentSelectable && !subjectName) {
      toast.error('Select a department first.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`${baseUrl}/monthly-report`, { params: buildParams() });
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
        `${baseUrl}/monthly-report/pdf?${query}`,
        `monthly_report_${report?.subject_name || subjectName}_${month}_${year}.pdf`
      );
    } catch (err) {
      toast.error('Failed to download PDF.');
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Department Monthly Report</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 flex flex-wrap items-end gap-3">
        {departmentSelectable && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
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
            Department of {report.subject_name} · {MONTHS[report.month - 1]} {report.year} · HoD: {report.hod_name || 'Not assigned'}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">S.No.</th>
                <th className="px-4 py-2">Name of Doctors</th>
                <th className="px-4 py-2">Post</th>
                <th className="px-4 py-2">CL</th>
                <th className="px-4 py-2">Absent</th>
                <th className="px-4 py-2">Total Present Days</th>
                <th className="px-4 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {report.records.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">Dr. {r.student_name}</td>
                  <td className="px-4 py-2">{r.post}</td>
                  <td className="px-4 py-2">{r.cl_days || '---'}</td>
                  <td className="px-4 py-2">{r.absent_days || '---'}</td>
                  <td className="px-4 py-2">{r.total_present_label}</td>
                  <td className="px-4 py-2">{r.remarks || '-'}</td>
                </tr>
              ))}
              {report.records.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No approved records for this department and month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
