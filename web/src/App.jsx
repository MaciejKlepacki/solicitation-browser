import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useUrlState } from './useUrlState.js';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import Filters from './components/Filters.jsx';
import RfqTable from './components/RfqTable.jsx';
import Pagination from './components/Pagination.jsx';

const FILTER_KEYS = ['q', 'issued_days', 'closing_days', 'include_closed', 'set_aside', 'sol_type', 'fsg', 'fsc', 'amsc', 'qty_min', 'qty_max', 'tech_docs', 'status'];
const pick = (s, keys) => Object.fromEntries(keys.map((k) => [k, s[k]]));

export default function App() {
  const [state, update, reset] = useUrlState();
  const [stats, setStats] = useState(null);
  const [facets, setFacets] = useState(null);
  const [data, setData] = useState({ rows: [], total: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  // Rows + facets refetch together; stale responses are dropped by request id.
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const filters = pick(state, FILTER_KEYS);
    Promise.all([
      api.rfqs({ ...filters, sort: state.sort, dir: state.dir, page: state.page, per_page: state.per_page }),
      api.facets(filters),
    ]).then(([rfqs, fac]) => {
      if (id !== reqId.current) return;
      setData(rfqs); setFacets(fac); setError(null);
    }).catch((e) => { if (id === reqId.current) setError(e.message); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [state]);

  const onSort = (col) => update({ sort: col, dir: state.sort === col && state.dir === 'asc' ? 'desc' : 'asc', page: state.page });
  const today = stats?.today || new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen">
      <Header stats={stats} />
      <SearchBar state={state} update={update} reset={reset} total={data.total} loading={loading} />
      <main className="mx-auto flex max-w-[1500px] gap-5 px-6 py-5">
        <Filters state={state} update={update} facets={facets} />
        <div className="min-w-0 flex-1">
          <RfqTable rows={data.rows} today={today} sort={state.sort} dir={state.dir} onSort={onSort} loading={loading} error={error} />
          <Pagination page={state.page} perPage={state.per_page} total={data.total} onPage={(p) => update({ page: p })} onPerPage={(n) => update({ per_page: n })} />
        </div>
      </main>
    </div>
  );
}
