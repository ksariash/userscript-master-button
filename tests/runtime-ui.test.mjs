import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';
const result=await build({entryPoints:['src/main.mjs'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'MBTest',loader:{'.css':'text'},define:{__VERSION__:'"test"',__MODEL_WORKER__:'""',__AUTO_START__:'false'}});
const fixture='<!doctype html><title>Article</title><main><article><h1>Article title</h1><p id="one">The first paragraph is original narrative.</p><aside><p id="promo">Get our newsletter. Sign up now.</p></aside><p id="two"><a href="/source">The closing paragraph keeps a source link.</a></p></article></main>';
async function setup(url='https://example.org/article'){
 const dom=new JSDOM(fixture,{url,pretendToBeVisual:true,runScripts:'dangerously'});dom.window.eval(result.outputFiles[0].text);const values=new Map(),calls=[];
 const gm={getValue:async(k,d)=>values.get(k)??d,setValue:async(k,v)=>values.set(k,v),deleteValue:async k=>values.delete(k),setClipboard:async t=>{calls.push(['copy',t]);return true;},xmlHttpRequest:d=>{calls.push(['request',d]);return Promise.reject(new Error('Mock network unavailable'));}};
 const audio=dom.window.document.createElement('audio');audio.play=async()=>{};audio.pause=()=>{};audio.load=()=>{};
 const instance=await dom.window.MBTest.start({document:dom.window.document,gm,workerSource:'',audioFactory:()=>audio});return{dom,instance,gm,calls,values,ui:instance.app.ui,store:instance.app.store};
}
const click=(ui,action)=>ui.shadow.querySelector(`[data-action="${action}"]`).click();const tick=()=>new Promise(r=>setTimeout(r,0));
test('Mock DOM key setup: both main raw URL forms open a usable form and save only to extension storage',async()=>{
 for(const path of ['main','refs/heads/main']){
  const s=await setup(`https://raw.githubusercontent.com/ksariash/userscript-master-button/${path}/SETUP.txt`);
  assert.equal(s.ui.mode,'speech');const field=s.ui.sheet.querySelector('#speech-key');
  assert.equal(field.disabled,false);assert.equal(s.ui.sheet.querySelector('[data-action=save-key]').disabled,false);
  field.focus();assert.equal(s.ui.shadow.activeElement,field);field.value='k'.repeat(32);click(s.ui,'save-key');await tick();
  assert.equal(s.values.get('master-button:speech-key'),'k'.repeat(32));assert.equal(field.value,'');
  assert.match(s.ui.sheet.querySelector('.key-status').textContent,/stored in Userscripts/);
  assert.equal(s.calls.length,0);assert.equal(s.dom.window.localStorage.length,0);assert.equal(s.dom.window.sessionStorage.length,0);
  click(s.ui,'forget-key');await tick();assert.equal(s.values.has('master-button:speech-key'),false);
  s.instance.stop();s.dom.window.close();
 }
});
test('Mock DOM key setup: other repositories, branches, hostnames, file paths and GitHub HTML stay blocked',async()=>{
 for(const url of ['https://raw.githubusercontent.com/other/userscript-master-button/main/SETUP.txt','https://raw.githubusercontent.com/ksariash/userscript-master-button/refs/heads/other/SETUP.txt','https://raw.githubusercontent.com.evil.example/ksariash/userscript-master-button/main/SETUP.txt','https://raw.githubusercontent.com/ksariash/userscript-master-button/main/OTHER.txt','https://github.com/ksariash/userscript-master-button/blob/main/SETUP.txt']){
  const s=await setup(url);s.ui.open('speech');assert.equal(s.ui.sheet.querySelector('#speech-key').disabled,true);
  assert.match(s.ui.sheet.querySelector('.key-entry-state').textContent,/Open the dedicated/);
  await s.ui.click({target:s.ui.sheet.querySelector('[data-action=save-key]')});assert.equal(s.values.has('master-button:speech-key'),false);
  s.instance.stop();s.dom.window.close();
 }
});
test('Mock DOM key setup: missing extension storage explains disabled controls; setup action opens canonical document',async()=>{
 const s=await setup('https://raw.githubusercontent.com/ksariash/userscript-master-button/refs/heads/main/SETUP.txt');
 s.instance.settings.persistent=false;s.ui.open('speech');assert.equal(s.ui.sheet.querySelector('#speech-key').disabled,true);
 assert.match(s.ui.sheet.querySelector('.key-entry-state').textContent,/storage is unavailable/);s.instance.stop();s.dom.window.close();
 const other=await setup();const tabs=[];other.gm.openInTab=async(...args)=>tabs.push(args);other.ui.open('speech');click(other.ui,'open-key-setup');await tick();
 assert.deepEqual(tabs,[['https://raw.githubusercontent.com/ksariash/userscript-master-button/main/SETUP.txt',false]]);other.instance.stop();other.dom.window.close();
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
test('Mock DOM selection preserves exact whole-passage identity and labels partial fragments as unmapped',async()=>{
 const s=await setup(),p=[...s.store.records.values()].find(p=>p.source?.node.id==='one'),selection=s.dom.window.getSelection(),range=s.dom.window.document.createRange();range.selectNodeContents(p.source.node);selection.addRange(range);s.ui.open('reader');assert.equal(s.store.reading().length,1);assert.equal(s.store.reading()[0].id,p.id);s.ui.open('idle');selection.removeAllRanges();range.setStart(p.source.nodes[0],4);range.setEnd(p.source.nodes[0],9);selection.addRange(range);s.ui.open('reader');assert.equal(s.store.reading()[0].scope,'reader');assert.equal(s.store.reading()[0].source,null);s.instance.stop();s.dom.window.close();
});
