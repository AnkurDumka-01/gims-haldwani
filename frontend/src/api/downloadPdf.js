import apiClient from './client';

export async function downloadAttendancePdf(url, filename) {
  try {
    const response = await apiClient.get(url, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // With responseType: 'blob', an error response (e.g. the 409 a PHMS/no-stipend student
    // gets back) arrives as a Blob too, not parsed JSON -- so err.response.data.message is
    // normally undefined and callers fall back to a generic "failed" toast. Re-reading that
    // blob as text recovers the real backend message so it can still be shown.
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) err.response.data = parsed;
      } catch {
        // Not JSON (or empty) -- leave the original error as-is.
      }
    }
    throw err;
  }
}
