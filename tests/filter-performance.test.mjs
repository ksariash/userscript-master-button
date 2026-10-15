import test from 'node:test';import assert from 'node:assert/strict';
import {loadModelAssets} from '../src/platform/model-assets.mjs';
import {NLIRuntime} from '../src/platform/nli-runtime.mjs';
import {LocalClassifier} from '../src/platform/classifier.mjs';
import {DecisionStore} from '../core/decisions.mjs';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('Model assets use two bounded downloads and warm cache avoids transport',async()=>{
 let active=0,peak=0,requests=0;const entries=new Map(),cache={match:async u=>entries.get(u)?.clone(),put:async(u,r)=>entries.set(u,r)};
 const fetcher=async(url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');requests++;peak=Math.max(peak,++active);await tick();active--;return new Response(url.endsWith('.onnx')?new Uint8Array(4):'{"ok":true}');};
 const options={fetcher,cache},model={id:'test/local',revision:'fixed',weightBytes:4};const cold=await loadModelAssets(model,options),warm=await loadModelAssets(model,options);assert.equal(requests,4);assert.equal(peak,2);assert.deepEqual(warm,cold);assert.equal(cold['config.json'].ok,true);assert.equal(cold['onnx/model_quantized.onnx'].length,4);
});
test('Failed asset aborts peer download and does not launch remaining files',async()=>{
 let requests=0,aborted=false;const fetcher=async(url,{signal})=>{requests++;if(url.endsWith('.onnx')){await tick();return new Response('failed',{status:500});}return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Canceled','AbortError'));},{once:true}));};
 await assert.rejects(loadModelAssets({id:'test',revision:'fixed',weightBytes:4},{fetcher}),/download failed/);assert.equal(aborted,true);assert.equal(requests,2);
});
test('NLI releases input and output tensors on success, invalid output and session failure',async()=>{
 for(const outcome of ['success','invalid','throw']){const allocated=[];class Tensor{constructor(){this.disposed=0;allocated.push(this);}dispose(){this.disposed++;}}
 const runtime=Object.create(NLIRuntime.prototype);runtime.entailment=1;runtime.contradiction=0;runtime.Tensor=Tensor;runtime.tokenizer={encode:()=>({ids:[1,2],attention_mask:[1,1],token_type_ids:[0,1]})};runtime.session={inputNames:['input_ids','attention_mask','token_type_ids'],run:async()=>{if(outcome==='throw')throw new Error('session failure');const logits=new Tensor();logits.data=outcome==='invalid'?[NaN,1]:[0,1];return{logits};}};
 if(outcome==='success')assert.deepEqual(await runtime.scores('original',['article']),[1/(1+Math.exp(-1))]);else await assert.rejects(runtime.scores('original',['article']));assert.ok(allocated.length>=3);assert.ok(allocated.every(t=>t.disposed===1));
 }
});
test('Classifier revokes worker URL on ready and failure, without double release on stop',async()=>{
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL;let made=0,released=[];URL.createObjectURL=()=>`blob:mock:${++made}`;URL.revokeObjectURL=u=>released.push(u);
 try{for(const fail of [false,true]){class Worker{postMessage({id}){queueMicrotask(()=>this.onmessage({data:fail?{id,error:'failed'}:{id,result:{}}}));}terminate(){}}
 const store=new DecisionStore([]),classifier=new LocalClassifier(store,{WorkerClass:Worker});if(fail)await assert.rejects(classifier.load(),/failed/);else await classifier.load();assert.equal(classifier.url,null);classifier.dispose();}assert.deepEqual(released,['blob:mock:1','blob:mock:2']);}finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
