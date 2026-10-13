// Decision-policy and lifecycle regressions with real bundled extraction and fake vectors.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const article=Array.from({length:12},(_,i)=>`<p id="a${i}">Researchers measured solar cell performance over the winter, comparing the field data with laboratory observations and carefully documenting the findings. Experiment ${i}.</p>`).join('');
 const dom=new JSDOM(`<html><head><title>Research</title></head><body><main><article><h1>Research report</h1>${article}<aside class="related"><p id="promo">Browse these other scientific reports from our partners.</p></aside></article></main></body></html>`,{url:'https://example.com/research',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.CSS={escape:x=>String(x)};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 w.Audio=class extends w.EventTarget{constructor(){super();this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){}removeAttribute(){this.src='';}getAttribute(){return this.src;}};
 const saved={};w.GM={getValue:async(k,d)=>k.endsWith(':azure')?'fake':{semanticAuto:false},setValue:async(k,v)=>saved[k]=JSON.parse(JSON.stringify(v))};
 const src=fs.readFileSync(path.join(__dirname,'../dist/master-button.user.js'),'utf8'),end=src.lastIndexOf('\n})();');
 const expose='\nwindow.T={passageStore,semantic,reading,classifyPassage,passageExcluded,passageRecord,correctPassage,undoPassageCorrection,resetSiteLearning,refreshPassages,updateSite,setFiltering,openReader,beginFilterReview,endFilterReview,handleAction,teachSemantic,detachedPassages,runSemanticScan,get prefs(){return prefs;},get state(){return state;}};';w.eval(src.slice(0,end)+expose+src.slice(end));await wait(30);const t=w.T;
 t.semantic.extractor=async xs=>({tolist:()=>xs.map(()=>[1,0,0])});t.semantic.status='ready';
 const prose=t.passageRecord(w.document.querySelector('#a0')),promo=t.passageRecord(w.document.querySelector('#promo'));
 assert.equal(t.passageStore.extractor,'Defuddle 0.19.5');assert.equal(prose.extraction,'Retained by Defuddle');
 assert.equal(promo.extraction,'Outside extracted content');assert(t.passageExcluded(promo),'Extraction and component evidence jointly exclude clutter');
 const noMatch={excluded:false,source:'no match',reason:'No close match',model:'MiniLM',score:.1};
 assert(t.classifyPassage(promo,noMatch).excluded);
 assert(!t.classifyPassage({...promo,extraction:'Retained by Defuddle'},noMatch).excluded,'Retained prose must not be discarded from a class name alone');
 assert(!t.classifyPassage({...prose,extraction:'Outside extracted content'},noMatch).excluded,'Extraction rejection alone must fail open');
 assert(!t.classifyPassage(promo,{...noMatch,source:'your Keep example'}).excluded,'Learned Keep protects against weak structural evidence');
 // CSS-rule exclusions are shared even while preview temporarily reveals the source.
 t.prefs.rules['example.com']=[{type:'css',selector:'#a1',enabled:true}];t.updateSite();t.openReader();const ruled=t.passageRecord(w.document.querySelector('#a1'));
 assert(t.passageExcluded(ruled));assert(t.reading.passages.filter(p=>p.sourceId===ruled.id).every(p=>p.excluded));
 t.beginFilterReview();assert.notEqual(ruled.element.style.display,'none');assert(t.passageExcluded(ruled));t.setFiltering(false);assert(!t.passageExcluded(ruled),'Disabled rules must not survive through a preview snapshot');t.setFiltering(true);t.endFilterReview();assert.equal(ruled.element.style.display,'none');
 await t.correctPassage(ruled,'keep');assert(!t.passageExcluded(ruled));assert.notEqual(ruled.element.style.display,'none');await t.undoPassageCorrection();assert(t.passageExcluded(ruled));assert.equal(ruled.element.style.display,'none');
 t.setFiltering(false);assert(!t.passageExcluded(ruled));t.setFiltering(true);
 // Teaching routes through the same correction and Undo operation, exactly one prototype.
 t.state.selectionText=prose.text;t.state.selectionElement=prose.element;t.state.view='teach';await t.handleAction('teach-skip');assert.equal(prose.override,'skip');assert(t.passageStore.undo.length);await t.undoPassageCorrection();assert.equal(prose.override,null);
 // Empty/detached selection teaching still has reversible learning.
 await t.correctPassage(null,'skip',{sample:'Recommended for you, read these other articles.',reason:'related'});const count=t.prefs.semanticExamples['example.com'].length;await t.undoPassageCorrection();assert.equal(t.prefs.semanticExamples['example.com'].length,count-1);
 // Reset cancels pending learning and cannot be undone into obsolete prototypes.
 let finish;const real=t.semantic.extractor;t.semantic.extractor=async xs=>new Promise(resolve=>finish=()=>resolve({tolist:()=>xs.map(()=>[1,0,0])}));
 const pending=t.correctPassage(prose,'keep');await wait(0);await t.resetSiteLearning();assert.equal(prose.override,'keep');assert.equal(t.passageStore.undo.length,0);finish();await pending;assert.equal(t.prefs.semanticExamples['example.com'],undefined);t.semantic.extractor=real;
 // Removed/reinserted nodes always receive a usable source record; changed nodes update mapping.
 const node=w.document.querySelector('#a3'),old=t.passageRecord(node).id;node.remove();t.refreshPassages();assert(!t.passageStore.byId.has(old));w.document.querySelector('article').append(node);t.refreshPassages();const returned=t.passageRecord(node);assert(returned&&t.passageStore.byId.get(returned.id)===returned);
 node.textContent+=' Updated wording.';t.refreshPassages();assert(t.passageRecord(node)&&t.passageStore.byId.has(t.passageRecord(node).id));
 // Selected/pasted text uses the same classifier as page sources.
 t.reading.passages=t.detachedPassages('Recommended for you: read these other reports.');t.prefs.semanticAuto=true;
 while([...t.passageStore.records,...t.reading.passages.map(x=>t.passageStore.byId.get(x.sourceId))].some(p=>p.analyzedRevision!==t.semantic.revision))await t.runSemanticScan();
 assert(t.reading.passages[0].excluded);assert.equal(t.reading.passages[0].analysis.model,'MiniLM');t.prefs.semanticAuto=false;
 // Navigation clears page-only choices/review without deleting site settings.
 t.beginFilterReview();t.passageStore.review=true;w.history.pushState({},'', '/next');t.refreshPassages();assert(!t.passageStore.review);assert(!t.state.filterReview);assert.equal(t.reading.passages.length,0);assert(t.prefs.rules['example.com'].length);
 dom.window.close();console.log('Stabilization PASS: extraction-aware policy, shared rule/preview decisions, teaching Undo, pending reset, node reinsertion and navigation');
})().catch(e=>{console.error(e);process.exitCode=1;});
