import { useState } from 'react';
import { toast } from 'react-toastify';
import { UploadCloud, Download } from 'lucide-react';
import apiClient from '../../api/client';

export default function ImportStudents() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = async () => {
    try {
      const res = await apiClient.get('/admin/students/import-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gims-student-import-template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Choose a filled-in .xlsx file first.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      if (res.data.created > 0) toast.success(`${res.data.created} of ${res.data.total} student(s) imported.`);
      if (res.data.errors > 0) toast.warn(`${res.data.errors} row(s) had errors -- see the table below.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setLoading(false);
      setFile(null);
      e.target.reset();
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-semibold text-gray-800 mb-2">Import PG Students from Excel</h2>
        <p className="text-sm text-gray-500 mb-4">
          Download the template, fill in one row per student (Name, Roll Number and Subject Name are required;
          everything else is optional), then upload it back. Each row is validated and inserted independently --
          a mistake on one row won't stop the rest from being imported.
        </p>

        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 mb-6"
        >
          <Download className="w-4 h-4" /> Download Template (.xlsx)
        </button>

        <form onSubmit={handleUpload} className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <UploadCloud className="w-4 h-4" /> {loading ? 'Importing...' : 'Upload & Import'}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="font-medium text-gray-800">{result.total} row(s) processed</span>
            <span className="text-green-700">{result.created} created</span>
            <span className="text-red-600">{result.errors} error(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.row} className="border-t border-gray-100">
                    <td className="px-3 py-2">{r.row}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">
                      <span className={r.status === 'created' ? 'text-green-700' : 'text-red-600'}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
