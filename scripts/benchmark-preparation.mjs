import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
const {AzureClient}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:'../src/speech/azure.mjs');
const rows=[];
for(let i=0;i<5;i++){
 let requests=0,active=0,peak=0;
 const client=new AzureClient({getKey:async()=> 'isolated-dummy',request:async d=>{requests++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,20));active--;return d.method==='GET'?{status:200,responseText:JSON.stringify([{ShortName:'en-US-JennyNeural',Locale:'en-US',DisplayName:'Jenny',Gender:'Female',VoiceType:'Neural',Status:'GA'}])}:{status:200,response:new ArrayBuffer(48000)};}});
 const config={region:'eastus',voice:'en-US-JennyNeural'},start=performance.now();await Promise.all(['one','two','three'].map(t=>client.synthesize(t,config)));const coldMs=performance.now()-start,coldRequests=requests,warmStart=performance.now();await Promise.all(['one','two','three'].map(t=>client.synthesize(t,config)));rows.push({coldMs,warmMs:performance.now()-warmStart,coldRequests,warmRequests:requests-coldRequests,peak});
}
const median=key=>rows.map(r=>r[key]).sort((a,b)=>a-b)[2];
console.log(JSON.stringify({validation:'Synthetic serial transport, 20 ms/request, dummy key/audio; no Azure or device requests. Warm catalogue only, not PCM cache.',node:process.version,rounds:rows,median:{coldMs:median('coldMs'),warmMs:median('warmMs'),coldRequests:median('coldRequests'),warmRequests:median('warmRequests'),peak:median('peak')}},null,2));
