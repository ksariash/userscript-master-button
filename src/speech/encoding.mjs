import {MP3Stream,ENCODING_CHUNK_BYTES} from './mp3-core.mjs';
import {abortError} from './azure.mjs';
export {QUALITY} from './mp3-core.mjs';
const source=typeof __MP3_WORKER__==='undefined'?'':__MP3_WORKER__;
/** At most one PCM chunk in flight; cached PCM is never detached. */
export async function encodeMP3(buffers,{quality='standard',signal,onProgress=()=>{},onResources=()=>{},yieldTask=()=>new Promise(r=>setTimeout(r,0)),WorkerClass=globalThis.Worker,workerSource=source,makeURL=b=>URL.createObjectURL(b),revokeURL=u=>URL.revokeObjectURL(u),requestTimeout=30000}={}){
 if(signal?.aborted)throw abortError();
 let worker,url,waiter,id=0,workerReady=false;const parts=[],total=buffers.reduce((n,b)=>n+b.byteLength,0);let processed=0,maxTransferBytes=0;
 const dispose=()=>{worker?.terminate();worker=null;if(url){revokeURL(url);url=null;}};
 const abort=()=>{waiter?.reject(abortError());dispose();};signal?.addEventListener('abort',abort,{once:true});
 const send=(action,data={},transfer=[])=>new Promise((resolve,reject)=>{
  const current=++id;let timer;const clear=()=>{clearTimeout(timer);if(waiter?.id===current)waiter=null;};waiter={id:current,resolve:value=>{clear();resolve(value);},reject:error=>{clear();reject(error);}};
  timer=setTimeout(()=>waiter?.reject(new Error('Local MP3 worker timed out. Retry a smaller recording.')),action==='init'?Math.min(requestTimeout,3000):requestTimeout);
  try{if(signal?.aborted)throw abortError();worker.postMessage({id:current,action,...data},transfer);}catch(error){waiter.reject(error);}
 });
 try{
  if(WorkerClass&&workerSource){try{
   url=makeURL(new Blob([workerSource],{type:'text/javascript'}));worker=new WorkerClass(url);
   worker.onmessage=({data})=>{if(data.id===waiter?.id)data.error?waiter.reject(new Error(data.error)):waiter.resolve(data.parts||[]);};
   worker.onerror=()=>waiter?.reject(new Error('Local MP3 worker is unavailable.'));
   await send('init',{quality});workerReady=true;
   // The worker has loaded its script; it owns no GM APIs or network transport.
   revokeURL(url);url=null;
  }catch(error){dispose();if(signal?.aborted)throw abortError();}}
  const encoder=workerReady?null:new MP3Stream(quality);
  onResources({backend:workerReady?'worker':'yielding-main',retainedPCMBytes:[...new Set(buffers)].reduce((n,b)=>n+b.byteLength,0),scratchBytes:2304,maxTransferBytes});
  for(const buffer of buffers)for(let offset=0;offset<buffer.byteLength;offset+=ENCODING_CHUNK_BYTES){
   if(signal?.aborted)throw abortError();const length=Math.min(ENCODING_CHUNK_BYTES,buffer.byteLength-offset);
   if(workerReady){const chunk=buffer.slice(offset,offset+length);maxTransferBytes=Math.max(maxTransferBytes,chunk.byteLength);parts.push(...await send('chunk',{buffer:chunk},[chunk]));}
   else{await yieldTask();if(signal?.aborted)throw abortError();parts.push(...encoder.push(new Uint8Array(buffer,offset,length)));}
   processed+=length;onProgress(total?processed/total:0);
  }
  if(signal?.aborted)throw abortError();parts.push(...(workerReady?await send('finish'):encoder.finish()));onProgress(1);
  onResources({backend:workerReady?'worker':'yielding-main',retainedPCMBytes:[...new Set(buffers)].reduce((n,b)=>n+b.byteLength,0),scratchBytes:2304,maxTransferBytes});
  return new Blob(parts,{type:'audio/mpeg'});
 }finally{signal?.removeEventListener('abort',abort);dispose();parts.length=0;}
}
