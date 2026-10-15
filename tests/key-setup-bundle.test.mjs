import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {KEY_SETUP_URL} from '../src/platform/key-setup.mjs';
const script=await readFile('dist/master-button.user.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('Generated userscript matches metadata, manifest and package',async()=>{
 const meta=await readFile('dist/master-button.meta.js','utf8'),manifest=JSON.parse(await readFile('dist/build.json','utf8')),pkg=JSON.parse(await readFile('package.json','utf8'));
 assert.ok(script.startsWith(meta));assert.equal(manifest.version,pkg.version);assert.ok(meta.includes(`@version      ${pkg.version}`));
 assert.equal(createHash('sha256').update(script).digest('hex'),manifest.sha256);assert.equal(Buffer.byteLength(script),manifest.scriptBytes);
 assert.match(meta,/@inject-into  content/);assert.doesNotMatch(meta,/@grant\s+unsafeWindow/);
});
test('Generated bundle runs with lexical mock GM on setup; raw migration never touches GM',async()=>{
 for(const url of [KEY_SETUP_URL,'https://raw.githubusercontent.com/ksariash/userscript-master-button/main/SETUP.txt','https://raw.githubusercontent.com/ksariash/userscript-master-button/refs/heads/main/SETUP.txt']){
  const dom=new JSDOM(await readFile('docs/setup.html','utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true});
  try{
   let shadow,reads=0,requests=0;const values=new Map(),attach=dom.window.Element.prototype.attachShadow;
   dom.window.Element.prototype.attachShadow=function(options){shadow=attach.call(this,options);return shadow;};
   dom.window.HTMLMediaElement.prototype.pause=()=>{};dom.window.HTMLMediaElement.prototype.load=()=>{};
   const gm={getValue:async(k,d)=>{reads++;return values.get(k)??d;},setValue:async(k,v)=>values.set(k,v),deleteValue:async k=>values.delete(k),xmlHttpRequest:()=>{requests++;throw new Error('Mock requests disabled');}};
   dom.window.Function('GM',script)(gm);for(let i=0;i<10;i++)await tick();
   if(url===KEY_SETUP_URL){
    assert.equal(shadow.querySelector('#speech-key').disabled,false);
    shadow.querySelector('[data-action="check-storage"]').click();for(let i=0;i<5;i++)await tick();assert.match(shadow.querySelector('.key-entry-state').textContent,/storage passed/);
    shadow.querySelector('#speech-key').value='d'.repeat(32);shadow.querySelector('[data-action="save-key"]').click();for(let i=0;i<5;i++)await tick();
    assert.equal(values.get('master-button:speech-key'),'d'.repeat(32));assert.equal(shadow.querySelector('#speech-key').value,'');assert.equal(requests,1);
    shadow.querySelector('[data-action="back"]').click();assert.equal(shadow.querySelector('#speech-key'),null);
   }else{assert.equal(reads,0);assert.equal(requests,0);assert.equal(shadow,undefined);assert.equal(dom.window.document.querySelector('[data-master-button="setup-moved"] a').href,KEY_SETUP_URL);}
   assert.equal(dom.window.GM,undefined);assert.equal(dom.window.localStorage.length,0);assert.equal(dom.window.sessionStorage.length,0);
  }finally{dom.window.close();}
 }
});
