import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

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
    </div>
  );
}
