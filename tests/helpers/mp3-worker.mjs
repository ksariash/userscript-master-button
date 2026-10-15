import {Worker} from 'node:worker_threads';
import {build} from 'esbuild';
/** Runs the actual bundled browser-worker encoder in Node, not a mocked encoder. */
export async function workerFixture(){
 const result=await build({entryPoints:['src/speech/mp3-worker.mjs'],bundle:true,write:false,format:'iife',platform:'browser',minify:true});const script=result.outputFiles[0].text;
 const state={created:0,terminated:0};
 class Adapter{
  constructor(){state.created++;this.worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);parentPort.on('message',data=>self.onmessage({data}));${script}`,{eval:true});this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',error=>this.onerror?.(error));}
  postMessage(data,transfer){this.worker.postMessage(data,transfer);}
  terminate(){state.terminated++;this.worker.terminate();}
 }
 return{WorkerClass:Adapter,workerSource:script,state};
}
export function tone(seconds){const pcm=new ArrayBuffer(24000*2*seconds),view=new DataView(pcm);for(let i=0;i<pcm.byteLength/2;i++)view.setInt16(i*2,Math.sin(i/24000*Math.PI*2*440)*8000,true);return pcm;}
