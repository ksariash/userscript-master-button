// ==UserScript==
// @name         iPhone Master Button
// @namespace    https://github.com/ksariash/userscript-master-button
// @version      0.1.4
// @description  A single floating drawer for clean links, nuisance filtering, media, and Azure narration
// @author       ksariash
// @match        *://*/*
// @exclude      *://*.banking.*/*
// @run-at       document-start
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
const VERSION = '0.1.4';
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
const defaults=()=>({position:{right:14,bottom:105}, filter:{}, siteCleanup:{}, nsfw:true, autoMaps:true, playbackRate:1,fontSize:17, azure:{region:'eastus',voice:'en-US-JennyNeural',quality:'compact'}, rules:{}, learning:{}, learningEnabled:{}, semanticAuto:true, semanticExamples:{}, semanticThreshold:0.79, semanticSeedThreshold:0.89});
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
function appliedFilter(){if(!filterEnabled()||state.filterReview)return;const rules=activeRules();for(const rule of rules){for(const el of safeMatches(rule.selector)){if(rule.type==='css'&&!protectedNode(el))hideNode(el,`Custom rule: ${rule.selector}`);}}scheduleSemanticScan();}
function beginFilterReview(){
 if(state.filterReview)return;
 state.reviewHidden=new Map(hidden);state.filterReview=true;showAll();render();
}
function endFilterReview(){
 if(!state.filterReview)return;
 state.filterReview=false;state.reviewHidden=null;
 if(filterEnabled()){appliedFilter();resetSemanticReview();}
 render();
}
function setFiltering(enabled){prefs.filter[domainKey()]=enabled;saveSettings();if(!enabled){showAll();}else appliedFilter();render();}
function nodeSelector(el){
  if(el.id&&/^[a-zA-Z][\w:-]{2,75}$/.test(el.id)&&!/\d{5,}/.test(el.id))return '#'+CSS.escape(el.id);
  let s=el.tagName.toLowerCase();const cls=[...el.classList].filter(c=>/^[a-z][\w-]{2,48}$/i.test(c)&&!/[0-9a-f]{8,}/i.test(c)&&!/^css-|^sc-|^jsx-/i.test(c)).slice(0,2);
  if(cls.length)s+='.'+cls.map(c=>CSS.escape(c)).join('.');
  const ancestor=el.parentElement;if(ancestor?.id&&/^[a-zA-Z][\w:-]{2,75}$/.test(ancestor.id))s='#'+CSS.escape(ancestor.id)+' > '+s;
  return s;
}
function clearPicker(){if(picker)document.removeEventListener('click',picker,true);picker=null;stopPreview();render();}
function stopPreview(){for(const e of pickerMatches){e.removeAttribute('data-mb-preview');e.removeAttribute('data-mb-preview-hide');}pickerMatches=[];preview=false;}
function pickFilter(){clearPicker();beginFilterReview();openView('picker');picker=function(e){if(e.target.closest?.('[data-mb-host]'))return;e.preventDefault();e.stopImmediatePropagation();const target=e.target.closest?.('aside,[role="complementary"],section,div,figure,li,p')||e.target;if(!target||protectedNode(target)){notify('Select a smaller part of the page.');return;}stopPreview();const selector=nodeSelector(target);let ms=safeMatches(selector);if(ms.length>80||ms.length>document.querySelectorAll('p,div,li,section,article').length*.2){notify('Selector is too broad; choose a more specific element.');return;}pickerMatches=ms.filter(n=>!protectedNode(n));for(const n of pickerMatches)n.setAttribute('data-mb-preview','');state.pickerSelector=selector;render();};document.addEventListener('click',picker,true);}
function togglePreview(){preview=!preview;for(const n of pickerMatches){if(preview)n.setAttribute('data-mb-preview-hide','');else n.removeAttribute('data-mb-preview-hide');}render();}
function savePickerRule(){const selector=state.pickerSelector;if(!selector||!pickerMatches.length)return;const arr=prefs.rules[domainKey()]||(prefs.rules[domainKey()]=[]);arr.push({id:Date.now().toString(36),selector,type:'css',enabled:true});stopPreview();clearPicker();endFilterReview();saveSettings();appliedFilter();openView('rules');}
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

// Pretrained *local* language-embedding model + online, per-site prototype learning.
// Not generative LLM weight fine-tuning: explicit feedback trains a nearest-prototype
// classifier in the model's semantic space. Text stays on-device; stored examples
// are rounded vectors without article text or URL histories.
const EMBEDDING_MODEL='Xenova/all-MiniLM-L6-v2';
const EMBEDDING_RUNTIME='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/+esm';
const semantic={status:'idle',detail:'Not loaded',extractor:null,loading:null,queue:Promise.resolve(),running:false,refreshTimer:0,revision:0,scanned:0,lastError:''};
const semanticScores=new WeakMap();
const semanticCategories={related:'Related stories',promotion:'Promotion / newsletter',navigation:'Navigation / page chrome',offtopic:'Breaks article flow',article:'Article prose'};
const SEMANTIC_SEEDS=[
 ['Related articles you may also like', 'related'],
 ['Recommended for you: Read these stories next', 'related'],
 ['You might also enjoy these other posts', 'related'],
 ['Sign up for our newsletter to get updates in your inbox', 'promotion'],
 ['Subscribe now for exclusive access and offers', 'promotion'],
 ['Sponsored content. Advertisement.', 'promotion'],
 ['Download our app for a better reading experience', 'promotion'],
 ['Share this article on Facebook, Instagram or X', 'navigation'],
 ['Skip to content. Home. Menu. Latest news.', 'navigation']
];
let seedVectors=null;
function vectorsForSite(domain=domainKey()){const raw=prefs.semanticExamples?.[domain];return Array.isArray(raw)?raw:[];}
function dot(a,b){if(!a||!b||a.length!==b.length)return 0;let sum=0;for(let i=0;i<a.length;i++)sum+=a[i]*b[i];return sum;}
function compactVector(v){return Array.from(v, x=>Math.round(Number(x)*1000)/1000);}
function embeddingInput(s){return text(s).slice(0,650);}
async function loadSemantic(){
 if(semantic.extractor)return semantic.extractor;
 if(semantic.loading)return semantic.loading;
 semantic.status='loading';semantic.detail='Downloading model and starting local inference';render();
 semantic.loading=(async()=>{
  try{
   // No text sent to a service: only model code and weights are downloaded.
   const lib=await import(EMBEDDING_RUNTIME);
   const pipeline=lib.pipeline;
   if(typeof pipeline!=='function')throw Error('Model runtime was not available');
   const extractor=await pipeline('feature-extraction',EMBEDDING_MODEL,{device:'wasm',dtype:'q8',progress_callback:p=>{
    if(p.status==='progress'&&Number.isFinite(p.progress))semantic.detail=`Loading model · ${Math.round(p.progress)}%`;
   }});
   semantic.extractor=extractor;semantic.status='ready';semantic.lastError='';semantic.detail='MiniLM embeddings · on device';
   render();return extractor;
  }catch(err){semantic.status='error';semantic.lastError=String(err.message||err).slice(0,175);semantic.detail=semantic.lastError;render();throw err;}
  finally{semantic.loading=null;}
 })();return semantic.loading;
}
async function embedTexts(input){
 const model=await loadSemantic();const texts=input.map(embeddingInput);
 const out=[];
 // Sequential, small batches keep memory bounded on Safari.
 for(let i=0;i<texts.length;i+=4){
  const r=await model(texts.slice(i,i+4),{pooling:'mean',normalize:true});
  const rows=r.tolist();for(const row of rows)out.push(compactVector(row));
 }
 return out;
}
async function ensureSemanticSeeds(){if(!seedVectors){const v=await embedTexts(SEMANTIC_SEEDS.map(x=>x[0]));seedVectors=v.map((vector,i)=>({vector,reason:SEMANTIC_SEEDS[i][1]}));}return seedVectors;}
function semanticDecision(vec,domain=domainKey(),contextVector=null){
 const items=vectorsForSite(domain);let skip={score:-1,reason:'offtopic'},keep={score:-1};
 for(const x of items){if(!Array.isArray(x.v))continue;
  const contentScore=dot(vec,x.v);const contextScore=contextVector&&Array.isArray(x.contextV)?dot(contextVector,x.contextV):0;const score=Math.max(contentScore,contextScore?0.82*contentScore+0.18*contextScore:contentScore);
  if(x.d==='skip'&&score>skip.score)skip={score,reason:x.reason||'offtopic'};
  if(x.d==='keep'&&score>keep.score)keep={score};
 }
 let seed={score:-1,reason:''};if(seedVectors){for(const x of seedVectors){const score=dot(vec,x.vector);if(score>seed.score)seed={score,reason:x.reason};}}
 const threshold=Number(prefs.semanticThreshold??0.79);
 const seedThreshold=Number(prefs.semanticSeedThreshold??0.89);
 let excluded=false,source='no match',reason='No close nuisance match';
 if(keep.score>=0.74&&keep.score>=skip.score-0.065){source='your Keep example';reason='Similar to article prose you kept';}
 else if(skip.score>=threshold&&skip.score>keep.score+0.065){excluded=true;source='your Skip example';reason=`Similar to skipped ${semanticCategories[skip.reason]||'content'}`;}
 else if(seed.score>=seedThreshold&&seed.score>keep.score+0.065){excluded=true;source='built-in examples';reason=`Likely ${semanticCategories[seed.reason]||'distraction'}`;}
 else if(keep.score>=0.74){source='your Keep example';reason='Kept by your feedback';}
 return {excluded,reason,score:Math.max(skip.score,seed.score,0),skipScore:skip.score,keepScore:keep.score,seedScore:seed.score,threshold,seedThreshold,source,model:'MiniLM'};
}
function resetSemanticReview(){
 for(const x of document.querySelectorAll('[data-mb-semantic-reviewed]'))x.removeAttribute('data-mb-semantic-reviewed');
 for(const [el,old] of [...hidden])if(old.reason?.startsWith('Similar to')||old.reason?.startsWith('Likely'))showNode(el);
 scheduleSemanticScan();
}
async function analyzePhrase(value,element=null){
 if(!semantic.extractor)return {excluded:false,reason:semantic.status==='error'?'Model unavailable':'Model not loaded',model:'Unavailable',score:null,source:'no inference'};
 const [vector]=await embedTexts([value]);const result=semanticDecision(vector);if(element)semanticScores.set(element,result);return result;
}
async function inspectSelectedPhrase(){
 if(!state.selectionText)return;
 state.selectionScore={model:'Loading',score:null,reason:'Comparing with learned examples…'};render();
 try{state.selectionScore=await analyzePhrase(state.selectionText,state.selectionElement);}catch(e){state.selectionScore={model:'Unavailable',score:null,reason:String(e.message||e)};}
 render();
}
async function teachSemantic(value,decision,reason='offtopic',el=null){
 const sample=embeddingInput(value);if(sample.length<8)throw Error('Select a longer phrase to teach the model.');
 if(!prefs.semanticExamples)prefs.semanticExamples={};
 const origin=domainKey();
 semantic.detail='Learning from selected text';render();
 learnPassage(sample,decision);// Include nearby *previously hidden* sibling text as context before learning.
 const neighbors=el?[el.previousElementSibling,el.nextElementSibling].filter(Boolean):[];
 const oldHidden=state.reviewHidden||hidden;const hiddenNeighbors=neighbors.filter(n=>oldHidden.has(n)||[...oldHidden.keys()].some(h=>h.contains(n)));
 const nearby=hiddenNeighbors.map(n=>embeddingInput(n.textContent)).filter(t=>t.length>=12).slice(0,2);
 const context=embeddingInput([el?.textContent||'',...nearby].join(' '));
 const contextUseful=context.length>25&&context!==sample;
 const vectors=await embedTexts(contextUseful?[sample,context]:[sample]);const vector=vectors[0];
 const examples=prefs.semanticExamples[origin]||=[];
 const duplicate=examples.findIndex(x=>x.h===tokenHash(sample.toLowerCase()));
 if(duplicate>=0)examples.splice(duplicate,1);
 examples.push({h:tokenHash(sample.toLowerCase()),d:decision,reason:decision==='keep'?'article':reason,v:vector,contextV:contextUseful?vectors[1]:undefined});
 prefs.semanticExamples[origin]=examples.slice(-24);
 await saveSettings();
 if(el&&decision==='skip'&&filterEnabled()&&!state.filterReview&&!protectedNode(el))hideNode(el,'Explicitly skipped: '+(semanticCategories[reason]||reason));
 semantic.detail=`Ready · ${prefs.semanticExamples[origin].length} learned examples`;
 semantic.revision++;render();scheduleSemanticScan();if(reading.passages.length)void reclassifyTranscript().catch(e=>notify(e.message));
 return true;
}
function semanticCandidates(){
 const roots=[...document.querySelectorAll('article,[itemprop="articleBody"],main,[role="main"]')];
 const root=roots.sort((a,b)=>text(b.textContent).length-text(a.textContent).length)[0];
 if(!root)return [];
 return [...root.querySelectorAll('p,li,blockquote,aside,section')].filter(el=>{
  const t=text(el.textContent);return t.length>=25&&t.length<750&&!el.querySelector('p,li,blockquote,aside,section')&&!el.closest('nav,footer,header,[data-mb-host]')&&!protectedNode(el);
 }).slice(0,90);
}
function scheduleSemanticScan(){
 if(!prefs.semanticAuto||!filterEnabled()||state.filterReview||semantic.running||!semantic.extractor||!document.querySelector('article,main,[role="main"]'))return;
 clearTimeout(semantic.refreshTimer);semantic.refreshTimer=setTimeout(()=>{void runSemanticScan();},850);
}
async function runSemanticScan(){
 if(semantic.running||!semantic.extractor||!prefs.semanticAuto||!filterEnabled()||state.filterReview)return;
 const candidates=semanticCandidates().filter(el=>!hidden.has(el)&&!el.hasAttribute('data-mb-semantic-reviewed'));
 if(!candidates.length)return;
 const origin=domainKey();semantic.running=true;try{
  const inputs=candidates.map(el=>text(el.textContent));
  const contextual=vectorsForSite(origin).some(x=>Array.isArray(x.contextV));
  const contextInputs=contextual?candidates.map(el=>{
   const neighbors=[el.previousElementSibling,el.nextElementSibling].filter(Boolean);
   return embeddingInput([el.textContent,...neighbors.map(n=>n.textContent)].join(' '));
  }):[];
  const vectors=await embedTexts(contextual?[...inputs,...contextInputs]:inputs);
  const embeddings=vectors.slice(0,candidates.length),contextEmbeddings=contextual?vectors.slice(candidates.length):[];
  if(domainKey()!==origin||!filterEnabled()||!prefs.semanticAuto||state.filterReview)return;
  for(let i=0;i<candidates.length;i++){
   const el=candidates[i];if(!el.isConnected)continue;
   const result=semanticDecision(embeddings[i],origin,contextEmbeddings[i]||null);
   semanticScores.set(el,result);semantic.scanned++;el.setAttribute('data-mb-semantic-reviewed','');
   if(result.excluded)hideNode(el,result.reason);
  }
 }catch(err){semantic.detail='Model filtering stopped: '+String(err.message||err);}
 finally{semantic.running=false;render();}
}
async function reclassifyTranscript(){
 if(!semantic.extractor||!reading?.passages?.length)return;
 const gen=reading.generation,items=reading.passages.filter(p=>p.reason!=='You skipped this passage'&&p.reason!=='You kept this passage');
 if(!items.length)return;const data=await embedTexts(items.map(p=>p.text));if(gen!==reading.generation)return;
 for(let i=0;i<items.length;i++){
  const result=semanticDecision(data[i]);const p=items[i];
  // Do not override explicit keep/skip or already-prepared audio.
  p.analysis=result;if(p.status==='idle'&&!p.blob&&!p.manual){p.excluded=result.excluded;p.reason=result.reason;}
 }
 render();
}

const REDDIT_NAGS=[
 '#configured-xpromo-unrated_block','#configured-xpromo-blocking_xpromo_nsfw_blocking','#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop','#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms','#desktop-dynamic-upsell-dialog','#app-upsell-blocking-bottom-sheet-direct','#app-upsell-blocking-bottom-sheet-seo','#xpromo-bottom-sheet','#xpromo-new-app-selector','#xpromo-app-selector','#xpromo-small-header','#nsfw-desktop-auth-blocking-modal-dialog','#nsfw-desktop-auth-blocking-modal-overlay-element','#nsfw-qr-dialog','#blocking-modal','#nsfw-desktop-auth-blocking-modal','xpromo-top-button','xpromo-app-selector','faceplate-bottom-sheet[id*="xpromo"]','rpl-bottom-sheet[id*="app-upsell"]','rpl-bottom-sheet[id*="xpromo"]','configured-xpromo-modal[id*="xpromo"]','.configured-xpromo-bottom-sheet','.configured-xpromo-full-screen','.XPromoPopup','.XPromoPopupRpl','.XPromoPopupRplNew','.XPromoBottomBar','.XPromoInFeed','.XPromoPill','.AppSelectorModal__body','.upsell_banner','.rpl-dialog#age-gate-interstitial'
];
const siteSelectors={
 reddit:REDDIT_NAGS,
 x:['[data-interaction="app-store-obstruction"]','[data-testid="app-bar-close"] ~ [data-testid="app-install-banner"]'],
 instagram:['[data-testid="app-download-banner"]'],
 facebook:['.contextual-sign-in-modal','.sign-in-modal','[data-testid="app-install-banner"]'],
 linkedin:['.contextual-sign-in-modal','.sign-in-modal','.guest-upsell'],
 slashdot:[],google:[],other:[]
};
const NAG_RE=/(?:get\s+(?:the\s+)?best\s+of\s+reddit\s+in\s+the\s+app|(?:open|view|use|get|continue|download).{0,35}(?:in\s+the\s+app|the\s+(?:reddit|instagram|facebook|twitter|linkedin)\s+app)|(?:log|sign)\s+in\s+to\s+(?:continue|see|view)|join\s+(?:reddit|the conversation))/i;
const DIALOGS='[role="dialog"],[aria-modal="true"],dialog,faceplate-bottom-sheet,rpl-bottom-sheet';
function isAuthPage(){return /^\/(?:login|register|signup|accounts\/login)(?:\/|$)/i.test(location.pathname);}
// Reddit's timed mobile app interstitial is sometimes a full-viewport DIV, not a dialog.
// Keep rules site-scoped; no broad body/main/article hiding, no interference with login.
const REDDIT_PROMO_HEAD=/(?:get\s+(?:the\s+)?best\s+of\s+reddit\s+in\s+the\s+app|(?:get|open|use|view)\s+(?:the\s+)?reddit\s+app)/i;
const REDDIT_PROMO_BUTTON=/^(?:get\s+(?:the\s+)?reddit\s+app|open\s+(?:in\s+)?(?:the\s+)?app|continue\s+in\s+(?:the\s+)?app)$/i;
const REDDIT_DIALOGISH='dialog,[role="dialog"],[aria-modal="true"],rpl-bottom-sheet,faceplate-bottom-sheet,faceplate-dialog,configured-xpromo-modal,[class*="XPromo"],[class*="xpromo"],[id*="xpromo"],[class*="upsell" i],[id*="upsell" i],[class*="modal" i]';
const redditScrollOriginal=new Map();let redditDismissed=false;
const redditKnownCSS=REDDIT_NAGS.map(s=>`html[data-mb-reddit-clean] ${s}`).join(',\n');
const redditCss=`${redditKnownCSS},html[data-mb-reddit-clean] [data-mb-reddit-nag]{display:none!important;visibility:hidden!important;pointer-events:none!important}`;
function toggleRedditCSS(enabled){
 if(siteName()!=='reddit')return;
 const root=document.documentElement;if(!root)return;
 root.toggleAttribute('data-mb-reddit-clean',enabled);
 let sheet=document.getElementById('mb-reddit-css');
 if(!sheet){sheet=document.createElement('style');sheet.id='mb-reddit-css';sheet.textContent=redditCss;(document.head||root).append(sheet);}
}
function redditRootForPromotion(node){
 if(!node||protectedNode(node)||isAuthPage())return null;
 const inDialog=node.closest?.(REDDIT_DIALOGISH);
 if(inDialog&&!protectedNode(inDialog))return inDialog;
 // Detect a full-screen overlay only when both the prominent headline and CTA exist.
 for(let el=node.parentElement,depth=0;el&&depth<9;el=el.parentElement,depth++){
  if(protectedNode(el))break;
  const content=text(el.textContent||'');if(content.length>1800)break;
  const heading=[...el.querySelectorAll('h1,h2,h3,[role="heading"]')].some(h=>REDDIT_PROMO_HEAD.test(text(h.textContent)));
  const cta=[...el.querySelectorAll('button,a,[role="button"]')].some(b=>REDDIT_PROMO_BUTTON.test(text(b.textContent).slice(0,100)));
  if(!heading||!cta)continue;
  const style=getComputedStyle(el),rect=el.getBoundingClientRect(),height=innerHeight||1;
  const likelyOverlay=style.position==='fixed'||style.position==='sticky'||(style.position==='absolute'&&rect.height>height*.55);
  const largeInterstitial=rect.height>=height*.56&&rect.width>=(innerWidth||1)*.65&&el.children.length>0;
  if(likelyOverlay||largeInterstitial)return el;
 }
 return null;
}
function redditExtraPromos(){
 let removed=0;
 const headings=safeMatches('h1,h2,h3,[role="heading"]').filter(h=>REDDIT_PROMO_HEAD.test(text(h.textContent).slice(0,150)));
 for(const heading of headings.slice(0,18)){
  const candidate=redditRootForPromotion(heading);
  if(candidate){candidate.setAttribute('data-mb-reddit-nag','');if(hideNode(candidate,'Reddit app interstitial'))removed++;}
 }
 // A plain visible modal may lack a heading but still contain unmistakable app-promo copy.
 for(const el of safeMatches(REDDIT_DIALOGISH).slice(0,55)){
  if(protectedNode(el)||el.querySelector('input,textarea,[contenteditable="true"]'))continue;
  const msg=text(el.textContent).slice(0,1200);
  if(msg&&msg.length<1000&&REDDIT_PROMO_HEAD.test(msg)){
   el.setAttribute('data-mb-reddit-nag','');if(hideNode(el,'Reddit app interstitial'))removed++;
  }
 }
 return removed;
}
function redditScrollLockPresent(){return [document.documentElement,document.body].some(el=>el&&(
  /(?:^|\s)(?:no-scroll|rpl-scroll-lock|scroll-is-blocked|scroll-disabled|overflow-hidden)(?:\s|$)/.test(el.className||'') ||
  el.hasAttribute('m-scroll-lock') || el.hasAttribute('scroll-lock') ||
  ['overflow','overflow-y'].some(prop=>/^(hidden|clip)$/i.test(el.style.getPropertyValue(prop))) ||
  (el===document.body&&el.style.position==='fixed') || el.style.touchAction==='none'
  ));}
function redditUnlockScroll(){
 if(!redditDismissed||!redditScrollLockPresent())return;
 // Never defeat an unrelated, still-visible native dialog.
 const openDialog=[...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')].some(el=>{
  if(hidden.has(el)||el.closest('[data-mb-reddit-nag]'))return false;
  const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden';
 });
 if(openDialog)return;
 for(const el of [document.documentElement,document.body]){
  if(!el)continue;
  if(!redditScrollOriginal.has(el))redditScrollOriginal.set(el,{
   className:el.getAttribute('class'), scrollAttr:el.getAttribute('scroll-lock'),mAttr:el.getAttribute('m-scroll-lock'),
   css:new Map(['overflow','overflow-y','position','touch-action','overscroll-behavior','pointer-events','padding-right'].map(k=>[k,[el.style.getPropertyValue(k),el.style.getPropertyPriority(k)]]))
  });
  el.classList.remove('no-scroll','rpl-scroll-lock','scroll-is-blocked','scroll-disabled','overflow-hidden');
  el.removeAttribute('m-scroll-lock');el.removeAttribute('scroll-lock');
  for(const key of ['overflow','overflow-y','position','touch-action','overscroll-behavior','pointer-events','padding-right'])el.style.removeProperty(key);
 }
}
function redditRestoreScrollOwnership(){
 // Do not re-lock scroll on disabling cleanup; relinquish ownership instead.
 redditScrollOriginal.clear();redditDismissed=false;
 for(const el of safeMatches('[data-mb-reddit-nag]'))el.removeAttribute('data-mb-reddit-nag');
}

function siteClean(){
 if(!cleanupEnabled()||siteName()==='other'||isAuthPage())return;
 const name=siteName();if(name==='reddit')toggleRedditCSS(true);let hiddenPromos=0;for(const sel of siteSelectors[name]||[])for(const n of safeMatches(sel))if(hideNode(n,'Known '+name+' app prompt'))hiddenPromos++;
 if(name==='reddit')hiddenPromos+=redditExtraPromos();
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
 if(name==='reddit'){if(hiddenPromos)redditDismissed=true;redditUnlockScroll();if(prefs.nsfw)revealReddit();}
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
function setSiteCleanup(on){prefs.siteCleanup[siteName()]=on;saveSettings();if(!on){if(siteName()==='reddit'){toggleRedditCSS(false);redditRestoreScrollOwnership();}showAll();if(siteName()==='slashdot')document.documentElement.removeAttribute('data-mb-slashdot');appliedFilter();}else updateSite();render();}
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
  for(const t of chunkText(str)){result.push({text:t,element:n,excluded:excluded||classification.excluded,reason:excluded?'Hidden on page':classification.reason,analysis:{model:'Heuristic',excluded:excluded||classification.excluded,reason:excluded?'Hidden by website rule':classification.reason,source:'DOM and site rules',score:null},blob:null,status:'idle'});}
 }
 return result;
}
function openReader(){stopPlayback(true);reading.passages=discoverPassages();reading.index=0;state.readerEditing=false;if(!reading.passages.length)notify('No article text found. Select text first, or paste text in the reader.');openView('reader');if(semantic.extractor)void reclassifyTranscript().catch(e=>notify(e.message));}
function readerPlain(){return reading.passages.filter(p=>!p.excluded).map(p=>p.text).join('\n\n');}
function replaceReaderText(v){stopPlayback(true);reading.passages=chunkText(v).map(t=>({text:t,element:null,excluded:false,reason:'Edited text',blob:null,status:'idle'}));reading.index=0;state.readerEditing=false;render();}
function excludePassage(i){
 const p=reading.passages[i];if(!p)return;
 const excluding=!p.excluded;
 // Do not interrupt other audio or destroy all prepared audio when correcting one passage.
 if(excluding&&i===reading.index&&!audio.paused){audio.pause();const next=nextEnabled(i+1);if(next>=0&&reading.passages[next].blob)void playPassage(next).catch(()=>{});}
 p.excluded=excluding;p.manual=true;p.reason=excluding?'You skipped this passage':'You kept this passage';
 learnPassage(p.text,excluding?'skip':'keep');
 void teachSemantic(p.text,excluding?'skip':'keep',excluding?'offtopic':'article',p.element).catch(e=>notify('Local learning: '+e.message));
 render();
}
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
async function loadVoices(){if(!azureKey)throw Error('Save a key first.');const region=prefs.azure.region?.trim().toLowerCase();state.voicesLoading=true;render();try{const r=await requestGM(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,{responseType:'text',headers:{'Ocp-Apim-Subscription-Key':azureKey}});let list;try{list=JSON.parse(r.responseText||r.response);}catch{throw Error('Azure returned an invalid voices list.');}
 state.voices=list.filter(v=>v.ShortName&&v.Locale).map(v=>({id:v.ShortName,locale:v.Locale,label:`${v.LocalName||v.ShortName} · ${v.Locale} · ${v.Gender||'Voice'}`})).sort((a,b)=>a.locale.localeCompare(b.locale)||a.label.localeCompare(b.label));state.voicesRegion=region;state.voicesError='';notify(`Loaded ${state.voices.length} Azure voices`);render();}catch(e){state.voicesError=e.message;throw e;}finally{state.voicesLoading=false;render();}}
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
 if(prefs.semanticAuto&&filterEnabled()&&reading.passages.length){
  if(!semantic.extractor){try{notify('Preparing the local filter before speech…');await loadSemantic();await ensureSemanticSeeds();}catch(e){notify('Local model unavailable. Review the text and disable Local AI if you want to proceed without it.');openView('filter');return;}}
  await reclassifyTranscript();
 }
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
function playbackClock(t){if(!Number.isFinite(t)||t<0)return '—:—';const n=Math.floor(t);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function updateAudioProgress(){
 const root=host?.shadowRoot;if(!root)return;
 const s=root.querySelector('[data-audio-seek]');
 const d=audio.duration,valid=Number.isFinite(d)&&d>0;
 if(s&&!s.matches(':active')){s.max=valid?String(d):'100';s.value=valid?String(audio.currentTime):'0';}
 const now=root.querySelector('[data-audio-now]'),total=root.querySelector('[data-audio-total]');
 if(now)now.textContent=playbackClock(audio.currentTime);
 if(total)total.textContent=playbackClock(d);
 const p=reading.passages[reading.index];if(valid&&p&&audioMode==='article')p.duration=d;
 const segments=root.querySelector('[data-audio-segments]');if(segments)segments.textContent=`${reading.index+1}/${reading.passages.length} passages`;
}
audio.addEventListener('loadedmetadata',updateAudioProgress);
audio.addEventListener('durationchange',updateAudioProgress);
audio.addEventListener('timeupdate',updateAudioProgress);
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
const state={filterReview:false,filterPreview:false,selectionScore:null,whyIndex:-1,view:'',readerEditing:false,readerDraft:'',voices:[],siteMedia:[],mediaIndex:0,selectedMedia:null,selectMedia:false,pickerSelector:'',exporting:false,slashdotSimple:false,voicesRegion:'',voicesLoading:false,voicesError:'',voiceQuery:'',selectionText:'',selectionElement:null,selectionReason:'related',selectionMode:false};
const button=(action,icon,label,extra='')=>`<button type="button" data-action="${esc(action)}" class="mb-action" ${extra}><span aria-hidden="true">${icon}</span><span>${esc(label)}</span></button>`;
function notify(message){if(!host)return;const el=host.shadowRoot.querySelector('.mb-toast');if(!el)return;el.textContent=String(message);el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},4500);}
async function shareURL(u){try{if(navigator.share){await navigator.share({url:u});return;}}catch(e){if(e.name==='AbortError')return;}await copyText(u);notify('Copied link.');}
async function copyText(v){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(v);return;}catch{}}if(typeof GM!=='undefined'&&typeof GM.setClipboard==='function'){await GM.setClipboard(v);return;}throw Error('No clipboard permission; use the URL editor to copy manually.');}
function openView(v){
 if(state.filterReview&&!['teach','select-text','picker','filter','why'].includes(v))endFilterReview();
 state.view=v;render();
}
function positionCSS(){const vv=window.visualViewport,w=vv?.width||document.documentElement?.clientWidth||innerWidth;return `left:${Math.max(5,(vv?.offsetLeft||0)+w-56-Math.max(5,Math.min(w-66,prefs.position.right)))}px;top:${Math.max(5,(vv?.offsetTop||0)+(vv?.height||innerHeight)-56-Math.max(8,Math.min((vv?.height||innerHeight)-66,prefs.position.bottom)))}px;bottom:auto;right:auto;`;}
// Inline, consistent stroke icons; no external assets or webfonts.
const iconPaths={
 'share':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.1m-6.6 9 6.6 4"/>',
 'link':'<path d="m10 13 4-4"/><path d="M15 7h2a5 5 0 0 1 0 10h-3"/><path d="M9 17H7A5 5 0 0 1 7 7h3"/>',
 'headphones':'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="2" y="13" width="5" height="8" rx="2"/><rect x="17" y="13" width="5" height="8" rx="2"/>',
 'filter':'<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="7" cy="7" r="1"/>',
 'sliders':'<path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h11m4 0h1"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 'wave':'<path d="M2 10v4m4-8v12m4-15v18m4-14v10m4-7v4m4-7v10"/>',
 'images':'<rect x="3" y="3" width="15" height="15" rx="2"/><path d="m3 14 4-4 4 4 3-3 4 4M8 7h.01M9 21h11a1 1 0 0 0 1-1V8"/>',
 'eye':'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
 'pointer':'<path d="m4 3 7 18 2.2-7.6L21 11z"/>',
 'shield':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
 'eye':'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 'map':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
 'comment':'<path d="M21 11a8 8 0 0 1-8 8H7l-4 3v-8a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8"/>',
 'book':'<path d="M12 7a7 7 0 0 0-9-2v14a7 7 0 0 1 9 2 7 7 0 0 1 9-2V5a7 7 0 0 0-9 2zm0 0v14"/>',
 'search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 'download':'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 'check':'<path d="m5 12 4 4L19 6"/>',
 'refresh':'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 5M4 12l1 5a8 8 0 0 0 14-2"/>',
 'chevron':'<path d="m9 18 6-6-6-6"/>',
 'close':'<path d="M5 5 19 19M19 5 5 19"/>',
 'back':'<path d="m15 18-6-6 6-6"/>',
 'play':'<path d="m8 5 12 7-12 7z"/>',
 'pause':'<path d="M8 5v14M16 5v14"/>',
 'prev':'<path d="M5 5v14m13-14-9 7 9 7z"/>',
 'next':'<path d="M19 5v14M6 5l9 7-9 7z"/>',
 'minus':'<path d="M5 12h14"/>',
 'file':'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 12h7m-7 4h7"/>',
 'volume':'<path d="M11 5 6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>'
};
function ico(name,size=19){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.chevron}</svg>`;}
function tile(action,icon,label){return `<button class="mb-tile" data-action="${esc(action)}" type="button">${ico(icon,21)}<span>${esc(label)}</span></button>`;}
function compact(action,icon,label,end=''){return `<button class="mb-compact" data-action="${esc(action)}" type="button"><span class="mb-compact-icon">${ico(icon,18)}</span><span class="mb-compact-label">${esc(label)}</span>${end?`<span class="mb-compact-end">${esc(end)}</span>`:ico('chevron',15)}</button>`;}
const styles=`
:host{all:initial;color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif!important;-webkit-font-smoothing:antialiased;}
*,*::before,*::after{box-sizing:border-box;}
button,input,textarea,select{font-family:inherit;-webkit-tap-highlight-color:transparent;}
button{cursor:pointer;}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent,#528cff);outline-offset:2px;}
.mb-launch{position:fixed;${positionCSS()}width:43px;height:43px;border-radius:50%;border:1px solid rgba(255,255,255,.19);background:rgba(24,29,40,.78);color:white;box-shadow:0 5px 20px #0003;z-index:2;font:500 20px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;touch-action:none;pointer-events:auto;display:flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);}
.mb-count{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;border-radius:9px;background:#4c80ef;color:white;font:600 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:2px 3px;}
.mb-panel{--fg:#17202d;--muted:#747f90;--bg:#f8f9fc;--surface:#fff;--tile:#fff;--bd:#e7eaf0;--accent:#3766df;--tint:#edf3ff;position:fixed;right:10px;bottom:calc(env(safe-area-inset-bottom) + 64px);width:min(370px,calc(100vw - 20px));max-height:min(76dvh,650px);overflow:auto;overscroll-behavior:contain;z-index:3;background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:24px;box-shadow:0 16px 55px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.05);font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:auto;-webkit-overflow-scrolling:touch;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f5f6fb;--muted:#959cae;--bg:#1a1c24;--surface:#242732;--tile:#272a35;--bd:#343744;--accent:#95b4ff;--tint:#2c3852;}}
.mb-panel.reader{inset:0;width:100%;max-height:100dvh;border:0;border-radius:0;display:flex;flex-direction:column;background:var(--bg);}
.mb-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;background:var(--bg);padding:10px 12px 9px;gap:9px;border-bottom:1px solid var(--bd);}
.mb-head h2{font-size:15px;line-height:1.25;font-weight:720;letter-spacing:-.35px;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.mb-head-start{display:flex;align-items:center;gap:9px;min-width:0;flex:1;}
.mb-head button{flex-shrink:0;}.mb-brand{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--tint);color:var(--accent);font:600 19px system-ui;flex:none;}
.mb-small{border:0;background:var(--surface);color:var(--fg);border-radius:10px;padding:7px 9px;font:600 12px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;min-height:32px;display:inline-flex;gap:5px;justify-content:center;align-items:center;}
.mb-icon-btn{width:40px;height:40px;padding:9px;}
.mb-body{padding:10px 12px 12px;display:grid;gap:9px;}
.mb-section{display:grid;gap:7px;}
.mb-section-head{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:1px 1px 0;}
.mb-section-title{font-size:11px;font-weight:730;letter-spacing:.35px;color:var(--muted);text-transform:uppercase;}
.mb-section-note{font:500 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--muted);}
.mb-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}
.mb-tile{min-width:0;min-height:67px;background:var(--tile);border:1px solid var(--bd);border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--fg);padding:9px 4px 8px;}
.mb-tile svg{color:var(--accent);flex:none;}
.mb-tile span{font:600 11px/1.14 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;white-space:nowrap;letter-spacing:-.12px;}
.mb-compact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}
.mb-compact{border:1px solid var(--bd);border-radius:12px;background:var(--tile);color:var(--fg);min-width:0;min-height:44px;padding:7px 9px;display:flex;align-items:center;gap:7px;text-align:left;font:600 11.7px/1.15 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;}
.mb-compact-icon{color:var(--accent);flex:none;display:flex;}.mb-compact-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}.mb-compact-end{font:650 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--accent);white-space:nowrap;}.mb-compact>svg:last-child{color:var(--muted);opacity:.55;flex:none;}
.mb-action{display:flex;gap:9px;align-items:center;justify-content:flex-start;background:var(--tile);color:var(--fg);border:1px solid var(--bd);border-radius:11px;min-height:44px;padding:8px 10px;text-align:left;font:600 12px/1.25 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;cursor:pointer;}
.mb-action span:first-child{width:22px;flex-shrink:0;font-size:15px;text-align:center;}.mb-action:disabled,.mb-small:disabled{opacity:.48;}
.mb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}
.mb-muted{font-size:11px;line-height:1.45;color:var(--muted);margin:0;}
.mb-footer{font:10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--muted);text-align:center;padding:1px 0 1px;}
.mb-rule{background:var(--surface);border:1px solid var(--bd);border-radius:11px;padding:9px;display:grid;gap:6px;overflow-wrap:anywhere;}
.mb-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.mb-field{display:grid;gap:4px;font-size:11px;color:var(--muted);font-weight:600;}
.mb-input,.mb-select,.mb-textarea{width:100%;min-height:38px;border:1px solid var(--bd);border-radius:10px;background:var(--surface);color:var(--fg);font:13px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:8px;}
.mb-textarea{min-height:102px;resize:vertical;font-size:13px;}
.mb-transcript{flex:1;min-height:0;overflow:auto;padding:8px 14px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
.mb-paragraph{display:flex;align-items:flex-start;gap:8px;padding:12px 0;border-bottom:1px solid var(--bd);line-height:1.65;white-space:pre-wrap;}
.mb-paragraph small{font:500 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--muted);display:block;margin-bottom:3px;}
.mb-paragraph.current{background:var(--tint);border-radius:12px;margin:3px -6px;padding:10px 6px;}
.mb-paragraph.excluded{opacity:.46;}.mb-paragraph button{border:1px solid var(--bd);background:var(--surface);color:var(--fg);border-radius:10px;padding:6px;min-width:33px;min-height:33px;}
.mb-controls{flex:none;border-top:1px solid var(--bd);padding:10px 12px calc(12px + env(safe-area-inset-bottom));display:grid;gap:9px;background:var(--bg);}
.mb-range{width:100%;accent-color:var(--accent);height:14px;}.mb-player-row{display:flex;justify-content:space-between;align-items:center;gap:7px;}.mb-player-row .mb-small{min-width:38px;}.mb-primary-play{height:44px;min-width:53px!important;border-radius:14px;background:var(--fg);color:var(--bg);}.mb-player-extra{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}.mb-player-extra .mb-action{justify-content:center;text-align:center;flex-direction:column;gap:4px;padding:7px 3px;font-size:10px;min-height:44px;}.mb-player-extra .mb-action span:first-child{height:18px;width:20px;}
.mb-toast{position:fixed;bottom:calc(env(safe-area-inset-bottom) + 61px);left:10px;right:10px;margin:auto;max-width:370px;color:#fff;background:rgba(21,25,35,.95);padding:10px 12px;border-radius:12px;font:12px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;z-index:5;pointer-events:none;box-shadow:0 8px 25px #0005;}
.mb-toast[hidden],.mb-panel[hidden]{display:none;}.mb-pill{font:600 10px;color:var(--muted);background:var(--surface);padding:4px 7px;border-radius:7px;}
.mb-preview{height:95px;border-radius:11px;background:var(--surface);display:grid;place-items:center;overflow:hidden;}.mb-preview img,.mb-preview video{max-width:100%;max-height:95px;object-fit:contain;}

/* v0.1.2 compact iPhone design tokens: 44pt target, 7pt between groups,
   6/12pt gutters, separators instead of outlines, one obvious accent. */
.mb-panel{--fg:#1c2535;--muted:#6e7787;--bg:#f4f5f8;--surface:#fff;--tile:#fff;--bd:#e5e8ee;--accent:#386de7;--tint:#eef3ff;border-radius:19px;width:min(352px,calc(100vw - 24px));max-height:min(73dvh,560px);font-size:13px;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f6f7fb;--muted:#a4abba;--bg:#171a21;--surface:#232730;--tile:#232730;--bd:#333743;--accent:#a0bdff;--tint:#293a55;}}
.mb-head{padding:4px 8px;border-bottom:1px solid var(--bd);min-height:45px;}
.mb-head h2{font-size:15px;font-weight:680;letter-spacing:-.27px;}
.mb-icon-btn{height:42px;width:42px;border-radius:12px;background:transparent;padding:10px;}
.mb-brand{height:30px;width:30px;border-radius:10px;}
.mb-body{padding:9px 11px 11px;gap:7px;}
.mb-section{gap:5px;}.mb-section-title{font-size:10px;letter-spacing:.6px;}.mb-section-note{font-size:10px;}
.mb-tiles{gap:5px;}.mb-tile{min-height:59px;border-radius:12px;gap:3px;border-color:transparent;padding:6px 3px;}.mb-tile svg{height:19px;width:19px;}.mb-tile span{font-size:10.5px;}
.mb-compact-grid{gap:5px;}.mb-compact{border-color:transparent;border-radius:11px;min-height:44px;padding:7px 10px;font-size:12px;}
.mb-grid{gap:5px;}.mb-action{border-color:transparent;border-radius:11px;min-height:44px;padding:8px 11px;font-size:12.5px;font-weight:570;}
.mb-small{min-height:39px;font-size:12px;}
.mb-row{gap:6px;}.mb-rule{gap:6px;padding:9px;border-color:transparent;}
.mb-field{font-size:11px;gap:3px;}.mb-input,.mb-select,.mb-textarea{min-height:44px;background:var(--surface);border-color:var(--bd);border-radius:11px;padding:8px 11px;font-size:14px;}
.mb-settings-group{background:var(--surface);border-radius:13px;overflow:hidden;}
.mb-setting{display:flex;align-items:center;min-height:47px;gap:9px;padding:2px 11px;border-bottom:1px solid var(--bd);}
.mb-setting:last-child{border-bottom:0;}.mb-setting-label{font-weight:590;flex:0 0 90px;font-size:12.5px;}
.mb-setting-value{flex:1;min-width:0;}.mb-setting-value .mb-input,.mb-setting-value .mb-select{min-height:40px;border:0;border-radius:0;background:transparent;padding:6px 2px;text-align:right;font-size:13px;}
.mb-setting-value .mb-select{text-align-last:right;}.mb-setting .mb-small{flex:none;min-width:38px;min-height:40px;}
.mb-caption{color:var(--muted);font-size:11px;line-height:1.35;padding:1px 3px;}
.mb-kicker{font-size:10px;letter-spacing:.55px;text-transform:uppercase;font-weight:740;color:var(--muted);}
.mb-status{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);min-width:0;line-height:1.35;}
.mb-dot{width:7px;height:7px;border-radius:50%;background:#adb3bf;flex:none;}.mb-dot.ready{background:#28a36c;}.mb-dot.loading{background:#e9a63d;}.mb-dot.error{background:#d95c67;}
.mb-status-text{overflow-wrap:anywhere;min-width:0;}
.mb-minor{border:0;background:transparent;color:var(--accent);font-size:12px;min-height:40px;padding:4px 9px;font-weight:650;}
.mb-voice-search{border:0;border-bottom:1px solid var(--bd);background:transparent;width:100%;padding:9px 12px;min-height:41px;color:var(--fg);font-size:13px;outline:none;}
.mb-selection{display:grid;gap:6px;}.mb-selection blockquote{margin:0;padding:9px 11px;border-left:2px solid var(--accent);background:var(--surface);border-radius:8px;font-size:12px;max-height:84px;overflow:auto;}
.mb-fieldset{display:grid;gap:4px;}.mb-inline{display:flex;align-items:center;gap:4px;min-width:0;}
.mb-voice-status{font-size:10.5px;color:var(--muted);}
.mb-transcript{padding:6px 12px;}.mb-paragraph{padding:8px 0;line-height:1.5;}
.mb-controls{padding:7px 11px calc(8px + env(safe-area-inset-bottom));gap:6px;}
.mb-pill{border-radius:6px;}
@media(prefers-reduced-motion:no-preference){.mb-panel:not(.reader){animation:mb-in .15s cubic-bezier(.2,.8,.2,1);}@keyframes mb-in{from{opacity:.85;transform:translateY(5px) scale(.99)}to{opacity:1;transform:none}}}
.mb-panel.view-speech .mb-body{gap:6px;padding:7px 10px 8px;}
.mb-panel.view-speech .mb-setting{min-height:44px;}
.mb-panel.view-speech .mb-row{min-height:36px;}
.mb-panel.view-speech .mb-caption{margin:0;}
/* 0.1.3 cohesive touch-first revision: one translucent sheet, grouped surfaces,
   quiet explanations, full-size gesture targets and stable reader layout. */
.mb-launch{width:56px;height:56px;border:0;background:transparent;box-shadow:none;color:#fff;font-size:23px;isolation:isolate;}
.mb-launch::before{content:"";position:absolute;inset:6px;background:rgba(29,35,48,.91);border:1px solid rgba(255,255,255,.22);border-radius:50%;box-shadow:0 4px 16px #0005;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);z-index:-1;}
.mb-launch-symbol{position:relative;pointer-events:none;}.mb-count{top:2px;right:2px;}
.mb-panel{--fg:#171b24;--muted:#667085;--bg:rgba(248,249,252,.96);--surface:rgba(255,255,255,.96);--tile:transparent;--bd:rgba(24,34,56,.10);--accent:#366be5;--tint:rgba(56,106,229,.08);width:min(352px,calc(100vw - 20px));border-radius:23px;border:1px solid rgba(255,255,255,.68);box-shadow:0 20px 70px #10172840,0 1px 8px #10172814;-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);overflow:auto;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f4f6fa;--muted:#a1a8b7;--bg:rgba(24,28,36,.97);--surface:#282d38;--tile:transparent;--bd:rgba(255,255,255,.09);--accent:#a0baff;--tint:rgba(126,160,255,.14);border-color:#454957;}}
.mb-head{min-height:48px;padding:6px 10px;gap:8px;border-color:var(--bd);background:transparent;}
.mb-head h2{font-size:15px;font-weight:750;letter-spacing:-.35px;}
.mb-icon-btn{background:var(--surface);border-radius:13px;min-height:44px;min-width:44px;}
.mb-body{gap:10px;padding:10px 12px 11px;}
.mb-kicker,.mb-section-title{font-weight:720;font-size:10px;letter-spacing:.7px;}
.mb-tiles{gap:0;border-radius:15px;background:var(--surface);border:1px solid var(--bd);overflow:hidden;}
.mb-tile{min-height:66px;border:0;border-radius:0;border-right:1px solid var(--bd);border-bottom:1px solid var(--bd);background:transparent;gap:5px;}
.mb-tile:nth-child(3n){border-right:0;}.mb-tile:nth-last-child(-n+3){border-bottom:0;}.mb-tile:active{background:var(--tint);}
.mb-compact-grid{gap:0;border-radius:15px;overflow:hidden;border:1px solid var(--bd);background:var(--surface);}
.mb-compact{border:0;border-radius:0;min-height:46px;background:transparent;border-bottom:1px solid var(--bd);padding:9px 10px;}
.mb-compact:nth-child(odd){border-right:1px solid var(--bd);}.mb-compact:nth-last-child(-n+2){border-bottom:0;}
.mb-settings-group{border:1px solid var(--bd);border-radius:15px;background:var(--surface);overflow:hidden;}
.mb-setting{min-height:48px;padding:5px 11px;border-bottom:1px solid var(--bd);gap:7px;}
.mb-setting:last-child{border-bottom:0;}
.mb-select{border:0;background:transparent;max-width:100%;text-align:right;font-weight:600;}
.mb-voice-search{background:var(--surface);border:0;border-bottom:1px solid var(--bd);}
.mb-action{border-radius:13px;background:var(--surface);min-height:44px;}
.mb-semantic-status{display:flex;gap:8px;align-items:center;padding:10px 11px;border:1px solid var(--bd);border-radius:14px;background:var(--surface);flex-wrap:wrap;}
.mb-status-copy{display:grid;gap:2px;flex:1;}.mb-status-copy strong{font-size:12px;}.mb-status-copy small{color:var(--muted);font-size:10px;}.mb-warn{width:100%;font-size:11px;color:#cc7744;overflow-wrap:anywhere;}
.mb-action-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}.mb-strip-action{display:flex;justify-content:center;align-items:center;gap:5px;min-height:45px;background:var(--surface);border:1px solid var(--bd);border-radius:13px;color:var(--fg);font-size:11px;font-weight:650;}.mb-strip-action.selected{color:var(--accent);border-color:var(--accent);}
.mb-switch{min-width:50px;width:50px;height:32px;border:0;border-radius:18px;background:#c9cfda;position:relative;padding:3px;}
.mb-switch span{display:block;background:white;width:26px;height:26px;border-radius:50%;box-shadow:0 1px 3px #0003;transition:transform .16s;}.mb-switch.is-on{background:#366be5;}.mb-switch.is-on span{transform:translateX(18px);}
.mb-range-setting{min-height:35px;border:0;}.mb-range-setting label{font-weight:640;font-size:12px;}.mb-range-setting output{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:760;}
#mb-threshold,#mb-seed-threshold{width:calc(100% - 22px);margin:3px 11px 10px;accent-color:var(--accent);}
.mb-hint-row{display:flex;justify-content:space-between;color:var(--muted);font-size:10px;padding:0 4px;margin-top:-4px;}
.mb-score-card{padding:11px;background:var(--surface);border:1px solid var(--bd);border-radius:14px;}
.mb-score-header{display:flex;align-items:center;justify-content:space-between;}.mb-score-number{font:730 20px -apple-system,BlinkMacSystemFont,system-ui;color:var(--accent);font-variant-numeric:tabular-nums;}
.mb-score-bars{display:grid;gap:5px;margin:10px 0;}.mb-score-bars>div{display:flex;justify-content:space-between;align-items:center;gap:9px;color:var(--muted);font-size:11px;}.mb-score-bars b{color:var(--fg);font-variant-numeric:tabular-nums;}
.mb-selection{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:10px;}.mb-selection blockquote{font-size:13px;line-height:1.5;max-height:26vh;overflow:auto;margin:5px 0 0;}
.mb-panel.reader{border-radius:0;background:var(--bg);}.mb-panel.reader .mb-head{min-height:50px;}.mb-transcript{padding:4px 15px 16px;scrollbar-width:thin;}
.mb-paragraph{gap:9px;padding:13px 0;line-height:1.55;border-color:var(--bd);}.mb-paragraph.current{background:var(--tint);margin:0 -9px;padding:13px 9px;}
.mb-paragraph.excluded{opacity:.55;}.mb-pass-toggle{width:44px;min-width:44px;height:44px;min-height:44px;border-radius:13px!important;background:var(--surface)!important;display:grid;place-items:center;color:var(--fg);}
.mb-pass-content{flex:1;min-width:0;}.mb-pass-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;margin:0 0 5px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;}
.mb-why-btn{font:650 10px -apple-system,BlinkMacSystemFont,system-ui;color:var(--accent)!important;border:0!important;display:inline-flex;align-items:center;gap:2px;min-height:36px!important;padding:4px 7px!important;background:transparent!important;}
.mb-pass-text{line-height:1.58;letter-spacing:-.1px;overflow-wrap:anywhere;}
.mb-controls{padding:8px 14px calc(10px + env(safe-area-inset-bottom));gap:7px;box-shadow:0 -5px 22px #00000008;}
.mb-timeline{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:680;color:var(--muted);font-variant-numeric:tabular-nums;}
.mb-timeline span:first-child,.mb-timeline span:last-child{min-width:46px;}.mb-timeline span:last-child{text-align:right;}.mb-timeline span:nth-child(2){font-weight:500;}
.mb-range{height:15px;margin:0;}.mb-player-extra .mb-action{background:var(--surface);border:1px solid var(--bd);}.mb-primary-play{border-radius:50%;height:48px;min-width:48px!important;}
@media(prefers-reduced-motion:reduce){.mb-switch span{transition:none;}}

`;
const globalStyles=`[data-mb-preview]{outline:3px dashed #4c80ff!important;outline-offset:3px!important;}[data-mb-preview-hide]{visibility:hidden!important;}html[data-mb-slashdot] #slashboxes,html[data-mb-slashdot] #footer,html[data-mb-slashdot] .adwrap{display:none!important;}html[data-mb-slashdot] #firehose,html[data-mb-slashdot] #articles{max-width:790px!important;width:100%!important;margin:auto!important;}`;
function head(title){const menu=state.view==='menu';return `<header class="mb-head">${menu?'<span class="mb-brand" aria-hidden="true">✦</span>':`<button type="button" class="mb-small mb-icon-btn" data-action="back" aria-label="Back">${ico('back',19)}</button>`}<h2>${esc(title)}</h2><button type="button" class="mb-small mb-icon-btn" data-action="close" aria-label="Close drawer">${ico('close',16)}</button></header>`;}
function renderMenu(){
 const s=siteName(),active=cleanupEnabled(),site=s[0].toUpperCase()+s.slice(1);
 const siteActions=[];
 if(s!=='other')siteActions.push(compact('site-toggle','shield','Auto cleanup',active?'On':'Off'));
 if(s==='reddit')siteActions.push(compact('nsfw','eye','Reveal NSFW',prefs.nsfw?'On':'Off'));
 if(['x','instagram','facebook','linkedin'].includes(s))siteActions.push(compact('media','images','Browse media'),compact('media-picker','pointer','Select on page'));
 if(s==='facebook')siteActions.push(compact('fb-comments','comment','Show comments'));
 if(s==='slashdot')siteActions.push(compact('slashdot-simple','book','Reader layout'),compact('slashdot-search','search','Search'),compact('slashdot-older','clock','Older stories'));
 if(s==='google')siteActions.push(compact('auto-maps','map','Auto Apple Maps',prefs.autoMaps?'On':'Off'),compact('apple-maps','map','Open Apple Maps'));
 if(camelURL(location.href))siteActions.push(compact('camel','clock','Price history'));
 return `${head('Master Button')}<div class="mb-body">
 <section class="mb-section"><div class="mb-section-head"><span class="mb-section-title">Tools</span><span class="mb-section-note">${esc(location.hostname)}</span></div>
 <div class="mb-tiles">${tile('share-clean','share','Share link')}${tile('url','link','Edit URL')}${tile('reader','headphones','Read aloud')}${tile('filter','filter','Filter page')}${tile('rules','sliders','Filter rules')}${tile('speech','wave','Speech')}</div></section>
 ${siteActions.length?`<section class="mb-section"><div class="mb-section-head"><span class="mb-section-title">${esc(site)} controls</span><span class="mb-section-note">Automatic where possible</span></div><div class="mb-compact-grid">${siteActions.join('')}</div></section>`:''}
 <div class="mb-row"><span class="mb-footer">v${VERSION} · <span data-count>0</span> hidden items</span><button type="button" class="mb-small" data-action="updates">${ico('refresh',13)} Updates</button></div></div>`;
}
function renderURL(){return `${head('Edit URL')}<div class="mb-body"><label class="mb-field">Destination URL<textarea class="mb-textarea" rows="3" id="mb-url">${esc(state.urlDraft||location.href)}</textarea></label><div class="mb-grid">${button('url-clean','✦','Clean URL')}${button('url-copy','▣','Copy')}${button('url-share','↗','Share')}${button('url-open','↗','Open URL')}</div><p class="mb-muted">Only confirmed tracking parameters are removed. Other parameters and fragments are preserved.</p></div>`;}
function semanticStatus(){const n=vectorsForSite().length;
 const active=filterEnabled()&&prefs.semanticAuto;
 const status=semantic.status==='ready'?'On-device MiniLM ready':semantic.status==='loading'?'Loading on-device model':semantic.status==='error'?'Model could not load':active?'Waiting to start':'Semantic filter paused';
 const detail=semantic.status==='error'?`<div class="mb-warn">${esc(semantic.lastError||semantic.detail)}</div>`:'';
 return `<div class="mb-semantic-status"><span class="mb-dot ${esc(semantic.status)}"></span><div class="mb-status-copy"><strong>${esc(status)}</strong><small>${n} taught examples · ${semantic.scanned} blocks scanned</small></div>${detail}</div>`;
}
function formatScore(s){return Number.isFinite(s)&&s>=0?s.toFixed(2):'—';}
function renderScoreDetails(a){
 if(!a)return '<p class="mb-caption">No analysis yet. The local model must load before scores become available.</p>';
 if(a.model!=='MiniLM')return `<p class="mb-caption">${esc(a.reason||'Waiting for a local model.')} · ${esc(a.source||a.model)}. No local model similarity score is available.</p>`;
 return `<div class="mb-score-header"><strong>${a.excluded?'Excluded':'Kept'}</strong><span class="mb-score-number">${formatScore(a.score)}</span></div>
 <div class="mb-score-bars"><div><span>Learned skip match</span><b>${formatScore(a.skipScore)}</b></div><div><span>Learned keep match</span><b>${formatScore(a.keepScore)}</b></div><div><span>Built-in nuisance match</span><b>${formatScore(a.seedScore)}</b></div></div>
 <p class="mb-caption">${esc(a.reason)} · ${esc(a.source)}. Learned threshold ${Number(a.threshold).toFixed(2)}; built-in threshold ${Number(a.seedThreshold).toFixed(2)}. Similarity is not a probability.</p>`;
}
function renderFilter(){return `${head('Filter')}<div class="mb-body mb-filter-view">
 <div class="mb-settings-group"><div class="mb-setting"><span class="mb-setting-label">Filter this site</span><span class="mb-setting-value">${filterEnabled()?'Active':'Off'}</span><button class="mb-switch ${filterEnabled()?'is-on':''}" role="switch" aria-checked="${filterEnabled()}" aria-label="Filter this site" data-action="filter-toggle"><span></span></button></div>
 <div class="mb-setting"><span class="mb-setting-label">Local AI</span><span class="mb-setting-value">${prefs.semanticAuto?'Automatic':'Off'}</span><button class="mb-switch ${prefs.semanticAuto?'is-on':''}" role="switch" aria-checked="${prefs.semanticAuto}" aria-label="Enable local semantic filter" data-action="semantic-toggle"><span></span></button></div></div>
 ${semanticStatus()}
 <div class="mb-action-strip"><button data-action="filter-preview" class="mb-strip-action ${state.filterReview?'selected':''}">${ico('eye',17)} <span>${state.filterReview?'End preview':'Show all'}</span></button><button data-action="select-phrase" class="mb-strip-action">${ico('pointer',17)} <span>Teach</span></button><button data-action="pick-filter" class="mb-strip-action">${ico('filter',17)} <span>Pick</span></button></div>
 <div class="mb-settings-group"><div class="mb-setting mb-range-setting"><label for="mb-threshold">Learned match sensitivity</label><output id="mb-threshold-value">${Number(prefs.semanticThreshold??.79).toFixed(2)}</output></div><input type="range" id="mb-threshold" min="0.60" max="0.96" step="0.01" value="${prefs.semanticThreshold??.79}" aria-label="Learned match threshold"></div>
 <div class="mb-hint-row"><span>Lower = filters more</span><span>Higher = safer</span></div>
 <div class="mb-row"><button data-action="semantic-load" class="mb-minor">${ico('refresh',14)} ${semantic.status==='ready'?'Rescan':'Retry model'}</button><button data-action="rules" class="mb-minor">Rules & scores ${ico('chevron',14)}</button></div>
 <p class="mb-caption">${state.filterReview?'All filtered elements are visible for inspection. Tap End preview to reapply your rules.':'Corrections on the page or in the reader train the same local classifier.'}</p>
 </div>`;}
function renderTeach(){return `${head('Teach filter')}<div class="mb-body">
 <div class="mb-selection"><span class="mb-kicker">Selected words</span><blockquote>${esc(state.selectionText||'Select text from the article to teach.')}</blockquote></div>
 <div class="mb-settings-group"><div class="mb-setting"><label class="mb-setting-label" for="mb-reason">Reason</label><div class="mb-setting-value"><select id="mb-reason" class="mb-select">${Object.entries(semanticCategories).filter(([k])=>k!=='article').map(([key,label])=>`<option value="${esc(key)}" ${state.selectionReason===key?'selected':''}>${esc(label)}</option>`).join('')}</select></div></div></div>
 <div class="mb-grid">${button('teach-skip',ico('close',16),'Skip like this')}${button('teach-keep',ico('check',16),'Keep like this')}</div>
 ${state.selectionScore?`<div class="mb-score-card">${renderScoreDetails(state.selectionScore)}</div>`:''}
 ${semanticStatus()}<p class="mb-caption">Page content is visible while teaching; nearby previously hidden passages are included as context for the new example. Only embeddings are saved.</p>
 <button data-action="select-phrase" class="mb-minor">Change selected text</button></div>`;}
function renderWhy(){const p=reading.passages[state.whyIndex];return `${head('Why this passage?')}<div class="mb-body"><div class="mb-selection"><span class="mb-kicker">${p?.excluded?'Excluded':'Included'} · passage ${(state.whyIndex||0)+1}</span><blockquote>${esc(p?.text||'')}</blockquote></div>
 <div class="mb-score-card">${renderScoreDetails(p?.analysis)}</div><div class="mb-row">${button('pass-toggle:'+state.whyIndex,ico('check',17),p?.excluded?'Include this':'Skip this')}${button('pass-analyze:'+state.whyIndex,ico('refresh',17),'Analyze again')}</div>
 ${button('filter',ico('sliders',16),'Filter thresholds')}</div>`;}
function renderSelectText(){return `${head('Select text')}<div class="mb-body"><p class="mb-caption">Long-press and highlight a phrase on the webpage. Then tap ✦ or “Use selection”. Do not select entire articles.</p>${button('selection-use',ico('check',17),'Use highlighted text')}${button('teach-skip',ico('minus',17),'Skip cached selection')}</div>`;}
function renderPicker(){return `${head('Select nuisance element')}<div class="mb-body"><p>Tap an unwanted element on the webpage. Its matching elements will be outlined before you save anything.</p><div class="mb-rule"><strong>${esc(state.pickerSelector||'No element selected')}</strong><span class="mb-muted">${pickerMatches.length} matching elements highlighted</span>${pickerMatches.length?`<div class="mb-grid">${button('preview',preview?'◉':'◎',preview?'Undo preview':'Preview hiding')}${button('picker-save','✓','Save rule')}</div>${button('picker-next','↓','Show next match')}`:''}</div>${button('picker-cancel','×','Cancel and restore')}</div>`;}
function renderRules(){const rules=prefs.rules[domainKey()]||[];return `${head('Rules & learning')}<div class="mb-body">
 ${semanticStatus()}<div class="mb-grid">${button('select-phrase',ico('pointer',17),'Teach text')}${button('pick-filter',ico('filter',17),'Visual rule')}</div>
 ${rules.length?rules.map((r,i)=>`<div class="mb-rule"><strong>${esc(r.selector)}</strong><span class="mb-muted">${safeMatches(r.selector).length} matches · ${r.enabled?'Enabled':'Disabled'}</span><div class="mb-grid">${button('rule-toggle:'+i,r.enabled?'✓':'○',r.enabled?'Disable':'Enable')}${button('rule-edit:'+i,'✎','Edit')}${button('rule-delete:'+i,'⌫','Delete')}</div></div>`).join(''):'<p class="mb-caption">No CSS rules yet. Phrase learning does not require CSS selectors.</p>'}
 <div class="mb-settings-group"><div class="mb-setting mb-range-setting"><label for="mb-seed-threshold">Built-in nuisance sensitivity</label><output id="mb-seed-threshold-value">${Number(prefs.semanticSeedThreshold??0.89).toFixed(2)}</output></div><input type="range" id="mb-seed-threshold" min="0.70" max="0.98" step="0.01" value="${prefs.semanticSeedThreshold??0.89}"></div>
 <div class="mb-settings-group"><div class="mb-setting"><span class="mb-setting-label">Token fallback</span><span class="mb-setting-value">${prefs.learningEnabled?.[domainKey()]===false?'Off':'On'}</span><button class="mb-minor" data-action="learning-toggle">Toggle</button></div>
 <div class="mb-setting"><span class="mb-setting-label">Learning</span><span class="mb-setting-value">${vectorsForSite().length} examples</span><button class="mb-minor" data-action="semantic-reset">Reset</button></div></div>
 <p class="mb-caption">Only your explicit selections and transcript Skip/Keep choices train the filter. No page histories are saved.</p></div>`;}
const azureRegions=[['australiaeast','Australia East'],['brazilsouth','Brazil South'],['canadacentral','Canada Central'],['canadaeast','Canada East'],['centralindia','Central India'],['centralus','Central US'],['eastasia','East Asia'],['eastus','East US'],['eastus2','East US 2'],['francecentral','France Central'],['germanywestcentral','Germany West Central'],['italynorth','Italy North'],['japaneast','Japan East'],['japanwest','Japan West'],['koreacentral','Korea Central'],['northcentralus','North Central US'],['northeurope','North Europe'],['norwayeast','Norway East'],['qatarcentral','Qatar Central'],['southafricanorth','South Africa North'],['southcentralus','South Central US'],['southeastasia','Southeast Asia'],['swedencentral','Sweden Central'],['switzerlandnorth','Switzerland North'],['switzerlandwest','Switzerland West'],['uaenorth','UAE North'],['uksouth','UK South'],['ukwest','UK West'],['westcentralus','West Central US'],['westeurope','West Europe'],['westus','West US'],['westus2','West US 2'],['westus3','West US 3']];
function voiceOptions(){const chosen=prefs.azure.voice,list=state.voicesRegion===prefs.azure.region?state.voices:[];if(!list.length)return `<option value="${esc(chosen)}">${esc(chosen)} · load voices below</option>`;return list.map(v=>`<option value="${esc(v.id)}" ${v.id===chosen?'selected':''}>${esc(v.label)}</option>`).join('');}
function renderSpeech(){const count=state.voicesRegion===prefs.azure.region?state.voices.length:0;return `${head('Speech')}<div class="mb-body">
 <span class="mb-kicker">Azure resource</span><div class="mb-settings-group">
 <div class="mb-setting"><label class="mb-setting-label" for="mb-key">API key</label><div class="mb-setting-value"><input class="mb-input" id="mb-key" type="password" autocomplete="off" placeholder="${azureKey?'Saved · replace key':'Enter key'}"></div></div>
 <div class="mb-setting"><label class="mb-setting-label" for="mb-region">Region</label><div class="mb-setting-value"><select id="mb-region" class="mb-select">${azureRegions.map(([v,t])=>`<option value="${v}" ${prefs.azure.region===v?'selected':''}>${esc(t)}</option>`).join('')}</select></div></div></div>
 <div class="mb-row"><button class="mb-minor" data-action="speech-forget">Forget key</button><button class="mb-small" data-action="speech-save">${ico('check',16)} Save & load voices</button></div>
 <span class="mb-kicker">Voice ${count?'· '+count+' available':''}</span><div class="mb-settings-group">
 <input class="mb-voice-search" type="search" id="mb-voice-search" placeholder="Search language or voice" aria-label="Search loaded voices">
 <div class="mb-setting"><label class="mb-setting-label" for="mb-voice">Voice</label><div class="mb-setting-value"><select class="mb-select" id="mb-voice">${voiceOptions()}</select></div><button class="mb-small" aria-label="Hear selected voice" data-action="speech-demo">${ico('play',17)}</button></div>
 <div class="mb-setting"><label class="mb-setting-label" for="mb-quality">MP3 quality</label><div class="mb-setting-value"><select class="mb-select" id="mb-quality"><option value="compact" ${prefs.azure.quality==='compact'?'selected':''}>48 kbps · compact</option><option value="high" ${prefs.azure.quality==='high'?'selected':''}>96 kbps · high</option></select></div></div></div>
 <div class="mb-row"><span class="mb-voice-status">${esc(state.voicesLoading?'Loading voices…':state.voicesError|| (count?count+' voices ready':'Save key and region to load voices'))}</span><button class="mb-minor" data-action="speech-voices">${ico('refresh',15)} Reload</button></div>
 <p class="mb-caption">Key stays in extension storage. Enabled narration text is sent directly to Azure.</p></div>`;}
function renderReader(){
 const total=reading.passages.length,ready=reading.passages.filter(p=>p.blob&&!p.excluded).length,enabled=enabledIndices().length;
 const editor=state.readerEditing?`<div class="mb-body"><textarea class="mb-textarea" style="min-height:42dvh" id="mb-reader-edit">${esc(state.readerDraft)}</textarea>${button('reader-save','✓','Use edited text')}${button('reader-abort','×','Cancel editing')}</div>`:`<div class="mb-transcript" data-transcript>${total?reading.passages.map((p,i)=>`<div class="mb-paragraph ${p.excluded?'excluded':''} ${i===reading.index?'current':''}" data-pass="${i}"><button class="mb-pass-toggle" type="button" data-action="pass-toggle:${i}" aria-label="${p.excluded?'Include':'Skip'} passage ${i+1}">${ico(p.excluded?'check':'close',18)}</button><div class="mb-pass-content"><div class="mb-pass-meta"><span>${String(i+1).padStart(2,'0')} · ${esc(p.excluded?'Skipped':p.status==='ready'?'Ready':'Included')}</span><button type="button" data-action="pass-why:${i}" class="mb-why-btn">${esc(p.analysis?.model==='MiniLM'?formatScore(p.analysis.score):'Why?')} ${ico('chevron',12)}</button></div><div class="mb-pass-text" style="font-size:${prefs.fontSize}px" data-action="pass-play:${i}">${esc(p.text)}</div></div></div>`).join(''):'<p>No article found. Tap Edit text to paste something to narrate.</p>'}</div>`;
 return `${head('Article reader')}<div class="mb-body" style="flex:none;padding-bottom:5px"><div class="mb-row"><span class="mb-muted">${ready}/${enabled} ready${reading.preparing?' · Preparing…':''}</span><button class="mb-small" data-action="reader-edit">${ico('file',14)} Edit text</button></div></div>${editor}
 <section class="mb-controls"><div class="mb-timeline"><span data-audio-now>0:00</span><span data-audio-segments>${reading.index+1}/${reading.passages.length} passages</span><span data-audio-total>—:—</span></div><input data-audio-seek type="range" class="mb-range" value="0" min="0" max="100" step=".1" aria-label="Seek within current passage"/><div class="mb-player-row"><button class="mb-small" data-action="prev" aria-label="Previous passage">${ico('prev',19)}</button><button class="mb-small mb-primary-play" data-action="play" aria-label="${reading.playing?'Pause':'Play'}">${ico(reading.playing?'pause':'play',23)}</button><button class="mb-small" data-action="next" aria-label="Next passage">${ico('next',19)}</button><label class="mb-field" style="width:81px">Speed<select class="mb-select" id="mb-rate" style="min-height:31px;padding:5px">${[.75,1,1.25,1.5,1.75,2].map(x=>`<option value="${x}" ${prefs.playbackRate===x?'selected':''}>${x}×</option>`).join('')}</select></label></div>
 <div class="mb-player-extra">${button('prepare',ico('wave',17),reading.preparing?'Preparing':'Prepare')}${button('export-mp3',ico('download',17),'MP3')}${button('export-text',ico('file',17),'Transcript')}${button('filter',ico('sliders',17),'Filter')}</div>
 <div class="mb-row"><button class="mb-small" data-action="stop">${ico('close',13)} Stop</button><button class="mb-small" data-action="reader-new">${ico('refresh',13)} Re-extract</button><button class="mb-small" data-action="minimize">${ico('minus',13)} Minimize</button></div></section>`;
}
function renderMini(){return `${head('Now playing')}<div class="mb-body"><p class="mb-muted">Passage ${reading.index+1} of ${reading.passages.length}</p><div class="mb-grid">${button('play',reading.playing?'❚❚':'▶',reading.playing?'Pause':'Play')}${button('next','⇥','Next passage')}${button('reader','▤','Full reader')}${button('menu','☰','All tools')}</div></div>`;}
function renderMedia(){state.siteMedia=mediaItems();const i=Math.min(state.mediaIndex,state.siteMedia.length-1),it=state.selectedMedia||state.siteMedia[Math.max(0,i)];return `${head('Media · '+siteName())}<div class="mb-body"><p class="mb-muted">Choose the currently displayed item, or select one directly on the webpage. Downloads require accessible direct files.</p><div class="mb-row"><strong>${state.siteMedia.length} detected items</strong><button class="mb-small" data-action="media-refresh">Refresh</button></div>${state.siteMedia.length?`<select id="mb-media" class="mb-select">${state.siteMedia.map((x,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(x.kind+' '+(j+1)+' · '+x.label)}</option>`).join('')}</select>`:''}${it?`<div class="mb-preview">${it.kind==='image'?`<img src="${esc(it.url)}" alt="Selected media preview">`:'<span>Video selected</span>'}</div><p class="mb-muted">${esc(it.kind)} · ${esc(it.url.slice(0,110))}</p>`:''}
 <div class="mb-grid">${button('media-picker','◎','Select on page')}${button('media-share','↗','Share file')}${button('media-download','⇩','Download file')}${button('media-open','↗','Open source')}</div></div>`;}
function renderMediaPicker(){return `${head('Tap page media')}<div class="mb-body"><p>Tap an image or video on the website. The tap will select it rather than open the post.</p>${button('media-cancel','×','Cancel selection')}</div>`;}
function render(){if(!host)return;const shadow=host.shadowRoot;const content=state.view==='menu'?renderMenu():state.view==='url'?renderURL():state.view==='filter'?renderFilter():state.view==='teach'?renderTeach():state.view==='why'?renderWhy():state.view==='select-text'?renderSelectText():state.view==='picker'?renderPicker():state.view==='rules'?renderRules():state.view==='speech'?renderSpeech():state.view==='reader'?renderReader():state.view==='mini'?renderMini():state.view==='media'?renderMedia():state.view==='media-picker'?renderMediaPicker():'';
 shadow.querySelector('.mb-launch').style.cssText=positionCSS();const panel=shadow.querySelector('.mb-panel');panel.hidden=!state.view;panel.className='mb-panel'+(state.view==='reader'?' reader':'')+' view-'+state.view;const vv=window.visualViewport,w=vv?.width||document.documentElement?.clientWidth||innerWidth;panel.style.left=state.view==='reader'?`${vv?.offsetLeft||0}px`:`${(vv?.offsetLeft||0)+Math.max(10,w-Math.min(352,w-24)-12)}px`;panel.style.right='auto';const launchBox=shadow.querySelector('.mb-launch').getBoundingClientRect();
 const below=launchBox.top<Math.min(340,(vv?.height||innerHeight)*0.42);
 if(state.view==='reader'){panel.style.top=`${vv?.offsetTop||0}px`;panel.style.bottom='auto';panel.style.maxHeight='100dvh';}
 else if(below){panel.style.top=`${launchBox.bottom+10}px`;panel.style.bottom='auto';panel.style.maxHeight=`${Math.max(140,(vv?.height||innerHeight)-launchBox.bottom-24)}px`;}
 else {panel.style.top='auto';panel.style.bottom=`${Math.max(14,innerHeight-launchBox.top+10)}px`;panel.style.maxHeight=`${Math.max(140,launchBox.top-24)}px`;}
panel.style.height=state.view==='reader'?`${vv?.height||innerHeight}px`:'auto';panel.style.width=state.view==='reader'?`${w}px`:`${Math.min(352,w-24)}px`;if(panel.innerHTML!==content){
  // Preserve reader scroll and focused passage even when applying Skip/Keep or playing audio.
  const oldTranscript=panel.querySelector('[data-transcript]');
  const savedScroll=oldTranscript?.scrollTop;
  const hadTranscript=!!oldTranscript&&state.view==='reader'&&!state.readerEditing;
  const savedFocus=shadow.activeElement?.getAttribute?.('data-action');
  panel.innerHTML=content;
  if(hadTranscript){const next=panel.querySelector('[data-transcript]');if(next)next.scrollTop=savedScroll;}
  if(savedFocus?.startsWith('pass-')&&state.view==='reader')panel.querySelector(`[data-action="${savedFocus}"]`)?.focus({preventScroll:true});
 }
 if(state.view==='reader')updateAudioProgress();updateCount();}

async function handleAction(action,el){
 try{
  if(action==='close'){if(state.view==='picker')clearPicker();if(state.view==='media-picker')endMediaPick();endFilterReview();state.view='';render();return;}
  if(action==='back'){const old=state.view;if(old==='picker')clearPicker();if(old==='media-picker')endMediaPick();if(old==='why'){openView('reader');return;}if(old==='teach'||old==='select-text'){openView('filter');return;}endFilterReview();openView('menu');return;}
  if(action==='menu'){openView('menu');return;}
  if(action==='minimize'){endFilterReview();state.view='';render();return;}
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
  if(action==='filter'){openView('filter');if(prefs.semanticAuto&&semantic.status==='idle')void loadSemantic().then(ensureSemanticSeeds).then(scheduleSemanticScan).catch(()=>{});return;}
  if(action==='semantic-load'){if(semantic.extractor){for(const x of document.querySelectorAll('[data-mb-semantic-reviewed]'))x.removeAttribute('data-mb-semantic-reviewed');scheduleSemanticScan();notify('Rescanning article with local model.');}else{notify('Loading on-device language model…');await loadSemantic();await ensureSemanticSeeds();scheduleSemanticScan();if(reading.passages.length)await reclassifyTranscript();notify('Local MiniLM is ready.');}render();return;}
  if(action==='semantic-toggle'){prefs.semanticAuto=!prefs.semanticAuto;await saveSettings();if(!prefs.semanticAuto){for(const [el,old] of [...hidden])if(String(old.reason).startsWith('Similar to')||String(old.reason).startsWith('Likely'))showNode(el);}else{if(!semantic.extractor)void loadSemantic().then(ensureSemanticSeeds).then(scheduleSemanticScan).catch(()=>{});else scheduleSemanticScan();}render();return;}
  if(action==='filter-preview'){
  if(state.filterReview){endFilterReview();notify('Filtering restored.');}
  else{beginFilterReview();notify('All filtered content shown until you end preview.');}
  render();return;
 }
 if(action==='select-phrase'){
  rememberSelectedPhrase();beginFilterReview();state.selectionScore=null;
  openView(state.selectionText?'teach':'select-text');
  if(state.selectionText)void inspectSelectedPhrase();return;
 }
  if(action==='selection-use'){rememberSelectedPhrase();if(!state.selectionText){notify('Select words on the webpage first.');return;}beginFilterReview();openView('teach');void inspectSelectedPhrase();return;}
  if(action==='teach-skip'||action==='teach-keep'){const v=state.selectionText;if(!v)throw Error('Select some article text first.');const decision=action==='teach-skip'?'skip':'keep';const reason=host.shadowRoot.getElementById('mb-reason')?.value||state.selectionReason;state.selectionReason=reason;notify('Learning from your selection…');await teachSemantic(v,decision,reason,state.selectionElement);notify(decision==='skip'?'Saved. Similar interruptions will be filtered.':'Saved. Similar article prose will be preserved.');endFilterReview();openView('filter');return;}
  if(action==='semantic-reset'){delete prefs.semanticExamples[domainKey()];delete prefs.learning[domainKey()];await saveSettings();semantic.revision++;for(const x of document.querySelectorAll('[data-mb-semantic-reviewed]'))x.removeAttribute('data-mb-semantic-reviewed');showAll();appliedFilter();render();notify('Site learning reset.');return;}
  if(action==='filter-toggle'){setFiltering(!filterEnabled());return;}
  if(action==='restore-hidden'){showAll();notify('Restored items modified by this script.');return;}
  if(action==='rules'){openView('rules');return;}
  if(action==='pick-filter'){pickFilter();return;}
  if(action==='preview'){togglePreview();return;}
  if(action==='picker-cancel'){clearPicker();endFilterReview();openView('filter');return;}
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
  if(action==='speech'){openView('speech');if(azureKey&&state.voicesRegion!==prefs.azure.region&&!state.voicesLoading)void loadVoices().catch(e=>notify(e.message));return;}
  if(action==='speech-save'){
   const k=host.shadowRoot.getElementById('mb-key')?.value?.trim();const region=host.shadowRoot.getElementById('mb-region')?.value?.trim().toLowerCase();
   if(!/^[a-z0-9-]{3,40}$/.test(region))throw Error('Enter a valid Azure region, e.g. eastus.');
   prefs.azure.region=region;if(k){if(!storageOK)throw Error('Extension-controlled storage is required before saving a key.');await gmSet(STORAGE+':azure',k);azureKey=k;}
   await saveSettings();if(state.voicesRegion!==region){state.voices=[];state.voicesRegion='';}notify('Speech settings saved. Loading voices…');render();if(azureKey)await loadVoices();return;
  }
  if(action==='speech-forget'){await gmSet(STORAGE+':azure','');azureKey='';reading.sampleCache.clear();notify('Speech key forgotten.');render();return;}
  if(action==='speech-voices'){await loadVoices();return;}
  if(action==='speech-demo'){await demoVoice();return;}
  if(action==='reader-edit'){state.readerDraft=reading.passages.map(p=>p.text).join('\n\n');state.readerEditing=true;render();return;}
  if(action==='reader-abort'){state.readerEditing=false;render();return;}
  if(action==='reader-save'){const v=host.shadowRoot.getElementById('mb-reader-edit')?.value||'';replaceReaderText(v);return;}
  if(action.startsWith('pass-toggle:')){excludePassage(Number(action.split(':')[1]));return;}
 if(action.startsWith('pass-why:')){state.whyIndex=Number(action.split(':')[1]);openView('why');return;}
 if(action.startsWith('pass-analyze:')){const i=Number(action.split(':')[1]),p=reading.passages[i];if(!p)return;notify('Analyzing passage locally…');p.analysis=await analyzePhrase(p.text,p.element);if(!p.manual&&!p.blob){p.excluded=p.analysis.excluded;p.reason=p.analysis.reason;}render();return;}
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
function rememberSelectedPhrase(){
 const sel=window.getSelection();if(!sel||sel.isCollapsed)return;
 const v=text(sel.toString());if(v.length<8||v.length>650)return;
 const anchor=sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement;
 if(!anchor||anchor.closest?.('[data-mb-host]'))return;
 const element=anchor.closest?.('p,li,blockquote,aside,div,section');
 state.selectionText=v;state.selectionElement=element&&!protectedNode(element)?element:null;
}
function installUI(){if(document.querySelector('[data-mb-host]'))return;
 host=document.createElement('div');host.setAttribute('data-mb-host','');host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:2147483647!important;pointer-events:none!important;';
 const shadow=host.attachShadow({mode:'open'});shadow.innerHTML=`<style>${styles}</style><button class="mb-launch" type="button" aria-label="Open Master Button tools"><span class="mb-launch-symbol">✦</span><span class="mb-count" data-count>0</span></button><section class="mb-panel" role="dialog" aria-label="Master Button controls" hidden></section><div class="mb-toast" role="status" aria-live="polite" hidden></div>`;
 document.documentElement.appendChild(host);
 const global=document.createElement('style');global.textContent=globalStyles;global.id='mb-global-style';(document.head||document.documentElement).append(global);
 let drag=null,lastTouchToggle=0;
 const launch=shadow.querySelector('.mb-launch');
 const toggleLaunch=()=>{rememberSelectedPhrase();if(state.view==='select-text'&&state.selectionText){openView('teach');void inspectSelectedPhrase();return;}if(state.view)endFilterReview();openView(state.view?'':reading.playing?'mini':'menu');};
 document.addEventListener('selectionchange',()=>{const selection=window.getSelection();if(selection&&!selection.isCollapsed&&selection.toString().length>8)rememberSelectedPhrase();});
 launch.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,right:prefs.position.right,bottom:prefs.position.bottom,moved:false,type:e.pointerType};try{launch.setPointerCapture(e.pointerId);}catch{}});
 launch.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.max(Math.abs(dx),Math.abs(dy))>15)drag.moved=true;if(!drag.moved)return;prefs.position.right=Math.max(6,Math.min((visualViewport?.width||innerWidth)-66,drag.right-dx));prefs.position.bottom=Math.max(6,Math.min((visualViewport?.height||innerHeight)-66,drag.bottom-dy));launch.style.cssText=positionCSS();});
 launch.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved,type=drag.type;drag=null;if(moved){ignoreClick=true;void saveSettings();}else if(type==='touch'||type==='pen'){lastTouchToggle=Date.now();toggleLaunch();}});
 launch.addEventListener('pointercancel',()=>{drag=null;});
 launch.addEventListener('click',e=>{if(Date.now()-lastTouchToggle<850){e.preventDefault();return;}if(ignoreClick){e.preventDefault();ignoreClick=false;return;}toggleLaunch();});
 shadow.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b){e.stopPropagation();void handleAction(b.dataset.action,b);}});
 shadow.addEventListener('change',e=>{
  if(e.target.id==='mb-threshold'||e.target.id==='mb-seed-threshold'){prefs[e.target.id==='mb-threshold'?'semanticThreshold':'semanticSeedThreshold']=Number(e.target.value);saveSettings();resetSemanticReview();if(reading.passages.length)void reclassifyTranscript();render();}
  if(e.target.id==='mb-media'){state.mediaIndex=Number(e.target.value);state.selectedMedia=null;render();}
  if(e.target.id==='mb-voice'){prefs.azure.voice=e.target.value;reading.sampleCache.clear();saveSettings();}
  if(e.target.id==='mb-region'){prefs.azure.region=e.target.value;state.voices=[];state.voicesRegion='';state.voicesError='';saveSettings();render();if(azureKey)void loadVoices().catch(x=>notify(x.message));}
  if(e.target.id==='mb-quality'){prefs.azure.quality=e.target.value;saveSettings();}
  if(e.target.id==='mb-rate'){prefs.playbackRate=Number(e.target.value);audio.playbackRate=prefs.playbackRate;saveSettings();}
  if(e.target.matches('[data-audio-seek]')&&Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Number(e.target.value));
 });
 shadow.addEventListener('input',e=>{if(e.target.id==='mb-threshold'||e.target.id==='mb-seed-threshold'){const output=host.shadowRoot.getElementById(e.target.id+'-value');if(output)output.textContent=Number(e.target.value).toFixed(2);}if(e.target.id==='mb-url')state.urlDraft=e.target.value;if(e.target.id==='mb-reader-edit')state.readerDraft=e.target.value;if(e.target.id==='mb-voice-search'){const q=e.target.value.trim().toLowerCase();const sel=host.shadowRoot.getElementById('mb-voice');if(sel){const items=state.voices.filter(v=>(v.label+' '+v.id).toLowerCase().includes(q)).slice(0,250);sel.replaceChildren(...items.map(v=>{const o=document.createElement('option');o.value=v.id;o.textContent=v.label;o.selected=v.id===prefs.azure.voice;return o;}));if(!items.length){const o=document.createElement('option');o.textContent='No matching voices';sel.append(o);}}}});
 addEventListener('resize',()=>{prefs.position.right=Math.min(prefs.position.right,innerWidth-66);prefs.position.bottom=Math.min(prefs.position.bottom,innerHeight-66);render();});
 if(window.visualViewport)visualViewport.addEventListener('resize',()=>{const keyboard=Math.max(0,innerHeight-visualViewport.height-visualViewport.offsetTop);launch.style.bottom=Math.max(prefs.position.bottom,keyboard+14)+'px';});
 render();
}
function monitorDOM(){
 if(siteName()==='reddit'){
   const lockWatcher=new MutationObserver(()=>{if(cleanupEnabled())redditUnlockScroll();});
   for(const root of [document.documentElement,document.body])if(root)lockWatcher.observe(root,{attributes:true,attributeFilter:['style','class','m-scroll-lock','scroll-lock']});
   // Timed interstitials may appear long after load, and may reapply overflow locks
   // without child-list changes. Keep the periodic safety pass site-scoped.
   setInterval(()=>{if(document.visibilityState!=='hidden'&&cleanupEnabled())siteClean();},2500);
   [150,600,1400,4000,9000,20000,35000,50000,65000].forEach(delay=>setTimeout(()=>{if(cleanupEnabled())siteClean();},delay));
 }
 observer=new MutationObserver(records=>{
  // Avoid scanning each leaf mutation during fast page transitions.
  if(!records.some(r=>![host?.contains(r.target)]&&r.target!==host&&r.target.id!=='mb-global-style'))return;
  clearTimeout(observerTimer);observerTimer=setTimeout(()=>{if(location.href!==lastLocation){lastLocation=location.href;state.selectionText='';state.selectionElement=null;autoMapRedirect();}updateSite();if(prefs.semanticAuto&&semantic.status==='idle'&&document.querySelector('article,main,[role="main"]'))void loadSemantic().then(ensureSemanticSeeds).then(scheduleSemanticScan).catch(()=>{});scheduleSemanticScan();},420);
 });observer.observe(document.documentElement,{childList:true,characterData:true,subtree:true});
 addEventListener('popstate',()=>{lastLocation=location.href;autoMapRedirect();setTimeout(updateSite,100);});
 addEventListener('pageshow',()=>updateSite());
}
async function boot(){
 if(document.querySelector('[data-mb-host]'))return;
 await readSettings();autoMapRedirect();if(!document.documentElement)return;if(siteName()==='reddit')toggleRedditCSS(cleanupEnabled());
 installUI();updateSite();monitorDOM();if(!storageOK)notify('Extension storage unavailable: preferences will not persist.');// Auto-start for article pages; never report 'ready' until the pretrained weights load.
 if(prefs.semanticAuto&&filterEnabled())setTimeout(()=>{
  if(prefs.semanticAuto&&filterEnabled()&&document.querySelector('article,main,[role="main"]'))void loadSemantic().then(ensureSemanticSeeds).then(scheduleSemanticScan).catch(()=>{render();});
 },250);
}
// Hide known Reddit interstitials before the first asynchronous settings read.
// The persisted per-site setting is applied by boot() as soon as it resolves.
if(siteName()==='reddit'&&document.documentElement)toggleRedditCSS(true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void boot(),{once:true});else void boot();

})();
