# DIBBS Solicitation Browser

A small full-stack app that pulls daily Requests for Quotation (RFQs) from the DLA Internet Bid
Board System (DIBBS) and lets a vendor browse, search and filter them, with one click back to the
original record on DIBBS.

Stack, deliberately minimal: **Node.js + Express + SQLite (built-in `node:sqlite`, FTS5)** on the
server, **Vite + React + Tailwind** on the client. No ORM, no auth, no Docker.

## Run it

```bash
npm install
npm run fetch            # pull the last 7 days from DIBBS (+ today's grid), ~2-3 min
npm run dev              # API on :3001, UI on http://localhost:5173
```

Production-style: `npm run build && npm start` (Express serves `dist/` on :3001).

`npm run fetch -- --days 14` pulls more history; `--no-grid` skips the live grid; `--force` re-imports.
Re-running is safe (idempotent upserts).

## Where the data comes from

DIBBS has no API, but it publishes machine-readable daily files, which are far more stable than
scraping the ASP.NET grid:

| Source | What | Why |
|---|---|---|
| `Downloads/RFQ/Archive/inYYMMDD.txt` | Fixed-width index, one line per RFQ line item: solicitation, NSN/part number, PR, return-by, PDF name, qty, unit, nomenclature, buyer, AMSC, set-aside | One request per day, documented layout, ~2 000 rows/day |
| `Downloads/RFQ/Archive/bqYYMMDD.zip` | Batch-quote file (121 columns). We lift: RFQ type (fast award / auto-eval / AIDC / manual), delivery days, FOB, inspection point | Enriches each line with fields a vendor filters on |
| `RFQ/RFQRecs.aspx?category=issue&value=MM-DD-YYYY` | The live grid (50 rows/page, WebForms postback paging) | The files for a given day are only published the **next** day, so this is the only source for RFQs issued **today** |

Rows are keyed by `solicitation:purchase_request`. File data is richer and overwrites grid data
when it arrives; the grid adds `status` (Open/Removed) and `tech_docs`.

One caveat: the daily file is organised by **post date**, and DLA re-posts some older RFQs, so for
file-only rows `issue_date` is really "posted on". The grid is queried by true issue date and runs
last, so rows it has seen (today's) carry the exact issue date. Verified against record pages.

Two DIBBS quirks handled in `server/ingest/dibbs.js`:

- Every host shows a DoD warning/consent form first. The client POSTs it automatically and keeps
  the resulting cookies per host (`www.dibbs…` and `dibbs2.bsm…` are separate).
- The F5 WAF rejects any POST whose header names are lower-case, which is what `fetch`/undici
  always sends. The client therefore uses `node:https` with Title-Case headers.

## Filters and why

Picked for someone deciding *"is this worth quoting?"*:

- **Issued** (today / 2 / 7 days) and **closing within** (3 / 7 / 14 days): freshness and urgency.
- **Set-aside** (unrestricted, small business, WOSB, HUBZone, SDVOSB, 8(a)): eligibility first,
  the rest does not matter if you cannot bid.
- **RFQ type**: *fast award* candidates are micro-purchases that can be awarded before the return
  date, so quick wins for small vendors; *auto-eval* is lowest-price-wins; *manual* means a buyer
  reads your quote.
- **Category** (Federal Supply Group / Class from the NSN): match against what you actually sell.
- **Tech data (AMSC)**: `G` means the government has full data and anyone can compete; most other
  codes mean you must be an approved source. A huge time saver.
- **Quantity** and **delivery days**: capacity and lead-time fit.
- Removed RFQs and closed RFQs are hidden by default.

Search is full-text (FTS5) across solicitation, NSN/part number, nomenclature and PR, with prefix
matching; NSN dashes are ignored so `8475-01-537-3803` and `8475015373803` both work.

## Layout

```
server/
  index.js            Express entry; serves dist/ in production
  db.js               node:sqlite schema (rfqs + FTS5 + imports), upsert
  fsc.js              FSG / set-aside / AMSC labels
  routes/rfqs.js      GET /api/rfqs, /api/facets, /api/stats
  ingest/
    run.js            npm run fetch
    dibbs.js          HTTP client (consent, WAF-friendly headers)
    parseIndexFile.js fixed-width "in" file parser
    parseBatchFile.js "bq" file parser
    scrapeGrid.js     live grid scraper (today)
    zip.js            tiny zip reader (no deps)
web/                  Vite + React + Tailwind UI
data/                 dibbs.sqlite + raw downloads (git-ignored)
```

## Tradeoffs / what I would do next

- Ingest is a manual script; in production it would be a cron (files appear once a day, early
  morning US time) plus an hourly grid refresh for the current day.
- The batch file is parsed only for a handful of header fields; it also carries approved-source
  CAGEs (`as*.txt`), which would make a great "I am an approved source" filter.
- No tests beyond parser smoke checks against real files; parsers are pure functions so they are
  easy to cover.
