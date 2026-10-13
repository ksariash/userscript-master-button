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
function openReader(){stopPlayback(true);reading.passages=discoverPassages();reading.index=0;state.readerEditing=false;if(!reading.passages.length)notify('No article text found. Select text first, or paste text in the reader.');openView('reader');if(semantic.extractor)void reclassifyTranscript().catch(e=>notify(e.message));}
function readerPlain(){return reading.passages.filter(p=>!p.excluded).map(p=>p.text).join('\n\n');}
function replaceReaderText(v){stopPlayback(true);reading.passages=chunkText(v).map(t=>({text:t,element:null,excluded:false,reason:'Edited text',blob:null,status:'idle'}));reading.index=0;state.readerEditing=false;render();}
function excludePassage(i){const p=reading.passages[i];if(!p)return;stopPlayback(true);p.excluded=!p.excluded;p.reason=p.excluded?'You skipped this passage':'You kept this passage';learnPassage(p.text,p.excluded?'skip':'keep');void teachSemantic(p.text,p.excluded?'skip':'keep',p.excluded?'offtopic':'article',p.element).catch(e=>notify('Local model: '+e.message));reading.passages.forEach(t=>{t.status='idle';});render();}
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
