'use strict';
const VERSION = '0.1.0';
const URL_BLACKLIST = new Set(['fbclid','gclid','dclid','gbraid','wbraid','msclkid','mc_cid','mc_eid','igshid','vero_id','oly_enc_id','oly_anon_id','_hsenc','_hsmi','__hsfp','ref_src','spm','yclid']);
const text = v => String(v == null ? '' : v).replace(/\s+/g,' ').trim();
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const siteName = (host=location.hostname) => /(^|\.)reddit\.com$/.test(host) ? 'reddit' : /(^|\.)(x\.com|twitter\.com)$/.test(host) ? 'x' : /(^|\.)instagram\.com$/.test(host) ? 'instagram' : /(^|\.)facebook\.com$/.test(host) || host==='m.facebook.com' ? 'facebook' : /(^|\.)linkedin\.com$/.test(host) ? 'linkedin' : /(^|\.)slashdot\.org$/.test(host) ? 'slashdot' : /(^|\.)(google\.[a-z.]+)$/.test(host) ? 'google' : 'other';
const supportedURL = s => { try {const u=new URL(s,location.href); return /^https?:$/.test(u.protocol)?u:null;}catch{return null;} };
function amazonData(str){
  const u=supportedURL(str);if(!u)return null;
  const h=u.hostname.toLowerCase().replace(/^(www\.|smile\.|m\.)/,'');
  const m=h.match(/^amazon\.(com|co\.uk|de|fr|it|es|ca|co\.jp|com\.au)$/);if(!m)return null;
  const asin=u.pathname.match(/(?:\/(?:dp|gp\/product|exec\/obidos\/ASIN)\/)([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase() || u.searchParams.get('asin')?.toUpperCase();
  if(!asin || !/^[A-Z0-9]{10}$/.test(asin))return null;
  return {asin,market:m[1],short:`https://www.${h}/dp/${asin}`};
}
function cleanURL(str){
  const u=supportedURL(str);if(!u)throw new Error('Use an http or https URL.');
  const amazon=amazonData(u.href);if(amazon) return amazon.short;
  for(const k of [...u.searchParams.keys()])if(k.toLowerCase().startsWith('utm_') || URL_BLACKLIST.has(k.toLowerCase()))u.searchParams.delete(k);
  return u.href;
}
const CAMEL = {'com':'www.camelcamelcamel.com','co.uk':'uk.camelcamelcamel.com','de':'de.camelcamelcamel.com','fr':'fr.camelcamelcamel.com','it':'it.camelcamelcamel.com','es':'es.camelcamelcamel.com','ca':'ca.camelcamelcamel.com','co.jp':'jp.camelcamelcamel.com','com.au':'au.camelcamelcamel.com'};
function camelURL(str){const a=amazonData(str);return a && CAMEL[a.market] ? `https://${CAMEL[a.market]}/product/${a.asin}`:null;}
function appleMapsURL(str){
 const u=supportedURL(str); if(!u||!/(^|\.)google\.[a-z.]+$/.test(u.hostname)||!u.pathname.startsWith('/maps'))return null;
 // Accept explicit location or direction coordinates/terms only; never derive a misleading destination from opaque map metadata.
 const d=u.searchParams.get('daddr')||u.searchParams.get('destination');
 if(d){const a=new URL('https://maps.apple.com/');a.searchParams.set('daddr',d);const s=u.searchParams.get('saddr')||u.searchParams.get('origin');if(s)a.searchParams.set('saddr',s);return a.href;}
 const dir=u.pathname.match(/^\/maps\/dir\/(?:([^/]+)\/)?([^/@?]+)(?:\/|$)/);
 if(dir){const a=new URL('https://maps.apple.com/');a.searchParams.set('daddr',decodeURIComponent(dir[2]).replace(/\+/g,' '));if(dir[1])a.searchParams.set('saddr',decodeURIComponent(dir[1]).replace(/\+/g,' '));return a.href;}
 const q=u.searchParams.get('q')||u.searchParams.get('query');
 const place=u.pathname.match(/^\/maps\/place\/([^/@?]+)/);
 if(q||place){const a=new URL('https://maps.apple.com/');a.searchParams.set('q',q||decodeURIComponent(place[1]).replace(/\+/g,' '));return a.href;}
 return null;
}
function tokenHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function tokens(s){return text(s).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.slice(0,80)||[];}
function chunkText(input,max=1550){
 const out=[]; for(const p of String(input).split(/\n\s*\n/).map(text).filter(Boolean)){
  if(p.length<=max){out.push(p);continue;}
  const sentences=p.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g)||[p];let buf='';
  for(const s of sentences){if((buf+s).length>max&&buf){out.push(text(buf));buf='';}if(s.length>max){if(buf){out.push(text(buf));buf='';}for(let i=0;i<s.length;i+=max)out.push(text(s.slice(i,i+max)));}else buf+=s;}
  if(buf)out.push(text(buf));
 }return out;
}
const libTest = {cleanURL,amazonData,camelURL,appleMapsURL,tokens,tokenHash,chunkText,siteName};
