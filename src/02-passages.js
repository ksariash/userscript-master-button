// One page-scoped ledger. Views never classify or own copies of passage decisions.
const passageStore={records:[],byElement:new WeakMap(),byId:new Map(),nextId:1,epoch:0,review:false,undo:[],selectedId:null,extractor:'Not extracted',error:'',url:location.href};
const PASSAGE_SELECTOR='p,h1,h2,h3,h4,blockquote,li,pre,figcaption';
function passageAnalysis(p){
 const base=p.analysis||{excluded:false,reason:'Not classified',model:'Unavailable',source:'no inference',score:null};
 const ownedHidden=[...hidden,...(state.reviewHidden||[])].find(([el])=>p.element&&(el===p.element||el.contains(p.element)));
 const rule=filterEnabled()?p.ruleReason:null;
 const owned=ownedHidden?.[1],ownedActive=owned&&(owned.owner==='site'?cleanupEnabled():filterEnabled());
 const automaticReason=rule||(ownedActive&&(!owned.reason.startsWith('Custom rule:')||p.ruleReason)?owned.reason:null);
 if(p.override!==null)return {...base,excluded:p.override==='skip',reason:`You ${p.override==='skip'?'skipped':'kept'} this passage`,source:'Your explicit choice'};
 if(automaticReason)return {...base,excluded:true,reason:automaticReason,source:'Saved page rule'};
 return {...base,excluded:filterEnabled()&&!!base.excluded};
}
function passageExcluded(p){return passageAnalysis(p).excluded;}
function passageReason(p){return passageAnalysis(p).reason;}
function refreshRuleEvidence(){
 const rules=activeRules();
 for(const p of passageStore.byId.values()){
  p.ruleReason=null;if(!p.element)continue;
  for(const rule of rules){
   let match;try{match=p.element.closest?.(rule.selector);}catch{continue;} // Invalid legacy selectors fail conservatively.
   if(match&&!protectedNode(match)){p.ruleReason=`Custom rule: ${rule.selector}`;break;}
  }
 }
}
function classifyPassage(p,model=null){
 const structure=inspectPassage(p.text,p.element);
 const removed=p.extraction==='Outside extracted content';
 const extractionKnown=passageStore.extractor==='Defuddle 0.19.5';
 // Extraction alone is never an exclusion. Corroborate rejected blocks with specific clutter evidence.
 const structuralSkip=structure.explicitCopy||(extractionKnown&&removed&&structure.excluded);
 const protectedByLearning=model?.source==='your Keep example';
 const excluded=!!model?.excluded||(!protectedByLearning&&structuralSkip);
 const structuralReason=excluded&&!model?.excluded;
 return {...(model||{model:'Heuristic',score:null}),excluded,
  reason:structuralReason?structure.reason:model?.reason||(removed?'Retained for review outside extracted article':'Article text'),
  source:structuralReason?(removed?'Defuddle + structural evidence':'Explicit promotional copy'):model?.source||'Defuddle article structure',
  extraction:p.extraction,structuralReason:structure.reason,uncertain:!excluded&&!protectedByLearning&&removed};
}
function classificationRecords(){
 const records=new Map(passageStore.records.map(p=>[p.id,p]));
 for(const chunk of reading.passages){const p=passageStore.byId.get(chunk.sourceId);if(p)records.set(p.id,p);}
 return [...records.values()];
}
function passageRecord(element){return element?passageStore.byElement.get(element):null;}
function resetPassageStore(){
 for(const p of passageStore.records){restorePassageStyle(p);p.element.removeAttribute('data-mb-review-target');}
 passageStore.review=false;state.filterReview=false;state.reviewHidden=null;stopPreview();if(picker){document.removeEventListener('click',picker,true);picker=null;}
 passageStore.records=[];passageStore.byElement=new WeakMap();passageStore.byId.clear();passageStore.epoch++;passageStore.undo=[];passageStore.selectedId=null;state.pageSelected=null;state.whySource=null;passageStore.url=location.href;
}
function refreshPassages(){
 if(passageStore.url!==location.href){stopPlayback(true);reading.passages=[];resetPassageStore();}
 const roots=[...document.querySelectorAll('article,[itemprop="articleBody"],main,[role="main"]')];
 const root=roots.sort((a,b)=>text(b.textContent).length-text(a.textContent).length)[0]||document.body;
 if(!root)return [];
 let nodes=[...root.querySelectorAll(PASSAGE_SELECTOR)].filter(el=>text(el.textContent).length>=8&&!el.querySelector(PASSAGE_SELECTOR)&&!el.closest('nav,header,footer,[data-mb-host],script,style,textarea,[contenteditable="true"]'));
 // Plain body/main roots never become grayable passages; users can select or paste unstructured text.
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
  passageStore.byId.set(p.id,p);old.delete(p);return p;
 });
 for(const p of old){restorePassageStyle(p);if(passageStore.byElement.get(p.element)===p)passageStore.byElement.delete(p.element);passageStore.byId.delete(p.id);}
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
  const evidence=retained.has(p.id)?'Retained by Defuddle':retained.size?'Outside extracted content':'Extraction unavailable';
  if(p.extraction!==evidence){p.extraction=evidence;p.analyzedRevision=-1;}
  p.analysis=classifyPassage(p,p.modelAnalysis||null);
 }
 passageStore.epoch++;refreshRuleEvidence();syncPassageViews();reconcilePlayback();return passageStore.records;
}
function restorePassageStyle(p){
 if(!p.element)return;
 if(p.originalDisplay!==null){const old=p.originalDisplay;if(old.value)p.element.style.setProperty('display',old.value,old.priority);else p.element.style.removeProperty('display');p.originalDisplay=null;}
 p.element.removeAttribute('data-mb-skipped');
}
function renderPagePassages(){
 for(const p of passageStore.records){
  restorePassageStyle(p);
  if(!p.element.isConnected||(!filterEnabled()&&p.override===null)||(state.filterReview&&!passageStore.review)||!passageExcluded(p))continue;
  p.element.setAttribute('data-mb-skipped','');
  // Preserve geometry and text. Collapsing is an explicit secondary preference.
  if(prefs.hideSkipped&&!passageStore.review&&!hidden.has(p.element)&&!protectedNode(p.element)){p.originalDisplay={value:p.element.style.getPropertyValue('display'),priority:p.element.style.getPropertyPriority('display')};p.element.style.setProperty('display','none','important');}
 }
 renderPageControls();
}
function syncPassageViews(){
 for(const p of reading.passages){const source=passageStore.byId.get(p.sourceId);if(!source){if(p.sourceId){p.excluded=true;p.reason='Source changed; re-extract to include updated text.';}continue;}p.excluded=passageExcluded(source);p.manual=source.override!==null;p.reason=passageReason(source);p.analysis=passageAnalysis(source);}
 renderPagePassages();render();
}
async function correctPassage(p,decision,options={}){
 if(!['keep','skip'].includes(decision))return false;
 const sample=options.sample||p?.text;if(!sample)throw Error('Select text first.');
 if(p){state.pageSelected=p.id;passageStore.selectedId=p.id;}
 const h=tokenHash(embeddingInput(sample).toLowerCase()),domain=domainKey();
 if(!p||p.override!==decision||options.sample){
  passageStore.undo.push({id:p?.id||null,override:p?.override??null,h,domain,example:vectorsForSite(domain).find(x=>x.h===h)});
  passageStore.undo=passageStore.undo.slice(-30);
 }
 if(p){
  if(decision==='keep'&&p.element)for(const el of [...hidden.keys()])if(el===p.element||el.contains(p.element))showNode(el);
  p.override=decision;p.revision++;
 }
 updateSite();syncPassageViews();reconcilePlayback();
 try{return await teachSemantic(sample,decision,options.reason||(decision==='keep'?'article':'offtopic'),p?.element||options.element);}
 catch(e){if(options.reportError)throw e;notify('Choice applied. Learning unavailable; retry from Filter.');return false;}
}
async function undoPassageCorrection(){
 let item,p;
 while(passageStore.undo.length){item=passageStore.undo.pop();p=item.id&&passageStore.byId.get(item.id);if(!item.id||p)break;item=null;}
 if(!item)return;
 cancelTraining(item.domain,item.h);if(p){p.override=item.override;p.revision++;}
 const examples=vectorsForSite(item.domain).filter(x=>x.h!==item.h);if(item.example)examples.push(item.example);
 prefs.semanticExamples[item.domain]=examples.slice(-24);
 await saveSettings();resetSemanticReview();updateSite();syncPassageViews();reconcilePlayback();
}
async function resetSiteLearning(){
 const domain=domainKey();
 for(const key of trainingVersions.keys())if(key.startsWith(domain+'|'))trainingVersions.set(key,trainingVersions.get(key)+1);
 delete prefs.semanticExamples[domain];delete prefs.learning[domain];
 // An old Undo must not resurrect prototypes that the user intentionally reset.
 passageStore.undo=passageStore.undo.filter(x=>x.domain!==domain);
 await saveSettings();resetSemanticReview();updateSite();syncPassageViews();reconcilePlayback();
}
function setPageReview(on){
 if(on){refreshPassages();beginFilterReview();}
 passageStore.review=on;if(!on)endFilterReview();state.view='';renderPagePassages();render();scheduleSemanticScan();
}
function selectReviewPassage(id,scroll=false){
 const p=passageStore.byId.get(id);if(!p?.element)return;
 passageStore.selectedId=id;state.pageSelected=id;
 if(scroll)p.element.scrollIntoView({block:'center',behavior:'auto'});
 renderPageControls();
}
function renderPageControls(){
 if(!host)return;
 let layer=host.shadowRoot.querySelector('.mb-page-controls');
 if(!layer){layer=document.createElement('div');layer.className='mb-page-controls';host.shadowRoot.append(layer);}
 for(const p of passageStore.records)p.element.removeAttribute('data-mb-review-target');
 if(!passageStore.review||state.view){layer.replaceChildren();return;}
 let bar=layer.querySelector('.mb-review-bar');
 if(!bar){
  bar=document.createElement('div');bar.className='mb-review-bar';
  bar.innerHTML='<div class="mb-review-picker" hidden><select id="mb-review-passage" aria-label="Choose passage to review"></select><button type="button" data-action="page-selected-toggle">Skip</button></div><div class="mb-review-actions"><span>Review passages</span><button type="button" data-action="page-why">Why</button><button type="button" data-action="page-undo">Undo</button><button type="button" data-action="page-review-end">Done</button></div>';
  layer.append(bar);
 }
 const viewport=window.visualViewport,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight,top=viewport?.offsetTop||0,left=viewport?.offsetLeft||0;
 const markers=new Map([...layer.querySelectorAll('.mb-page-toggle')].map(b=>[b.dataset.sourceId,b]));
 const visible=[];let lastBottom=top-46,needsPicker=false;
 for(const p of passageStore.records){
  const r=p.element.getBoundingClientRect();
  if(!r.width||!r.height||r.bottom<top||r.top>top+h-102)continue;
  visible.push(p);
  const rightMargin=left+w-r.right>=48,leftMargin=r.left-left>=48;
  const x=rightMargin?r.right+2:leftMargin?r.left-46:null;
  const y=Math.max(top+2,r.top,lastBottom+2);
  // Crowded and edge-to-edge text uses the native passage chooser, never a target over text.
  if(x===null||y+44>r.bottom+6){needsPicker=true;continue;}
  if(y+44>top+h-106)continue;
  let b=markers.get(p.id);
  if(!b){b=document.createElement('button');b.type='button';b.className='mb-page-toggle';b.dataset.sourceId=p.id;layer.insertBefore(b,bar);}
  markers.delete(p.id);b.dataset.action='page-toggle:'+p.id;
  b.style.left=x+'px';b.style.top=y+'px';
  b.setAttribute('aria-label',`${passageExcluded(p)?'Keep':'Skip'} passage: ${p.text.slice(0,65)}`);
  b.setAttribute('aria-pressed',String(passageExcluded(p)));b.textContent=passageExcluded(p)?'✓':'−';lastBottom=y+44;
 }
 for(const b of markers.values())b.remove();
 const selected=passageStore.byId.get(passageStore.selectedId);
 if(needsPicker&&(!selected||!selected.element.isConnected))selectReviewPassageInitial(visible[0]||passageStore.records[0]);
 const active=passageStore.byId.get(passageStore.selectedId);
 if(active?.element)active.element.setAttribute('data-mb-review-target','');
 const picker=bar.querySelector('.mb-review-picker');picker.hidden=!needsPicker;
 const sel=bar.querySelector('select'),signature=passageStore.records.map(p=>p.id).join(',');
 if(sel.dataset.signature!==signature){
  sel.replaceChildren(...passageStore.records.map((p,i)=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${i+1} · ${p.text.slice(0,48)}`;return o;}));sel.dataset.signature=signature;
 }
 if(active)sel.value=active.id;
 const toggle=bar.querySelector('[data-action="page-selected-toggle"]');toggle.disabled=!active;toggle.textContent=active&&passageExcluded(active)?'Keep':'Skip';
 bar.querySelector('[data-action="page-why"]').disabled=!active;
 bar.querySelector('[data-action="page-undo"]').disabled=!passageStore.undo.length;
}
function selectReviewPassageInitial(p){if(p){passageStore.selectedId=p.id;state.pageSelected=p.id;}}
let pageControlFrame=0;
function schedulePageControls(){if(pageControlFrame)return;pageControlFrame=requestAnimationFrame(()=>{pageControlFrame=0;renderPageControls();});}
