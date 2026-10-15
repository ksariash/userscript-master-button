import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {readFile} from 'node:fs/promises';
import {KEY_SETUP_URL,isKeySetupURL} from '../src/platform/key-setup.mjs';
const setupHTML=await readFile('docs/setup.html','utf8');
const result=await build({entryPoints:['src/main.mjs'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'MBTest',loader:{'.css':'text'},define:{__VERSION__:'"test"',__MODEL_WORKER__:'""',__AUTO_START__:'false'}});
const fixture='<!doctype html><title>Article</title><main><article><h1>Article title</h1><p id="one">The first paragraph is original narrative.</p><aside><p id="promo">Get our newsletter. Sign up now.</p></aside><p id="two"><a href="/source">The closing paragraph keeps a source link.</a></p></article></main>';
async function setup(url='https://example.org/article'){
 const dom=new JSDOM(url===KEY_SETUP_URL?setupHTML:fixture,{url,pretendToBeVisual:true,runScripts:'dangerously'});dom.window.HTMLMediaElement.prototype.pause=()=>{};dom.window.HTMLMediaElement.prototype.load=()=>{};dom.window.eval(result.outputFiles[0].text);const values=new Map(),calls=[];
 const gm={getValue:async(k,d)=>values.get(k)??d,setValue:async(k,v)=>values.set(k,v),deleteValue:async k=>values.delete(k),setClipboard:async t=>{calls.push(['copy',t]);return true;},xmlHttpRequest:d=>{calls.push(['request',d]);return Promise.reject(new Error('Mock network unavailable'));}};
 const audio=dom.window.document.createElement('audio');audio.play=async()=>{};audio.pause=()=>{};audio.load=()=>{};
 const instance=await dom.window.MBTest.start({document:dom.window.document,gm,workerSource:'',audioFactory:()=>audio});return{dom,instance,gm,calls,values,ui:instance.app.ui,store:instance.app.store};
}
const click=(ui,action)=>ui.shadow.querySelector(`[data-action="${action}"]`).click();const tick=()=>new Promise(r=>setTimeout(r,0));
test('Userscripts injection mock: lexical GM works without globalThis.GM or an explicitly supplied API',async()=>{
 const dom=new JSDOM(fixture,{url:'https://ksariash.github.io/userscript-master-button/setup.html',runScripts:'dangerously',pretendToBeVisual:true});const values=new Map();
 const gm={getValue:async(k,d)=>values.get(k)??d,setValue:async(k,v)=>values.set(k,v)};
 assert.equal(dom.window.GM,undefined);
 const start=dom.window.Function('{GM}',`${result.outputFiles[0].text}; return MBTest.start;`)({GM:gm});
 const audio=dom.window.document.createElement('audio');audio.pause=()=>{};audio.load=()=>{};
 const instance=await start({document:dom.window.document,workerSource:'',audioFactory:()=>audio});
 assert.equal(instance.settings.persistent,true);const ui=instance.app.ui;assert.equal(ui.sheet.querySelector('#speech-key').disabled,false);
 ui.sheet.querySelector('#speech-key').value='k'.repeat(32);click(ui,'save-key');await tick();assert.equal(values.get('master-button:speech-key'),'k'.repeat(32));assert.equal(dom.window.GM,undefined);
 instance.stop();dom.window.close();
});
test('Preferences-read failure does not disable key entry; storage check, verified save and key-free report still work',async()=>{
 const dom=new JSDOM(fixture,{url:'https://ksariash.github.io/userscript-master-button/setup.html',runScripts:'dangerously',pretendToBeVisual:true});const values=new Map(),copies=[];
 const gm={getValue:async(k,d)=>{if(k==='master-button:v2')throw new Error('preferences unavailable');return values.get(k)??d;},setValue:async(k,v)=>values.set(k,v),deleteValue:async k=>values.delete(k),setClipboard:async text=>copies.push(text),info:{scriptHandler:'Userscripts',version:'4.8.2',script:{version:'2.0.0-alpha.4','inject-into':'content'}}};
 dom.window.eval(result.outputFiles[0].text);const audio=dom.window.document.createElement('audio');audio.pause=()=>{};audio.load=()=>{};const instance=await dom.window.MBTest.start({document:dom.window.document,gm,workerSource:'',audioFactory:()=>audio,version:'2.0.0-alpha.4'});
 try{const ui=instance.app.ui;assert.equal(instance.settings.startupState,'preferences-load-failed');assert.equal(ui.sheet.querySelector('#speech-key').disabled,false);assert.match(ui.sheet.querySelector('.speech-version').textContent,/alpha.4/);click(ui,'check-storage');await tick();assert.equal(instance.settings.storageCheck.state,'passed');assert.equal(values.size,0);
 ui.sheet.querySelector('#speech-key').value='k'.repeat(32);click(ui,'save-key');await tick();assert.equal(values.get('master-button:speech-key'),'k'.repeat(32));assert.equal(ui.sheet.querySelector('#speech-key').value,'');click(ui,'copy-support');await tick();assert.equal(JSON.parse(copies[0]).storage.state,'passed');assert.equal(copies[0].includes('k'.repeat(32)),false);
 }finally{instance.stop();dom.window.close();}
});
test('Mock Azure diagnostic without a saved key sends no request and reports only no-key',async()=>{
 const s=await setup();try{s.ui.open('speech');click(s.ui,'check-azure');await tick();assert.equal(s.calls.length,0);assert.equal(s.ui.azureCheck.code,'no-key');assert.equal(JSON.parse(s.ui.sheet.querySelector('#support-report').value).azure.code,'no-key');}finally{s.instance.stop();s.dom.window.close();}
});
test('Mock DOM key setup: the exact dedicated HTML URL opens a usable form and save only to extension storage',async()=>{
 {
  const s=await setup('https://ksariash.github.io/userscript-master-button/setup.html');
  assert.equal(s.ui.mode,'speech');const field=s.ui.sheet.querySelector('#speech-key');
  assert.equal(field.disabled,false);assert.equal(s.ui.sheet.querySelector('[data-action=save-key]').disabled,false);
  field.focus();assert.equal(s.ui.shadow.activeElement,field);field.value='k'.repeat(32);click(s.ui,'save-key');await tick();
  assert.equal(s.values.get('master-button:speech-key'),'k'.repeat(32));assert.equal(field.value,'');
  assert.match(s.ui.sheet.querySelector('.key-status').textContent,/stored in Userscripts/);
  assert.ok(s.calls.every(([kind,request])=>kind==='request'&&request.method==='GET'&&request.url.endsWith('/cognitiveservices/voices/list')));assert.equal(s.dom.window.localStorage.length,0);assert.equal(s.dom.window.sessionStorage.length,0);
  click(s.ui,'forget-key');await tick();assert.equal(s.values.has('master-button:speech-key'),false);
  s.instance.stop();s.dom.window.close();
 }
});
test('Mock DOM key setup: other repositories, branches, hostnames, file paths and GitHub HTML stay blocked',async()=>{
 for(const url of [KEY_SETUP_URL+'?key=dummy',KEY_SETUP_URL+'#dummy',KEY_SETUP_URL.replace('/setup.html','/other.html'),KEY_SETUP_URL.replace('ksariash.','other.'),'https://raw.githubusercontent.com/other/userscript-master-button/main/SETUP.txt','https://raw.githubusercontent.com/ksariash/userscript-master-button/refs/heads/other/SETUP.txt','https://raw.githubusercontent.com.evil.example/ksariash/userscript-master-button/main/SETUP.txt','https://raw.githubusercontent.com/ksariash/userscript-master-button/main/OTHER.txt','https://github.com/ksariash/userscript-master-button/blob/main/SETUP.txt']){
  const s=await setup(url);s.ui.open('speech');assert.equal(s.ui.sheet.querySelector('#speech-key').disabled,true);
  assert.match(s.ui.sheet.querySelector('.key-entry-state').textContent,/Open the dedicated/);
  await s.ui.click({target:s.ui.sheet.querySelector('[data-action=save-key]')});assert.equal(s.values.has('master-button:speech-key'),false);
  s.instance.stop();s.dom.window.close();
 }
});
test('Mock DOM key setup: missing extension storage permits paste and gives an adjacent save failure; setup action opens canonical document',async()=>{
 const s=await setup('https://ksariash.github.io/userscript-master-button/setup.html');
 try{s.instance.settings.persistent=false;s.ui.open('speech');const field=s.ui.sheet.querySelector('#speech-key');assert.equal(field.disabled,false);assert.match(s.ui.sheet.querySelector('.key-entry-state').textContent,/storage is unavailable/);field.value='k'.repeat(32);field.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));assert.match(s.ui.sheet.querySelector('.key-entry-state').textContent,/Key entered/);click(s.ui,'save-key');await tick();assert.match(s.ui.sheet.querySelector('.key-entry-state').textContent,/storage is unavailable/);assert.equal(field.value,'k'.repeat(32));assert.equal(s.values.has('master-button:speech-key'),false);}finally{s.instance.stop();s.dom.window.close();}
 const other=await setup();const tabs=[];other.gm.openInTab=async(...args)=>tabs.push(args);other.ui.open('speech');click(other.ui,'open-key-setup');await tick();
 assert.deepEqual(tabs,[['https://ksariash.github.io/userscript-master-button/setup.html',false]]);other.instance.stop();other.dom.window.close();
});
test('Mock DOM runtime: source Skip/Keep, reader, narration/export snapshot, late assessment and Undo share one identity',async()=>{
 const s=await setup(),p=[...s.store.records.values()].find(p=>p.source?.node.id==='promo');s.ui.open('review');s.ui.select(p.id);click(s.ui,'why');s.ui.shadow.querySelector('#remember').checked=true;click(s.ui,'correct');
 assert.equal(s.store.resolve(p.id).included,false);assert.equal(s.store.snapshot().passages.some(x=>x.id===p.id),false);assert.equal(s.store.examples.size,1);assert.ok(s.dom.window.document.querySelector('#promo [data-mb-tone]'));
 s.ui.open('reader');const node=s.ui.nodes.get(p.id);assert.equal(node.classList.contains('skipped'),true);s.store.assess(p.id,{label:'ARTICLE',validatedExclusion:true},{documentId:s.store.documentId,revision:p.revision});assert.equal(s.store.resolve(p.id).included,false);
 s.ui.select(p.id);s.ui.open('why');click(s.ui,'undo');assert.equal(node.classList.contains('skipped'),false);assert.equal(s.store.examples.size,0);assert.equal(s.store.snapshot().passages.some(x=>x.id===p.id),true);assert.equal(s.dom.window.document.querySelector('a').getAttribute('href'),'/source');
 s.instance.stop();assert.equal(s.dom.window.document.querySelector('[data-master-button="host"]'),null);s.dom.window.close();
});
test('Mock DOM runtime preserves focused drafts, expanded details, reader scroll and selection through assessment updates',async()=>{
 const s=await setup();s.ui.open('reader');const p=s.store.reading()[1];s.ui.select(p.id);s.ui.open('why');s.ui.sheet.querySelector('details').open=true;s.ui.transcript.scrollTop=123;s.store.assess(p.id,{label:'ARTICLE',reason:'Mock result'},{documentId:s.store.documentId,revision:p.revision});assert.equal(s.ui.sheet.querySelector('details').open,true);assert.equal(s.ui.transcript.scrollTop,123);
 s.ui.open('editor');const field=s.ui.sheet.querySelector('textarea');field.value='Unfinished draft';field.focus();s.store.assess(p.id,{label:'UNCERTAIN'},{documentId:s.store.documentId,revision:p.revision});assert.equal(field.value,'Unfinished draft');assert.equal(s.ui.shadow.activeElement,field);
 s.instance.stop();s.dom.window.close();
});
test('Mock DOM runtime has one instance, two launcher taps toggle, sharing does not navigate, and arbitrary-site key entry is disabled',async()=>{
 const s=await setup();click(s.ui,'launcher');assert.equal(s.ui.mode,'menu');click(s.ui,'launcher');assert.equal(s.ui.mode,'idle');assert.equal(await s.dom.window.MBTest.start({document:s.dom.window.document,gm:s.gm,workerSource:''}),null);
 const old=s.dom.window.location.href;s.ui.open('menu');click(s.ui,'share');await tick();assert.equal(s.dom.window.location.href,old);assert.equal(s.calls[0][0],'copy');s.ui.open('speech');assert.equal(s.ui.sheet.querySelector('#speech-key').disabled,true);assert.equal(s.ui.sheet.querySelector('[data-action=save-key]').disabled,true);
 s.instance.stop();s.dom.window.close();
});
test('Mock DOM runtime lets selector text be edited without recreating the form or activating site links',async()=>{
 const s=await setup();s.ui.open('rule');const field=s.ui.sheet.querySelector('#selector');field.focus();field.value='aside';field.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));assert.equal(s.ui.sheet.querySelector('#selector'),field);assert.equal(s.ui.shadow.activeElement,field);assert.equal(s.ui.picker.inspection.matches.length,1);click(s.ui,'preview-rule');assert.match(s.dom.window.document.querySelector('aside').style.outline,/2px/);click(s.ui,'cancel-rule');assert.equal(s.dom.window.document.querySelector('aside').style.outline,'');
 s.instance.stop();s.dom.window.close();
});
test('Mock runtime media browser: main-menu discovery, post title, preview, type filtering and page picker',async()=>{
 const s=await setup('https://x.com/example');try{
 s.dom.window.document.querySelector('article').insertAdjacentHTML('beforeend','<figure><figcaption>Morning light at the harbor</figcaption><a href="/photo"><img width="500" height="300" src="https://media.example/harbor.jpg"></a><video poster="https://media.example/poster.jpg" src="https://media.example/boat.mp4"></video></figure>');
 s.ui.open('menu');assert.ok(s.ui.menu.querySelector('[data-action=clean-nags]'));assert.ok(s.ui.menu.querySelector('[data-action=media]'));click(s.ui,'media');
 assert.equal(s.ui.sheet.querySelectorAll('.media-item').length,2);assert.match(s.ui.sheet.querySelector('.media-item').textContent,/Morning light/);assert.ok(s.ui.sheet.querySelector('.media-thumb img'));
 s.ui.sheet.querySelector('.media-item').click();assert.equal(s.ui.mode,'media-detail');assert.equal(s.ui.sheet.querySelector('.media-preview img').src,'https://media.example/harbor.jpg');assert.match(s.ui.sheet.querySelector('.media-title').textContent,/Morning light/);
 click(s.ui,'media-next');assert.ok(s.ui.sheet.querySelector('.media-preview video[controls]'));click(s.ui,'media');const type=s.ui.sheet.querySelector('#media-type');type.value='video';type.dispatchEvent(new s.dom.window.Event('change'));assert.equal(s.ui.sheet.querySelectorAll('.media-item').length,1);
 click(s.ui,'pick-media');assert.equal(s.ui.mediaPicker.active,true);click(s.ui,'cancel-media-pick');assert.equal(s.ui.mediaPicker.active,false);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock voice UI: regional results only, language groups, searchable labels and stale-region protection',async()=>{
 const s=await setup();try{
 await s.instance.settings.replaceKey('k'.repeat(32));const pending=new Map();s.instance.app.speech.client.voices=region=>new Promise(resolve=>pending.set(region,resolve));s.ui.open('speech');await tick();
 assert.equal(s.ui.sheet.querySelector('#voice').disabled,true);assert.equal(s.ui.sheet.querySelectorAll('#voice option[value="en-US-JennyNeural"]').length,0);
 const region=s.ui.sheet.querySelector('#region');region.value='westus2';region.dispatchEvent(new s.dom.window.Event('change'));await tick();
 const voices=[{id:'en-US-AriaNeural',name:'Aria',locale:'en-US',language:'English (United States)',gender:'Female',status:'GA'},{id:'fr-FR-DeniseNeural',name:'Denise',locale:'fr-FR',language:'French (France)',gender:'Female',status:'GA'}];pending.get('westus2')(voices);await tick();pending.get('eastus')([{id:'en-US-StaleNeural',name:'Stale',language:'English'}]);await tick();
 const select=s.ui.sheet.querySelector('#voice');assert.equal(select.querySelectorAll('optgroup').length,2);assert.equal(select.querySelectorAll('option[value="en-US-StaleNeural"]').length,0);assert.match(select.textContent,/Aria · Female/);
 select.value='en-US-AriaNeural';select.dispatchEvent(new s.dom.window.Event('change'));const search=s.ui.sheet.querySelector('#voice-search');search.value='French';search.dispatchEvent(new s.dom.window.Event('input'));assert.equal(select.querySelectorAll('optgroup').length,1);assert.equal(s.instance.settings.value.speech.voice,'en-US-AriaNeural');
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock DOM selection preserves exact whole-passage identity and labels partial fragments as unmapped',async()=>{
 const s=await setup(),p=[...s.store.records.values()].find(p=>p.source?.node.id==='one'),selection=s.dom.window.getSelection(),range=s.dom.window.document.createRange();range.selectNodeContents(p.source.node);selection.addRange(range);s.ui.open('reader');assert.equal(s.store.reading().length,1);assert.equal(s.store.reading()[0].id,p.id);s.ui.open('idle');selection.removeAllRanges();range.setStart(p.source.nodes[0],4);range.setEnd(p.source.nodes[0],9);selection.addRange(range);s.ui.open('reader');assert.equal(s.store.reading()[0].scope,'reader');assert.equal(s.store.reading()[0].source,null);s.instance.stop();s.dom.window.close();
});
test('Mock automatic exclusions, reader visibility, source Keep/Undo and transcript snapshot stay synchronized',async()=>{
 const s=await setup(),p=[...s.store.records.values()].find(p=>p.source?.node.id==='promo');
 try{s.ui.open('reader');s.store.assess(p.id,{label:'NUISANCE',validatedExclusion:true,reason:'Mock invitation result'},{documentId:s.store.documentId,revision:p.revision,evidenceRevision:p.evidenceRevision});const node=s.ui.nodes.get(p.id);assert.equal(node.hidden,true);assert.equal(s.store.snapshot().passages.some(r=>r.id===p.id),false);const revision=s.store.sequenceRevision;click(s.ui,'show-skipped');assert.equal(node.hidden,false);assert.equal(s.store.sequenceRevision,revision);
 s.ui.select(p.id);s.ui.open('why');click(s.ui,'correct');assert.equal(s.store.resolve(p.id).included,true);assert.equal(s.store.snapshot().passages.some(r=>r.id===p.id),true);assert.equal(node.classList.contains('skipped'),false);click(s.ui,'undo');assert.equal(s.store.resolve(p.id).included,false);assert.equal(node.classList.contains('skipped'),true);assert.equal(s.store.snapshot().passages.some(r=>r.id===p.id),false);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock model startup requires explicit first download; later Read starts it, and a storage failure cannot prevent Stop',async()=>{
 const s=await setup();let loads=0;
 try{s.instance.app.classifier.load=async()=>{loads++;};s.ui.open('reader');assert.equal(loads,0);click(s.ui,'reader-model');click(s.ui,'load-model');await tick();assert.equal(loads,1);assert.equal(s.instance.settings.value.modelEnabled,true);s.ui.open('idle');s.ui.open('reader');await tick();assert.equal(loads,2);s.ui.open('model');let stopped=false;s.instance.app.classifier.stop=()=>{stopped=true;};s.instance.settings.save=async()=>{throw new Error('Mock storage failure');};click(s.ui,'stop-model');await tick();assert.equal(stopped,true);assert.equal(s.instance.settings.value.modelEnabled,false);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock key entry gives immediate paste/save feedback, preserves failed input, and separates verified save from Azure failure',async()=>{
 const s=await setup('https://ksariash.github.io/userscript-master-button/setup.html');
 try{const field=s.ui.sheet.querySelector('#speech-key'),status=s.ui.sheet.querySelector('.key-entry-state');field.value='k'.repeat(32);field.dispatchEvent(new s.dom.window.Event('paste',{bubbles:true}));await tick();assert.match(status.textContent,/Key entered/);
 let verify;const originalRead=s.gm.getValue;s.gm.getValue=async(k,d)=>k==='master-button:speech-key'?new Promise(r=>verify=r):originalRead(k,d);click(s.ui,'save-key');await tick();assert.match(status.textContent,/verifying readback/);assert.equal(s.ui.sheet.querySelector('[data-action=save-key]').disabled,true);verify('wrong readback');await tick();assert.match(status.textContent,/did not retain/);assert.equal(field.value,'k'.repeat(32));assert.equal(s.ui.sheet.querySelector('[data-action=save-key]').disabled,false);
 s.gm.getValue=originalRead;click(s.ui,'save-key');await tick();await tick();assert.equal(field.value,'');assert.match(status.textContent,/Key saved and verified/);assert.match(status.textContent,/could not load voices/);assert.match(s.ui.sheet.querySelector('.voice-status').textContent,/unavailable|could not|request|network/i);assert.equal(s.dom.window.localStorage.length,0);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock bulk reader selection: range and included article, no seek during selection, synchronized Skip/Keep and one Undo',async()=>{
 const s=await setup();let seeks=0;s.instance.app.speech.play=async()=>{seeks++;};
 try{s.ui.open('reader');const rows=s.store.reading(),initial=s.store.snapshot();click(s.ui,'select-passages');assert.equal(s.ui.reader.querySelector('.player').hidden,true);click(s.ui,'selection-range');s.ui.nodes.get(rows[0].id).querySelector('.prose').click();assert.match(s.ui.reader.querySelector('.selection-status').textContent,/last passage/);s.ui.nodes.get(rows[2].id).querySelector('.prose').click();assert.equal(seeks,0);assert.equal(s.ui.selection.ids().length,3);const revision=s.store.sequenceRevision;click(s.ui,'selection-skip');assert.equal(s.store.sequenceRevision,revision+1);assert.equal(s.store.history.length,1);assert.equal(s.store.snapshot().passages.length,initial.passages.length-3);assert.ok(s.ui.nodes.get(rows[1].id).classList.contains('skipped'));click(s.ui,'undo');assert.deepEqual(s.store.snapshot().passages.map(p=>p.id),initial.passages.map(p=>p.id));
 s.store.correct(rows[1].id,'NUISANCE');click(s.ui,'selection-all');assert.equal(s.ui.selection.ids().includes(rows[1].id),false);click(s.ui,'selection-keep');const kept=s.ui.selection.ids();for(const id of kept){s.store.assess(id,{label:'NUISANCE',validatedExclusion:true},{documentId:s.store.documentId,revision:s.store.records.get(id).revision});assert.equal(s.store.resolve(id).included,true);}click(s.ui,'selection-done');assert.equal(s.ui.selection,null);assert.equal(s.ui.reader.querySelector('.player').hidden,false);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock passage range shortcuts respect page/reading scope and leave the current passage unchanged',async()=>{
 const s=await setup();
 try{s.ui.open('review');const rows=[...s.store.records.values()].filter(p=>p.scope==='page'),current=rows[2];s.ui.select(current.id);s.ui.open('why');click(s.ui,'skip-before');assert.ok(rows.slice(0,2).every(p=>!s.store.resolve(p.id).included));assert.equal(s.store.resolve(current.id).included,true);assert.equal(s.store.history.length,1);click(s.ui,'undo');assert.ok(rows.every(p=>s.store.resolve(p.id).included));
 s.store.setReading([rows[1].id,current.id,rows[3].id]);s.ui.open('reader');s.ui.select(current.id);s.ui.open('why');click(s.ui,'skip-after');assert.equal(s.store.resolve(rows[3].id).included,false);assert.equal(s.store.resolve(rows[0].id).included,true);assert.equal(s.store.resolve(current.id).included,true);click(s.ui,'undo');assert.equal(s.store.resolve(rows[3].id).included,true);
 s.ui.open('review');click(s.ui,'select-passages');assert.equal(s.ui.selection.scope,'page');assert.equal(s.ui.nodes.size,rows.length);click(s.ui,'selection-all');assert.deepEqual([...s.ui.selection.ids()],[...s.instance.app.controller.articleIds()]);click(s.ui,'selection-done');assert.equal(s.ui.base,'review');
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Mock media browser exposes a blob video without a downloadable file and keeps page navigation reachable',async()=>{
 const s=await setup('https://x.com/a');
 try{s.dom.window.document.querySelector('article').insertAdjacentHTML('beforeend','<div data-testid="videoComponent"><video src="blob:https://x.com/local" poster="https://pbs.twimg.com/ext_tw_video_thumb/123/poster.jpg"></video></div>');s.ui.open('media');const item=s.ui.mediaItems.find(m=>m.type==='video');assert.ok(item);s.ui.showMedia(item.id);assert.ok(s.ui.sheet.querySelector('.media-preview img'));assert.equal(s.ui.sheet.querySelector('[data-action=download-media]').disabled,true);assert.equal(s.ui.sheet.querySelector('[data-action=open-media]').disabled,true);assert.equal(s.ui.sheet.querySelector('[data-action=media-source]').disabled,false);assert.match(s.ui.sheet.querySelector('.media-info').textContent,/Play this video/);
 }finally{s.instance.stop();s.dom.window.close();}
});

test('Raw setup migration is native, idempotent, and precedes even a stalled GM bridge',async()=>{
 for(const path of ['main','refs/heads/main']){
  const dom=new JSDOM('<pre>Old setup instructions</pre>',{url:`https://raw.githubusercontent.com/ksariash/userscript-master-button/${path}/SETUP.txt`,runScripts:'dangerously'});
  try{dom.window.eval(result.outputFiles[0].text);let calls=0;const gm={getValue(){calls++;return new Promise(()=>{});}};
   for(let i=0;i<2;i++)assert.equal(await dom.window.MBTest.start({document:dom.window.document,gm}),null);
   assert.equal(calls,0);assert.equal(dom.window.document.querySelectorAll('[data-master-button="setup-moved"]').length,1);
   const link=dom.window.document.querySelector('a');assert.equal(link.href,KEY_SETUP_URL);assert.equal(link.onclick,null);
   assert.equal(dom.window.document.querySelector('input,button,[data-master-button="host"]'),null);
  }finally{dom.window.close();}
 }
});
test('Trusted setup allowlist rejects URL variants and lookalikes',()=>{
 assert.equal(isKeySetupURL(KEY_SETUP_URL),true);
 for(const url of [KEY_SETUP_URL+'?key=dummy',KEY_SETUP_URL+'#dummy',KEY_SETUP_URL+'/',KEY_SETUP_URL.replace('https:','http:'),KEY_SETUP_URL.replace('ksariash.','other.'),KEY_SETUP_URL.replace('github.io','github.io.evil.example'),KEY_SETUP_URL.replace('/setup.html','/other.html'),KEY_SETUP_URL.replace('https://','https://user@'),'https://raw.githubusercontent.com/ksariash/userscript-master-button/main/SETUP.txt','invalid'])assert.equal(isKeySetupURL(url),false,url);
});
test('Script-free setup artifact and mocked Done/storage interactions',async()=>{
 const s=await setup(KEY_SETUP_URL);
 try{
  const doc=s.dom.window.document,policy=doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
  assert.match(policy,/script-src 'none'/);assert.match(policy,/default-src 'none'/);assert.match(policy,/form-action 'none'/);assert.doesNotMatch(policy,/sandbox/);
  assert.equal(doc.querySelector('script,iframe,form,input,link,img,object,embed'),null);
  assert.ok([...doc.querySelectorAll('*')].every(el=>[...el.attributes].every(a=>!a.name.startsWith('on'))));
  await tick();const before=[...s.values];click(s.ui,'check-storage');await tick();assert.equal(s.instance.settings.storageCheck.state,'passed');assert.deepEqual([...s.values],before);assert.equal(s.calls.length,0);
  click(s.ui,'back');assert.notEqual(s.ui.mode,'speech');assert.equal(s.dom.window.GM,undefined);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Export actions use the extracted title for text and pass it into recording preparation',async()=>{
 const s=await setup(),files=[];
 try{s.dom.window.navigator.canShare=()=>true;s.dom.window.navigator.share=async data=>files.push(data.files[0]);s.ui.controller.inventory.title='An article: 東京';s.ui.open('exports');click(s.ui,'export-text');await tick();assert.equal(files[0].name,'An article 東京.txt');
 let captured;s.ui.exporter.prepare=async options=>{captured=options.title;};click(s.ui,'prepare-export');await tick();assert.equal(captured,'An article: 東京');
 s.ui.exporter.currentArtifact=()=>({blob:new s.dom.window.Blob(['mock'],{type:'audio/mpeg'}),filename:'Prepared title.mp3'});s.ui.patch();s.ui.controller.inventory.title='Later title';click(s.ui,'share-export');await tick();assert.equal(files[1].name,'Prepared title.mp3');
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Time updates patch transport only and each assessment triggers one full UI update',async()=>{
 const s=await setup();try{s.ui.open('reader');let patches=0;const original=s.ui.patch.bind(s.ui);s.ui.patch=(...args)=>{patches++;return original(...args);};const row=s.ui.reader.querySelector('.prose'),icon=s.ui.reader.querySelector('[data-action=play] svg');s.ui.transcript.scrollTop=127;
 for(let i=0;i<100;i++)s.ui.speechUpdate({status:'paused',currentTime:i,duration:120});assert.equal(patches,0);assert.equal(s.ui.reader.querySelector('.prose'),row);assert.equal(s.ui.reader.querySelector('[data-action=play] svg'),icon);assert.equal(s.ui.transcript.scrollTop,127);assert.match(s.ui.reader.querySelector('.duration').textContent,/1:39/);
 const p=s.store.reading()[0];s.store.assess(p.id,{label:'ARTICLE'},{documentId:s.store.documentId,revision:p.revision});assert.equal(patches,1);
 }finally{s.instance.stop();s.dom.window.close();}
});
test('Reading scrubber exposes prepared extent, preserves dragging, and dispatches seek',async()=>{
 const s=await setup();try{s.ui.open('reader');const range=s.ui.reader.querySelector('#reading-seek');assert.equal(range.disabled,true);let sought;s.ui.speech.seek=async value=>{sought=value;};
 const state={status:'paused',currentTime:2,duration:10,readingTime:12,seekDuration:20,totalDuration:null};s.ui.speechUpdate(state);assert.equal(range.disabled,false);assert.equal(range.max,'20');assert.equal(range.value,'12');assert.match(range.getAttribute('aria-valuetext'),/0:12 of 0:20 prepared/);assert.match(s.ui.reader.querySelector('.seek-label').textContent,/total unknown/);
 range.value='17';range.dispatchEvent(new s.dom.window.Event('input'));s.ui.speechUpdate({...state,readingTime:13});assert.equal(range.value,'17');range.dispatchEvent(new s.dom.window.Event('change'));await tick();assert.equal(sought,17);s.ui.speechUpdate({...state,seekDuration:0,readingTime:null});assert.equal(range.disabled,true);
 }finally{s.instance.stop();s.dom.window.close();}
});
