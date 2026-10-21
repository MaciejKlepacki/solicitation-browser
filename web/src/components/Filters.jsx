import { useState } from 'react';
import { SET_ASIDE, SOL_TYPE } from '../format.js';

function Section({ index, title, children, hint }) {
  return (
    <section className="border-b border-line py-3.5 last:border-0">
      <h3 className="label mb-2 text-ink"><span className="text-primary">{index}</span> {title}</h3>
      {hint && <p className="mb-2 text-[11px] leading-snug text-ink-muted">{hint}</p>}
      {children}
    </section>
  );
}

function Check({ checked, onChange, label, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-[3px] text-[13px] text-ink-muted hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded-none border-line-strong accent-primary" />
      <span className="flex-1 truncate">{label}</span>
      {count != null && <span className="mono text-[11px] text-ink-faint">{count.toLocaleString('en-US')}</span>}
    </label>
  );
}

const field = 'w-full border border-line-strong bg-white px-2 py-1.5 text-[13px] outline-none focus:border-primary';

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={field}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export default function Filters({ state, update, facets }) {
  const [fsgQuery, setFsgQuery] = useState('');
  const toggleIn = (key, value) => {
    const cur = state[key];
    update({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };
  const fsgOptions = (facets?.fsg || []).filter((f) => !fsgQuery || `${f.value} ${f.label}`.toLowerCase().includes(fsgQuery.toLowerCase()));

  return (
    <aside className="w-64 shrink-0 self-start border border-line bg-surface px-3 py-1">
      <Section index="01" title="Issued">
        <Select value={state.issued_days} onChange={(v) => update({ issued_days: v })} options={[['', 'Any date'], ['1', 'Today'], ['2', 'Last 2 days'], ['3', 'Last 3 days'], ['7', 'Last 7 days']]} />
      </Section>

      <Section index="02" title="Quote due" hint="Return-by date relative to today">
        <Select value={state.closing_days} onChange={(v) => update({ closing_days: v })} options={[['', 'Any open RFQ'], ['0', 'Due today'], ['3', 'Within 3 days'], ['7', 'Within 7 days'], ['14', 'Within 14 days'], ['30', 'Within 30 days']]} />
        <div className="mt-1.5">
          <Check label="Include closed RFQs" checked={state.include_closed === '1'} onChange={(e) => update({ include_closed: e.target.checked ? '1' : '', closing_days: '' })} />
        </div>
      </Section>

      <Section index="03" title="Set-aside" hint="Who is allowed to bid">
        {(facets?.set_aside || []).map((f) => (
          <Check key={f.value} label={SET_ASIDE[f.value]?.label || f.label} count={f.n} checked={state.set_aside.includes(f.value)} onChange={() => toggleIn('set_aside', f.value)} />
        ))}
      </Section>

      <Section index="04" title="RFQ type" hint="Fast award = micro-purchase, may be awarded before due date">
        {(facets?.sol_type || []).map((f) => (
          <Check key={f.value} label={SOL_TYPE[f.value]?.label || f.label} count={f.n} checked={state.sol_type.includes(f.value)} onChange={() => toggleIn('sol_type', f.value)} />
        ))}
      </Section>

      <Section index="05" title="Category (FSG)" hint="First two digits of the NSN">
        <input value={fsgQuery} onChange={(e) => setFsgQuery(e.target.value)} placeholder="Filter categories…" className={`${field} mb-1 py-1 text-xs`} />
        <div className="max-h-56 overflow-y-auto pr-1">
          {fsgOptions.map((f) => (
            <Check key={f.value} label={`${f.value} · ${f.label || 'Other'}`} count={f.n} checked={state.fsg.includes(f.value)} onChange={() => toggleIn('fsg', f.value)} />
          ))}
          {fsgOptions.length === 0 && <p className="py-1 text-xs text-ink-faint">No categories</p>}
        </div>
      </Section>

      <Section index="06" title="Tech data (AMSC)" hint="Whether drawings/data are available to bid">
        {(facets?.amsc || []).map((f) => (
          <Check key={f.value} label={f.label || f.value} count={f.n} checked={state.amsc.includes(f.value)} onChange={() => toggleIn('amsc', f.value)} />
        ))}
      </Section>

      <Section index="07" title="Quantity">
        <div className="flex items-center gap-2">
          <input type="number" min="0" placeholder="min" value={state.qty_min} onChange={(e) => update({ qty_min: e.target.value })} className={`${field} mono py-1`} />
          <span className="text-ink-faint">–</span>
          <input type="number" min="0" placeholder="max" value={state.qty_max} onChange={(e) => update({ qty_max: e.target.value })} className={`${field} mono py-1`} />
        </div>
      </Section>

      <Section index="08" title="Other">
        <Check label="Has technical documents" checked={state.tech_docs === '1'} onChange={(e) => update({ tech_docs: e.target.checked ? '1' : '' })} />
        <Check label="Show removed RFQs" checked={state.status === 'all'} onChange={(e) => update({ status: e.target.checked ? 'all' : '' })} />
      </Section>
    </aside>
  );
}
