import {pipeline,env} from '@huggingface/transformers';import {MODEL_CONFIG} from '../core/model-contract.mjs';import {DESCRIPTIONS,featureInput,structuralFeatures} from '../core/language-features.mjs';
const assetFetch=self.fetch.bind(self);self.fetch=(input,options={})=>assetFetch(input,{...options,credentials:'omit',referrerPolicy:'no-referrer'});
let classifier,backend;const reply=(id,data)=>postMessage({id,...data});
self.onmessage=async event=>{
 const {id,action,data}=event.data;
 try{
  if(action==='load'){
   backend=data.backend;env.allowLocalModels=false;env.allowRemoteModels=true;env.useBrowserCache=true;env.useWasmCache=false;
   const cacheName=`master-button-model:${MODEL_CONFIG.revision}:${MODEL_CONFIG.dtype}`;
   if(self.caches){for(const key of await caches.keys())if(key.startsWith('master-button-model:')&&key!==cacheName)await caches.delete(key);env.useCustomCache=true;env.customCache=await caches.open(cacheName);env.useBrowserCache=false;}
   const factory=URL.createObjectURL(new Blob([__ORT_FACTORY__],{type:'text/javascript'}));env.backends.onnx.wasm.wasmPaths={mjs:factory,wasm:__ORT_WASM_URL__};env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
   classifier=await pipeline('zero-shot-classification',MODEL_CONFIG.id,{revision:MODEL_CONFIG.revision,dtype:MODEL_CONFIG.dtype,device:backend,progress_callback:p=>postMessage({progress:{status:p.status,file:p.file,loaded:p.loaded,total:p.total}})});reply(id,{result:{backend,model:MODEL_CONFIG.id}});return;
  }
  if(!classifier)throw new Error('Load the local model first.');
  if(action==='classify'){
   const {passage,previous,next}=data,input=featureInput(passage,previous,next),tokens=classifier.tokenizer(input).input_ids.data.length;
   if(tokens>MODEL_CONFIG.maxInputTokens){reply(id,{result:{features:null,inputTokens:tokens,reason:'The complete passage exceeds the bounded local context. It remains included.'}});return;}
   const output=await classifier(input,DESCRIPTIONS,{hypothesis_template:'This text is {}.',multi_label:true}),map=new Map(output.labels.map((l,i)=>[l,output.scores[i]]));
   reply(id,{result:{features:[...DESCRIPTIONS.map(l=>map.get(l)),...structuralFeatures(passage)],inputTokens:tokens,model:MODEL_CONFIG.id,backend,promptVersion:MODEL_CONFIG.promptVersion}});return;
  }
  if(action==='url'){
   const proposals=[];for(const key of data.parameterNames.slice(0,30)){
    const r=await classifier(`URL parameter name: ${key}. Host: ${data.host}. Path: ${data.path}.`,['analytics or advertising tracking','functional routing, authentication or content selection'],{hypothesis_template:'This field is used for {}.',multi_label:false});
    if(r.labels[0]==='analytics or advertising tracking'&&r.scores[0]>.8)proposals.push(key);
   }
   reply(id,{result:proposals});return;
  }
  throw new Error('Unknown local model action.');
 }catch(e){reply(id,{error:action==='load'?'Local model could not load. This page or browser may block workers, WebAssembly, WebGPU, downloads, or storage. Manual Keep/Skip remains available.':'Local inference failed. The passage remains included; retry from Model settings.'});}
};
