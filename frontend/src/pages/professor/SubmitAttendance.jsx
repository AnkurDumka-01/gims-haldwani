import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';
import { toDateInputValue } from '../../utils/dateInput';
import { dayTotalsSum, validateDayTotals } from '../../utils/attendanceValidation';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

const emptyForm = {
  student_id: '', month: now.getMonth() + 1, year: now.getFullYear(),
  total_working_days: '', days_present: '', date_of_joining: '',
  cl_days: 0, academic_leave_days: 0, special_leave_days: 0, absent_days: 0, remarks: '',
  is_drp: false, drp_from_date: '', drp_to_date: '',
};

export default function SubmitAttendance() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/professor/students').then(({ data }) => setStudents(data));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  // Auto-fills Date of Joining from the student's record on file when they're picked, so the
  // field usually just needs confirming -- editable in case it's missing or wrong.
  const handleStudentChange = (e) => {
    const studentId = e.target.value;
    const student = students.find((s) => String(s.id) === studentId);
    setForm({ ...form, student_id: studentId, date_of_joining: toDateInputValue(student?.date_of_joining) });
  };

  const daySum = dayTotalsSum(form);
  const dayTotalsError = validateDayTotals(form);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dayTotalsError) {
      toast.error(dayTotalsError);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/professor/attendance', form);
      toast.success('Attendance submitted for admin review.');
      (data.warnings || []).forEach((w) => toast.warning(w, { autoClose: 8000 }));
      setForm({ ...emptyForm, student_id: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="font-semibold text-gray-800 mb-4">Submit Attendance</h2>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select name="student_id" required value={form.student_id} onChange={handleStudentChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
            <input type="date" name="date_of_joining" value={form.date_of_joining} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <p className="text-xs text-gray-500 mt-1">Auto-filled from the student's record — confirm or correct it if missing/wrong. This drives their training-year (Year 1/2/3) calculations.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select name="month" value={form.month} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input type="number" name="year" value={form.year} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Days in Month</label>
              <input type="number" name="total_working_days" min="0" required value={form.total_working_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days Present in Department</label>
              <input type="number" name="days_present" min="0" required value={form.days_present} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col">
              <label className="flex items-end h-8 text-xs text-gray-500 mb-1 leading-tight">CL</label>
              <input type="number" name="cl_days" min="0" value={form.cl_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="flex items-end h-8 text-xs text-gray-500 mb-1 leading-tight">Academic Leave</label>
              <input type="number" name="academic_leave_days" min="0" value={form.academic_leave_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="flex items-end h-8 text-xs text-gray-500 mb-1 leading-tight">Special Leave (Mat/Pat)</label>
              <input type="number" name="special_leave_days" min="0" value={form.special_leave_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="flex items-end h-8 text-xs text-gray-500 mb-1 leading-tight">Absent</label>
              <input type="number" name="absent_days" min="0" value={form.absent_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <p className={`text-xs ${dayTotalsError ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            Present + CL + Academic + Special + Absent = {daySum}
            {form.total_working_days !== '' && ` (must equal Total Days in Month, ${form.total_working_days})`}
          </p>

          <div className="border border-amber-200 bg-amber-50 rounded-md p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" name="is_drp" checked={form.is_drp} onChange={handleChange}
                className="rounded border-gray-300" />
              On DRP (District Residency Programme)
            </label>
            {form.is_drp && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">DRP From</label>
                  <input type="date" name="drp_from_date" required={form.is_drp} value={form.drp_from_date} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">DRP To</label>
                  <input type="date" name="drp_to_date" required={form.is_drp} value={form.drp_to_date} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <p className="col-span-2 text-xs text-amber-700">
                  Every report for this month will note that working days/absent are subject to verification from the DRP completion certificate.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <textarea name="remarks" rows={2} value={form.remarks} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>
      </div>
    </div>
  );
}
