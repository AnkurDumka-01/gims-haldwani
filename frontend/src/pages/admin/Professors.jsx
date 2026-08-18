import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';
import { DEPARTMENTS } from '../../constants/departments';
import CredentialsModal from '../../components/CredentialsModal';
import ResetPasswordModal from '../../components/ResetPasswordModal';

const emptyForm = { name: '', email: '', password: '', department: '', phone: '' };

function EditProfessorModal({ professor, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: professor.name || '', email: professor.email || '',
    department: professor.department || '', phone: professor.phone || '', password: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/admin/professors/${professor.id}`, form);
      toast.success('Professor details updated.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update professor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-4">Edit Professor</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" required placeholder="Full name" value={form.name} onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <select name="department" value={form.department} onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select department (optional)</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input name="password" type="password" placeholder="New password (leave blank to keep current)" value={form.password} onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
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

export default function Professors() {
  const [professors, setProfessors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState(null);
  const [resettingProfessor, setResettingProfessor] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const load = async () => {
    const { data } = await apiClient.get('/admin/professors');
    setProfessors(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/admin/professors', form);
      toast.success('Professor account created.');
      setCredentials({ name: form.name, email: form.email, password: form.password });
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create professor.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (professor, newPassword) => {
    try {
      await apiClient.put(`/admin/professors/${professor.id}`, { password: newPassword });
      setResettingProfessor(null);
      setCredentials({ name: professor.name, email: professor.email, password: newPassword });
      toast.success('Password reset.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const toggleActive = async (prof) => {
    try {
      await apiClient.patch(`/admin/professors/${prof.id}/status`, { is_active: !prof.is_active });
      load();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Create Professor Login</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="name" required placeholder="Full name" value={form.name} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="password" type="password" required placeholder="Temporary password" value={form.password} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <select name="department" value={form.department} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select department (optional)</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Creating...' : 'Create Professor'}
            </button>
          </form>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {professors.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.email}</td>
                  <td className="px-4 py-2">{p.department || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditingProfessor(p)} className="text-xs text-blue-600 hover:underline mr-3">
                      Edit
                    </button>
                    <button onClick={() => setResettingProfessor(p)} className="text-xs text-blue-600 hover:underline mr-3">
                      Reset Password
                    </button>
                    <button onClick={() => toggleActive(p)} className="text-xs text-blue-600 hover:underline">
                      {p.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {professors.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No professors yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingProfessor && (
        <EditProfessorModal
          professor={editingProfessor}
          onClose={() => setEditingProfessor(null)}
          onSaved={() => { setEditingProfessor(null); load(); }}
        />
      )}
      {resettingProfessor && (
        <ResetPasswordModal
          title="Reset Professor Password"
          name={resettingProfessor.name}
          onClose={() => setResettingProfessor(null)}
          onReset={(newPassword) => handleResetPassword(resettingProfessor, newPassword)}
        />
      )}
      {credentials && (
        <CredentialsModal
          title="Professor Login Credentials"
          {...credentials}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
