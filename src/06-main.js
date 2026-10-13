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
