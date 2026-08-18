import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';
import { DEPARTMENTS } from '../../constants/departments';

// Postgres DATE columns come back as full ISO timestamps at local midnight (e.g.
// "2025-03-19T18:30:00.000Z" for 20 Mar in UTC+5:30) -- slicing the ISO string grabs the
// UTC calendar date and is off by a day whenever the local offset is non-zero. This form
// re-submits every field unconditionally on save, so that off-by-one silently shifted a
// student's Date of Admission/Joining/Service End back a day on every single edit. Reading
// back local getFullYear/getMonth/getDate (same fix as professor/SubmitAttendance.jsx) is
// the correct conversion.
function toDateInputValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const emptyForm = {
  name: '', father_name: '', roll_number: '', subject_name: '',
  date_of_admission: '', batch: '', date_of_joining: '',
  professor_id: '', phone: '', email: '',
  account_number: '', monthly_stipend_rate: '', service_end_date: '',
  phms: 'false', stipend_from_college: 'true',
};

// Same field set as emptyForm, plus roll_number is editable here too (unlike the add form,
// where roll_number is a plain required field, edit needs is_active as well since the admin
// should be able to flip a student's active/inactive status without a separate screen).
const emptyEditForm = { ...emptyForm, is_active: 'true' };

function StudentFormFields({ form, onChange, professors, includeStatus }) {
  return (
    <>
      <input name="name" required placeholder="Name" value={form.name} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <input name="father_name" placeholder="Father's Name" value={form.father_name} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <input name="roll_number" required placeholder="Roll Number" value={form.roll_number} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <select name="subject_name" required value={form.subject_name} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
        <option value="">Select Subject Name</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Date of Admission</label>
        <input name="date_of_admission" type="date" value={form.date_of_admission} onChange={onChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      </div>
      <input name="batch" placeholder="Batch (e.g. 2025-2026)" value={form.batch} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <div>
        <label className="block text-xs text-gray-500 mb-1">Date of Joining (used to compute PG Year 1/2/3)</label>
        <input name="date_of_joining" type="date" value={form.date_of_joining} onChange={onChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      </div>
      <select name="professor_id" value={form.professor_id} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
        <option value="">Assign professor (optional)</option>
        {professors.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input name="email" type="email" placeholder="Email (optional)" value={form.email} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
      <input name="phone" placeholder="Phone (optional)" value={form.phone} onChange={onChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />

      {includeStatus && (
        <select name="is_active" value={form.is_active} onChange={onChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      )}

      <div className="border-t border-gray-100 pt-3">
        <label className="block text-xs text-gray-500 mb-1">PHMS</label>
        <select name="phms" value={form.phms} onChange={onChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>

        {/* Only asked when PHMS = Yes. PHMS = No follows the normal attendance + stipend
            flow unchanged; PHMS = Yes with Stipend from College = No skips stipend
            calculation entirely (attendance summary only) -- see stipendCalculator.js. */}
        {form.phms === 'true' && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Stipend from College?</label>
            <select name="stipend_from_college" value={form.stipend_from_college} onChange={onChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            {form.stipend_from_college === 'false' && (
              <p className="text-xs text-amber-600 mt-1">
                No stipend calculation will be done for this student -- only the attendance sheet summary will be generated.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Stipend details (for salary reports)</p>
        <input name="account_number" placeholder="Bank Account Number" value={form.account_number} onChange={onChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />
        <input name="monthly_stipend_rate" type="number" min="0" step="0.01" placeholder="Monthly Stipend Rate (Rs.)" value={form.monthly_stipend_rate} onChange={onChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Service End Date (optional)</label>
          <input name="service_end_date" type="date" value={form.service_end_date} onChange={onChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
      </div>
    </>
  );
}

function EditStudentModal({ student, professors, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: student.name || '', father_name: student.father_name || '', roll_number: student.roll_number || '',
    subject_name: student.subject_name || '', date_of_admission: toDateInputValue(student.date_of_admission),
    batch: student.batch || '', date_of_joining: toDateInputValue(student.date_of_joining),
    professor_id: student.professor_id || '', phone: student.phone || '', email: student.email || '',
    account_number: student.account_number || '', monthly_stipend_rate: student.monthly_stipend_rate ?? '',
    service_end_date: toDateInputValue(student.service_end_date), is_active: String(student.is_active ?? true),
    phms: String(student.phms ?? false), stipend_from_college: String(student.stipend_from_college ?? true),
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Professor mapping goes through its own endpoint (already wired to audit logging /
      // validation there) rather than duplicating that logic into updateStudent.
      const professorChanged = String(student.professor_id || '') !== String(form.professor_id || '');
      const { professor_id, ...rest } = form;
      await apiClient.put(`/admin/students/${student.id}`, { ...rest, is_active: form.is_active === 'true' });
      if (professorChanged) {
        await apiClient.post(`/admin/students/${student.id}/assign-professor`, { professor_id: professor_id || null });
      }
      toast.success('Student updated.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-4">Edit Student</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <StudentFormFields form={form} onChange={handleChange} professors={professors} includeStatus />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Search/filter state -- search is free text (name/roll no./father's name/email/phone,
  // matched server-side); batch/subject/status are exact-match dropdowns.
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async (filters = {}) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.batch) params.batch = filters.batch;
    if (filters.subject_name) params.subject_name = filters.subject_name;
    if (filters.is_active) params.is_active = filters.is_active;
    const [studentsRes, profsRes] = await Promise.all([
      apiClient.get('/admin/students', { params }),
      apiClient.get('/admin/professors'),
    ]);
    setStudents(studentsRes.data);
    setProfessors(profsRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  // Debounce the free-text search so every keystroke doesn't fire a request; dropdown
  // filters apply immediately since they're discrete choices, not typing.
  useEffect(() => {
    const t = setTimeout(() => {
      load({ search, batch: batchFilter, subject_name: subjectFilter, is_active: statusFilter });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, batchFilter, subjectFilter, statusFilter]);

  const knownBatches = useMemo(
    () => [...new Set(students.map((s) => s.batch).filter(Boolean))].sort(),
    [students]
  );

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/admin/students', { ...form, professor_id: form.professor_id || null });
      toast.success('Student added.');
      setForm(emptyForm);
      load({ search, batch: batchFilter, subject_name: subjectFilter, is_active: statusFilter });
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
      load({ search, batch: batchFilter, subject_name: subjectFilter, is_active: statusFilter });
    } catch (err) {
      toast.error('Failed to update mapping.');
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name} (Roll No. ${student.roll_number})? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/students/${student.id}`);
      toast.success('Student deleted.');
      load({ search, batch: batchFilter, subject_name: subjectFilter, is_active: statusFilter });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student.');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Add PG Student</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <StudentFormFields form={form} onChange={handleChange} professors={professors} />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              placeholder="Search by name, roll no., father's name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm lg:col-span-2"
            />
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">All Batches</option>
              {knownBatches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Father's Name</th>
                <th className="px-4 py-2">Roll No.</th>
                <th className="px-4 py-2">Subject Name</th>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Status</th>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {s.phms && s.stipend_from_college === false && (
                      <span className="block mt-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 w-fit" title="PHMS, no stipend from college -- attendance only, no stipend calculation">
                        No Stipend (PHMS)
                      </span>
                    )}
                  </td>
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
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link to={`/admin/students/${s.id}/report`} className="text-xs text-blue-600 hover:underline mr-3">
                      Leave Register
                    </Link>
                    <button onClick={() => setEditingStudent(s)} className="text-xs text-blue-600 hover:underline mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No students match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          professors={professors}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            load({ search, batch: batchFilter, subject_name: subjectFilter, is_active: statusFilter });
          }}
        />
      )}
    </div>
  );
}
