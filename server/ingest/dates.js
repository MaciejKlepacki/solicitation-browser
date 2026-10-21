// Small date helpers; all dates handled as ISO yyyy-mm-dd strings.

export function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "MM/DD/YY" or "MM-DD-YYYY" -> ISO
export function usToIso(s) {
  const m = s?.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (!m) return null;
  let y = +m[3];
  if (y < 100) y += 2000;
  return toIso(y, +m[1], +m[2]);
}

// "261020" (yymmdd, from file names) -> ISO
export function yymmddToIso(s) {
  const m = s.match(/^(\d{2})(\d{2})(\d{2})$/);
  return m ? toIso(2000 + +m[1], +m[2], +m[3]) : null;
}

export function isoToUs(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}-${d}-${y}`;
}

export function todayIso() {
  // DIBBS operates on US Eastern time; good enough for daily granularity.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
