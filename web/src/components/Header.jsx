import { nf } from '../format.js';

function Stat({ index, label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 border-l border-white/15 pl-4">
      <span className="label text-white/50"><span className="text-primary-hover">{index}</span> {label}</span>
      <span className={`mono text-xl leading-none ${accent || 'text-white'}`}>{value == null ? '–' : nf.format(value)}</span>
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 7l9 11 9-11" /><path d="M7.5 7l4.5 5.5L16.5 7" />
    </svg>
  );
}

export default function Header({ stats }) {
  const range = stats?.date_range;
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-4">
          <Mark />
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.02em]">Solicitation Browser</h1>
            <p className="label mt-1 text-white/50">
              DLA DIBBS · RFQ feed
              {range?.from_date && <> · {range.from_date} → {range.to_date}</>}
              {stats?.last_import && <> · synced {new Date(stats.last_import).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          </div>
        </div>
        <div className="flex gap-6">
          <Stat index="01" label="Open RFQs" value={stats?.open} />
          <Stat index="02" label="Issued today" value={stats?.issued_today} />
          <Stat index="03" label="Closing in 7d" value={stats?.closing_7d} accent="text-primary-hover" />
          <Stat index="04" label="Fast award" value={stats?.fast_award} />
        </div>
      </div>
    </header>
  );
}
