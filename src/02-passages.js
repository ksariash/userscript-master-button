// One page-scoped ledger. Views never classify or own copies of passage decisions.
const passageStore={records:[],byElement:new WeakMap(),byId:new Map(),nextId:1,epoch:0,review:false,undo:[],extractor:'Not extracted',error:'',url:location.href};
const PASSAGE_SELECTOR='p,h1,h2,h3,h4,blockquote,li,pre,figcaption';
function passageExcluded(p){return p.override!==null?p.override==='skip':filterEnabled()&&!!p.analysis?.excluded;}
function passageReason(p){return p.override!==null?`You ${p.override==='skip'?'skipped':'kept'} this passage`:p.analysis?.reason||'Article text';}
function passageRecord(element){return element?passageStore.byElement.get(element):null;}
function resetPassageStore(){
 for(const p of passageStore.records)restorePassageStyle(p);
 passageStore.records=[];passageStore.byElement=new WeakMap();passageStore.byId.clear();passageStore.epoch++;passageStore.undo=[];passageStore.url=location.href;
}
function refreshPassages(){
 if(passageStore.url!==location.href){stopPlayback(true);reading.passages=[];resetPassageStore();}
 const roots=[...document.querySelectorAll('article,[itemprop="articleBody"],main,[role="main"]')];
 const root=roots.sort((a,b)=>text(b.textContent).length-text(a.textContent).length)[0]||document.body;
 if(!root)return [];
 let nodes=[...root.querySelectorAll(PASSAGE_SELECTOR)].filter(el=>text(el.textContent).length>=8&&!el.querySelector(PASSAGE_SELECTOR)&&!el.closest('nav,header,footer,[data-mb-host],script,style,textarea,[contenteditable="true"]'));
 if(!nodes.length&&text(root.textContent).length>20)nodes=[root];
 const changed=nodes.length!==passageStore.records.length||nodes.some((el,i)=>passageStore.records[i]?.element!==el||passageStore.records[i]?.text!==text(el.textContent));
 if(!changed){renderPageControls();return passageStore.records;}
 const old=new Set(passageStore.records);
 passageStore.records=nodes.map(el=>{
  const value=text(el.textContent);let p=passageStore.byElement.get(el);
  if(!p||p.text!==value){
   if(p){restorePassageStyle(p);passageStore.byId.delete(p.id);}
   p={id:String(passageStore.nextId++),text:value,element:el,override:null,revision:0,analysis:null,analyzedRevision:-1,originalDisplay:null};
   passageStore.byElement.set(el,p);passageStore.byId.set(p.id,p);
  }
  old.delete(p);return p;
 });
 for(const p of old){restorePassageStyle(p);passageStore.byId.delete(p.id);}
 // IDs are applied only to the detached copy. Never rebuild live page HTML.
 const clone=document.cloneNode(true);clone.querySelectorAll('[data-mb-source]').forEach(el=>el.removeAttribute('data-mb-source'));
 const originalNodes=[...document.querySelectorAll(PASSAGE_SELECTOR)],copyNodes=[...clone.querySelectorAll(PASSAGE_SELECTOR)];
 originalNodes.forEach((el,i)=>{const p=passageRecord(el);if(p&&copyNodes[i])copyNodes[i].setAttribute('data-mb-source',p.id);});
 clone.querySelectorAll('[data-mb-host],#mb-global-style,#mb-reddit-css').forEach(el=>el.remove());
 // Our own gray/collapse styles must not become extraction evidence.
 for(const el of clone.querySelectorAll('[data-mb-source]')){const p=passageStore.byId.get(el.getAttribute('data-mb-source'));if(p&&p.originalDisplay!==null){if(p.originalDisplay.value)el.style.setProperty('display',p.originalDisplay.value,p.originalDisplay.priority);else el.style.removeProperty('display');}el.removeAttribute('data-mb-skipped');}
 let retained=new Set();
 try{
  const result=new Defuddle(clone,{url:location.href,useAsync:false,standardize:false,removeHiddenElements:false}).parse();
  const parsed=new DOMParser().parseFromString(result.content||'','text/html');
  retained=new Set([...parsed.querySelectorAll('[data-mb-source]')].map(el=>el.getAttribute('data-mb-source')));
  passageStore.extractor=retained.size?'Defuddle 0.19.5':'Structural fallback';passageStore.error=retained.size?'':'Extraction could not map this page; original passages retained.';
 }catch(e){passageStore.extractor='Structural fallback';passageStore.error='Article extraction unavailable; original passages retained.';}
 for(const p of passageStore.records){
  p.extraction=retained.has(p.id)?'Retained by Defuddle':'Outside extracted content';
  if(!p.analysis){const heuristic=inspectPassage(p.text,p.element);p.analysis={...heuristic,model:'Heuristic',source:'DOM and site rules',score:null};}
 }
 passageStore.epoch++;syncPassageViews();reconcilePlayback();return passageStore.records;
}
function restorePassageStyle(p){
 if(!p.element)return;
 if(p.originalDisplay!==null){const old=p.originalDisplay;if(old.value)p.element.style.setProperty('display',old.value,old.priority);else p.element.style.removeProperty('display');p.originalDisplay=null;}
 p.element.removeAttribute('data-mb-skipped');
}
function renderPagePassages(){
 for(const p of passageStore.records){
  restorePassageStyle(p);
  if(!p.element.isConnected||!filterEnabled()||(state.filterReview&&!passageStore.review)||!passageExcluded(p))continue;
  p.element.setAttribute('data-mb-skipped','');
  // Preserve geometry and text. Collapsing is an explicit secondary preference.
  if(prefs.hideSkipped&&!passageStore.review&&!protectedNode(p.element)){p.originalDisplay={value:p.element.style.getPropertyValue('display'),priority:p.element.style.getPropertyPriority('display')};p.element.style.setProperty('display','none','important');}
 }
 renderPageControls();
}
function syncPassageViews(){
 for(const p of reading.passages){const source=passageStore.byId.get(p.sourceId);if(!source){if(p.sourceId){p.excluded=true;p.reason='Source changed; re-extract to include updated text.';}continue;}p.excluded=passageExcluded(source);p.manual=source.override!==null;p.reason=passageReason(source);p.analysis=source.analysis;}
 renderPagePassages();render();
}
async function correctPassage(p,decision){
 if(p)state.pageSelected=p.id;
 if(!p||!['keep','skip'].includes(decision))return;
 if(p.override===decision)return;
 const h=tokenHash(embeddingInput(p.text).toLowerCase()),domain=domainKey();
 passageStore.undo.push({id:p.id,override:p.override,h,domain,example:vectorsForSite(domain).find(x=>x.h===h)});passageStore.undo=passageStore.undo.slice(-30);
 if(decision==='keep'&&p.element)for(const el of [...hidden.keys()])if(el===p.element||el.contains(p.element))showNode(el);
 p.override=decision;p.revision++;syncPassageViews();reconcilePlayback();
 try{await teachSemantic(p.text,decision,decision==='keep'?'article':'offtopic',p.element);}catch(e){notify('Choice applied. Learning unavailable; retry from Filter.');}
}
async function undoPassageCorrection(){
 const item=passageStore.undo.pop();if(!item)return;
 const p=passageStore.byId.get(item.id);if(!p)return;
 cancelTraining(item.domain,item.h);p.override=item.override;p.revision++;
 const examples=vectorsForSite(item.domain).filter(x=>x.h!==item.h);if(item.example)examples.push(item.example);prefs.semanticExamples[item.domain]=examples.slice(-24);
 semantic.revision++;await saveSettings();resetSemanticReview();syncPassageViews();reconcilePlayback();
}
function setPageReview(on){
 if(on){refreshPassages();beginFilterReview();}
 passageStore.review=on;if(!on)endFilterReview();state.view='';renderPagePassages();render();scheduleSemanticScan();
}
function renderPageControls(){
 if(!host)return;let layer=host.shadowRoot.querySelector('.mb-page-controls');
 if(!layer){layer=document.createElement('div');layer.className='mb-page-controls';host.shadowRoot.append(layer);}
 if(!passageStore.review||state.view){layer.replaceChildren();return;}
 const viewport=window.visualViewport,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight,top=viewport?.offsetTop||0,left=viewport?.offsetLeft||0;
 const fragment=document.createDocumentFragment();let lastBottom=-100;
 for(const p of passageStore.records){
  const r=p.element.getBoundingClientRect();if(!r.width||!r.height||r.bottom<top||r.top>top+h-58)continue;
  // Prefer the left margin. On edge-to-edge layouts use a compact right-edge control.
  const x=r.left-left>=48?r.left-46:Math.min(left+w-46,r.right-44);
  const y=Math.max(top+2,r.top,lastBottom+2);if(y>Math.min(r.bottom,top+h-102))continue;
  const b=document.createElement('button');b.type='button';b.className='mb-page-toggle';b.dataset.action='page-toggle:'+p.id;b.style.left=x+'px';b.style.top=y+'px';b.setAttribute('aria-label',`${passageExcluded(p)?'Keep':'Skip'} passage: ${p.text.slice(0,65)}`);b.setAttribute('aria-pressed',String(passageExcluded(p)));b.textContent=passageExcluded(p)?'✓':'−';fragment.append(b);lastBottom=y+44;
 }
 const bar=document.createElement('div');bar.className='mb-review-bar';bar.innerHTML=`<span>Review passages</span>${state.pageSelected?'<button type="button" data-action="page-why">Why</button>':''}<button type="button" data-action="page-undo" ${passageStore.undo.length?'':'disabled'}>Undo</button><button type="button" data-action="page-review-end">Done</button>`;fragment.append(bar);layer.replaceChildren(fragment);
}
let pageControlFrame=0;
function schedulePageControls(){if(pageControlFrame)return;pageControlFrame=requestAnimationFrame(()=>{pageControlFrame=0;renderPageControls();});}
