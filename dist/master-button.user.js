// ==UserScript==
// @name         iPhone Master Button
// @namespace    https://github.com/ksariash/userscript-master-button
// @version      0.1.0
// @description  A single floating drawer for clean links, nuisance filtering, media, and Azure narration
// @author       ksariash
// @match        *://*/*
// @exclude      *://*.banking.*/*
// @run-at       document-idle
// @noframes
// @inject-into  content
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @connect      *.tts.speech.microsoft.com
// @connect      *.cognitiveservices.azure.com
// @connect      raw.githubusercontent.com
// @connect      *.twimg.com
// @connect      *.fbcdn.net
// @connect      *.cdninstagram.com
// @connect      *.licdn.com
// @connect      *.facebook.com
// @connect      *.instagram.com
// @connect      *.linkedin.com
// @connect      *.reddit.com
// @connect      *.googlevideo.com
// @updateURL    https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.meta.js
// @downloadURL  https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.user.js
// ==/UserScript==

;(()=>{
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

const STORAGE='master-button:v1';
const defaults=()=>({position:{right:14,bottom:105}, filter:{}, siteCleanup:{}, nsfw:true, autoMaps:true, playbackRate:1,fontSize:17, azure:{region:'eastus',voice:'en-US-JennyNeural',quality:'compact'}, rules:{}, learning:{}, learningEnabled:{}});
let prefs=defaults(), azureKey='', storageOK=false;
async function gmGet(k, def){if(typeof GM==='undefined'||typeof GM.getValue!=='function')return def;return await GM.getValue(k,def);}
async function gmSet(k,v){if(typeof GM==='undefined'||typeof GM.setValue!=='function')throw Error('Protected Userscripts storage unavailable');await GM.setValue(k,v);}
async function readSettings(){try{const saved=await gmGet(STORAGE,null);if(saved&&typeof saved==='object')prefs={...defaults(),...saved,azure:{...defaults().azure,...saved.azure}};azureKey=String(await gmGet(STORAGE+':azure','')||'');storageOK=typeof GM!=='undefined'&&typeof GM.setValue==='function';}catch(e){console.warn('[Master Button] Storage not accessible',e);}}
async function saveSettings(){try{await gmSet(STORAGE,prefs);}catch(e){notify('Cannot save settings; check Userscripts permissions.');}}
const domainKey=()=>location.hostname.toLowerCase().replace(/^www\./,'');
const filterEnabled=()=>prefs.filter[domainKey()]!==false;
const cleanupEnabled=()=>prefs.siteCleanup[siteName()]!==false;

// Reversible visual filtering. Learning is a bounded local hash-based classifier,
// NOT a pretrained or fine-tuned LLM. Classifier labels come exclusively from explicit choices.
const hidden=new Map(); let picker=null, pickerMatches=[], preview=false, filterTick=0;
const BAN_SEL='[data-mb-host],html,body,head,main,article,[role="main"],shreddit-post';
function protectedNode(el){return !el || !el.isConnected || el.closest('[data-mb-host]') || el.matches(BAN_SEL) || el.querySelector('article,main,[role="main"],[data-mb-host]') || el===document.documentElement || el===document.body;}
function hideNode(el,reason='Rule'){if(protectedNode(el))return false;if(hidden.has(el))return false;hidden.set(el,{display:el.style.getPropertyValue('display'),priority:el.style.getPropertyPriority('display'),reason});el.style.setProperty('display','none','important');updateCount();return true;}
function showNode(el){const old=hidden.get(el);if(!old)return;if(old.display)el.style.setProperty('display',old.display,old.priority);else el.style.removeProperty('display');hidden.delete(el);updateCount();}
function showAll(){for(const e of [...hidden.keys()])showNode(e);}
function updateCount(){if(!host)return;for(const n of host.shadowRoot.querySelectorAll('[data-count]'))n.textContent=String([...hidden.keys()].filter(e=>e.isConnected&&!([...hidden.keys()].some(other=>other!==e&&other.contains(e)))).length);}
function activeRules(){return (prefs.rules[domainKey()]||[]).filter(r=>r.enabled!==false);}
function safeMatches(sel){try{return [...document.querySelectorAll(sel)].slice(0,350);}catch{return [];}}
function appliedFilter(){if(!filterEnabled())return;const rules=activeRules();for(const rule of rules){for(const el of safeMatches(rule.selector)){if(rule.type==='css'&&!protectedNode(el))hideNode(el,`Custom rule: ${rule.selector}`);}}}
function setFiltering(enabled){prefs.filter[domainKey()]=enabled;saveSettings();if(!enabled){showAll();}else appliedFilter();render();}
function nodeSelector(el){
  if(el.id&&/^[a-zA-Z][\w:-]{2,75}$/.test(el.id)&&!/\d{5,}/.test(el.id))return '#'+CSS.escape(el.id);
  let s=el.tagName.toLowerCase();const cls=[...el.classList].filter(c=>/^[a-z][\w-]{2,48}$/i.test(c)&&!/[0-9a-f]{8,}/i.test(c)&&!/^css-|^sc-|^jsx-/i.test(c)).slice(0,2);
  if(cls.length)s+='.'+cls.map(c=>CSS.escape(c)).join('.');
  const ancestor=el.parentElement;if(ancestor?.id&&/^[a-zA-Z][\w:-]{2,75}$/.test(ancestor.id))s='#'+CSS.escape(ancestor.id)+' > '+s;
  return s;
}
function clearPicker(){if(!picker)return;document.removeEventListener('click',picker,true);picker=null;stopPreview();render();}
function stopPreview(){for(const e of pickerMatches){e.removeAttribute('data-mb-preview');e.removeAttribute('data-mb-preview-hide');}pickerMatches=[];preview=false;}
function pickFilter(){clearPicker();openView('picker');picker=function(e){if(e.target.closest?.('[data-mb-host]'))return;e.preventDefault();e.stopImmediatePropagation();const target=e.target.closest?.('aside,[role="complementary"],section,div,figure,li,p')||e.target;if(!target||protectedNode(target)){notify('Select a smaller part of the page.');return;}stopPreview();const selector=nodeSelector(target);let ms=safeMatches(selector);if(ms.length>80||ms.length>document.querySelectorAll('p,div,li,section,article').length*.2){notify('Selector is too broad; choose a more specific element.');return;}pickerMatches=ms.filter(n=>!protectedNode(n));for(const n of pickerMatches)n.setAttribute('data-mb-preview','');state.pickerSelector=selector;render();};document.addEventListener('click',picker,true);}
function togglePreview(){preview=!preview;for(const n of pickerMatches){if(preview)n.setAttribute('data-mb-preview-hide','');else n.removeAttribute('data-mb-preview-hide');}render();}
function savePickerRule(){const selector=state.pickerSelector;if(!selector||!pickerMatches.length)return;const arr=prefs.rules[domainKey()]||=[];arr.push({id:Date.now().toString(36),selector,type:'css',enabled:true});stopPreview();clearPicker();saveSettings();appliedFilter();openView('rules');}
// Anonymous, site-scoped token statistics; hash counts only, no text/body/history.
function classificationScore(v,domain=domainKey()){
 const terms=[...new Set(tokens(v))],model=prefs.learning[domain]||{};let val=0,hits=0;
 for(const t of terms){const data=model[tokenHash(t)];if(data){val+=Math.log((data.skip+1)/(data.keep+1));hits++;}}
 return {score:hits?val/Math.sqrt(hits):0,hits};
}
function learnPassage(v,decision){const domain=domainKey(),model=prefs.learning[domain]||={};for(const t of [...new Set(tokens(v))].slice(0,60)){const k=tokenHash(t);const e=model[k]||={keep:0,skip:0};e[decision]=Math.min(30,e[decision]+1);model[k]=e;}const keys=Object.keys(model);if(keys.length>700)for(const k of keys.slice(0,keys.length-700))delete model[k];saveSettings();}
function nuisanceReason(el,str){
 const feedback=classificationScore(str);
 if(prefs.learningEnabled?.[domainKey()]!==false&&feedback.hits>=2&&feedback.score < -0.8)return '';
 const context=((el?.className&&typeof el.className==='string'?el.className:'')+' '+(el?.id||'')+' '+(el?.getAttribute?.('aria-label')||'')).toLowerCase();
 if(/related|recommend|newsletter|promo|advert|sponsor|outbrain|taboola/.test(context))return 'Promotional or recommendation component';
 if(/(?:^|\W)(?:related articles|you might also like|recommended for you|sign up for our newsletter|from around the web|advertisement)(?:\W|$)/i.test(str.slice(0,170)))return 'Likely recommendation or promotion';
 const s=feedback;if(prefs.learningEnabled?.[domainKey()]!==false&&s.hits>=2&&s.score>1.8)return 'Learned from your corrections';
 return '';
}
function inspectPassage(v,el){const why=nuisanceReason(el,v);return {excluded:!!why,reason:why||'Article text'};}

const REDDIT_NAGS=[
 '#desktop-dynamic-upsell-dialog','#app-upsell-blocking-bottom-sheet-direct','#app-upsell-blocking-bottom-sheet-seo','#xpromo-bottom-sheet','#xpromo-new-app-selector','#xpromo-app-selector','#xpromo-small-header','#nsfw-desktop-auth-blocking-modal-dialog','#nsfw-desktop-auth-blocking-modal-overlay-element','#nsfw-qr-dialog','#blocking-modal','#nsfw-desktop-auth-blocking-modal','xpromo-top-button','xpromo-app-selector','faceplate-bottom-sheet[id*="xpromo"]','rpl-bottom-sheet[id*="app-upsell"]','rpl-bottom-sheet[id*="xpromo"]','configured-xpromo-modal[id*="xpromo"]','.configured-xpromo-bottom-sheet','.XPromoPopup','.XPromoPopupRpl','.XPromoBottomBar','.XPromoInFeed','.AppSelectorModal__body','.upsell_banner'
];
const siteSelectors={
 reddit:REDDIT_NAGS,
 x:['[data-interaction="app-store-obstruction"]','[data-testid="app-bar-close"] ~ [data-testid="app-install-banner"]'],
 instagram:['[data-testid="app-download-banner"]'],
 facebook:['.contextual-sign-in-modal','.sign-in-modal','[data-testid="app-install-banner"]'],
 linkedin:['.contextual-sign-in-modal','.sign-in-modal','.guest-upsell'],
 slashdot:[],google:[],other:[]
};
const NAG_RE=/(?:open|view|use|get|continue|download).{0,24}(?:in\s+the\s+app|the\s+(?:reddit|instagram|facebook|twitter|linkedin)\s+app)|(?:log|sign)\s+in\s+to\s+(?:continue|see|view)|join\s+(?:reddit|the conversation)/i;
const DIALOGS='[role="dialog"],[aria-modal="true"],dialog,faceplate-bottom-sheet,rpl-bottom-sheet';
function isAuthPage(){return /^\/(?:login|register|signup|accounts\/login)(?:\/|$)/i.test(location.pathname);}
function siteClean(){
 if(!cleanupEnabled()||siteName()==='other'||isAuthPage())return;
 const name=siteName();for(const sel of siteSelectors[name]||[])for(const n of safeMatches(sel))hideNode(n,'Known '+name+' app prompt');
 if(['reddit','instagram','facebook','x','linkedin'].includes(name)){
  // Never hide a generic dialog based solely on its role: only clearly matching promo copy.
  for(const el of safeMatches(DIALOGS).slice(0,50)){
   const body=text(el.textContent).slice(0,900);if(body.length&&NAG_RE.test(body)&&body.length<700&&el.querySelectorAll('input,textarea').length===0)hideNode(el,'App or login interruption');
  }
  for(const a of safeMatches('header a,nav a,header button,nav button').slice(0,60)){
   const label=text(a.textContent+' '+(a.getAttribute('aria-label')||''));
   if(NAG_RE.test(label)&&label.length<85)hideNode(a,'App promotion');
  }
 }
 if(name==='reddit'&&prefs.nsfw)revealReddit();
 if(name==='slashdot'&&state.slashdotSimple){document.documentElement.setAttribute('data-mb-slashdot','');}
 // Restore document scroll only if modal is already hidden, and no other visible dialog exists.
 if([...hidden.keys()].some(e=>e.isConnected&&/(dialog|modal|sheet|overlay)/i.test(String(e.className)+' '+e.tagName))&&!document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]:not([style*="none"])')){
   if(document.body.style.overflow==='hidden')document.body.style.removeProperty('overflow');
 }
}
function revealReddit(){
 for(const e of safeMatches('shreddit-blurred-container')){
  const isNSFW=/nsfw/i.test((e.getAttribute('reason')||'')+' '+(e.closest('[data-faceplate-tracking-context]')?.getAttribute('data-faceplate-tracking-context')||''));
  if(isNSFW){try{e.blurred=false;e.removeAttribute('blurred');}catch{}}
 }
 for(const e of safeMatches('community-highlight-card,devvit2-blur-gate')){try{if('isBlurred' in e)e.isBlurred=false;if('_blur' in e)e._blur=false;}catch{}}
 for(const e of safeMatches('[data-faceplate-tracking-context*="nsfw"] .thumbnail-blur')){
  e.classList.remove('thumbnail-blur');e.style.removeProperty('filter');
 }
 for(const e of safeMatches('xpromo-nsfw-blocking-container')){
  const sr=e.shadowRoot;if(!sr)continue;
  if(!sr.querySelector('slot[data-mb-nsfw]')){const slot=document.createElement('slot');slot.dataset.mbNsfw='1';sr.append(slot);}
  sr.querySelectorAll('[role="dialog"],.prompt,.viewInApp').forEach(n=>{if(NAG_RE.test(text(n.textContent)))hideNode(n,'NSFW app prompt');});
 }
}
function updateSite(){siteClean();appliedFilter();}
function setSiteCleanup(on){prefs.siteCleanup[siteName()]=on;saveSettings();if(!on){showAll();if(siteName()==='slashdot')document.documentElement.removeAttribute('data-mb-slashdot');appliedFilter();}else updateSite();render();}
function autoMapRedirect(){if(!prefs.autoMaps||siteName()!=='google')return;const dest=appleMapsURL(location.href);if(!dest)return;if(sessionStorage.getItem('mb:last-map')===location.href)return;try{sessionStorage.setItem('mb:last-map',location.href);}catch{}location.replace(dest);}
function imageSrc(img){
 const sources=(img.getAttribute('srcset')||'').split(',').map(x=>{const p=x.trim().split(/\s+/);return {url:p[0],w:Number(p[1]?.replace(/[^0-9]/g,''))||0};}).sort((a,b)=>b.w-a.w);
 return sources[0]?.url || img.currentSrc || img.src;
}
function mediaItems(){
 const root=document.querySelector('article:has(img,video),[data-testid="tweet"]:has(img,video),[role="article"]:has(img,video)')||document;
 const found=[];for(const el of root.querySelectorAll('img,video')){
  if(!el.getBoundingClientRect)continue;const r=el.getBoundingClientRect();if(r.width<95||r.height<90)continue;
  const raw=el.tagName==='VIDEO'?(el.currentSrc||el.src||el.querySelector('source')?.src):imageSrc(el);
  const u=supportedURL(raw);if(!u)continue;if(u.protocol!=='https:'&&u.protocol!=='http:')continue;
  if(el.tagName==='IMG'&&/avatar|profile|emoji|icon|logo/i.test((el.alt||'')+' '+(el.className||'')))continue;
  const href=u.href;const key=href.replace(/([?&])name=(?:small|medium|large|orig)/,'$1name=orig');
  if(found.some(x=>x.url===key))continue;
  found.push({url:key,kind:el.tagName==='VIDEO'?'video':'image',el,label:(el.alt||'').slice(0,65)||`${el.tagName==='VIDEO'?'Video':'Image'} ${found.length+1}`});
  if(found.length>=65)break;
 }
 return found;
}
function expandFacebookComments(){
 if(siteName()!=='facebook')return notify('This action is for Facebook.');
 const names=/^(?:view|see|show|load)\s+(?:more\s+|all\s+|previous\s+)?(?:\d+\s+)?comments?\b|^(?:most relevant|all comments)$/i;
 const target=[...document.querySelectorAll('button,[role="button"],a')].find(e=>names.test(text(e.textContent))&&!e.closest('[data-mb-host]'));
 if(target){target.click();notify('Requested Facebook’s native comments.');}else notify('No accessible native comments control found.');
}
function slashdotOlder(){if(siteName()!=='slashdot')return;const a=[...document.querySelectorAll('a')].find(x=>/older articles|older stories|more stories/i.test(text(x.textContent)));if(a?.href)location.assign(a.href);else notify('Older articles link not found.');}

let reading={passages:[],index:0,generation:0,preparing:false,playing:false,autoplay:false,aborts:new Set(),sampleCache:new Map()};
let audioMode='article';const audio=new Audio();audio.preload='auto'; audio.playsInline=true;
let lastAudioURL=null;
const MIME_MP3='audio/mpeg';
function revokeAudioURL(){if(lastAudioURL){URL.revokeObjectURL(lastAudioURL);lastAudioURL=null;}}
function discoverPassages(){
 const selection=text(window.getSelection()?.toString()||'');
 if(selection.length>2)return chunkText(selection).map(s=>({text:s,element:null,excluded:false,reason:'Selected text',blob:null,status:'idle'}));
 const candidates=[...document.querySelectorAll('article,[itemprop="articleBody"],[role="main"],main')];
 const root=candidates.sort((a,b)=>{
  const score=n=>text(n.textContent).length-Math.min(2500,n.querySelectorAll('a,button,nav').length*42);
  return score(b)-score(a);
 })[0]||document.body;
 let nodes=[...root.querySelectorAll('p,h1,h2,h3,blockquote,li')].filter(e=>{
  const v=text(e.textContent);return v.length>=22 && v.length<=4500 && !e.closest('nav,header,footer,aside,[role="navigation"],[data-mb-host]') && !e.querySelector('p,h1,h2,h3,blockquote,li');
 });
 if(nodes.length<2){const v=text(root.textContent);if(v.length>200)nodes=[root];}
 const seen=new Set();const result=[];
 for(const n of nodes.slice(0,350)){
  const str=text(n.textContent);if(seen.has(str))continue;seen.add(str);
  const excluded=hidden.has(n)||[...hidden.keys()].some(e=>e.contains(n));const classification=inspectPassage(str,n);
  for(const t of chunkText(str)){result.push({text:t,element:n,excluded:excluded||classification.excluded,reason:excluded?'Hidden on page':classification.reason,blob:null,status:'idle'});}
 }
 return result;
}
function openReader(){stopPlayback(true);reading.passages=discoverPassages();reading.index=0;state.readerEditing=false;if(!reading.passages.length)notify('No article text found. Select text first, or paste text in the reader.');openView('reader');}
function readerPlain(){return reading.passages.filter(p=>!p.excluded).map(p=>p.text).join('\n\n');}
function replaceReaderText(v){stopPlayback(true);reading.passages=chunkText(v).map(t=>({text:t,element:null,excluded:false,reason:'Edited text',blob:null,status:'idle'}));reading.index=0;state.readerEditing=false;render();}
function excludePassage(i){const p=reading.passages[i];if(!p)return;stopPlayback(true);p.excluded=!p.excluded;p.reason=p.excluded?'You skipped this passage':'You kept this passage';learnPassage(p.text,p.excluded?'skip':'keep');reading.passages.forEach(t=>{t.status='idle';});render();}
async function requestGM(url,opts={}){
 if(!/^https:/.test(url))throw Error('Only HTTPS requests are allowed.');
 if(typeof GM==='undefined'||typeof GM.xmlHttpRequest!=='function')throw Error('Userscripts GM.xmlHttpRequest is unavailable. Check the script grants and extension permissions.');
 const params={url,method:opts.method||'GET',headers:opts.headers||{},data:opts.data,responseType:opts.responseType||'arraybuffer',timeout:45000};
 let request=GM.xmlHttpRequest(params);
 if(request?.abort&&opts.onRequest)opts.onRequest(request);
 const response=await request;
 if(response.status<200||response.status>=300){const msg=response.status===401||response.status===403?'Authorization failed: check the Azure key and region':response.status===429?'Azure rate limit exceeded':`Request returned HTTP ${response.status}`;throw Error(msg);}
 return response;
}
function responseBlob(response,type=MIME_MP3){const v=response.response;if(v instanceof Blob)return v;if(v instanceof ArrayBuffer)return new Blob([v],{type});if(ArrayBuffer.isView(v))return new Blob([v],{type});throw Error('Audio response was not binary.');}
function azureEndpoint(path){const region=prefs.azure.region?.trim().toLowerCase();if(!/^[a-z0-9-]{3,40}$/.test(region))throw Error('Choose a valid Azure resource region.');return `https://${region}.tts.speech.microsoft.com/cognitiveservices/${path}`;}
function synthSSML(s){const voice=prefs.azure.voice||'en-US-JennyNeural';if(!/^[\w-]{4,90}$/.test(voice))throw Error('Invalid voice name');const lang=voice.split('-').slice(0,2).join('-');return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${esc(lang)}"><voice name="${esc(voice)}">${esc(s)}</voice></speak>`;}
async function azureSynthesize(v,onRequest){
 if(!azureKey)throw Error('Set an Azure Speech resource key first.');
 const fmt=prefs.azure.quality==='high'?'audio-24khz-96kbitrate-mono-mp3':'audio-24khz-48kbitrate-mono-mp3';
 const r=await requestGM(azureEndpoint('v1'),{method:'POST',data:synthSSML(v),responseType:'arraybuffer',headers:{'Ocp-Apim-Subscription-Key':azureKey,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':fmt,'User-Agent':'iPhoneMasterButton/0.1'},onRequest});
 return responseBlob(r);
}
async function loadVoices(){if(!azureKey)throw Error('Enter a key first.');const region=prefs.azure.region?.trim().toLowerCase();const r=await requestGM(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,{responseType:'text',headers:{'Ocp-Apim-Subscription-Key':azureKey}});let list;try{list=JSON.parse(r.responseText||r.response);}catch{throw Error('Azure returned an invalid voices list.');}
 state.voices=list.filter(v=>v.ShortName&&v.Locale).map(v=>({id:v.ShortName,label:`${v.Locale} · ${v.LocalName||v.ShortName} (${v.Gender||'voice'})`}));notify(`Loaded ${state.voices.length} Azure voices`);render();}
async function demoVoice(){if(!azureKey)return notify('Enter your Azure key first.');stopPlayback(true);audioMode='demo';try{
 const key=prefs.azure.region+'|'+prefs.azure.voice+'|'+prefs.azure.quality;
 if(!reading.sampleCache.has(key))reading.sampleCache.set(key,await azureSynthesize('Hello. This is a sample of the selected reading voice.'));
 const blob=reading.sampleCache.get(key);const u=URL.createObjectURL(blob);revokeAudioURL();lastAudioURL=u;audio.src=u;audio.playbackRate=1;await audio.play();notify('Playing voice sample');
 }catch(e){notify(e.message);}}
function stopAudioOnly(){audio.pause();audio.removeAttribute('src');audio.load();revokeAudioURL();reading.playing=false;}
function stopPlayback(invalidate=false){if(invalidate){reading.generation++;for(const c of reading.aborts){try{c.abort?.();}catch{}}reading.aborts.clear();reading.preparing=false;reading.autoplay=false;}stopAudioOnly();}
function enabledIndices(){return reading.passages.map((p,i)=>!p.excluded?i:-1).filter(i=>i>=0);}
function nextEnabled(from){return enabledIndices().find(i=>i>=from)??-1;}
async function prepareReading(){
 if(!azureKey){openView('speech');return;}
 const ids=enabledIndices();if(!ids.length)return notify('No enabled passages to narrate.');
 const job=++reading.generation;reading.preparing=true;reading.autoplay=true;render();
 // The first passage is synthesized first; subsequent passages start while it plays.
 for(const i of ids){if(job!==reading.generation)break;const p=reading.passages[i];if(p.blob)continue;
  p.status='preparing';render();try{const blob=await azureSynthesize(p.text,req=>reading.aborts.add(req));if(job!==reading.generation)break;p.blob=blob;p.status='ready';if(reading.autoplay&&i===ids[0]){reading.index=i;playPassage(i).catch(e=>notify(`Tap Play to start audio: ${e.message}`));}render();}
  catch(e){if(job!==reading.generation)break;p.status='error';p.error=e.message;notify(`Passage ${i+1}: ${e.message}`);render();break;}
 }
 if(job===reading.generation){reading.preparing=false;render();}
}
async function playPassage(i){audioMode='article';const p=reading.passages[i];if(!p||p.excluded)return;reading.index=i;stopAudioOnly();if(!p.blob){notify('This passage is not ready yet.');render();return;}
 lastAudioURL=URL.createObjectURL(p.blob);audio.src=lastAudioURL;audio.playbackRate=prefs.playbackRate;try{await audio.play();reading.playing=true;state.view='reader';render();}catch(e){reading.playing=false;render();throw e;}
}
audio.addEventListener('ended',()=>{reading.playing=false;if(audioMode==='demo'){render();return;}const n=nextEnabled(reading.index+1);if(n>=0){if(reading.passages[n].blob)playPassage(n).catch(()=>{});else notify('Buffering next passage. Unlock Safari and tap Play if needed.');}else notify('Finished reading.');render();});
audio.addEventListener('pause',()=>{reading.playing=false;render();});
audio.addEventListener('play',()=>{reading.playing=true;render();});
audio.addEventListener('timeupdate',()=>{const s=host?.shadowRoot?.querySelector('[data-audio-seek]');if(s&&Number.isFinite(audio.duration)&&audio.duration>0){s.max=String(audio.duration);s.value=String(audio.currentTime);} });
function pauseResume(){if(audio.paused){if(audio.src)audio.play().catch(e=>notify('Tap again to allow playback: '+e.message));else{const i=nextEnabled(reading.index);if(i>=0&&reading.passages[i].blob)playPassage(i).catch(e=>notify(e.message));else prepareReading();}}else audio.pause();}
async function jumpTo(i){const p=reading.passages[i];if(!p||p.excluded)return;if(p.blob){await playPassage(i);}else notify('Passage still preparing.');}
function transcriptFile(withTimings=false){let v='';for(const [i,p] of reading.passages.entries()){if(p.excluded)continue;v+=withTimings?`[Passage ${i+1}${Number.isFinite(p.duration)?' · '+Math.round(p.duration)+'s':''}]\n`:'';v+=p.text+'\n\n';}return new Blob([v],{type:'text/plain;charset=utf-8'});}
// Strip leading ID3 metadata per chunk. MP3 frame joining is best-effort, not guaranteed gapless.
async function combineMp3(){const pass=reading.passages.filter(p=>!p.excluded);if(pass.some(p=>!p.blob))throw Error('Prepare every enabled passage before exporting audio.');if(!pass.length)throw Error('No enabled passages.');
 const parts=[];for(const p of pass){let b=new Uint8Array(await p.blob.arrayBuffer());if(b.length>10&&b[0]===73&&b[1]===68&&b[2]===51){const size=(b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9];b=b.slice(size+10);}if(b.length<3||b[0]!==255||(b[1]&224)!==224)throw Error('Azure returned a format that cannot be joined as MP3.');parts.push(b);}return new Blob(parts,{type:MIME_MP3});
}
async function downloadBlob(blob,name){const file=new File([blob],name,{type:blob.type||'application/octet-stream'});
 if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:name});return;}catch(e){if(e.name==='AbortError')return;}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=name;a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('Used browser download fallback.');
}
async function exportAudio(){try{state.exporting=true;render();const b=await combineMp3();await downloadBlob(b,'master-button-reading.mp3');}catch(e){notify(e.message);}finally{state.exporting=false;render();}}
function setMediaSession(){if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:document.title||'Article narration',artist:location.hostname});navigator.mediaSession.setActionHandler('play',()=>pauseResume());navigator.mediaSession.setActionHandler('pause',()=>pauseResume());navigator.mediaSession.setActionHandler('nexttrack',()=>{const n=nextEnabled(reading.index+1);if(n>=0)jumpTo(n);});navigator.mediaSession.setActionHandler('previoustrack',()=>{const n=enabledIndices().filter(i=>i<reading.index).pop();if(n!==undefined)jumpTo(n);});}catch{}}
setMediaSession();

let host=null,toastTimer=0,observer=null,observerTimer=0,lastLocation=location.href,ignoreClick=false;
const state={view:'',readerEditing:false,readerDraft:'',voices:[],siteMedia:[],mediaIndex:0,selectedMedia:null,selectMedia:false,pickerSelector:'',exporting:false,slashdotSimple:false};
const button=(action,icon,label,extra='')=>`<button type="button" data-action="${esc(action)}" class="mb-action" ${extra}><span aria-hidden="true">${icon}</span><span>${esc(label)}</span></button>`;
function notify(message){if(!host)return;const el=host.shadowRoot.querySelector('.mb-toast');if(!el)return;el.textContent=String(message);el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},4500);}
async function shareURL(u){try{if(navigator.share){await navigator.share({url:u});return;}}catch(e){if(e.name==='AbortError')return;}await copyText(u);notify('Copied link.');}
async function copyText(v){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(v);return;}catch{}}if(typeof GM!=='undefined'&&typeof GM.setClipboard==='function'){await GM.setClipboard(v);return;}throw Error('No clipboard permission; use the URL editor to copy manually.');}
function openView(v){state.view=v;render();}
function positionCSS(){const vv=window.visualViewport,w=vv?.width||document.documentElement.clientWidth||innerWidth;return `left:${Math.max(5,(vv?.offsetLeft||0)+w-47-Math.max(5,Math.min(w-54,prefs.position.right)))}px;top:${Math.max(5,(vv?.offsetTop||0)+(vv?.height||innerHeight)-47-Math.max(8,Math.min((vv?.height||innerHeight)-54,prefs.position.bottom)))}px;bottom:auto;right:auto;`;}
const styles=`
:host{all:initial;color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif!important;}
*,*::before,*::after{box-sizing:border-box;}
.mb-launch{position:fixed;${positionCSS()}width:47px;height:47px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(29,35,48,.74);color:white;box-shadow:0 3px 14px rgba(0,0,0,.24);z-index:2;font:500 22px -apple-system;touch-action:none;pointer-events:auto;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);}
.mb-count{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;border-radius:10px;background:#3d79ff;color:white;font:600 10px -apple-system;padding:2px 4px;}
.mb-panel{--fg:#172131;--muted:#576377;--bg:#fff;--box:#f0f2f7;--bd:#e2e5ed;position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 78px);width:min(390px,calc(100vw - 24px));max-height:min(76dvh,690px);overflow:auto;overscroll-behavior:contain;z-index:3;background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:21px;box-shadow:0 9px 48px rgba(0,0,0,.28);font:15px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:auto;-webkit-overflow-scrolling:touch;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f1f2f6;--muted:#afb8c8;--bg:#20232b;--box:#303541;--bd:#3e4551;}}
.mb-panel.reader{inset:env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0;width:100%;max-height:100dvh;border-radius:0;display:flex;flex-direction:column;}
.mb-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;background:var(--bg);padding:14px 14px 9px;border-bottom:1px solid var(--bd);gap:8px;}
.mb-head h2{font-size:16px;line-height:1.3;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mb-small{border:0;background:var(--box);color:var(--fg);border-radius:11px;padding:8px 10px;font:inherit;min-height:38px;}
.mb-body{padding:12px 14px 16px;display:grid;gap:10px;}
.mb-action{display:flex;gap:10px;align-items:center;justify-content:flex-start;background:var(--box);color:var(--fg);border:1px solid var(--bd);border-radius:12px;min-height:45px;padding:10px 12px;text-align:left;font:500 14px/1.4 -apple-system;cursor:pointer;}
.mb-action span:first-child{width:23px;flex-shrink:0;font-size:18px;text-align:center;}
.mb-action:disabled,.mb-small:disabled{opacity:.47;}
.mb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.mb-muted{font-size:12px;color:var(--muted);margin:0;}
.mb-rule{border:1px solid var(--bd);border-radius:12px;padding:9px 10px;display:grid;gap:7px;overflow-wrap:anywhere;}
.mb-row{display:flex;align-items:center;justify-content:space-between;gap:9px;}
.mb-field{display:grid;gap:4px;font-size:12px;color:var(--muted);font-weight:600;}
.mb-input,.mb-select,.mb-textarea{width:100%;min-height:42px;border:1px solid var(--bd);border-radius:10px;background:var(--box);color:var(--fg);font:14px/1.4 -apple-system;padding:8px;}
.mb-textarea{min-height:130px;resize:vertical;font-size:14px;}
.mb-transcript{flex:1;min-height:0;overflow:auto;padding:12px 15px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
.mb-paragraph{display:flex;align-items:flex-start;gap:7px;padding:12px 7px;border-bottom:1px solid var(--bd);line-height:1.6;white-space:pre-wrap;}
.mb-paragraph.current{background:rgba(72,136,255,.14);border-radius:10px;}
.mb-paragraph.excluded{opacity:.5;}
.mb-paragraph button{border:1px solid var(--bd);background:var(--box);color:var(--fg);border-radius:9px;padding:6px;min-width:38px;min-height:38px;}
.mb-controls{flex:none;border-top:1px solid var(--bd);padding:10px 13px calc(9px + env(safe-area-inset-bottom));display:grid;gap:9px;background:var(--bg);}
.mb-range{width:100%;accent-color:#527cdb;}
.mb-toast{position:fixed;bottom:calc(env(safe-area-inset-bottom) + 66px);left:12px;right:12px;margin:auto;max-width:370px;color:#fff;background:rgba(22,24,31,.93);padding:12px;border-radius:12px;font:13px/1.4 -apple-system;z-index:5;pointer-events:none;}
.mb-toast[hidden],.mb-panel[hidden]{display:none;}
.mb-pill{font-size:11px;color:var(--muted);background:var(--box);padding:4px 7px;border-radius:9px;}
.mb-preview{height:96px;border-radius:11px;background:var(--box);display:grid;place-items:center;overflow:hidden;}
.mb-preview img,.mb-preview video{max-width:100%;max-height:96px;object-fit:contain;}
:host([data-picker]){--unused:0;}
@media(prefers-reduced-motion:no-preference){.mb-panel{animation:mb-in .12s ease-out;}@keyframes mb-in{from{opacity:.8;transform:translateY(6px)}to{opacity:1;transform:none}}}
`;
const globalStyles=`[data-mb-preview]{outline:3px dashed #4c80ff!important;outline-offset:3px!important;}[data-mb-preview-hide]{visibility:hidden!important;}html[data-mb-slashdot] #slashboxes,html[data-mb-slashdot] #footer,html[data-mb-slashdot] .adwrap{display:none!important;}html[data-mb-slashdot] #firehose,html[data-mb-slashdot] #articles{max-width:790px!important;width:100%!important;margin:auto!important;}`;
function head(title){return `<header class="mb-head"><button class="mb-small" data-action="${state.view==='menu'?'close':'back'}" aria-label="Back">${state.view==='menu'?'×':'‹'}</button><h2>${esc(title)}</h2><button class="mb-small" data-action="close" aria-label="Close drawer">×</button></header>`;}
function renderMenu(){
 const s=siteName(),active=cleanupEnabled();return `${head('Master Button · '+s)}<div class="mb-body">
 <div class="mb-grid">${button('share-clean','↗','Share clean link')}${button('url','🔗','Edit URL')}${button('reader','◉','Read aloud')}${button('filter','◈','Filter page')}${button('rules','⚙','Filter rules')}${button('speech','♫','Speech settings')}</div>
 ${s!=='other'?`<div class="mb-row"><strong>${esc(s[0].toUpperCase()+s.slice(1))} controls</strong><span class="mb-pill">Site-specific</span></div>${button('site-toggle',active?'✓':'○',active?'Auto cleanup: On':'Auto cleanup: Off')}`:''}
 ${s==='reddit'?button('nsfw',prefs.nsfw?'✓':'○',`Reveal NSFW: ${prefs.nsfw?'On':'Off'}`):''}
 ${['x','instagram','facebook','linkedin'].includes(s)?`${button('media','▧','Browse media')}${button('media-picker','◎','Select media on page')}`:''}
 ${s==='facebook'?button('fb-comments','☷','Expand native comments'):''}
 ${s==='slashdot'?`${button('slashdot-simple','▤','Toggle reading layout')}${button('slashdot-search','⌕','Search Slashdot')}${button('slashdot-older','←','Older articles')}`:''}
 ${s==='google'?`${button('auto-maps',prefs.autoMaps?'✓':'○',`Auto Apple Maps: ${prefs.autoMaps?'On':'Off'}`)}${button('apple-maps','⌖','Open in Apple Maps')}`:''}
 ${camelURL(location.href)?button('camel','↗','Amazon price history'):''}
 ${button('updates','↻','Check for updates')}<p class="mb-muted">${esc(location.hostname)} · v${VERSION} · Hidden: <span data-count>0</span></p></div>`;
}
function renderURL(){return `${head('Edit URL')}<div class="mb-body"><label class="mb-field">Destination URL<textarea class="mb-textarea" rows="3" id="mb-url">${esc(state.urlDraft||location.href)}</textarea></label><div class="mb-grid">${button('url-clean','✦','Clean URL')}${button('url-copy','▣','Copy')}${button('url-share','↗','Share')}${button('url-open','↗','Open URL')}</div><p class="mb-muted">Only confirmed tracking parameters are removed. Other parameters and fragments are preserved.</p></div>`;}
function renderFilter(){return `${head('Page filtering')}<div class="mb-body">${button('filter-toggle',filterEnabled()?'✓':'○',`Filter ${filterEnabled()?'enabled':'disabled'} for ${domainKey()}`)}${button('pick-filter','⊕','Tap an element to filter')}${button('rules','⚙','Inspect and edit rules')}${button('restore-hidden','↶','Restore all hidden items')}
 <p class="mb-muted">Hidden now: <span data-count>0</span>. A preview never saves a rule. Article extraction also omits related-story and promotion blocks conservatively.</p></div>`;}
function renderPicker(){return `${head('Select nuisance element')}<div class="mb-body"><p>Tap an unwanted element on the webpage. Its matching elements will be outlined before you save anything.</p><div class="mb-rule"><strong>${esc(state.pickerSelector||'No element selected')}</strong><span class="mb-muted">${pickerMatches.length} matching elements highlighted</span>${pickerMatches.length?`<div class="mb-grid">${button('preview',preview?'◉':'◎',preview?'Undo preview':'Preview hiding')}${button('picker-save','✓','Save rule')}</div>${button('picker-next','↓','Show next match')}`:''}</div>${button('picker-cancel','×','Cancel and restore')}</div>`;}
function renderRules(){const rules=prefs.rules[domainKey()]||[];return `${head('Filter rules')}<div class="mb-body">${button('pick-filter','⊕','New visual rule')}${rules.length?rules.map((r,i)=>`<div class="mb-rule"><strong>${esc(r.selector)}</strong><span class="mb-muted">${safeMatches(r.selector).length} current matches · ${r.enabled?'Enabled':'Disabled'}</span><div class="mb-grid">${button('rule-toggle:'+i,r.enabled?'✓':'○',r.enabled?'Disable':'Enable')}${button('rule-edit:'+i,'✎','Edit selector')}${button('rule-delete:'+i,'⌫','Delete')}</div></div>`).join(''):'<p class="mb-muted">No custom rules for this site.</p>'}
 ${button('learning-toggle',prefs.learningEnabled?.[domainKey()]===false?'○':'✓',`Learning: ${prefs.learningEnabled?.[domainKey()]===false?'Off':'On'}`)}${button('learning-clear','↶','Reset learned preferences')}<p class="mb-muted">${Object.keys(prefs.learning[domainKey()]||{}).length} hashed token weights saved. No raw article text is stored.</p></div>`;}
function renderSpeech(){return `${head('Azure speech settings')}<div class="mb-body"><p class="mb-muted">Credentials are saved using Userscripts extension storage, not the website’s storage. Azure synthesis sends enabled text to Microsoft.</p>
 <label class="mb-field">Speech resource key<input class="mb-input" id="mb-key" type="password" value="" autocomplete="off" placeholder="${azureKey?'Saved · enter to replace':'Enter Azure resource key'}"></label>
 <label class="mb-field">Resource region<input class="mb-input" id="mb-region" value="${esc(prefs.azure.region)}" placeholder="eastus"></label>
 <div class="mb-grid">${button('speech-save','✓','Save settings')}${button('speech-forget','⌫','Forget key')}</div>
 ${button('speech-voices','↻','Load voices from Azure')}
 <label class="mb-field">Voice<select class="mb-select" id="mb-voice"><option value="${esc(prefs.azure.voice)}">${esc(prefs.azure.voice)}</option>${state.voices.filter(v=>v.id!==prefs.azure.voice).map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('')}</select></label>
 ${button('speech-demo','▶','▶ Hear voice sample')}
 <label class="mb-field">Audio quality<select class="mb-select" id="mb-quality"><option value="compact" ${prefs.azure.quality==='compact'?'selected':''}>Compact MP3 · 48 kbps</option><option value="high" ${prefs.azure.quality==='high'?'selected':''}>Higher quality MP3 · 96 kbps</option></select></label><p class="mb-muted">Choose quality before synthesis. Previously prepared audio is reused for export.</p></div>`;}
function renderReader(){
 const total=reading.passages.length,ready=reading.passages.filter(p=>p.blob&&!p.excluded).length,enabled=enabledIndices().length;
 const editor=state.readerEditing?`<div class="mb-body"><textarea class="mb-textarea" style="min-height:42dvh" id="mb-reader-edit">${esc(state.readerDraft)}</textarea>${button('reader-save','✓','Use edited text')}${button('reader-abort','×','Cancel editing')}</div>`:`<div class="mb-transcript" data-transcript>${total?reading.passages.map((p,i)=>`<div class="mb-paragraph ${p.excluded?'excluded':''} ${i===reading.index?'current':''}" data-pass="${i}"><button type="button" data-action="pass-toggle:${i}" aria-label="${p.excluded?'Include':'Skip'} passage ${i+1}">${p.excluded?'＋':'−'}</button><div><small>${i+1}/${total} · ${esc(p.status||'idle')}${p.reason&&p.excluded?' · '+esc(p.reason):''}</small><div style="font-size:${prefs.fontSize}px" data-action="pass-play:${i}">${esc(p.text)}</div></div></div>`).join(''):'<p>No article found. Tap Edit text to paste something to narrate.</p>'}</div>`;
 return `${head('Article reader')}<div class="mb-body" style="flex:none;padding-bottom:6px"><div class="mb-row"><span class="mb-muted">${ready}/${enabled} passages prepared${reading.preparing?' · Preparing…':''}</span><button class="mb-small" data-action="reader-edit">Edit text</button></div></div>${editor}
 <section class="mb-controls"><input data-audio-seek type="range" class="mb-range" value="0" min="0" max="100" step=".1" aria-label="Seek within current passage"/><div class="mb-row"><button class="mb-small" data-action="prev">⇤</button><button class="mb-small" data-action="play">${reading.playing?'❚❚':'▶'}</button><button class="mb-small" data-action="next">⇥</button><label class="mb-field" style="max-width:88px">Speed<select class="mb-select" id="mb-rate">${[.75,1,1.25,1.5,1.75,2].map(x=>`<option value="${x}" ${prefs.playbackRate===x?'selected':''}>${x}×</option>`).join('')}</select></label></div><div class="mb-grid">${button('prepare','▸',reading.preparing?'Preparing audio…':'Prepare & play')}${button('stop','■','Cancel / Stop')}${button('export-mp3','⇩',state.exporting?'Exporting…':'Share MP3')}${button('export-text','▤','Share transcript')}${button('filter','◈','Filtering rules')}${button('minimize','—','Minimize')}${button('reader-new','↻','New extraction')}</div><p class="mb-muted">Lock-screen mode: prepare all passages, then share the combined MP3 to a player. Automatic passage transitions in locked Safari are not guaranteed.</p></section>`;
}
function renderMini(){return `${head('Now playing')}<div class="mb-body"><p class="mb-muted">Passage ${reading.index+1} of ${reading.passages.length}</p><div class="mb-grid">${button('play',reading.playing?'❚❚':'▶',reading.playing?'Pause':'Play')}${button('next','⇥','Next passage')}${button('reader','▤','Full reader')}${button('menu','☰','All tools')}</div></div>`;}
function renderMedia(){state.siteMedia=mediaItems();const i=Math.min(state.mediaIndex,state.siteMedia.length-1),it=state.selectedMedia||state.siteMedia[Math.max(0,i)];return `${head('Media · '+siteName())}<div class="mb-body"><p class="mb-muted">Choose the currently displayed item, or select one directly on the webpage. Downloads require accessible direct files.</p><div class="mb-row"><strong>${state.siteMedia.length} detected items</strong><button class="mb-small" data-action="media-refresh">Refresh</button></div>${state.siteMedia.length?`<select id="mb-media" class="mb-select">${state.siteMedia.map((x,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(x.kind+' '+(j+1)+' · '+x.label)}</option>`).join('')}</select>`:''}${it?`<div class="mb-preview">${it.kind==='image'?`<img src="${esc(it.url)}" alt="Selected media preview">`:'<span>Video selected</span>'}</div><p class="mb-muted">${esc(it.kind)} · ${esc(it.url.slice(0,110))}</p>`:''}
 <div class="mb-grid">${button('media-picker','◎','Select on page')}${button('media-share','↗','Share file')}${button('media-download','⇩','Download file')}${button('media-open','↗','Open source')}</div></div>`;}
function renderMediaPicker(){return `${head('Tap page media')}<div class="mb-body"><p>Tap an image or video on the website. The tap will select it rather than open the post.</p>${button('media-cancel','×','Cancel selection')}</div>`;}
function render(){if(!host)return;const shadow=host.shadowRoot;const content=state.view==='menu'?renderMenu():state.view==='url'?renderURL():state.view==='filter'?renderFilter():state.view==='picker'?renderPicker():state.view==='rules'?renderRules():state.view==='speech'?renderSpeech():state.view==='reader'?renderReader():state.view==='mini'?renderMini():state.view==='media'?renderMedia():state.view==='media-picker'?renderMediaPicker():'';
 shadow.querySelector('.mb-launch').style.cssText=positionCSS();const panel=shadow.querySelector('.mb-panel');panel.hidden=!state.view;panel.className='mb-panel'+(state.view==='reader'?' reader':'');const vv=window.visualViewport,w=vv?.width||document.documentElement.clientWidth||innerWidth;panel.style.left=state.view==='reader'?`${vv?.offsetLeft||0}px`:`${(vv?.offsetLeft||0)+Math.max(12,w-Math.min(390,w-24)-12)}px`;panel.style.right='auto';panel.style.bottom=state.view==='reader'?'auto':`calc(env(safe-area-inset-bottom) + ${78+Math.max(0,innerHeight-(vv?.height||innerHeight)-(vv?.offsetTop||0))}px)`;panel.style.top=state.view==='reader'?`${vv?.offsetTop||0}px`:'auto';panel.style.height=state.view==='reader'?`${vv?.height||innerHeight}px`:'auto';panel.style.width=state.view==='reader'?`${w}px`:`${Math.min(390,w-24)}px`;if(panel.innerHTML!==content)panel.innerHTML=content;updateCount();}

async function handleAction(action,el){
 try{
  if(action==='close'){if(state.view==='picker')clearPicker();if(state.view==='media-picker')endMediaPick();state.view='';render();return;}
  if(action==='back'){if(state.view==='picker')clearPicker();if(state.view==='media-picker')endMediaPick();openView('menu');return;}
  if(action==='menu'){openView('menu');return;}
  if(action==='minimize'){state.view='';render();return;}
  if(action==='share-clean'){await shareURL(cleanURL(location.href));return;}
  if(action==='url'){state.urlDraft=location.href;openView('url');return;}
  if(action.startsWith('url-')){
   const input=host.shadowRoot.getElementById('mb-url');const raw=input?.value||state.urlDraft||location.href;
   if(action==='url-clean'){state.urlDraft=cleanURL(raw);render();}
   if(action==='url-copy'){await copyText(raw);notify('URL copied.');}
   if(action==='url-share')await shareURL(supportedURL(raw)?.href||(()=>{throw Error('Invalid URL');})());
   if(action==='url-open'){const u=supportedURL(raw);if(!u)throw Error('Use a valid https/http URL.');window.open(u.href,'_blank','noopener,noreferrer');}
   return;
  }
  if(action==='reader'){if(reading.passages.length)openView('reader');else openReader();return;}
  if(action==='reader-new'){openReader();return;}
  if(action==='filter'){openView('filter');return;}
  if(action==='filter-toggle'){setFiltering(!filterEnabled());return;}
  if(action==='restore-hidden'){showAll();notify('Restored items modified by this script.');return;}
  if(action==='rules'){openView('rules');return;}
  if(action==='pick-filter'){pickFilter();return;}
  if(action==='preview'){togglePreview();return;}
  if(action==='picker-cancel'){clearPicker();openView('filter');return;}
  if(action==='picker-save'){savePickerRule();return;}
  if(action==='picker-next'){if(!pickerMatches.length)return;const idx=(state.pickerIndex=(state.pickerIndex+1)%pickerMatches.length);pickerMatches[idx].scrollIntoView({block:'center',behavior:'smooth'});return;}
  if(action.startsWith('rule-')){
   const [cmd,n]=action.split(':');const r=(prefs.rules[domainKey()]||[])[Number(n)];if(!r)return;
   if(cmd==='rule-toggle'){r.enabled=!r.enabled;showAll();updateSite();}
   if(cmd==='rule-delete'){prefs.rules[domainKey()].splice(Number(n),1);showAll();updateSite();}
   if(cmd==='rule-edit'){const chosen=prompt('CSS selector for this site',r.selector);if(chosen===null)return;const m=safeMatches(chosen);if(!chosen.trim()||m.length>80||m.some(e=>protectedNode(e)))throw Error('Selector is invalid or too broad.');r.selector=chosen;showAll();updateSite();}
   await saveSettings();render();return;
  }
  if(action==='learning-toggle'){prefs.learningEnabled[domainKey()]=prefs.learningEnabled[domainKey()]===false;await saveSettings();render();return;}
  if(action==='learning-clear'){delete prefs.learning[domainKey()];await saveSettings();notify('Learning reset for this site.');return;}
  if(action==='site-toggle'){setSiteCleanup(!cleanupEnabled());return;}
  if(action==='nsfw'){prefs.nsfw=!prefs.nsfw;await saveSettings();if(prefs.nsfw)revealReddit();notify(`Reddit NSFW reveal ${prefs.nsfw?'enabled':'disabled'} (reload may be needed to restore original blur).`);render();return;}
  if(action==='camel'){const u=camelURL(location.href);if(u)window.open(u,'_blank','noopener,noreferrer');return;}
  if(action==='auto-maps'){prefs.autoMaps=!prefs.autoMaps;await saveSettings();render();notify('Automatic Apple Maps routing '+(prefs.autoMaps?'enabled':'disabled'));return;}
  if(action==='apple-maps'){const u=appleMapsURL(location.href);if(u)location.assign(u);else notify('This Google Maps URL has no safely identifiable destination.');return;}
  if(action==='fb-comments'){expandFacebookComments();return;}
  if(action==='slashdot-simple'){state.slashdotSimple=!state.slashdotSimple;if(state.slashdotSimple)document.documentElement.setAttribute('data-mb-slashdot','');else document.documentElement.removeAttribute('data-mb-slashdot');render();return;}
  if(action==='slashdot-search'){const q=prompt('Search Slashdot');if(q)window.open('https://slashdot.org/index2.pl?fhfilter='+encodeURIComponent(q),'_blank','noopener,noreferrer');return;}
  if(action==='slashdot-older'){slashdotOlder();return;}
  if(action==='media'||action==='media-refresh'){state.selectedMedia=null;state.mediaIndex=0;openView('media');return;}
  if(action==='media-picker'){startMediaPick();return;}
  if(action==='media-cancel'){endMediaPick();openView('media');return;}
  if(action==='media-share'||action==='media-download'||action==='media-open'){
   const m=state.selectedMedia||state.siteMedia[state.mediaIndex];if(!m)throw Error('Select an image or video first.');
   if(action==='media-open'){window.open(m.url,'_blank','noopener,noreferrer');return;}
   if(/\.(m3u8|mpd)(?:[?#]|$)/i.test(m.url))throw Error('Streaming playlists cannot be saved as single media files here.');
   notify('Fetching selected media…');const r=await requestGM(m.url,{responseType:'arraybuffer'});
   const type=/\.(mp4|mov)(?:[?#]|$)/i.test(m.url)?'video/mp4':m.kind==='video'?'video/mp4':'image/jpeg';
   const b=responseBlob(r,type);const name=`${siteName()}-${Date.now()}.${m.kind==='video'?'mp4':/\.png/i.test(m.url)?'png':'jpg'}`;
   if(action==='media-share')await downloadBlob(b,name);else{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);notify('Download requested.');}return;
  }
  if(action==='speech'){openView('speech');return;}
  if(action==='speech-save'){
   const k=host.shadowRoot.getElementById('mb-key')?.value?.trim();const region=host.shadowRoot.getElementById('mb-region')?.value?.trim().toLowerCase();
   if(!/^[a-z0-9-]{3,40}$/.test(region))throw Error('Enter a valid Azure region, e.g. eastus.');
   prefs.azure.region=region;if(k){if(!storageOK)throw Error('Extension-controlled storage is required before saving a key.');await gmSet(STORAGE+':azure',k);azureKey=k;}
   await saveSettings();notify('Speech settings saved.');render();return;
  }
  if(action==='speech-forget'){await gmSet(STORAGE+':azure','');azureKey='';reading.sampleCache.clear();notify('Speech key forgotten.');render();return;}
  if(action==='speech-voices'){await loadVoices();return;}
  if(action==='speech-demo'){await demoVoice();return;}
  if(action==='reader-edit'){state.readerDraft=reading.passages.map(p=>p.text).join('\n\n');state.readerEditing=true;render();return;}
  if(action==='reader-abort'){state.readerEditing=false;render();return;}
  if(action==='reader-save'){const v=host.shadowRoot.getElementById('mb-reader-edit')?.value||'';replaceReaderText(v);return;}
  if(action.startsWith('pass-toggle:')){excludePassage(Number(action.split(':')[1]));return;}
  if(action.startsWith('pass-play:')){await jumpTo(Number(action.split(':')[1]));return;}
  if(action==='prepare'){await prepareReading();return;}
  if(action==='play'){pauseResume();return;}
  if(action==='stop'){stopPlayback(true);render();notify('Stopped preparation and playback.');return;}
  if(action==='prev'){const idx=enabledIndices().filter(i=>i<reading.index).pop();if(idx!==undefined)await jumpTo(idx);else{audio.currentTime=Math.max(0,audio.currentTime-10);}return;}
  if(action==='next'){const i=nextEnabled(reading.index+1);if(i>=0)await jumpTo(i);return;}
  if(action==='export-mp3'){await exportAudio();return;}
  if(action==='export-text'){await downloadBlob(transcriptFile(true),'master-button-transcript.txt');return;}
  if(action==='updates'){
   const r=await requestGM('https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.meta.js',{responseType:'text'});
   const current=(r.responseText||r.response||'').match(/@version\s+([\d.]+)/)?.[1];
   if(!current)throw Error('Update metadata unavailable.');const a=current.split('.').map(Number),b=VERSION.split('.').map(Number);const newer=[0,1,2].find(i=>(a[i]||0)!==(b[i]||0));
   notify(newer===undefined?'You have the current release.':a[newer]>b[newer]?`Update ${current} is available. Open Userscripts to update.`:'This version is newer than the published release.');return;
  }
 }catch(e){notify(String(e.message||e));}
}
function endMediaPick(){if(state.mediaPickListener){document.removeEventListener('click',state.mediaPickListener,true);state.mediaPickListener=null;}state.selectMedia=false;}
function startMediaPick(){endMediaPick();state.selectMedia=true;state.mediaPickListener=e=>{
  if(e.target.closest?.('[data-mb-host]'))return;
  e.preventDefault();e.stopImmediatePropagation();const item=e.target.closest?.('img,video')||e.target.querySelector?.('img,video');
  if(!item){notify('Tap directly on an image or video.');return;}
  const raw=item.tagName==='VIDEO'?(item.currentSrc||item.src):imageSrc(item),url=supportedURL(raw);
  if(!url){notify('No direct media URL for this element.');return;}
  state.selectedMedia={url:url.href,kind:item.tagName==='VIDEO'?'video':'image',el:item,label:'Selected on page'};endMediaPick();openView('media');notify('Media selected.');
 };document.addEventListener('click',state.mediaPickListener,true);openView('media-picker');}
function installUI(){if(document.querySelector('[data-mb-host]'))return;
 host=document.createElement('div');host.setAttribute('data-mb-host','');host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:2147483647!important;pointer-events:none!important;';
 const shadow=host.attachShadow({mode:'open'});shadow.innerHTML=`<style>${styles}</style><button class="mb-launch" type="button" aria-label="Open Master Button tools">✦<span class="mb-count" data-count>0</span></button><section class="mb-panel" role="dialog" aria-label="Master Button controls" hidden></section><div class="mb-toast" role="status" aria-live="polite" hidden></div>`;
 document.documentElement.appendChild(host);
 const global=document.createElement('style');global.textContent=globalStyles;global.id='mb-global-style';(document.head||document.documentElement).append(global);
 let drag=null;const launch=shadow.querySelector('.mb-launch');
 launch.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,right:prefs.position.right,bottom:prefs.position.bottom,moved:false};launch.setPointerCapture?.(e.pointerId);});
 launch.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>9)drag.moved=true;if(!drag.moved)return;prefs.position.right=Math.max(6,Math.min((visualViewport?.width||innerWidth)-54,drag.right-dx));prefs.position.bottom=Math.max(6,Math.min(innerHeight-54,drag.bottom-dy));launch.style.cssText=positionCSS();});
 launch.addEventListener('pointerup',()=>{if(!drag)return;ignoreClick=drag.moved;if(drag.moved)saveSettings();drag=null;});
 launch.addEventListener('click',e=>{if(ignoreClick){e.preventDefault();ignoreClick=false;return;}openView(state.view?'':reading.playing?'mini':'menu');});
 shadow.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b){e.stopPropagation();void handleAction(b.dataset.action,b);}});
 shadow.addEventListener('change',e=>{
  if(e.target.id==='mb-media'){state.mediaIndex=Number(e.target.value);state.selectedMedia=null;render();}
  if(e.target.id==='mb-voice'){prefs.azure.voice=e.target.value;saveSettings();}
  if(e.target.id==='mb-quality'){prefs.azure.quality=e.target.value;saveSettings();}
  if(e.target.id==='mb-rate'){prefs.playbackRate=Number(e.target.value);audio.playbackRate=prefs.playbackRate;saveSettings();}
  if(e.target.matches('[data-audio-seek]')&&Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Number(e.target.value));
 });
 shadow.addEventListener('input',e=>{if(e.target.id==='mb-url')state.urlDraft=e.target.value;if(e.target.id==='mb-reader-edit')state.readerDraft=e.target.value;});
 addEventListener('resize',()=>{prefs.position.right=Math.min(prefs.position.right,innerWidth-54);prefs.position.bottom=Math.min(prefs.position.bottom,innerHeight-54);render();});
 if(window.visualViewport)visualViewport.addEventListener('resize',()=>{const keyboard=Math.max(0,innerHeight-visualViewport.height-visualViewport.offsetTop);launch.style.bottom=Math.max(prefs.position.bottom,keyboard+14)+'px';});
 render();
}
function monitorDOM(){observer=new MutationObserver(records=>{
  // Avoid scanning each leaf mutation during fast page transitions.
  if(!records.some(r=>![host?.contains(r.target)]&&r.target!==host&&r.target.id!=='mb-global-style'))return;
  clearTimeout(observerTimer);observerTimer=setTimeout(()=>{if(location.href!==lastLocation){lastLocation=location.href;autoMapRedirect();}updateSite();},420);
 });observer.observe(document.documentElement,{childList:true,characterData:true,subtree:true});
 addEventListener('popstate',()=>{lastLocation=location.href;autoMapRedirect();setTimeout(updateSite,100);});
 addEventListener('pageshow',()=>updateSite());
}
async function boot(){
 if(document.querySelector('[data-mb-host]'))return;
 await readSettings();autoMapRedirect();if(!document.documentElement)return;
 installUI();updateSite();monitorDOM();if(!storageOK)notify('Extension storage unavailable: preferences will not persist.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot(),{once:true});else void boot();

})();