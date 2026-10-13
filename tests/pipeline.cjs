// DOM/state integration: real bundled Defuddle; deterministic fake embeddings/audio.
// This does not prove Safari layout, actual MiniLM inference, or Azure connectivity.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'../dist/master-button.user.js'),'utf8');
const html='<!doctype html><html><head><title>Field research</title></head><body><article><h1>Field research</h1>'+Array.from({length:34},(_,i)=>`<p id="p${i}">${i===2?'Related articles recommended for you. ':''}Researchers recorded observations in the field, checking each measurement against their instruments and publishing detailed results. Study ${i}.</p>`).join('')+'</article></body></html>';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM(html,{url:'https://example.com/article',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.CSS={escape:x=>String(x)};w.matchMedia=()=>({matches:false});w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 const storage={};let requests=[],resolveSpeech;
 w.Audio=class extends w.EventTarget{constructor(){super();this.paused=true;this.duration=10;this.currentTime=0;this.attrs={};}play(){this.paused=false;this.dispatchEvent(new w.Event('play'));return Promise.resolve();}pause(){this.paused=true;this.dispatchEvent(new w.Event('pause'));}load(){}removeAttribute(k){delete this.attrs[k];this.src='';}getAttribute(k){return k==='src'?this.src:null;}};
 w.GM={getValue:async(k,d)=>k.endsWith(':azure')?'fake-key':{semanticAuto:false,semanticExamples:{'example.com':{examples:[]}},position:{right:14,bottom:105}},setValue:async(k,v)=>{storage[k]=JSON.parse(JSON.stringify(v));},xmlHttpRequest:async params=>{requests.push(params.data);return await new Promise(r=>{resolveSpeech=()=>r({status:200,response:new w.ArrayBuffer(4)});});}};
 const expose='\nwindow.T={passageStore,reading,semantic,refreshPassages,correctPassage,undoPassageCorrection,discoverPassages,openReader,excludePassage,prepareReading,audio,handleAction,runSemanticScan,normalizeSettings,normalizeExamples,render,renderTeach,setPageReview,beginFilterReview,endFilterReview,hideNode,hidden,renderPagePassages,teachSemantic,cancelTraining,saveSettings,get prefs(){return prefs;},get state(){return state;}};';
 const end=script.lastIndexOf('\n})();');w.eval(script.slice(0,end)+expose+script.slice(end));
 await wait(30);const t=w.T;assert(t.passageStore.records.length>=34);assert.equal(t.passageStore.extractor,'Defuddle 0.19.5');assert.equal(w.document.querySelectorAll('[data-mb-source]').length,0);
 assert(Array.isArray(t.prefs.semanticExamples['example.com']));
 const repaired=t.normalizeSettings({semanticExamples:{a:{0:{h:'h',d:'keep',v:[1,0]},1:{d:'bad',v:[]}}},rules:{a:{}},position:null,learning:null});assert.equal(repaired.semanticExamples.a.length,1);assert.equal(repaired.rules.a.length,0);
 t.semantic.extractor=async xs=>({tolist:()=>xs.map(s=>s.startsWith('Related')?[1,0]:[0,1])});t.semantic.status='ready';
 const p=t.passageStore.records.find(p=>p.element.id==='p0');t.openReader();await t.correctPassage(p,'skip');assert.equal(p.override,'skip');assert(t.reading.passages.filter(x=>x.sourceId===p.id).every(x=>x.excluded));assert(w.document.querySelector('#p0').hasAttribute('data-mb-skipped'));assert.equal(t.prefs.semanticExamples['example.com'].filter(x=>x.h===p.text.toLowerCase()).length,0);assert.equal(t.prefs.semanticExamples['example.com'].length,1);
 const idx=t.reading.passages.findIndex(x=>x.sourceId===p.id);t.excludePassage(idx);await wait(30);assert.equal(p.override,'keep');assert(!w.document.querySelector('#p0').hasAttribute('data-mb-skipped'));assert.equal(t.prefs.semanticExamples['example.com'].length,1);await t.undoPassageCorrection();assert.equal(p.override,'skip');assert.equal(t.prefs.semanticExamples['example.com'][0].d,'skip');
 // In-flight training cannot overwrite an undo.
 let finish;const real=t.semantic.extractor;t.semantic.extractor=async xs=>await new Promise(r=>{finish=()=>r({tolist:()=>xs.map(()=>[0,1])});});
 const pending=t.correctPassage(p,'keep');await wait(0);await t.undoPassageCorrection();finish();await pending;assert.equal(p.override,'skip');assert.equal(t.prefs.semanticExamples['example.com'][0].d,'skip');t.semantic.extractor=real;
 // Gray styling preserves unrelated inline style changes; review unhides collapsed content.
 t.prefs.hideSkipped=true;t.renderPagePassages();assert.equal(p.element.style.display,'none');p.element.style.color='red';t.setPageReview(true);assert.notEqual(p.element.style.display,'none');assert.equal(p.element.style.color,'red');t.setPageReview(false);
 t.beginFilterReview();assert.notEqual(p.element.style.display,'none');assert(!p.element.hasAttribute('data-mb-skipped'));t.endFilterReview();assert.equal(p.element.style.display,'none');
 // Real MutationObserver updates appended and edited content, invalidates stale source text.
 const added=w.document.createElement('p');added.textContent='A newly inserted observation from a dynamically updated article.';w.document.querySelector('article').append(added);await wait(550);assert(t.passageStore.records.some(p=>p.element===added));
 const before=p.id;p.element.textContent='Changed source wording should never replay old cached content.';await wait(550);assert(!t.passageStore.byId.has(before));assert(t.reading.passages.filter(x=>x.sourceId===before).every(x=>x.excluded));
 // Every passage is classified, including batches after the first 24; manual overrides survive.
 t.prefs.semanticAuto=true;await t.runSemanticScan();await t.runSemanticScan();assert(t.passageStore.records.every(p=>p.analyzedRevision>=0));t.prefs.semanticAuto=false;for(const p of t.passageStore.records){p.analysis={excluded:false,reason:'Test article',model:'Test'};p.override=null;}
 // Buffering resumes automatically; skipping a queued passage avoids its paid request.
 t.openReader();const enabled=t.reading.passages.filter(x=>!x.excluded);const first=enabled[0],second=enabled[1],third=enabled[2];const job=t.prepareReading();await wait(20);assert.equal(requests.length,1);resolveSpeech();await wait(20);assert.equal(requests.length,2);
 await t.correctPassage(t.passageStore.byId.get(third.sourceId),'skip');t.audio.dispatchEvent(new w.Event('ended'));assert.notEqual(t.reading.waitingIndex,null);resolveSpeech();await wait(20);assert.equal(t.reading.waitingIndex,null);assert.equal(t.reading.index,t.reading.passages.indexOf(second));assert(!requests.some(s=>s.includes(third.text)));
 await t.handleAction('stop');resolveSpeech();await job;
 // Passage text is an actual keyboard-operable button wired through delegation.
 assert(w.document.querySelector('[data-mb-host]').shadowRoot.querySelector('button.mb-pass-text'));
 console.log('Pipeline PASS: real extraction mapping, migration, shared corrections, undo race, restoration, dynamic DOM, multi-batch classification, buffering, skipped-request protection');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
