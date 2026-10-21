// Parser for the DIBBS daily "in" index file (inYYMMDD.txt): fixed-width, one line per RFQ line item.
// Layout per https://www.dibbs.bsm.dla.mil/Rfq/RfqFileDefs.aspx
import { usToIso } from './dates.js';
import { DIBBS_FILES } from './dibbs.js';

const LAYOUT = [
  ['solicitation', 13],
  ['nsn', 46],
  ['pr', 13],
  ['return_by', 8],
  ['file', 19],
  ['qty', 7],
  ['unit', 2],
  ['nomenclature', 21],
  ['buyer_code', 5],
  ['amsc', 1],
  ['item_type', 1],
  ['set_aside', 1],
  ['set_aside_pct', 3],
];

export function pdfUrl(solicitation, file) {
  // PDFs live in a folder named after the last digit of the solicitation number.
  const name = file || `${solicitation}.pdf`;
  return `${DIBBS_FILES}/Downloads/RFQ/${solicitation.slice(-1)}/${name.toUpperCase()}`;
}

export function parseIndexLine(line, issueDate) {
  let pos = 0;
  const raw = {};
  for (const [name, len] of LAYOUT) {
    raw[name] = line.slice(pos, pos + len).trim();
    pos += len;
  }
  if (!raw.solicitation) return null;
  const nsn = raw.nsn.replace(/-/g, '');
  return {
    solicitation: raw.solicitation,
    pr: raw.pr || null,
    nsn,
    fsc: raw.item_type === '1' && /^\d{13}$/.test(nsn) ? nsn.slice(0, 4) : null,
    item_type: raw.item_type || null,
    nomenclature: raw.nomenclature || null,
    qty: raw.qty ? parseInt(raw.qty, 10) : null,
    unit: raw.unit || null,
    issue_date: issueDate,
    return_by: usToIso(raw.return_by),
    set_aside: raw.set_aside || 'N',
    set_aside_pct: raw.set_aside_pct ? parseInt(raw.set_aside_pct, 10) : null,
    amsc: raw.amsc || null,
    buyer_code: raw.buyer_code || null,
    pdf_url: pdfUrl(raw.solicitation, raw.file),
  };
}

export function parseIndexFile(text, issueDate) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => parseIndexLine(l, issueDate))
    .filter(Boolean);
}
