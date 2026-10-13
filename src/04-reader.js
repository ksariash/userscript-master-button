let reading={passages:[],index:0,generation:0,preparing:false,playing:false,autoplay:false,waitingIndex:null,wantsPlay:false,preflight:false,aborts:new Set(),sampleCache:new Map()};
let audioMode='article';const audio=new Audio();audio.preload='auto'; audio.playsInline=true;
let lastAudioURL=null;
const MIME_MP3='audio/mpeg';
function revokeAudioURL(){if(lastAudioURL){URL.revokeObjectURL(lastAudioURL);lastAudioURL=null;}}
function chunksForRecord(p){return chunkText(p.text).map(t=>({text:t,sourceId:p.id,element:p.element,excluded:passageExcluded(p),manual:p.override!==null,reason:passageReason(p),analysis:p.analysis,blob:null,status:'idle'}));}
function detachedPassages(value){
 return chunkText(value).flatMap(t=>{const p={id:'text-'+passageStore.nextId++,text:t,element:null,override:null,revision:0,analyzedRevision:-1,extraction:'User-provided text',analysis:{excluded:false,reason:'Edited or selected text',model:'Manual',source:'Your text',score:null}};passageStore.byId.set(p.id,p);return chunksForRecord(p);});
}
function discoverPassages(){
 refreshPassages();const selection=text(window.getSelection()?.toString()||'');
 if(selection.length>2){const exact=passageStore.records.find(p=>p.text===selection);return exact?chunksForRecord(exact):detachedPassages(selection);}
 return passageStore.records.flatMap(chunksForRecord);
}
function openReader(){stopPlayback(true);reading.passages=discoverPassages();reading.index=0;state.readerEditing=false;if(!reading.passages.length)notify('No article text found. Select text first, or paste text in the reader.');openView('reader');if(semantic.extractor)void reclassifyTranscript().catch(e=>notify(e.message));}
function readerPlain(){return reading.passages.filter(p=>!p.excluded).map(p=>p.text).join('\n\n');}
function replaceReaderText(v){stopPlayback(true);reading.passages=detachedPassages(v);reading.index=0;state.readerEditing=false;render();}
function excludePassage(i){
 const chunk=reading.passages[i],p=chunk&&passageStore.byId.get(chunk.sourceId);if(!p)return;
 void correctPassage(p,passageExcluded(p)?'keep':'skip');
}
function reconcilePlayback(){
 if(reading.passages[reading.index]?.excluded){
  const resume=reading.wantsPlay;stopAudioOnly();const n=nextEnabled(reading.index+1);
  reading.waitingIndex=n>=0?n:null;reading.wantsPlay=resume&&n>=0;
 }
 if(reading.waitingIndex!==null&&reading.passages[reading.waitingIndex]?.excluded){const n=nextEnabled(reading.waitingIndex+1);reading.waitingIndex=n<0?null:n;}
 if(reading.wantsPlay&&reading.waitingIndex!==null&&reading.passages[reading.waitingIndex]?.blob){const n=reading.waitingIndex;reading.waitingIndex=null;void playPassage(n).catch(()=>notify('Tap Play to resume.'));}
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
function stopPlayback(invalidate=false){if(invalidate){reading.generation++;for(const c of reading.aborts){try{c.abort?.();}catch{}}reading.aborts.clear();reading.preparing=false;reading.autoplay=false;reading.preflight=false;for(const p of reading.passages)if(p.status==='preparing')p.status='idle';}reading.waitingIndex=null;reading.wantsPlay=false;stopAudioOnly();}
function enabledIndices(){return reading.passages.map((p,i)=>!p.excluded?i:-1).filter(i=>i>=0);}
function nextEnabled(from){return enabledIndices().find(i=>i>=from)??-1;}
async function prepareReading(){
 if(reading.preparing||reading.preflight)return;
 const job=++reading.generation;reading.preflight=true;
 try{
  if(!azureKey){openView('speech');return;}
  if(prefs.semanticAuto&&filterEnabled()){
   try{await loadSemantic();await ensureSemanticSeeds();
    while(job===reading.generation&&classificationRecords().some(p=>p.analyzedRevision!==semantic.revision)){
     if(semantic.running)await new Promise(resolve=>setTimeout(resolve,30));else if(await runSemanticScan()===false)throw Error('Classification unavailable');
     if(state.filterReview||!prefs.semanticAuto||!filterEnabled())break;
    }}catch(e){notify('Model unavailable. Review passages or turn Local AI off before preparing.');openView('filter');return;}
  }
  if(job!==reading.generation)return;
  const first=nextEnabled(0);if(first<0){notify('No enabled passages.');return;}
  reading.preparing=true;reading.wantsPlay=true;reading.waitingIndex=first;render();reconcilePlayback();
  // Re-evaluate inclusion immediately before each paid request, not from a stale snapshot.
  for(let i=0;i<reading.passages.length;i++){
   if(job!==reading.generation)break;
   const p=reading.passages[i];if(p.excluded||p.blob)continue;
   p.status='preparing';render();let request=null;
   try{
    const blob=await azureSynthesize(p.text,req=>{request=req;reading.aborts.add(req);});
    if(job!==reading.generation)break;
    p.blob=blob;p.status='ready';reconcilePlayback();render();
   }catch(e){if(job!==reading.generation)break;p.status='error';p.error=e.message;notify(`Passage ${i+1}: ${e.message}`);break;}
   finally{if(request)reading.aborts.delete(request);}
  }
 }finally{if(job===reading.generation){reading.preparing=false;reading.preflight=false;render();}}
}
async function playPassage(i){audioMode='article';reading.wantsPlay=true;reading.waitingIndex=null;const p=reading.passages[i];if(!p||p.excluded)return;reading.index=i;stopAudioOnly();if(!p.blob){notify('This passage is not ready yet.');render();return;}
 lastAudioURL=URL.createObjectURL(p.blob);audio.src=lastAudioURL;audio.playbackRate=prefs.playbackRate;try{await audio.play();reading.playing=true;render();}catch(e){reading.playing=false;reading.wantsPlay=false;render();throw e;}
}
audio.addEventListener('ended',()=>{
 reading.playing=false;if(audioMode==='demo'){render();return;}
 const n=nextEnabled(reading.index+1);
 if(n>=0){reading.waitingIndex=n;reconcilePlayback();}else{reading.wantsPlay=false;reading.waitingIndex=null;notify('Finished reading.');}render();
});
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
function pauseResume(){
 if(reading.wantsPlay&&(!audio.paused||reading.waitingIndex!==null)){reading.wantsPlay=false;audio.pause();render();return;}
 reading.wantsPlay=true;
 if(reading.waitingIndex!==null){reconcilePlayback();render();return;}
 if(audio.paused&&audio.getAttribute('src')&&!reading.passages[reading.index]?.excluded){audio.play().catch(e=>{reading.wantsPlay=false;notify('Tap again to allow playback.');});}
 else{const i=nextEnabled(reading.index);if(i>=0&&reading.passages[i].blob)void playPassage(i).catch(e=>notify(e.message));else void prepareReading();}
}
async function jumpTo(i){const p=reading.passages[i];if(!p||p.excluded)return;if(p.blob){await playPassage(i);}else notify('Passage still preparing.');}
function transcriptFile(withTimings=false){let v='';for(const [i,p] of reading.passages.entries()){if(p.excluded)continue;v+=withTimings?`[Passage ${i+1}${Number.isFinite(p.duration)?' · '+Math.round(p.duration)+'s':''}]\n`:'';v+=p.text+'\n\n';}return new Blob([v],{type:'text/plain;charset=utf-8'});}
// Strip leading ID3 metadata per chunk. MP3 frame joining is best-effort, not guaranteed gapless.
async function combineMp3(){const generation=reading.generation,pass=reading.passages.filter(p=>!p.excluded),blobs=pass.map(p=>p.blob);if(pass.some(p=>!p.blob))throw Error('Prepare every enabled passage before exporting audio.');if(!pass.length)throw Error('No enabled passages.');
 const parts=[];for(const p of pass){let b=new Uint8Array(await p.blob.arrayBuffer());if(b.length>10&&b[0]===73&&b[1]===68&&b[2]===51){const size=(b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9];b=b.slice(size+10);}if(b.length<3||b[0]!==255||(b[1]&224)!==224)throw Error('Azure returned a format that cannot be joined as MP3.');parts.push(b);}
 const current=reading.passages.filter(p=>!p.excluded);if(generation!==reading.generation||current.length!==pass.length||current.some((p,i)=>p!==pass[i]||p.blob!==blobs[i]))throw Error('Passages changed during export. Export again.');return new Blob(parts,{type:MIME_MP3});
}
async function downloadBlob(blob,name){const file=new File([blob],name,{type:blob.type||'application/octet-stream'});
 if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:name});return;}catch(e){if(e.name==='AbortError')return;}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=name;a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('Used browser download fallback.');
}
async function exportAudio(){try{state.exporting=true;render();const b=await combineMp3();await downloadBlob(b,'master-button-reading.mp3');}catch(e){notify(e.message);}finally{state.exporting=false;render();}}
function setMediaSession(){if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:document.title||'Article narration',artist:location.hostname});navigator.mediaSession.setActionHandler('play',()=>pauseResume());navigator.mediaSession.setActionHandler('pause',()=>{reading.wantsPlay=false;audio.pause();});navigator.mediaSession.setActionHandler('nexttrack',()=>{const n=nextEnabled(reading.index+1);if(n>=0)jumpTo(n);});navigator.mediaSession.setActionHandler('previoustrack',()=>{const n=enabledIndices().filter(i=>i<reading.index).pop();if(n!==undefined)jumpTo(n);});}catch{}}
setMediaSession();


function invalidatePreparedAudio(){stopPlayback(true);for(const p of reading.passages){p.blob=null;p.status='idle';delete p.duration;}render();}
