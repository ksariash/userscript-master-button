const TRACKING = /^(utm_[a-z0-9_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|igsh|_hsenc|_hsmi|vero_id|yclid)$/i;
export function validateURL(text, base) {
  let url; try { url = new URL(text.trim(), base); } catch { throw new Error('Enter a valid web address.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an http or https address without embedded credentials.');
  return url;
}
export function cleanURL(text) {
  const u = validateURL(text), removed = [];
  // Signed URLs are opaque. Even apparently decorative fields may be signed.
  if ([...u.searchParams.keys()].some(k => /^(x-amz-|x-goog-|signature$|sig$|token$)/i.test(k))) return { url: u.href, removed, note: 'Signed or tokenized URL preserved.' };
  for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) { u.searchParams.delete(key); removed.push(key); }
  return { url: u.href, removed, note: removed.length ? `${removed.length} recognized tracking fields removed.` : 'Functional query parameters and fragments preserved.' };
}
export function amazonProduct(text) {
  const u = validateURL(text); const markets = { 'amazon.com': 'www.amazon.com', 'amazon.co.uk': 'www.amazon.co.uk', 'amazon.de': 'www.amazon.de', 'amazon.fr': 'www.amazon.fr', 'amazon.it': 'www.amazon.it', 'amazon.es': 'www.amazon.es', 'amazon.ca': 'www.amazon.ca', 'amazon.com.au': 'www.amazon.com.au', 'amazon.co.jp': 'www.amazon.co.jp', 'amazon.in': 'www.amazon.in' };
  const host = Object.keys(markets).find(h => u.hostname === h || u.hostname === 'www.' + h || u.hostname === 'smile.' + h);
  const asin = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
  if (!host || !asin) return null;
  const regions = { 'amazon.com': '', 'amazon.co.uk': 'uk.', 'amazon.de': 'de.', 'amazon.fr': 'fr.', 'amazon.it': 'it.', 'amazon.es': 'es.', 'amazon.ca': 'ca.', 'amazon.com.au': 'au.' };
  return { asin, canonical: `https://${markets[host]}/dp/${asin}`, priceHistory: host in regions ? `https://${regions[host]}camelcamelcamel.com/product/${asin}` : null };
}
export function appleMapsURL(text) {
  const u = validateURL(text), markets = ['google.com','google.co.uk','google.de','google.fr','google.ca','google.com.au','google.co.jp','google.co.in','google.es','google.it','google.nl'];
  const host = u.hostname.replace(/^(www|maps)\./,'');
  if (!markets.includes(host) || !(u.pathname.startsWith('/maps') || u.hostname.startsWith('maps.') && u.pathname === '/')) return null;
  let destination = u.searchParams.get('destination') || u.searchParams.get('q') || u.searchParams.get('query');
  if (!destination) { const path = u.pathname.match(/\/place\/([^/]+)/)?.[1]; if (!path) return null; try { destination = decodeURIComponent(path).replace(/\+/g,' '); } catch { return null; } }
  const out = new URL('https://maps.apple.com/'); out.searchParams.set(u.searchParams.has('destination') ? 'daddr' : 'q', destination); return out.href;
}
/** LM assistance proposes field names; recognized tracking alone is auto-removable. */
export function validateURLProposal(original, keys) {
  const u = validateURL(original); if (!Array.isArray(keys)) return [];
  return [...new Set(keys.filter(k => typeof k === 'string' && u.searchParams.has(k)))].map(key => ({ key, recognized: TRACKING.test(key), value: u.searchParams.get(key) }));
}
export async function shareURL(text, { navigator, gm, title = '' }) {
  const cleaned = cleanURL(text).url;
  if (navigator.share) {
    try { await navigator.share({ title, url: cleaned }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'canceled'; }
  }
  if (gm?.setClipboard) { const ok = await gm.setClipboard(cleaned, 'text/plain'); if (ok === false) throw new Error('Copy failed. Open the URL editor to select the link.'); return 'copied'; }
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(cleaned); return 'copied'; }
  throw new Error('Open the URL editor to select and copy the clean link.');
}
