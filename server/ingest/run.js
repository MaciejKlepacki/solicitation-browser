#!/usr/bin/env node
// Usage: npm run fetch -- [--days N] [--no-grid] [--force]
//  1. Daily archive files (in*.txt + bq*.zip) for the last N days  -> rich, one request per day
//  2. The live grid for days without a file yet (i.e. today)       -> what was posted so far
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { DibbsClient, DIBBS } from './dibbs.js';
import { parseIndexFile } from './parseIndexFile.js';
import { parseBatchFile } from './parseBatchFile.js';
import { scrapeIssueDate } from './scrapeGrid.js';
import { unzip } from './zip.js';
import { yymmddToIso, todayIso, addDays } from './dates.js';
import { openDb, upsertRecords, recordImport, hasImport } from '../db.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const DAYS = parseInt(opt('--days', '7'), 10);
const RAW_DIR = path.resolve('data/raw');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function listArchiveFiles(client) {
  const html = await client.get(`${DIBBS}/RFQ/RFQDates.aspx?category=recent`);
  const $ = cheerio.load(html);
  const byDate = new Map();
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href');
    const m = href.match(/\/(in|bq)(\d{6})\.(txt|zip)$/i);
    if (!m) return;
    const iso = yymmddToIso(m[2]);
    if (!byDate.has(iso)) byDate.set(iso, {});
    byDate.get(iso)[m[1].toLowerCase()] = href;
  });
  return byDate;
}

async function download(client, url, name, binary) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const file = path.join(RAW_DIR, name);
  if (fs.existsSync(file)) return binary ? fs.readFileSync(file) : fs.readFileSync(file, 'latin1');
  const data = binary ? await client.getBinary(url) : await client.get(url);
  fs.writeFileSync(file, data, binary ? undefined : 'latin1');
  return data;
}

async function importFiles(client, db, date, files) {
  const key = `file:${date}`;
  if (!flag('--force') && hasImport(db, key)) { log(`${date}: archive already imported, skipping`); return; }
  const indexText = await download(client, files.in, `in${date}.txt`, false);
  const records = parseIndexFile(indexText, date);
  if (files.bq) {
    try {
      const zip = unzip(await download(client, files.bq, `bq${date}.zip`, true));
      const bqName = [...zip.keys()].find((n) => /^bq.*\.txt$/i.test(n));
      const extra = bqName ? parseBatchFile(zip.get(bqName).toString('latin1')) : new Map();
      for (const r of records) {
        const e = extra.get(`${r.solicitation}:${r.pr ?? ''}`);
        if (e) Object.assign(r, { sol_type: e.sol_type, fob: e.fob, inspection_point: e.inspection_point, delivery_days: e.delivery_days });
      }
      log(`${date}: ${records.length} index rows, ${extra.size} batch rows merged`);
    } catch (e) {
      log(`${date}: batch file skipped (${e.message})`);
    }
  }
  upsertRecords(db, records, 'file');
  recordImport(db, key, 'file', date, records.length);
}

async function importGrid(client, db, date) {
  const rows = await scrapeIssueDate(client, date, { log });
  if (rows.length) upsertRecords(db, rows, 'grid');
  recordImport(db, `grid:${date}`, 'grid', date, rows.length);
  log(`${date}: ${rows.length} grid rows upserted`);
}

async function main() {
  const db = openDb();
  const client = new DibbsClient({ log });
  const today = todayIso();
  const wanted = Array.from({ length: DAYS }, (_, i) => addDays(today, -i));

  log(`fetching last ${DAYS} day(s) up to ${today}`);
  const archive = await listArchiveFiles(client);
  log(`archive lists ${archive.size} day(s): ${[...archive.keys()].slice(0, 3).join(', ')} ...`);

  // Oldest first: the live grid (today) runs last and its explicit issue dates win over the
  // archive file date, which is the *post* date (DLA posts most RFQs the evening before issue).
  for (const date of [...wanted].reverse()) {
    const files = archive.get(date);
    if (files?.in) {
      await importFiles(client, db, date, files);
    } else if (!flag('--no-grid') && date >= addDays(today, -1)) {
      await importGrid(client, db, date);
    } else {
      log(`${date}: no archive file (weekend/holiday?), skipping`);
    }
  }
  const total = db.prepare('SELECT count(*) AS n FROM rfqs').get().n;
  log(`done. ${total} RFQ line items in database`);
}

main().catch((e) => { console.error(e); process.exit(1); });
