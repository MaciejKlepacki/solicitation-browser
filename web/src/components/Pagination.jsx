export default function Pagination({ page, perPage, total, onPage, onPerPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / perPage));
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(total || 0, page * perPage);
  const btn = 'label border border-line-strong bg-white px-2.5 py-[7px] leading-none text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-30';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="label text-ink-muted">Showing <span className="mono normal-case text-ink">{from.toLocaleString('en-US')}–{to.toLocaleString('en-US')}</span> of <span className="mono normal-case text-ink">{(total || 0).toLocaleString('en-US')}</span></div>
      <div className="flex items-center gap-1.5">
        <select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))} className="label border border-line-strong bg-white px-2 py-[6px] text-ink outline-none focus:border-primary">
          {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button className={btn} disabled={page <= 1} onClick={() => onPage(1)}>«</button>
        <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <span className="mono px-2 text-xs text-ink-muted">{page} / {pages}</span>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
        <button className={btn} disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
      </div>
    </div>
  );
}
