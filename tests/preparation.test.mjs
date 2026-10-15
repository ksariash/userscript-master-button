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
import {SpeechQueue} from '../src/speech/queue.mjs';
import {AzureClient} from '../src/speech/azure.mjs';
test('Interactive synthesis overtakes queued work without interrupting active transport',async()=>{
 const queue=new SpeechQueue(),order=[];let finish,priority=0;const a=queue.run(()=>new Promise(r=>{order.push('active');finish=r;}));await tick();
 const b=queue.run(()=>order.push('background')),c=queue.run(()=>order.push('promoted'),{priority:()=>priority});priority=10;finish();await Promise.all([a,b,c]);assert.deepEqual(order,['active','promoted','background']);
});
test('Canceled queue entries reject immediately and never run',async()=>{
 const queue=new SpeechQueue();let finish;const active=queue.run(()=>new Promise(r=>finish=r));await tick();const c=new AbortController();let ran=false;const canceled=queue.run(()=>{ran=true;},{signal:c.signal}).catch(e=>e);c.abort();assert.equal((await canceled).name,'AbortError');assert.equal(ran,false);finish();await active;
});
test('Concurrent cold voice lookups share a request and clearing voices rejects late results',async()=>{
 let count=0,release;const client=new AzureClient({getKey:async()=> 'dummy',request:()=>{count++;return new Promise(r=>release=r);}}),a=new AbortController();
 const first=client.voices('eastus',{signal:a.signal}).catch(e=>e),second=client.voices('eastus');await tick();a.abort();release({status:200,responseText:'[]'});assert.equal((await first).name,'AbortError');assert.deepEqual(await second,[]);assert.equal(count,1);
 const late=client.voices('eastus',{refresh:true}).catch(e=>e);await tick();client.clearVoices();assert.equal((await late).name,'AbortError');release({status:200,responseText:'[]'});await tick();assert.equal(client.voicesCache.size,0);
});
test('A settled preparation can immediately be refreshed or retried',async()=>{
 const pool=new PreparationPool(()=>{});let runs=0;const perform=async()=>++runs;
 assert.equal(await pool.join('a',{valid:()=>true},perform),1);assert.equal(await pool.join('a',{valid:()=>true},perform),2);
 await assert.rejects(pool.join('a',{valid:()=>true},async()=>{throw new Error('retry');}),/retry/);assert.equal(await pool.join('a',{valid:()=>true},perform),3);pool.stop();
});
