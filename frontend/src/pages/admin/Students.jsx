import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';
import { DEPARTMENTS } from '../../constants/departments';

const emptyForm = {
  name: '', father_name: '', roll_number: '', subject_name: '',
  date_of_admission: '', batch: '', date_of_joining: '',
  professor_id: '', phone: '', email: '',
  account_number: '', monthly_stipend_rate: '', service_end_date: '',
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [studentsRes, profsRes] = await Promise.all([
      apiClient.get('/admin/students'),
      apiClient.get('/admin/professors'),
    ]);
    setStudents(studentsRes.data);
    setProfessors(profsRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/admin/students', { ...form, professor_id: form.professor_id || null });
      toast.success('Student added.');
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (studentId, professorId) => {
    try {
      await apiClient.post(`/admin/students/${studentId}/assign-professor`, {
        professor_id: professorId || null,
      });
      toast.success('Professor mapping updated.');
      load();
    } catch (err) {
      toast.error('Failed to update mapping.');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Add PG Student</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="name" required placeholder="Name" value={form.name} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="father_name" placeholder="Father's Name" value={form.father_name} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="roll_number" required placeholder="Roll Number" value={form.roll_number} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <select name="subject_name" required value={form.subject_name} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select Subject Name</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date of Admission</label>
              <input name="date_of_admission" type="date" value={form.date_of_admission} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <input name="batch" placeholder="Batch (e.g. 2025-2026)" value={form.batch} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date of Joining (used to compute PG Year 1/2/3)</label>
              <input name="date_of_joining" type="date" value={form.date_of_joining} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <select name="professor_id" value={form.professor_id} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Assign professor (optional)</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input name="email" type="email" placeholder="Email (optional)" value={form.email} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="phone" placeholder="Phone (optional)" value={form.phone} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Stipend details (for salary reports)</p>
              <input name="account_number" placeholder="Bank Account Number" value={form.account_number} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />
              <input name="monthly_stipend_rate" type="number" min="0" step="0.01" placeholder="Monthly Stipend Rate (Rs.)" value={form.monthly_stipend_rate} onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Service End Date (optional)</label>
                <input name="service_end_date" type="date" value={form.service_end_date} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Father's Name</th>
                <th className="px-4 py-2">Roll No.</th>
                <th className="px-4 py-2">Subject Name</th>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Professor</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.father_name || '-'}</td>
                  <td className="px-4 py-2">{s.roll_number}</td>
                  <td className="px-4 py-2">{s.subject_name}</td>
                  <td className="px-4 py-2">{s.batch || '-'}</td>
                  <td className="px-4 py-2">
                    <select
                      value={s.professor_id || ''}
                      onChange={(e) => handleAssign(s.id, e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {professors.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/admin/students/${s.id}/report`} className="text-xs text-blue-600 hover:underline">
                      Annual Report
                    </Link>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No students yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
