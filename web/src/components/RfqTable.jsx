import Badge from './Badge.jsx';
import { dibbsRecordUrl, dibbsNsnUrl } from '../api.js';
import { formatSolicitation, formatNsn, formatDate, daysBetween, SET_ASIDE, SOL_TYPE, nf } from '../format.js';

const COLS = [
  { key: 'nsn', label: 'NSN / Part', sort: null },
  { key: 'nomenclature', label: 'Nomenclature', sort: 'nomenclature' },
  { key: 'solicitation', label: 'Solicitation', sort: 'solicitation' },
  { key: 'qty', label: 'Qty', sort: 'qty', right: true },
  { key: 'issue_date', label: 'Issued', sort: 'issue_date' },
  { key: 'return_by', label: 'Quote due', sort: 'return_by' },
  { key: 'links', label: '', sort: null },
];

function DueCell({ iso, today }) {
  if (!iso) return <span className="text-ink-faint">–</span>;
  const d = daysBetween(today, iso);
  let cls = 'text-ink-muted';
  let note = `${d}d`;
  if (d < 0) { cls = 'text-ink-faint'; note = 'closed'; }
  else if (d === 0) { cls = 'text-alert'; note = 'today'; }
  else if (d <= 3) { cls = 'text-alert'; }
  else if (d <= 7) { cls = 'text-primary'; }
  return (
    <div className="leading-tight">
      <div className="mono">{formatDate(iso)}</div>
      <div className={`label mt-0.5 ${cls}`}>{note}</div>
    </div>
  );
}

const linkBtn = 'label border border-line-strong bg-white px-2 py-[5px] leading-none text-ink hover:border-primary hover:text-primary';

function Row({ r, today }) {
  const sa = SET_ASIDE[r.set_aside];
  const st = SOL_TYPE[r.sol_type];
  const removed = r.status === 'Removed';
  const hasDocs = r.tech_docs && r.tech_docs !== 'None';
  return (
    <tr className={`border-b border-line hover:bg-primary-soft ${removed ? 'opacity-50' : ''}`}>
      <td className="px-3 py-2.5 align-top">
        <a href={dibbsNsnUrl(r.nsn)} target="_blank" rel="noreferrer" className="mono whitespace-nowrap text-[13px] text-ink hover:text-primary" title="All RFQs for this NSN on DIBBS">{formatNsn(r.nsn)}</a>
        {r.item_type === '2' && <div className="label mt-0.5 text-ink-faint">part no.</div>}
      </td>
      <td className="max-w-[320px] px-3 py-2.5 align-top">
        <div className="truncate text-sm font-medium text-ink" title={r.nomenclature || ''}>{r.nomenclature || <span className="text-ink-faint">—</span>}</div>
        <div className="label mt-0.5 truncate text-ink-faint">{r.fsc && <span>{r.fsc}</span>}{r.fsg_name && <> · {r.fsg_name}</>}</div>
      </td>
      <td className="px-3 py-2.5 align-top">
        <a href={dibbsRecordUrl(r.solicitation)} target="_blank" rel="noreferrer" className="mono whitespace-nowrap text-[13px] text-ink hover:text-primary">{formatSolicitation(r.solicitation)}</a>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sa && r.set_aside !== 'N' && <Badge cls={sa.cls} title={sa.label}>{sa.short}</Badge>}
          {st && r.sol_type !== 'M' && <Badge cls={st.cls}>{st.label}</Badge>}
          {hasDocs && <Badge title={r.tech_docs}>Tech docs</Badge>}
          {removed && <Badge cls="border-alert text-alert">Removed</Badge>}
        </div>
        {r.pr && <div className="label mt-1 text-ink-faint">PR <span className="normal-case">{r.pr}</span></div>}
      </td>
      <td className="px-3 py-2.5 text-right align-top">
        <div className="mono text-[13px]">{r.qty == null ? '–' : nf.format(r.qty)}</div>
        {r.unit && <div className="label mt-0.5 whitespace-nowrap text-ink-faint">{r.unit}{r.delivery_days ? ` · ${r.delivery_days}d dlvy` : ''}</div>}
      </td>
      <td className="mono px-3 py-2.5 align-top text-[13px] text-ink-muted">{formatDate(r.issue_date)}</td>
      <td className="px-3 py-2.5 align-top text-[13px]"><DueCell iso={r.return_by} today={today} /></td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex gap-1">
          <a href={dibbsRecordUrl(r.solicitation)} target="_blank" rel="noreferrer" className={linkBtn}>DIBBS →</a>
          {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer" className={linkBtn}>PDF</a>}
        </div>
      </td>
    </tr>
  );
}

export default function RfqTable({ rows, today, sort, dir, onSort, loading, error }) {
  return (
    <div className="border border-line bg-white">
      <table className="w-full border-collapse text-left">
        <thead className="bg-surface">
          <tr>
            {COLS.map((c) => {
              const active = c.sort && sort === c.sort;
              return (
                <th key={c.key} className={`label border-b border-line px-3 py-2.5 font-normal text-ink-muted ${c.right ? 'text-right' : ''}`}>
                  {c.sort ? (
                    <button onClick={() => onSort(c.sort)} className={`label inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}`}>
                      {c.label}
                      <span className={active ? 'text-primary' : 'text-ink-faint'}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          {rows.map((r) => <Row key={r.id} r={r} today={today} />)}
          {!loading && !error && rows.length === 0 && (
            <tr><td colSpan={COLS.length} className="px-3 py-14 text-center text-sm text-ink-muted">
              No RFQs match these filters. Try clearing a filter or widening the date range.
              <div className="label mt-2 text-ink-faint">If the database is empty, run <span className="normal-case">npm run fetch</span> first.</div>
            </td></tr>
          )}
          {error && (
            <tr><td colSpan={COLS.length} className="px-3 py-14 text-center text-sm text-alert">Could not load RFQs: {error}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
