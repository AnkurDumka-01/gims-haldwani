import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';
import apiClient from '../../api/client';
import { downloadAttendancePdf } from '../../api/downloadPdf';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function MySubmissions() {
  const [records, setRecords] = useState([]);

  const load = async () => {
    const { data } = await apiClient.get('/professor/attendance');
    setRecords(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDownload = async (r) => {
    try {
      await downloadAttendancePdf(
        `/professor/attendance/${r.id}/pdf`,
        `attendance_${r.roll_number}_${r.month}_${r.year}.pdf`
      );
    } catch (err) {
      toast.error('Failed to download PDF.');
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">My Submissions</h2>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Present / Working</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.student_name} <span className="text-gray-400">({r.roll_number})</span></td>
                <td className="px-4 py-2">{MONTHS[r.month - 1]} {r.year}</td>
                <td className="px-4 py-2">{r.days_present} / {r.total_working_days}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  {r.status === 'rejected' && r.rejection_reason && (
                    <div className="text-xs text-gray-400 mt-1">{r.rejection_reason}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.status === 'approved' && (
                    <button onClick={() => handleDownload(r)} className="text-gray-500 hover:text-blue-600" title="Download PDF">
                      <Download className="w-4 h-4 inline" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
