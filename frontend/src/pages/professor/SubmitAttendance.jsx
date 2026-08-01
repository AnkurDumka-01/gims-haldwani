import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();

const emptyForm = {
  student_id: '', month: now.getMonth() + 1, year: now.getFullYear(),
  total_working_days: '', days_present: '',
  cl_days: 0, academic_leave_days: 0, special_leave_days: 0, absent_days: 0, remarks: '',
};

export default function SubmitAttendance() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/professor/students').then(({ data }) => setStudents(data));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
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
            <select name="student_id" required value={form.student_id} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
              ))}
            </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Working Days</label>
              <input type="number" name="total_working_days" min="0" required value={form.total_working_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Days Present</label>
              <input type="number" name="days_present" min="0" required value={form.days_present} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">CL</label>
              <input type="number" name="cl_days" min="0" value={form.cl_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Academic Leave</label>
              <input type="number" name="academic_leave_days" min="0" value={form.academic_leave_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Special Leave (Mat/Pat)</label>
              <input type="number" name="special_leave_days" min="0" value={form.special_leave_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Absent</label>
              <input type="number" name="absent_days" min="0" value={form.absent_days} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
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
