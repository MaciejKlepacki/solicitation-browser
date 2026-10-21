// Thin wrapper over the JSON API. Every list parameter is sent comma-joined.
function toQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    q.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  return q.toString();
}

async function getJson(path, params = {}) {
  const qs = toQuery(params);
  const res = await fetch(`/api${path}${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  rfqs: (params) => getJson('/rfqs', params),
  facets: (params) => getJson('/facets', params),
  stats: () => getJson('/stats'),
};

export const DIBBS = 'https://www.dibbs.bsm.dla.mil';
export const dibbsRecordUrl = (sol) => `${DIBBS}/rfq/rfqrec.aspx?sn=${sol}`;
export const dibbsNsnUrl = (nsn) => `${DIBBS}/RFQ/RFQNsn.aspx?value=${nsn}&category=issue`;
