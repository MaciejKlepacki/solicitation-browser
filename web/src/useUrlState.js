import { useCallback, useState } from 'react';

// Filter state lives in the URL query string so a view can be bookmarked or shared.
const LIST_KEYS = new Set(['set_aside', 'sol_type', 'fsg', 'fsc', 'amsc']);

export const DEFAULTS = {
  q: '', issued_days: '', closing_days: '', include_closed: '', set_aside: [], sol_type: [], fsg: [],
  fsc: [], amsc: [], qty_min: '', qty_max: '', tech_docs: '', status: '', sort: 'return_by', dir: 'asc', page: 1, per_page: 50,
};

function read() {
  const sp = new URLSearchParams(window.location.search);
  const s = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) {
    const v = sp.get(k);
    if (v === null) continue;
    s[k] = LIST_KEYS.has(k) ? v.split(',').filter(Boolean) : k === 'page' || k === 'per_page' ? Number(v) || DEFAULTS[k] : v;
  }
  return s;
}

function write(s) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(s)) {
    const d = DEFAULTS[k];
    if (Array.isArray(v) ? v.length === 0 : v === d || v === '' || v === null) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const qs = sp.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

export function useUrlState() {
  const [state, setState] = useState(read);
  const update = useCallback((patch) => {
    setState((prev) => {
      // Any filter change goes back to page 1 unless the page itself changed.
      const next = { ...prev, ...patch, ...('page' in patch ? {} : { page: 1 }) };
      write(next);
      return next;
    });
  }, []);
  const reset = useCallback(() => { write(DEFAULTS); setState({ ...DEFAULTS }); }, []);
  return [state, update, reset];
}
