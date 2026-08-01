import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

export default function MyStudents() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    apiClient.get('/professor/students').then(({ data }) => setStudents(data));
  }, []);

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">My PG Students</h2>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Roll No.</th>
              <th className="px-4 py-2">Subject Name</th>
              <th className="px-4 py-2">Batch</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{s.roll_number}</td>
                <td className="px-4 py-2">{s.subject_name}</td>
                <td className="px-4 py-2">{s.batch || '-'}</td>
                <td className="px-4 py-2 text-right">
                  <Link to={`/professor/students/${s.id}/report`} className="text-xs text-blue-600 hover:underline">
                    Annual Report
                  </Link>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No students mapped to you yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
