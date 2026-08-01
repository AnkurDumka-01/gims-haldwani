import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Download } from 'lucide-react';
import apiClient from '../api/client';
import { downloadAttendancePdf } from '../api/downloadPdf';

function formatDateMMDDYYYY(date) {
  if (!date) return '-';
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export default function AnnualReportView({ summaryUrl, pdfUrl, backTo }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(summaryUrl)
      .then(({ data }) => setSummary(data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load annual report.'))
      .finally(() => setLoading(false));
  }, [summaryUrl]);

  const handleDownload = async () => {
    try {
      await downloadAttendancePdf(pdfUrl, `annual_attendance_${summary.student.roll_number}.pdf`);
    } catch (err) {
      toast.error('Failed to download PDF.');
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading report...</div>;
  if (!summary) return <div className="text-gray-400 text-sm">No data available.</div>;

  const { student, years, grandTotal, warnings, examEligible, examEligibilityThreshold } = summary;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to={backTo} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button onClick={handleDownload}
          className="flex items-center gap-1 bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm hover:bg-blue-700">
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-1">{student.name}</h2>
        <p className="text-sm text-gray-500">
          {student.roll_number} · {student.subject_name} {student.father_name ? `· S/o D/o ${student.father_name}` : ''}
        </p>
        <p className="text-sm text-gray-500">
          Supervising Professor: {student.professor_name || '-'} · Date of Admission: {formatDateMMDDYYYY(student.date_of_admission)} · Date of Joining: {formatDateMMDDYYYY(student.date_of_joining)}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">CL</th>
              <th className="px-4 py-2">Academic Leave</th>
              <th className="px-4 py-2">Special Leave (Mat/Pat)</th>
              <th className="px-4 py-2">Absent</th>
              <th className="px-4 py-2">Total Days Present</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">Year {y.year}</td>
                <td className="px-4 py-2">{y.cl_days}</td>
                <td className="px-4 py-2">{y.academic_leave_days}</td>
                <td className="px-4 py-2">{y.special_leave_days}</td>
                <td className="px-4 py-2">{y.absent_days}</td>
                <td className="px-4 py-2">{y.days_present}</td>
              </tr>
            ))}
            {years.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No approved attendance yet.</td></tr>
            )}
            <tr className="border-t border-gray-200 bg-amber-50 font-semibold">
              <td className="px-4 py-2">Grand Total</td>
              <td className="px-4 py-2">{grandTotal.cl_days}</td>
              <td className="px-4 py-2">{grandTotal.academic_leave_days}</td>
              <td className="px-4 py-2">{grandTotal.special_leave_days}</td>
              <td className="px-4 py-2">{grandTotal.absent_days}</td>
              <td className="px-4 py-2">{grandTotal.days_present}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`rounded-lg p-4 text-sm font-medium ${examEligible ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        Exam Eligibility (≥ {examEligibilityThreshold} days present required): {examEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
      </div>
    </div>
  );
}
