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
function embedTexts(input){
 const task=semantic.queue.catch(()=>{}).then(async()=>{
  const model=await loadSemantic(),texts=input.map(embeddingInput),out=[];
  for(let i=0;i<texts.length;i+=4){const r=await model(texts.slice(i,i+4),{pooling:'mean',normalize:true});for(const row of r.tolist())out.push(compactVector(row));}
  return out;
 });semantic.queue=task;return task;
}
async function ensureSemanticSeeds(){if(!seedVectors){const v=await embedTexts(SEMANTIC_SEEDS.map(x=>x[0]));seedVectors=v.map((vector,i)=>({vector,reason:SEMANTIC_SEEDS[i][1]}));}return seedVectors;}
function semanticDecision(vec,domain=domainKey(),contextVector=null){
 const items=prefs.learningEnabled?.[domain]===false?[]:vectorsForSite(domain);let skip={score:-1,reason:'offtopic'},keep={score:-1};
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
 semantic.revision++;
 for(const p of passageStore.records){p.analyzedRevision=-1;if(!prefs.semanticAuto)p.analysis={...inspectPassage(p.text,p.element),model:'Heuristic',source:'DOM and site rules',score:null};}
 syncPassageViews();scheduleSemanticScan();
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
const trainingVersions=new Map();
function cancelTraining(domain,h){const k=domain+'|'+h;trainingVersions.set(k,(trainingVersions.get(k)||0)+1);}
async function teachSemantic(value,decision,reason='offtopic',el=null){
 const sample=embeddingInput(value);if(sample.length<8)throw Error('Select a longer phrase.');
 const origin=domainKey(),h=tokenHash(sample.toLowerCase()),key=origin+'|'+h;
 cancelTraining(origin,h);const version=trainingVersions.get(key);
 const neighbors=el?[el.previousElementSibling,el.nextElementSibling].filter(Boolean):[];
 const context=embeddingInput([sample,...neighbors.map(n=>text(n.textContent))].join(' '));
 const vectors=await embedTexts(context!==sample?[sample,context]:[sample]);
 // Undo/newer choices invalidate inference that was already in flight.
 if(trainingVersions.get(key)!==version)return false;
 const examples=normalizeExamples(prefs.semanticExamples?.[origin]).filter(x=>x.h!==h);
 examples.push({h,d:decision,reason:decision==='keep'?'article':reason,v:vectors[0],contextV:vectors[1]});
 prefs.semanticExamples[origin]=examples.slice(-24);
 const persisted=await saveSettings();if(!persisted)throw Error('Learning could not be saved.');
 semantic.detail=`Ready · ${examples.length} learned examples`;resetSemanticReview();return true;
}
function scheduleSemanticScan(){
 if(!prefs.semanticAuto||!filterEnabled()||state.filterReview||semantic.running||!semantic.extractor)return;
 clearTimeout(semantic.refreshTimer);semantic.refreshTimer=setTimeout(()=>{void runSemanticScan();},450);
}
async function runSemanticScan(){
 if(semantic.running||!semantic.extractor||!prefs.semanticAuto||!filterEnabled()||state.filterReview)return;
 refreshPassages();const epoch=passageStore.epoch,revision=semantic.revision;
 const candidates=passageStore.records.filter(p=>p.analyzedRevision!==revision).slice(0,24);
 if(!candidates.length)return;
 semantic.running=true;let failed=false;
 try{
  await ensureSemanticSeeds();
  const inputs=candidates.flatMap(p=>chunkText(p.text,600));
  const contextual=vectorsForSite().some(x=>Array.isArray(x.contextV));
  const contexts=contextual?candidates.map(p=>embeddingInput([p.text,...[p.element?.previousElementSibling,p.element?.nextElementSibling].filter(Boolean).map(n=>text(n.textContent))].join(' '))):[];
  const allVectors=await embedTexts([...inputs,...contexts]),vectors=allVectors.slice(0,inputs.length),contextVectors=allVectors.slice(inputs.length);
  if(epoch!==passageStore.epoch||revision!==semantic.revision||!prefs.semanticAuto||!filterEnabled()||state.filterReview)return;
  let offset=0;
  candidates.forEach((p,index)=>{const count=chunkText(p.text,600).length,decisions=vectors.slice(offset,offset+count).map(v=>semanticDecision(v,domainKey(),contextVectors[index]));offset+=count;
   // Never gray a mixed long passage because only its first excerpt looks promotional.
   p.analysis=decisions.find(d=>!d.excluded)||decisions[0];p.analysis={...p.analysis,extraction:p.extraction};p.analyzedRevision=revision;semantic.scanned++;});
  syncPassageViews();reconcilePlayback();
 }catch(e){failed=true;semantic.detail='Filtering paused. Retry model from Filter.';return false;}
 finally{semantic.running=false;if(!failed&&passageStore.records.some(p=>p.analyzedRevision!==semantic.revision))scheduleSemanticScan();}
}
async function reclassifyTranscript(){
 if(!semantic.extractor)return;
 await runSemanticScan();syncPassageViews();
}
