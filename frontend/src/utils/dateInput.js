// Postgres DATE columns come back as full ISO timestamps at local midnight (e.g.
// "2025-01-14T18:30:00.000Z" for 15 Jan in UTC+5:30) -- slicing the ISO string grabs the
// UTC calendar date and is off by a day whenever the local offset is non-zero. Reading back
// local getFullYear/getMonth/getDate recovers the right date for an <input type="date">.
export function toDateInputValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
