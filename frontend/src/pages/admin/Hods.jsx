import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';
import { DEPARTMENTS } from '../../constants/departments';

const emptyForm = { name: '', email: '', password: '', department: '', phone: '' };

export default function Hods() {
  const [hods, setHods] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await apiClient.get('/admin/hods');
    setHods(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/admin/hods', form);
      toast.success('HoD account created.');
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create HoD.');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (hod) => {
    try {
      await apiClient.patch(`/admin/hods/${hod.id}/status`, { is_active: !hod.is_active });
      load();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Create HoD Login</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="name" required placeholder="Full name" value={form.name} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input name="password" type="password" required placeholder="Temporary password" value={form.password} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <select name="department" required value={form.department} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Creating...' : 'Create HoD'}
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
              {hods.map((h) => (
                <tr key={h.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{h.name}</td>
                  <td className="px-4 py-2">{h.email}</td>
                  <td className="px-4 py-2">{h.department}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {h.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => toggleActive(h)} className="text-xs text-blue-600 hover:underline">
                      {h.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {hods.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No HoDs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
