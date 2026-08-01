import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Check, X, Pencil } from 'lucide-react';
import apiClient from '../../api/client';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700',
  hod_approved: 'bg-blue-100 text-blue-700',
  hod_rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-500',
};

export default function AttendanceReview() {
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    const { data } = await apiClient.get('/hod/attendance', {
      params: statusFilter ? { status: statusFilter } : {},
    });
    setRecords(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({
      total_working_days: r.total_working_days,
      days_present: r.days_present,
      cl_days: r.cl_days,
      academic_leave_days: r.academic_leave_days,
      special_leave_days: r.special_leave_days,
      absent_days: r.absent_days,
      remarks: r.remarks || '',
    });
  };

  const saveEdit = async (id) => {
    try {
      await apiClient.put(`/hod/attendance/${id}`, editForm);
      toast.success('Record updated.');
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update.');
    }
  };

  const approve = async (id) => {
    try {
      await apiClient.post(`/hod/attendance/${id}/approve`);
      toast.success('Attendance approved and sent to admin.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve.');
    }
  };

  const submitReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    try {
      await apiClient.post(`/hod/attendance/${id}/reject`, { reason: rejectReason });
      toast.success('Attendance rejected.');
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject.');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-semibold text-gray-800 mr-4">Attendance Review</h2>
        {['pending', 'hod_approved', 'hod_rejected', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm capitalize ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {(s || 'All').replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Roll No.</th>
              <th className="px-4 py-2">Professor</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Working Days</th>
              <th className="px-4 py-2">Present</th>
              <th className="px-4 py-2">CL</th>
              <th className="px-4 py-2">Academic</th>
              <th className="px-4 py-2">Special</th>
              <th className="px-4 py-2">Absent</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-2">{r.student_name}</td>
                <td className="px-4 py-2">{r.roll_number}</td>
                <td className="px-4 py-2">{r.professor_name}</td>
                <td className="px-4 py-2">{MONTHS[r.month - 1]} {r.year}</td>

                {editingId === r.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={editForm.total_working_days}
                        onChange={(e) => setEditForm({ ...editForm, total_working_days: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={editForm.days_present}
                        onChange={(e) => setEditForm({ ...editForm, days_present: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={editForm.cl_days}
                        onChange={(e) => setEditForm({ ...editForm, cl_days: e.target.value })}
                        className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={editForm.academic_leave_days}
                        onChange={(e) => setEditForm({ ...editForm, academic_leave_days: e.target.value })}
                        className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={editForm.special_leave_days}
                        onChange={(e) => setEditForm({ ...editForm, special_leave_days: e.target.value })}
                        className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={editForm.absent_days}
                        onChange={(e) => setEditForm({ ...editForm, absent_days: e.target.value })}
                        className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs" />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2">{r.total_working_days}</td>
                    <td className="px-4 py-2">{r.days_present}</td>
                    <td className="px-4 py-2">{r.cl_days}</td>
                    <td className="px-4 py-2">{r.academic_leave_days}</td>
                    <td className="px-4 py-2">{r.special_leave_days}</td>
                    <td className="px-4 py-2">{r.absent_days}</td>
                  </>
                )}

                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_STYLE[r.status]}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  {r.status === 'hod_rejected' && r.hod_rejection_reason && (
                    <div className="text-xs text-gray-400 mt-1 max-w-[160px]">{r.hod_rejection_reason}</div>
                  )}
                  {r.status === 'rejected' && r.rejection_reason && (
                    <div className="text-xs text-gray-400 mt-1 max-w-[160px]">Admin: {r.rejection_reason}</div>
                  )}
                </td>

                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    {r.status === 'pending' && editingId !== r.id && (
                      <button title="Edit" onClick={() => startEdit(r)} className="text-gray-500 hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {editingId === r.id && (
                      <button onClick={() => saveEdit(r.id)} className="text-xs text-blue-600 hover:underline">
                        Save
                      </button>
                    )}
                    {r.status === 'pending' && (
                      <>
                        <button title="Approve" onClick={() => approve(r.id)} className="text-gray-500 hover:text-green-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button title="Reject" onClick={() => setRejectingId(r.id)} className="text-gray-500 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {rejectingId === r.id && (
                    <div className="mt-2 flex flex-col gap-1 items-end">
                      <input
                        placeholder="Reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => submitReject(r.id)} className="text-xs text-red-600 hover:underline">Confirm</button>
                        <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={12} className="px-4 py-6 text-center text-gray-400">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
