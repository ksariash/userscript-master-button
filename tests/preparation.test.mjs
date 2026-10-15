import test from 'node:test';
import assert from 'node:assert/strict';
import {PreparationPool} from '../src/speech/preparation.mjs';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('All consumers abort underlying synthesis; ignored late completion cannot refill cache',async()=>{
 let release,signal,stored=0;const pool=new PreparationPool(()=>stored++),a=new AbortController(),b=new AbortController();
 const perform=s=>{signal=s;return new Promise(r=>release=r);};
 const first=pool.join('same',{signal:a.signal,valid:()=>true},perform).catch(e=>e),second=pool.join('same',{signal:b.signal,valid:()=>true},perform).catch(e=>e);
 await tick();a.abort();assert.equal(signal.aborted,false);b.abort();assert.equal(signal.aborted,true);assert.equal((await first).name,'AbortError');assert.equal((await second).name,'AbortError');release({});await tick();assert.equal(stored,0);assert.equal(pool.jobs.size,0);
});
test('Shared synthesis rechecks all consumers when one passage becomes invalid',async()=>{
 let valid=true,release,recheck,stored=0;const pool=new PreparationPool(()=>stored++),perform=(_s,check)=>{recheck=check;return new Promise(r=>release=r);};
 const a=pool.join('same',{valid:()=>valid},perform).catch(e=>e),b=pool.join('same',{valid:()=>true},perform);await tick();valid=false;assert.equal(recheck(),true);release('pcm');assert.equal((await a).name,'AbortError');assert.equal(await b,'pcm');assert.equal(stored,1);pool.stop();
});
