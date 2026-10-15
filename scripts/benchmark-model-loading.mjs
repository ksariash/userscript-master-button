import {modelAsset,loadModelAssets} from '../src/platform/model-assets.mjs';
import {performance} from 'node:perf_hooks';
const model={id:'test/fixture',revision:'fixed',weightBytes:4},paths=['tokenizer.json','tokenizer_config.json','config.json','onnx/model_quantized.onnx'];
const results=[];
for(const mode of ['sequential','bounded-parallel'])for(let round=0;round<5;round++){
 let requests=0,active=0,peak=0;const entries=new Map(),cache={match:async u=>entries.get(u)?.clone(),put:async(u,r)=>entries.set(u,r)};
 const fetcher=async u=>{requests++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,20));active--;return new Response(u.endsWith('.onnx')?new Uint8Array(4):'{}');};
 const load=()=>mode==='sequential'?paths.reduce((p,path)=>p.then(()=>modelAsset(path,model,{cache,fetcher})),Promise.resolve()):loadModelAssets(model,{cache,fetcher});
 const start=performance.now();await load();const coldMs=performance.now()-start,before=requests,warmStart=performance.now();await load();results.push({mode,round,coldMs,warmMs:performance.now()-warmStart,coldRequests:before,warmRequests:requests-before,peak});
}
console.log(JSON.stringify({validation:'Synthetic four asset responses, 20 ms each, tiny payloads. Not real-model download/inference, memory or Safari performance.',node:process.version,results},null,2));
