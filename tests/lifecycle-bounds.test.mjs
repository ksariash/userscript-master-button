import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {PageLifecycle} from '../src/core/source.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){const end=Date.now()+5000;while(!check()){if(Date.now()>end)throw new Error('Lifecycle fixture did not settle');await wait(5);}}
function fixture(inventory,options={}){const dom=new JSDOM('<main><p>Original</p></main>',{url:'https://example.org/one'}),seen=[],errors=[],life=new PageLifecycle(dom.window.document,inventory,{delay:5,extractDelay:15,onScan:r=>seen.push(r),onError:e=>errors.push(e),...options});return{dom,life,seen,errors,stop(){life.stop();dom.window.close();}};}
test('Mutation burst scans once and reuses the same inventory for extraction',async()=>{
 let scans=0,extracts=0;const rows=[{id:'original'}],s=fixture({scan:()=>{scans++;return rows;},extract:r=>{extracts++;assert.equal(r,rows);return r;}});
 try{for(let i=0;i<100;i++)s.life.schedule();await until(()=>extracts===1);assert.equal(scans,1);assert.equal(extracts,1);assert.equal(s.seen.length,2);}finally{s.stop();}
});
test('Navigation retires scheduled callbacks before they can publish old-page rows',async()=>{
 let scans=0,navigated=0;const s=fixture({scan:()=>{scans++;return[];}},{onNavigate:()=>navigated++});try{s.life.schedule();s.dom.window.history.pushState({},'','/two');await until(()=>navigated===1);assert.equal(scans,0);assert.equal(navigated,1);assert.equal(s.life.stopped,true);assert.equal(s.seen.length,0);}finally{s.stop();}
});
test('Extraction failure retains original records, clears stale extraction evidence and recovers later',async()=>{
 let fails=true;const cache=new Map([['old',{}]]),rows=[{id:'a',originalText:'Original',extraction:{member:true}}],s=fixture({extraction:cache,scan:()=>rows,extract:r=>{if(fails)throw new Error('fixture');return r;}});
 try{s.life.schedule();await until(()=>s.errors.length>0);assert.equal(s.seen.at(-1)[0].originalText,'Original');assert.equal(s.seen.at(-1)[0].extraction.member,false);assert.equal(cache.size,0);assert.match(s.errors.at(-1),/preserved/);fails=false;s.life.schedule();await until(()=>s.errors.at(-1)==='');assert.equal(s.errors.at(-1),'');}finally{s.stop();}
});
test('Late async extraction and scans cannot publish after retirement',async()=>{
 for(const stage of ['scan','extract']){let resolve;const s=fixture({scan:()=>stage==='scan'?new Promise(r=>resolve=r):[],extract:()=>new Promise(r=>resolve=r)});s.life.schedule();await until(()=>typeof resolve==='function');assert.equal(typeof resolve,'function');const before=s.seen.length;s.life.stop();resolve([]);await wait(5);assert.equal(s.seen.length,before);s.stop();}
});
