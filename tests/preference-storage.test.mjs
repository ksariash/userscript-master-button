import test from 'node:test';import assert from 'node:assert/strict';
import {Settings,SETTINGS_KEY,SPEECH_KEY} from '../src/platform/storage.mjs';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('Hanging preference read is bounded, never overwrites unread data, and does not disable GM key storage',async()=>{
 const writes=[],values=new Map(),s=new Settings({getValue:async(k,d)=>k===SETTINGS_KEY?new Promise(()=>{}):values.get(k)??d,setValue:async(k,v)=>{writes.push(k);values.set(k,v);}},{preferenceTimeout:10});
 await assert.rejects(s.load(),/timed out/);assert.equal(s.persistent,true);s.value.textSize=24;await assert.rejects(s.save(),/not read/);assert.deepEqual(writes,[]);await s.replaceKey('isolated-dummy-key');assert.deepEqual(writes,[SPEECH_KEY]);assert.match(s.preferenceMessage(),/not be overwritten/);
});
test('Burst preference saves retain one pending snapshot and persist the newest state in order',async()=>{
 const writes=[],releases=[],s=new Settings({getValue:async()=>({schema:2}),setValue:(_k,v)=>{writes.push(v);return new Promise(r=>releases.push(r));}},{preferenceTimeout:500});await s.load();s.value.textSize=20;const first=s.save();await tick();const pending=[];
 for(let i=0;i<100;i++){s.value.textSize=21+i%10;pending.push(s.save());}assert.equal(new Set(pending).size,1);assert.equal(writes.length,1);releases[0]();await first;await tick();assert.equal(writes.length,2);assert.equal(writes[1].textSize,30);releases[1]();await Promise.all(pending);assert.equal(s.writer.active,null);
});
test('Timed-out GM write blocks overlapping writes until its uncertain operation settles',async()=>{
 const writes=[],releases=[],s=new Settings({getValue:async()=>({schema:2}),setValue:(_k,v)=>{writes.push(v);return new Promise(r=>releases.push(r));}},{preferenceTimeout:10});await s.load();const a=s.save().catch(e=>e);await tick();const b=s.save().catch(e=>e);assert.match((await a).message,/unknown/);assert.match((await b).message,/unknown/);await assert.rejects(s.save(),/unresolved/);assert.equal(writes.length,1);
 releases[0]();await tick();s.value.textSize=27;const latest=s.save();await tick();assert.equal(writes.length,2);releases[1]();await latest;assert.equal(writes[1].textSize,27);
});
test('Legacy-read timeout never creates a default replacement namespace',async()=>{
 let writes=0;const s=new Settings({getValue:k=>k===SETTINGS_KEY?undefined:new Promise(()=>{}),setValue:()=>writes++},{preferenceTimeout:10});await assert.rejects(s.load());await assert.rejects(s.save());assert.equal(writes,0);
});
