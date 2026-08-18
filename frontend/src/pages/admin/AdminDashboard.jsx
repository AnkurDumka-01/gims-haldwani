import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Download } from 'lucide-react';
import apiClient from '../../api/client';
import { downloadAttendancePdf } from '../../api/downloadPdf';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

// "Dashboard should include another feature to download students having attendance based on
// criteria selected by admin ... attendance greater than or equal to the selected attendance
// criteria." Period filters are optional -- left blank, the report covers all approved
// attendance on file.
function AttendanceThresholdReport() {
  const [minPercent, setMinPercent] = useState(75);
  const [usePeriod, setUsePeriod] = useState(false);
  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [students, setStudents] = useState([]);
  const [batch, setBatch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/students').then(({ data }) => setStudents(data)).catch(() => {});
  }, []);

  const batches = useMemo(
    () => [...new Set(students.map((s) => s.batch).filter(Boolean))].sort(),
    [students]
  );

  const buildParams = () => {
    const params = { min_percent: minPercent };
    if (usePeriod) {
      Object.assign(params, { from_month: fromMonth, from_year: fromYear, to_month: toMonth, to_year: toYear });
    }
    if (batch) {
      params.batch = batch;
    }
    return params;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/reports/attendance-threshold', { params: buildParams() });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const query = new URLSearchParams(buildParams()).toString();
      const batchSuffix = batch ? `_${batch}` : '';
      await downloadAttendancePdf(
        `/admin/reports/attendance-threshold/pdf?${query}`,
        `attendance_threshold_${minPercent}pct${batchSuffix}.pdf`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Attendance Threshold Report</h3>
      <p className="text-xs text-gray-500 mb-4">List (and download) students whose overall attendance is greater than or equal to a chosen percentage, optionally restricted to one batch.</p>

      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Minimum Attendance %</label>
          <input type="number" min="0" max="100" value={minPercent} onChange={(e) => setMinPercent(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-28" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Batch</label>
          <select value={batch} onChange={(e) => setBatch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">All batches</option>
            {batches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
          <input type="checkbox" checked={usePeriod} onChange={(e) => setUsePeriod(e.target.checked)} />
          Restrict to a period
        </label>
        {usePeriod && (
          <>
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
          </>
        )}
        <button onClick={handleGenerate} disabled={loading}
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Loading...' : 'Generate'}
        </button>
        {result && (
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1 bg-gray-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
            <Download className="w-4 h-4" /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        )}
      </div>

      {result && (
        <div className="border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Roll No.</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Days Present</th>
                <th className="px-3 py-2">Total Days</th>
                <th className="px-3 py-2">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {result.students.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-400">No students meet this criteria.</td></tr>
              ) : result.students.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.roll_number}</td>
                  <td className="px-3 py-2">{s.subject_name}</td>
                  <td className="px-3 py-2">{s.batch || '-'}</td>
                  <td className="px-3 py-2">{s.days_present}</td>
                  <td className="px-3 py-2">{s.total_working_days}</td>
                  <td className="px-3 py-2">{s.percentage.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// "Implement a leave register option for admin, where he can select any student or batch
// or department and leave record will be generated in form of PDF" -- matches the
// institution's paper Leave Register form. Exactly one selector is active at a time,
// switched via the "Select by" control below.
function LeaveRegisterReport() {
  const [students, setStudents] = useState([]);
  const [selectBy, setSelectBy] = useState('batch');
  const [studentId, setStudentId] = useState('');
  const [batch, setBatch] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/students').then(({ data }) => setStudents(data)).catch(() => {});
  }, []);

  const batches = useMemo(() => [...new Set(students.map((s) => s.batch).filter(Boolean))].sort(), [students]);
  const subjects = useMemo(() => [...new Set(students.map((s) => s.subject_name).filter(Boolean))].sort(), [students]);
  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  const selectedValue = selectBy === 'student' ? studentId : selectBy === 'batch' ? batch : subjectName;

  const buildParams = () => {
    const params = {};
    if (academicSession) params.academic_session = academicSession;
    if (selectBy === 'student') params.student_id = studentId;
    if (selectBy === 'batch') params.batch = batch;
    if (selectBy === 'department') params.subject_name = subjectName;
    return params;
  };

  const handleGenerate = async () => {
    if (!selectedValue) {
      toast.error('Select a student, batch, or department first.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/reports/leave-register', { params: buildParams() });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load leave register.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const query = new URLSearchParams(buildParams()).toString();
      const label = selectBy === 'student'
        ? students.find((s) => String(s.id) === String(studentId))?.roll_number || studentId
        : selectedValue;
      await downloadAttendancePdf(
        `/admin/reports/leave-register/pdf?${query}`,
        `leave_register_${label}.pdf`.replace(/\s+/g, '_')
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const modes = [
    { key: 'student', label: 'Student' },
    { key: 'batch', label: 'Batch' },
    { key: 'department', label: 'Department' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mt-6">
      <h3 className="font-semibold text-gray-800 mb-1">Leave Register</h3>
      <p className="text-xs text-gray-500 mb-4">Generate the institution's Leave Register (Year 1 and cumulative totals per student) for a chosen student, batch, or department.</p>

      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Select by</label>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            {modes.map((m) => (
              <button key={m.key} type="button"
                onClick={() => { setSelectBy(m.key); setResult(null); }}
                className={`px-3 py-2 text-sm ${selectBy === m.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {selectBy === 'student' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64">
              <option value="">Select student</option>
              {sortedStudents.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
            </select>
          </div>
        )}
        {selectBy === 'batch' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Batch</label>
            <select value={batch} onChange={(e) => setBatch(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select batch</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
        {selectBy === 'department' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <select value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select department</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Academic Session (optional)</label>
          <input type="text" placeholder="e.g. 2025-2026" value={academicSession} onChange={(e) => setAcademicSession(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-40" />
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Loading...' : 'Generate'}
        </button>
        {result && (
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1 bg-gray-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
            <Download className="w-4 h-4" /> {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        )}
      </div>

      {result && (
        <div className="border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Roll No.</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Year 1 Present / %</th>
                <th className="px-3 py-2">Total Present / %</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">No students found for this selection.</td></tr>
              ) : result.rows.map((r) => (
                <tr key={r.student.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.student.name}</td>
                  <td className="px-3 py-2">{r.student.roll_number}</td>
                  <td className="px-3 py-2">{r.student.subject_name}</td>
                  <td className="px-3 py-2">{r.student.batch || '-'}</td>
                  <td className="px-3 py-2">{r.yearOne.days_present} / {r.yearOne.percentage === null ? '-' : `${r.yearOne.percentage.toFixed(2)}%`}</td>
                  <td className="px-3 py-2">{r.grandTotal.days_present} / {r.grandTotal.percentage === null ? '-' : `${r.grandTotal.percentage.toFixed(2)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, students: 0, professors: 0 });

  useEffect(() => {
    const load = async () => {
      const [attendance, students, professors] = await Promise.all([
        apiClient.get('/admin/attendance'),
        apiClient.get('/admin/students'),
        apiClient.get('/admin/professors'),
      ]);
      const byStatus = { pending: 0, approved: 0, rejected: 0 };
      attendance.data.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      setCounts({ ...byStatus, students: students.data.length, professors: professors.data.length });
    };
    load();
  }, []);

  const cards = [
    { label: 'Pending Review', value: counts.pending, color: 'text-yellow-600', to: '/admin/attendance' },
    { label: 'Approved', value: counts.approved, color: 'text-green-600', to: '/admin/attendance' },
    { label: 'Rejected', value: counts.rejected, color: 'text-red-600', to: '/admin/attendance' },
    { label: 'PG Students', value: counts.students, color: 'text-blue-600', to: '/admin/students' },
    { label: 'Professors', value: counts.professors, color: 'text-purple-600', to: '/admin/professors' },
  ];

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className={`text-3xl font-semibold ${c.color}`}>{c.value}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <AttendanceThresholdReport />
      </div>
      <LeaveRegisterReport />
    </div>
  );
}
