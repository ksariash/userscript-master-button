import test from 'node:test';import assert from 'node:assert/strict';import {encodeMP3} from '../src/speech/encoding.mjs';import {ExportJob} from '../src/speech/export.mjs';import {DecisionStore} from '../core/decisions.mjs';import {workerFixture,tone} from './helpers/mp3-worker.mjs';
test('Actual worker and yielding encoder produce identical MP3 without detaching cached PCM',async()=>{
 const fixture=await workerFixture(),buffers=[tone(1),tone(1)],resources=[],revoked=[];const options={...fixture,onResources:r=>resources.push(r),makeURL:()=> 'blob:local-fixture',revokeURL:u=>revoked.push(u)};
 const worker=await encodeMP3(buffers,options),fallback=await encodeMP3(buffers,{WorkerClass:null});assert.deepEqual(new Uint8Array(await worker.arrayBuffer()),new Uint8Array(await fallback.arrayBuffer()));assert.equal(worker.type,'audio/mpeg');assert.ok(worker.size>10000);assert.equal(buffers[0].byteLength,48000);assert.equal(resources.at(-1).maxTransferBytes,9216);assert.equal(resources.at(-1).scratchBytes,2304);assert.deepEqual(revoked,['blob:local-fixture']);assert.equal(fixture.state.terminated,1);
});
test('Worker cancellation terminates conversion and fallback cancellation occurs before another chunk',async()=>{
 const fixture=await workerFixture();for(const worker of [true,false]){const controller=new AbortController();let updates=0;await assert.rejects(encodeMP3([tone(2)],{...(worker?fixture:{WorkerClass:null}),signal:controller.signal,onProgress:()=>{updates++;controller.abort();}}),e=>e.name==='AbortError');assert.equal(updates,1);}assert.equal(fixture.state.terminated,1);
});
test('Blocked worker startup falls back to yielding local encoding and releases its URL',async()=>{
 let revoked=0,yields=0;class Blocked{constructor(){throw new Error('blocked');}}
 const blob=await encodeMP3([tone(1)],{WorkerClass:Blocked,workerSource:'fixture',makeURL:()=> 'blob:fixture',revokeURL:()=>revoked++,yieldTask:async()=>yields++});assert.ok(blob.size>5000);assert.equal(revoked,1);assert.ok(yields>1);
});
test('Export artifacts release on selection change, cancellation and session disposal',async()=>{
 const store=new DecisionStore([{id:'a',originalText:'Original.'}]),config={region:'eastus',voice:'dummy',quality:'standard'},speech={getConfig:()=>config,ensure:async()=>({pcm:tone(1),duration:1})},exporter=new ExportJob(store,speech,{encode:async()=>new Blob(['fixture'])});
 await exporter.prepare();assert.ok(exporter.artifact);store.correct('a','NUISANCE');assert.equal(exporter.artifact,null);store.undo();await exporter.prepare();exporter.cancel();assert.equal(exporter.artifact,null);await exporter.prepare();exporter.dispose();assert.equal(exporter.artifact,null);await assert.rejects(exporter.prepare(),e=>e.name==='AbortError');
});
test('A stalled worker bootstrap times out into fallback; a midstream failure releases resources',async()=>{
 let terminated=0,revoked=0;class Stalled{postMessage(){}terminate(){terminated++;}}
 await encodeMP3([tone(1)],{WorkerClass:Stalled,workerSource:'fixture',requestTimeout:5,makeURL:()=> 'blob:test',revokeURL:()=>revoked++});assert.equal(terminated,1);assert.equal(revoked,1);
 class Broken{postMessage({id,action}){queueMicrotask(()=>action==='init'?this.onmessage({data:{id,parts:[]}}):this.onerror(new Error('fixture')));}terminate(){terminated++;}}
 await assert.rejects(encodeMP3([tone(1)],{WorkerClass:Broken,workerSource:'fixture',makeURL:()=> 'blob:test',revokeURL:()=>revoked++}),/unavailable/);assert.equal(terminated,2);assert.equal(revoked,2);
});
