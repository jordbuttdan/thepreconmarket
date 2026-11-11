/** '2027-03-31' -> 'March 31st, 2027'. Parsed as plain parts, so no timezone shift. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const suffix = d % 100 >= 11 && d % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][d % 10] ?? 'th');
  return `${months[m - 1]} ${d}${suffix}, ${y}`;
}
