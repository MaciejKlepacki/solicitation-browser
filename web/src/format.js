// Display helpers shared by the table and badges.

// SPE1C127Q0091 -> SPE1C1-27-Q-0091 (the way DIBBS prints it)
export function formatSolicitation(s) {
  if (!s || s.includes('-') || s.length !== 13) return s || '';
  return `${s.slice(0, 6)}-${s.slice(6, 8)}-${s.slice(8, 9)}-${s.slice(9)}`;
}

// 8475015373803 -> 8475-01-537-3803; part numbers pass through
export function formatNsn(nsn) {
  if (!nsn || !/^\d{13}$/.test(nsn)) return nsn || '';
  return `${nsn.slice(0, 4)}-${nsn.slice(4, 6)}-${nsn.slice(6, 9)}-${nsn.slice(9)}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const a = new Date(`${fromIso}T12:00:00Z`);
  const b = new Date(`${toIso}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Badges: mono, uppercase, 1px border, no fill. Set-asides in ink, RFQ types in blue.
const INK = 'border-line-strong text-ink';
const BLUE = 'border-primary text-primary';
const MUTED = 'border-line text-ink-muted';

export const SET_ASIDE = {
  N: { label: 'Unrestricted', short: 'Open', cls: MUTED },
  Y: { label: 'Small Business', short: 'SB', cls: INK },
  H: { label: 'HUBZone', short: 'HUB', cls: INK },
  R: { label: 'SDVOSB', short: 'SDVOSB', cls: INK },
  L: { label: 'Woman-Owned SB', short: 'WOSB', cls: INK },
  A: { label: '8(a)', short: '8(a)', cls: INK },
  E: { label: 'EDWOSB', short: 'EDWOSB', cls: INK },
};

export const SOL_TYPE = {
  F: { label: 'Fast Award', cls: `${BLUE} bg-primary-soft` },
  P: { label: 'Auto-eval', cls: BLUE },
  I: { label: 'AIDC', cls: BLUE },
  M: { label: 'Manual', cls: MUTED },
};

export const nf = new Intl.NumberFormat('en-US');
