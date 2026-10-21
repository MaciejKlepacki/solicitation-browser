// Parser for the DIBBS batch-quote file (bqYYMMDD.txt inside bqYYMMDD.zip): comma delimited,
// double-quoted, 121 columns. We only lift the handful of fields that describe the RFQ itself.
// Column numbers (1-based) per https://www.dibbs.bsm.dla.mil/Refs/help/Quoting/Batch/BatchFormat.aspx

const COL = {
  solicitation: 1,
  sol_type: 2,        // F fast auto evaluation, P auto evaluation, I AIDC, blank = manual
  set_aside: 3,
  fob: 32,            // O origin, D destination
  inspection_point: 36,
  line_no: 44,
  pr: 46,
  nsn: 47,
  unit: 48,
  qty: 49,
  delivery_days: 51,
};

export function parseBatchLine(line) {
  const t = line.trim();
  if (!t.startsWith('"')) return null;
  const f = t.slice(1, t.endsWith('"') ? -1 : undefined).split('","');
  const get = (n) => (f[n - 1] ?? '').trim();
  const solicitation = get(COL.solicitation);
  if (!solicitation) return null;
  return {
    solicitation,
    pr: get(COL.pr) || null,
    sol_type: get(COL.sol_type) || 'M',
    set_aside: get(COL.set_aside) || null,
    fob: get(COL.fob) || null,
    inspection_point: get(COL.inspection_point) || null,
    delivery_days: get(COL.delivery_days) ? parseInt(get(COL.delivery_days), 10) : null,
    line_no: get(COL.line_no) || null,
  };
}

// Returns Map keyed by "solicitation:pr" (first line item wins when a PR spans several lines).
export function parseBatchFile(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const r = parseBatchLine(line);
    if (!r) continue;
    const key = `${r.solicitation}:${r.pr ?? ''}`;
    if (!out.has(key)) out.set(key, r);
  }
  return out;
}
