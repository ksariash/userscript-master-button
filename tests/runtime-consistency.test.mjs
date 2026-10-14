import test from 'node:test';import assert from 'node:assert/strict';import { JSDOM } from 'jsdom';
import { DecisionStore } from '../core/decisions.mjs';import { LocalClassifier } from '../src/platform/classifier.mjs';import baseline from '../src/core/baseline-head.json' with {type:'json'};import { MODEL_CONFIG } from '../src/core/model-contract.mjs';
import { SelectorPicker, inspectSelector } from '../src/tools/rules.mjs';import { modelAsset } from '../src/platform/model-assets.mjs';

test('Mock feature corrections immediately reassess cached head output and Undo restores it without new inference',()=>{
  const store=new DecisionStore([{id:'a',originalText:'One explicit example.'},{id:'b',originalText:'Another passage.'}],{site:'a.test'}),features=Array(baseline.weights.length).fill(0);features[9]=1;features[10]=1;features[7]=1;
  const classifier=new LocalClassifier(store,{workerSource:'',WorkerClass:null}),initial=classifier.head.classify(features);assert.equal(initial.label,'NUISANCE');
  for(const id of ['a','b'])store.assess(id,{...initial,features,promptVersion:MODEL_CONFIG.promptVersion,validatedExclusion:false},{documentId:store.documentId,revision:0});
  store.correct('a','ARTICLE',{teach:true});const example=[...store.examples.values()][0];example.features=features;example.featureVersion=MODEL_CONFIG.promptVersion;store.changed(null,'memory');
  assert.equal(store.records.get('b').automatic.label,'UNCERTAIN');assert.equal(store.resolve('b').included,true);
  store.undo();assert.equal(store.records.get('b').automatic.label,initial.label);classifier.dispose();
});
test('Picker capture precedes previously registered document delegation and broad guards ignore script ballast',()=>{
  const dom=new JSDOM(`<div id="story">${'Article wording. '.repeat(50)}</div><script>${'x'.repeat(12000)}</script><aside><a href="/go">Prompt</a></aside>`,{url:'https://example.org'}),doc=dom.window.document;let native=0;
  doc.addEventListener('click',()=>native++,true);const picker=new SelectorPicker(doc);picker.start();doc.querySelector('a').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(native,0);assert.equal(inspectSelector(doc,'#story').blocked,true);picker.stop();dom.window.close();
});
test('Mock model downloads omit credentials, enforce declared and streamed bounds, and never cache incomplete weights',async()=>{
  const model={id:'public/model',revision:'fixed',weightBytes:4};let options,cached=0;
  const fetcher=async(url,o)=>{options=o;return new Response(new Uint8Array([1,2,3]));};
  await assert.rejects(modelAsset('onnx/model_quantized.onnx',model,{fetcher,cache:{match:async()=>null,put:async()=>cached++}}),/Incomplete/);assert.equal(cached,0);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  await assert.rejects(modelAsset('onnx/model_quantized.onnx',model,{fetcher:async()=>new Response(new Uint8Array(5))}),/budget/);
});
test('Mock bounded scan analyzes article scope before unrelated chrome and keeps original neighbor context',async()=>{
 const rows=['Chrome before','Other chrome','Article beginning','Article ending'].map((originalText,i)=>({id:String(i),originalText,tag:'p',role:'content',extraction:{member:i===0}})),store=new DecisionStore(rows,{documentId:'d'}),classifier=new LocalClassifier(store,{workerSource:'',WorkerClass:null}),calls=[];store.setReading(['2','3']);classifier.status='ready';classifier.budget=2;classifier.call=async(action,data)=>{calls.push(data);return{features:null,reason:'Mock bounded context'};};
 try{await classifier.scan();assert.deepEqual(calls.map(c=>c.passage.originalText),['Article beginning','Article ending']);assert.equal(calls[0].previous,'Other chrome');assert.equal(calls[0].next,'Article ending');assert.equal(store.records.get('0').automatic,null);assert.equal(store.snapshot().passages.length,2);}finally{classifier.dispose();}
});
