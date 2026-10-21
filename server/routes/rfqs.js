import { Router } from 'express';
import { fsgName, SET_ASIDE_NAMES, SOL_TYPE_NAMES, AMSC_NAMES } from '../fsc.js';
import { todayIso, addDays } from '../ingest/dates.js';

const SORTABLE = {
  return_by: 'return_by', issue_date: 'issue_date', qty: 'qty', solicitation: 'solicitation',
  nomenclature: 'nomenclature', fsc: 'fsc', delivery_days: 'delivery_days',
};
const PER_PAGE_MAX = 200;

const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);
const int = (v) => (v === undefined || v === '' ? null : Number.isFinite(+v) ? Math.trunc(+v) : null);

// Turn free text into an FTS5 prefix query: "pad helmet" -> "pad"* "helmet"*; NSN dashes are dropped.
export function ftsQuery(q) {
  const tokens = (q || '').replace(/(\d)-(?=\d)/g, '$1').match(/[\p{L}\p{N}]+/gu) || [];
  return tokens.map((t) => `"${t}"*`).join(' ');
}

export function buildWhere(query) {
  const where = [];
  const params = {};
  const today = todayIso();

  const q = ftsQuery(query.q);
  if (q) { where.push('rowid IN (SELECT rowid FROM rfqs_fts WHERE rfqs_fts MATCH @q)'); params.q = q; }

  if (query.issued_from) { where.push('issue_date >= @issued_from'); params.issued_from = query.issued_from; }
  if (query.issued_to) { where.push('issue_date <= @issued_to'); params.issued_to = query.issued_to; }
  if (int(query.issued_days) !== null) { where.push('issue_date >= @issued_since'); params.issued_since = addDays(today, -int(query.issued_days) + 1); }

  if (int(query.closing_days) !== null) {
    where.push('return_by >= @today AND return_by <= @closing_until');
    params.today = today; params.closing_until = addDays(today, int(query.closing_days));
  } else if (query.include_closed !== '1') {
    where.push('(return_by IS NULL OR return_by >= @today)'); params.today = today;
  }

  const inList = (col, values) => {
    if (!values.length) return;
    const keys = values.map((v, i) => { params[`${col}_${i}`] = v; return `@${col}_${i}`; });
    where.push(`${col} IN (${keys.join(',')})`);
  };
  inList('set_aside', list(query.set_aside));
  inList('sol_type', list(query.sol_type));
  inList('amsc', list(query.amsc));
  inList('fsc', list(query.fsc));
  inList('item_type', list(query.item_type));

  const fsg = list(query.fsg);
  if (fsg.length) { where.push(`substr(fsc,1,2) IN (${fsg.map((v, i) => { params[`fsg_${i}`] = v; return `@fsg_${i}`; }).join(',')})`); }

  if (int(query.qty_min) !== null) { where.push('qty >= @qty_min'); params.qty_min = int(query.qty_min); }
  if (int(query.qty_max) !== null) { where.push('qty <= @qty_max'); params.qty_max = int(query.qty_max); }
  if (int(query.delivery_max) !== null) { where.push('delivery_days <= @delivery_max'); params.delivery_max = int(query.delivery_max); }
  if (query.tech_docs === '1') where.push("tech_docs IS NOT NULL AND tech_docs <> '' AND tech_docs <> 'None'");
  if (query.status !== 'all') where.push("(status IS NULL OR status <> 'Removed')");

  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export function rfqRoutes(db) {
  const router = Router();

  router.get('/rfqs', (req, res) => {
    const { sql, params } = buildWhere(req.query);
    const sortCol = SORTABLE[req.query.sort] || 'return_by';
    const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
    const perPage = Math.min(PER_PAGE_MAX, Math.max(1, int(req.query.per_page) ?? 50));
    const page = Math.max(1, int(req.query.page) ?? 1);

    const total = db.prepare(`SELECT count(*) AS n FROM rfqs ${sql}`).get(params).n;
    const rows = db.prepare(
      `SELECT * FROM rfqs ${sql} ORDER BY ${sortCol} ${dir} NULLS LAST, solicitation ASC LIMIT @limit OFFSET @offset`
    ).all({ ...params, limit: perPage, offset: (page - 1) * perPage });

    res.json({
      total, page, per_page: perPage,
      rows: rows.map((r) => ({ ...r, fsg_name: r.fsc ? fsgName(r.fsc) : null })),
    });
  });

  // Facet counts for the current filter set (each facet ignores its own filter so options stay visible).
  router.get('/facets', (req, res) => {
    const facet = (col, omitKey, limit = 500) => {
      const q = { ...req.query }; delete q[omitKey];
      const { sql, params } = buildWhere(q);
      return db.prepare(
        `SELECT ${col} AS value, count(*) AS n FROM rfqs ${sql} ${sql ? 'AND' : 'WHERE'} ${col} IS NOT NULL
         GROUP BY ${col} ORDER BY n DESC LIMIT ${limit}`
      ).all(params);
    };
    res.json({
      set_aside: facet('set_aside', 'set_aside').map((f) => ({ ...f, label: SET_ASIDE_NAMES[f.value] || f.value })),
      sol_type: facet('sol_type', 'sol_type').map((f) => ({ ...f, label: SOL_TYPE_NAMES[f.value] || f.value })),
      amsc: facet('amsc', 'amsc').map((f) => ({ ...f, label: AMSC_NAMES[f.value] || f.value })),
      fsg: facet('substr(fsc,1,2)', 'fsg').map((f) => ({ ...f, label: fsgName(f.value) })),
      fsc: facet('fsc', 'fsc', 1000).map((f) => ({ ...f, label: fsgName(f.value) })),
      issue_date: facet('issue_date', 'issued_days'),
    });
  });

  router.get('/stats', (req, res) => {
    const today = todayIso();
    const one = (sql, p = {}) => db.prepare(sql).get(p);
    res.json({
      total: one('SELECT count(*) AS n FROM rfqs').n,
      solicitations: one('SELECT count(DISTINCT solicitation) AS n FROM rfqs').n,
      open: one('SELECT count(*) AS n FROM rfqs WHERE return_by >= @today AND (status IS NULL OR status <> @removed)', { today, removed: 'Removed' }).n,
      issued_today: one('SELECT count(*) AS n FROM rfqs WHERE issue_date = @today', { today }).n,
      closing_7d: one('SELECT count(*) AS n FROM rfqs WHERE return_by BETWEEN @today AND @until', { today, until: addDays(today, 7) }).n,
      fast_award: one('SELECT count(*) AS n FROM rfqs WHERE sol_type = @f AND return_by >= @today', { f: 'F', today }).n,
      date_range: one('SELECT min(issue_date) AS from_date, max(issue_date) AS to_date FROM rfqs'),
      last_import: one('SELECT max(imported_at) AS at FROM imports').at,
      imports: db.prepare('SELECT key, kind, date, records, imported_at FROM imports ORDER BY date DESC').all(),
      today,
    });
  });

  return router;
}
