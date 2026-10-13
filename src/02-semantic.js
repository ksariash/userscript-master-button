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
