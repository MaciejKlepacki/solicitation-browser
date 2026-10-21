import { useEffect, useState } from 'react';

const QUICK = [
  { label: 'Issued today', patch: { issued_days: '1' }, active: (s) => s.issued_days === '1' },
  { label: 'Closing in 3 days', patch: { closing_days: '3' }, active: (s) => s.closing_days === '3' },
  { label: 'Fast award', patch: { sol_type: ['F'] }, active: (s) => s.sol_type.length === 1 && s.sol_type[0] === 'F' },
  { label: 'Small business set-aside', patch: { set_aside: ['Y', 'H', 'R', 'L', 'A', 'E'] }, active: (s) => s.set_aside.length > 0 && !s.set_aside.includes('N') },
  { label: 'Has tech docs', patch: { tech_docs: '1' }, active: (s) => s.tech_docs === '1' },
];

export default function SearchBar({ state, update, reset, total, loading }) {
  const [text, setText] = useState(state.q);
  useEffect(() => { setText(state.q); }, [state.q]);
  // Debounce typing so the API is not hit on every keystroke.
  useEffect(() => {
    if (text === state.q) return;
    const t = setTimeout(() => update({ q: text }), 250);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (chip) => {
    if (chip.active(state)) {
      const cleared = Object.fromEntries(Object.keys(chip.patch).map((k) => [k, Array.isArray(chip.patch[k]) ? [] : '']));
      update(cleared);
    } else update(chip.patch);
  };

  return (
    <div className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-6 py-3">
        <div className="relative min-w-[300px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search NSN, part number, nomenclature, solicitation or PR…"
            className="w-full border border-line-strong bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-ink-faint focus:border-primary"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((chip) => {
            const on = chip.active(state);
            return (
              <button
                key={chip.label}
                onClick={() => toggle(chip)}
                className={`label border px-2.5 py-[7px] leading-none transition ${on ? 'border-primary bg-primary text-white' : 'border-line-strong bg-white text-ink hover:border-ink'}`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className={`label text-ink-muted ${loading ? 'opacity-50' : ''}`}>
            <span className="mono text-sm normal-case tracking-normal text-ink">{total == null ? '…' : total.toLocaleString('en-US')}</span> results
          </span>
          <button onClick={reset} className="label text-ink-muted hover:text-primary">Clear all →</button>
        </div>
      </div>
    </div>
  );
}
