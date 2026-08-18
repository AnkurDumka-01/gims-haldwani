import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { generatePassword } from '../utils/password';

// "Reset Password" flow for an existing professor/HoD login -- lets admin set a fresh
// password on demand (e.g. the original was lost) without ever needing to read back the
// old one. Confirming calls onReset(newPassword); the caller PUTs it and then shows the
// result in CredentialsModal.
export default function ResetPasswordModal({ title, name, onClose, onReset }) {
  const [password, setPassword] = useState(() => generatePassword());
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onReset(password);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-1">{title}</h2>
        <p className="text-xs text-gray-500 mb-4">{name}'s current password can't be recovered (it's securely hashed) -- set a new one below and hand it to them.</p>

        <label className="block text-xs text-gray-500 mb-1">New Password</label>
        <div className="flex items-center gap-2 mb-4">
          <input value={password} onChange={(e) => setPassword(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono" />
          <button type="button" onClick={() => setPassword(generatePassword())}
            className="shrink-0 border border-gray-300 rounded-md p-2 text-gray-600 hover:bg-gray-50" title="Generate another">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={saving || !password}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
