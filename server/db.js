import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || path.resolve('data/dibbs.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rfqs (
  id               TEXT PRIMARY KEY,          -- solicitation:pr (one row per line item)
  solicitation     TEXT NOT NULL,
  pr               TEXT,
  nsn              TEXT,                      -- digits only, or part number when item_type = '2'
  fsc              TEXT,                      -- first 4 digits of NSN
  item_type        TEXT,                      -- '1' NSN, '2' part number
  nomenclature     TEXT,
  qty              INTEGER,
  unit             TEXT,
  issue_date       TEXT,                      -- ISO yyyy-mm-dd
  return_by        TEXT,                      -- ISO yyyy-mm-dd
  set_aside        TEXT,                      -- N,Y,H,R,L,A,E
  set_aside_pct    INTEGER,
  sol_type         TEXT,                      -- F fast award, P auto eval, I AIDC, M manual
  amsc             TEXT,
  buyer_code       TEXT,
  delivery_days    INTEGER,
  fob              TEXT,                      -- O origin, D destination
  inspection_point TEXT,
  tech_docs        TEXT,
  status           TEXT,
  pdf_url          TEXT,
  line_count       INTEGER DEFAULT 1,
  source           TEXT,
  updated_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_rfqs_issue   ON rfqs(issue_date);
CREATE INDEX IF NOT EXISTS idx_rfqs_return  ON rfqs(return_by);
CREATE INDEX IF NOT EXISTS idx_rfqs_fsc     ON rfqs(fsc);
CREATE INDEX IF NOT EXISTS idx_rfqs_sol     ON rfqs(solicitation);

CREATE VIRTUAL TABLE IF NOT EXISTS rfqs_fts USING fts5(
  solicitation, nsn, nomenclature, pr,
  content='rfqs', content_rowid='rowid', tokenize='unicode61'
);
CREATE TRIGGER IF NOT EXISTS rfqs_ai AFTER INSERT ON rfqs BEGIN
  INSERT INTO rfqs_fts(rowid, solicitation, nsn, nomenclature, pr)
  VALUES (new.rowid, new.solicitation, new.nsn, new.nomenclature, new.pr);
END;
CREATE TRIGGER IF NOT EXISTS rfqs_ad AFTER DELETE ON rfqs BEGIN
  INSERT INTO rfqs_fts(rfqs_fts, rowid, solicitation, nsn, nomenclature, pr)
  VALUES ('delete', old.rowid, old.solicitation, old.nsn, old.nomenclature, old.pr);
END;
CREATE TRIGGER IF NOT EXISTS rfqs_au AFTER UPDATE ON rfqs BEGIN
  INSERT INTO rfqs_fts(rfqs_fts, rowid, solicitation, nsn, nomenclature, pr)
  VALUES ('delete', old.rowid, old.solicitation, old.nsn, old.nomenclature, old.pr);
  INSERT INTO rfqs_fts(rowid, solicitation, nsn, nomenclature, pr)
  VALUES (new.rowid, new.solicitation, new.nsn, new.nomenclature, new.pr);
END;

CREATE TABLE IF NOT EXISTS imports (
  key         TEXT PRIMARY KEY,               -- e.g. file:2026-10-20 or grid:2026-10-21
  kind        TEXT,
  date        TEXT,
  records     INTEGER,
  imported_at TEXT
);
`;

export function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

// New non-null values win; nomenclature keeps the longer (less truncated) text.
const UPSERT_SQL = `
INSERT INTO rfqs (id, solicitation, pr, nsn, fsc, item_type, nomenclature, qty, unit,
  issue_date, return_by, set_aside, set_aside_pct, sol_type, amsc, buyer_code,
  delivery_days, fob, inspection_point, tech_docs, status, pdf_url, source, updated_at)
VALUES (@id, @solicitation, @pr, @nsn, @fsc, @item_type, @nomenclature, @qty, @unit,
  @issue_date, @return_by, @set_aside, @set_aside_pct, @sol_type, @amsc, @buyer_code,
  @delivery_days, @fob, @inspection_point, @tech_docs, @status, @pdf_url, @source, @updated_at)
ON CONFLICT(id) DO UPDATE SET
  nsn              = COALESCE(excluded.nsn, rfqs.nsn),
  fsc              = COALESCE(excluded.fsc, rfqs.fsc),
  item_type        = COALESCE(excluded.item_type, rfqs.item_type),
  nomenclature     = CASE WHEN length(COALESCE(excluded.nomenclature,'')) > length(COALESCE(rfqs.nomenclature,''))
                          THEN excluded.nomenclature ELSE rfqs.nomenclature END,
  qty              = COALESCE(excluded.qty, rfqs.qty),
  unit             = COALESCE(excluded.unit, rfqs.unit),
  -- The grid carries the true issue date; the daily file only knows its post date. Keep the grid's.
  issue_date       = CASE WHEN rfqs.source = 'grid' AND excluded.source = 'file' THEN rfqs.issue_date
                          ELSE COALESCE(excluded.issue_date, rfqs.issue_date) END,
  return_by        = COALESCE(excluded.return_by, rfqs.return_by),
  set_aside        = COALESCE(excluded.set_aside, rfqs.set_aside),
  set_aside_pct    = COALESCE(excluded.set_aside_pct, rfqs.set_aside_pct),
  sol_type         = COALESCE(excluded.sol_type, rfqs.sol_type),
  amsc             = COALESCE(excluded.amsc, rfqs.amsc),
  buyer_code       = COALESCE(excluded.buyer_code, rfqs.buyer_code),
  delivery_days    = COALESCE(excluded.delivery_days, rfqs.delivery_days),
  fob              = COALESCE(excluded.fob, rfqs.fob),
  inspection_point = COALESCE(excluded.inspection_point, rfqs.inspection_point),
  tech_docs        = COALESCE(excluded.tech_docs, rfqs.tech_docs),
  status           = COALESCE(excluded.status, rfqs.status),
  pdf_url          = COALESCE(excluded.pdf_url, rfqs.pdf_url),
  source           = excluded.source,
  updated_at       = excluded.updated_at
`;

const COLUMNS = ['id', 'solicitation', 'pr', 'nsn', 'fsc', 'item_type', 'nomenclature', 'qty', 'unit',
  'issue_date', 'return_by', 'set_aside', 'set_aside_pct', 'sol_type', 'amsc', 'buyer_code',
  'delivery_days', 'fob', 'inspection_point', 'tech_docs', 'status', 'pdf_url', 'source', 'updated_at'];

export function upsertRecords(db, records, source) {
  const stmt = db.prepare(UPSERT_SQL);
  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    for (const r of records) {
      const row = { source, updated_at: now };
      for (const c of COLUMNS) if (!(c in row)) row[c] = r[c] ?? null;
      row.id = `${r.solicitation}:${r.pr ?? ''}`;
      stmt.run(row);
    }
    db.exec(`UPDATE rfqs SET line_count = (SELECT count(*) FROM rfqs r2 WHERE r2.solicitation = rfqs.solicitation)`);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return records.length;
}

export function recordImport(db, key, kind, date, records) {
  db.prepare(`INSERT OR REPLACE INTO imports (key, kind, date, records, imported_at) VALUES (?, ?, ?, ?, ?)`)
    .run(key, kind, date, records, new Date().toISOString());
}

export function hasImport(db, key) {
  return !!db.prepare('SELECT 1 FROM imports WHERE key = ?').get(key);
}
