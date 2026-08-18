import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Shown right after a login is created or its password is reset -- the one and only moment
// the plaintext password is available anywhere (it's bcrypt-hashed immediately after this).
// Admin should copy/note it down here for handing to the professor/HoD.
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 select-all">{value}</code>
        <button type="button" onClick={copy}
          className="shrink-0 border border-gray-300 rounded-md p-2 text-gray-600 hover:bg-gray-50" title="Copy">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function CredentialsModal({ title, name, email, password, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-1">{title}</h2>
        <p className="text-xs text-gray-500 mb-4">{name} — save these now. For security this password is never stored or shown again after you close this window.</p>
        <div className="space-y-3">
          <CopyField label="Username (Email)" value={email} />
          <CopyField label="Password" value={password} />
        </div>
        <button type="button" onClick={onClose}
          className="w-full mt-5 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700">
          Done, I've saved these
        </button>
      </div>
    </div>
  );
}
