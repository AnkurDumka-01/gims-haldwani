// Passwords are bcrypt-hashed server-side and never stored in recoverable form (correct,
// standard practice) -- so there is no "look up the password later" endpoint. What admins
// actually need for "future use" is: (1) see it clearly right when it's set, with an easy
// copy action, and (2) a one-click way to set a fresh one later if it's been lost. This
// generates that fresh one.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

export function generatePassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('');
}
