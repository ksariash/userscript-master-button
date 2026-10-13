import { readFile } from 'node:fs/promises';import { resolve } from 'node:path';import { pathToFileURL } from 'node:url';
import * as ort from 'onnxruntime-web/webgpu';import { NLIRuntime } from '../../src/platform/nli-runtime.mjs';
import { FEATURE_MODEL, DESCRIPTIONS, featureInput, structuralFeatures } from '../../src/core/language-features.mjs';
export async function loadDirectFeatures(cacheDir){
  const dist=resolve('node_modules/onnxruntime-web/dist'),root=resolve(cacheDir,FEATURE_MODEL.id,FEATURE_MODEL.revision),json=name=>readFile(`${root}/${name}`,'utf8').then(JSON.parse);
  ort.env.wasm.wasmPaths={mjs:pathToFileURL(`${dist}/ort-wasm-simd-threaded.asyncify.mjs`).href,wasm:pathToFileURL(`${dist}/ort-wasm-simd-threaded.asyncify.wasm`).href};ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  const session=await ort.InferenceSession.create(new Uint8Array(await readFile(`${root}/onnx/model_quantized.onnx`)),{executionProviders:['wasm'],graphOptimizationLevel:'all'}),model=new NLIRuntime({tokenizerJSON:await json('tokenizer.json'),tokenizerConfig:await json('tokenizer_config.json'),config:await json('config.json'),session,Tensor:ort.Tensor});
  return{async features(p,prev,next){const input=featureInput(p,prev,next),tokens=model.tokenCount(input);if(tokens>FEATURE_MODEL.contextTokens)return{features:null,tokens};return{features:[...await model.scores(input,DESCRIPTIONS),...structuralFeatures(p)],tokens};},dispose:()=>model.dispose()};
}
