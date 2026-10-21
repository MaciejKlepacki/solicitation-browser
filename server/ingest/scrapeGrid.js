// Scrapes the DIBBS "RFQs by issue date" grid (RFQRecs.aspx). This is the only source for RFQs
// issued today: the daily files are published the next day. ASP.NET WebForms paging = POST back
// with the page's hidden fields plus __EVENTTARGET/__EVENTARGUMENT.
import * as cheerio from 'cheerio';
import { DIBBS, hiddenFields } from './dibbs.js';
import { usToIso, isoToUs } from './dates.js';
import { pdfUrl } from './parseIndexFile.js';

const PAGE_SIZE = 50;

const SET_ASIDE_BY_ALT = [
  [/not set.?aside|unrestricted/i, 'N'],
  [/hubzone/i, 'H'],
  [/service.?disabled/i, 'R'],
  [/economically disadvantaged/i, 'E'],
  [/woman.?owned/i, 'L'],
  [/8\s*\(?a\)?/i, 'A'],
  [/small business set.?aside/i, 'Y'],
];

export function gridUrl(issueDateIso) {
  return `${DIBBS}/RFQ/RFQRecs.aspx?category=issue&TypeSrch=dt&value=${isoToUs(issueDateIso)}`;
}

export function parseGridPage(html, issueDateIso) {
  const $ = cheerio.load(html);
  const found = $('body').text().match(/Records Found:\s*([\d,]+)/i);
  const total = found ? parseInt(found[1].replace(/,/g, ''), 10) : 0;
  const rows = [];
  $('#ctl00_cph1_grdRfqSearch tr').each((_, tr) => {
    const td = $(tr).children('td');
    if (td.length < 9) return;
    const text = (i) => $(td[i]).text().replace(/\s+/g, ' ').trim();
    const alts = (i) => $(td[i]).find('img').map((_, im) => $(im).attr('alt') || '').get();
    const links = (i) => $(td[i]).find('a[href]').map((_, a) => $(a).attr('href')).get();

    const solicitation = text(4).match(/^[A-Z0-9-]+/)?.[0]?.replace(/-/g, '');
    // Solicitation numbers look like SPE1C127Q0091; skips the pager/header rows of the grid.
    if (!solicitation || !/^[A-Z]{3}[A-Z0-9]{10,13}$/.test(solicitation)) return;
    const nsnText = text(1);
    const isPart = !/^\d{4}-\d{2}-\d{3}-\d{4}/.test(nsnText);
    const nsn = (nsnText.match(/^[A-Z0-9-]+/)?.[0] || '').replace(/-/g, '');
    const prMatch = text(6).match(/^(\w+)\s*QTY:\s*([\d,]+)/i);
    const solAlts = alts(4).join(' | ');
    let set_aside = null;
    for (const [re, code] of SET_ASIDE_BY_ALT) if (re.test(solAlts)) { set_aside = code; break; }
    const statusText = text(5);
    const status = /removed/i.test(statusText) ? 'Removed' : /open/i.test(statusText) ? 'Open' : statusText || null;
    const pdf = links(4).find((h) => /\.pdf$/i.test(h));

    rows.push({
      solicitation,
      pr: prMatch?.[1] || null,
      nsn: nsn || null,
      fsc: !isPart && /^\d{13}$/.test(nsn) ? nsn.slice(0, 4) : null,
      item_type: isPart ? '2' : '1',
      nomenclature: text(2) || null,
      qty: prMatch ? parseInt(prMatch[2].replace(/,/g, ''), 10) : null,
      unit: null,
      issue_date: usToIso(text(7)) || issueDateIso,
      return_by: usToIso(text(8)),
      set_aside,
      sol_type: /fast award/i.test(solAlts) ? 'F' : null,
      tech_docs: text(3) || null,
      status,
      pdf_url: pdf || pdfUrl(solicitation),
    });
  });
  return { total, rows };
}

export async function scrapeIssueDate(client, issueDateIso, { log = () => {} } = {}) {
  const url = gridUrl(issueDateIso);
  let html = await client.get(url);
  let { total, rows } = parseGridPage(html, issueDateIso);
  const pages = Math.ceil(total / PAGE_SIZE);
  log(`grid ${issueDateIso}: ${total} records, ${pages} page(s)`);
  for (let page = 2; page <= pages; page++) {
    const form = hiddenFields(html);
    form.set('__EVENTTARGET', 'ctl00$cph1$grdRfqSearch');
    form.set('__EVENTARGUMENT', `Page$${page}`);
    html = await client.post(url, form, url);
    const next = parseGridPage(html, issueDateIso);
    if (!next.rows.length) break;
    rows = rows.concat(next.rows);
    if (page % 5 === 0) log(`  page ${page}/${pages} (${rows.length} rows)`);
  }
  return rows;
}
