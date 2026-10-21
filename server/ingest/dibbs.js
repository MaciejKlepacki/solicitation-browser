// Minimal HTTP client for DIBBS.
//  - Uses node:https instead of fetch: the F5 WAF in front of DIBBS rejects POSTs whose header names
//    are lower-case (which is what undici/fetch always sends). Browsers send Title-Case on HTTP/1.1.
//  - Sends browser-like headers (bare clients get "Request Rejected").
//  - Handles the DoD warning/consent form automatically, per host (www and dibbs2 differ).
import https from 'node:https';

export const DIBBS = 'https://www.dibbs.bsm.dla.mil';
export const DIBBS_FILES = 'https://dibbs2.bsm.dla.mil';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpsRequest(url, { method = 'GET', headers = {}, body, timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, port: 443, path: u.pathname + u.search, method, headers, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      },
    );
    req.on('timeout', () => req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export class DibbsClient {
  constructor({ delayMs = 250, retries = 2, log = () => {} } = {}) {
    this.cookies = new Map(); // host -> Map(name -> value)
    this.delayMs = delayMs;
    this.retries = retries;
    this.log = log;
  }

  cookieHeader(url) {
    const jar = this.cookies.get(new URL(url).host);
    return jar ? [...jar].map(([k, v]) => `${k}=${v}`).join('; ') : '';
  }

  storeCookies(url, res) {
    const host = new URL(url).host;
    if (!this.cookies.has(host)) this.cookies.set(host, new Map());
    for (const c of res.headers['set-cookie'] ?? []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      if (i > 0) this.cookies.get(host).set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
    }
  }

  async raw(url, { method = 'GET', body, headers = {}, referer } = {}) {
    await sleep(this.delayMs);
    const h = { ...HEADERS, ...headers };
    const cookie = this.cookieHeader(url);
    if (cookie) h.Cookie = cookie;
    if (referer) h.Referer = referer;
    if (body) h['Content-Length'] = Buffer.byteLength(body);
    let lastErr;
    for (let i = 0; i <= this.retries; i++) {
      try {
        const res = await httpsRequest(url, { method, headers: h, body });
        this.storeCookies(url, res);
        return res;
      } catch (e) {
        lastErr = e;
        this.log(`retry ${i + 1}/${this.retries} after error: ${e.message}`);
        await sleep(1000 * (i + 1));
      }
    }
    throw lastErr;
  }

  // GET/POST with consent handling and redirect following. Returns text, or a Buffer when binary.
  async request(url, opts = {}, { binary = false, attempt = 0 } = {}) {
    const res = await this.raw(url, opts);
    const location = res.headers.location;

    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url).href;
      if (/dodwarning\.aspx/i.test(next)) {
        if (attempt > 1) throw new Error(`Consent loop for ${url}`);
        await this.acceptConsent(next);
        return this.request(url, opts, { binary, attempt: attempt + 1 });
      }
      return this.request(next, { ...opts, method: 'GET', body: undefined }, { binary, attempt });
    }

    // A binary download that comes back as HTML is either the consent page or a WAF rejection.
    const isHtml = /text\/html/i.test(res.headers['content-type'] || '');
    const text = binary && !isHtml ? '' : res.body.toString('latin1');
    if (/<title>\s*Request Rejected/i.test(text)) throw new Error(`DIBBS WAF rejected request: ${url}`);
    if (/name="butAgree"/.test(text)) {
      if (attempt > 1) throw new Error(`Consent loop for ${url}`);
      await this.acceptConsent(url, text);
      return this.request(url, opts, { binary, attempt: attempt + 1 });
    }
    if (res.status >= 400) throw new Error(`HTTP ${res.status} for ${url}`);
    return binary ? res.body : text;
  }

  async acceptConsent(warningUrl, html) {
    this.log(`accepting DoD consent on ${new URL(warningUrl).host}`);
    if (!html) html = (await this.raw(warningUrl)).body.toString('latin1');
    const form = new URLSearchParams();
    for (const m of html.matchAll(/<input[^>]*>/gi)) {
      const tag = m[0];
      const name = tag.match(/name="([^"]*)"/)?.[1];
      const value = tag.match(/value="([^"]*)"/)?.[1] ?? '';
      const type = tag.match(/type="([^"]*)"/)?.[1];
      if (name && (type === 'hidden' || name === 'butAgree')) form.append(name, value);
    }
    const action = html.match(/<form[^>]*action="([^"]*)"/i)?.[1];
    const postUrl = action ? new URL(action.replace(/&amp;/g, '&'), warningUrl).href : warningUrl;
    const res = await this.raw(postUrl, {
      method: 'POST',
      body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      referer: warningUrl,
    });
    if (res.status >= 400 || /Request Rejected/.test(res.body.toString('latin1', 0, 400))) {
      throw new Error(`Consent POST failed (HTTP ${res.status}) on ${postUrl}`);
    }
  }

  get(url) { return this.request(url); }
  getBinary(url) { return this.request(url, {}, { binary: true }); }
  post(url, form, referer) {
    return this.request(url, {
      method: 'POST',
      body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      referer,
    });
  }
}

// Collect every ASP.NET hidden field (__VIEWSTATE*, __EVENTVALIDATION, ...) from a page.
export function hiddenFields(html) {
  const form = new URLSearchParams();
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/name="([^"]*)"/)?.[1];
    const value = tag.match(/value="([^"]*)"/)?.[1] ?? '';
    if (name) form.append(name, value.replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
  }
  return form;
}
