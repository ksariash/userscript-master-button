import {execFileSync} from 'node:child_process';import {writeFile,mkdir,rm} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {performance} from 'node:perf_hooks';
const mode=process.argv[2];
if(mode){
 const {tone,workerFixture}=await import('../tests/helpers/mp3-worker.mjs');const {encodeMP3}=await import(mode==='before'?pathToFileURL(resolve('.cache/encoding-baseline.mjs')).href:'../src/speech/encoding.mjs');
 const pcm=tone(10),options=mode==='worker'?await workerFixture():{WorkerClass:null};let resources,last=performance.now(),maxGap=0,ticks=0;
 const timer=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;ticks++;},5),start=performance.now();
 const blob=await encodeMP3([pcm],{...options,onResources:r=>resources=r});const elapsedMs=performance.now()-start;await new Promise(r=>setTimeout(r,10));clearInterval(timer);
 if(process.env.MB_MP3_OUTPUT)await writeFile(process.env.MB_MP3_OUTPUT,new Uint8Array(await blob.arrayBuffer()));
 console.log(JSON.stringify({mode,elapsedMs,maxHeartbeatGapMs:maxGap,heartbeatTicks:ticks,mp3Bytes:blob.size,pcmBytes:pcm.byteLength,peakProcessRssBytes:process.resourceUsage().maxRSS*1024,resources}));
}else{
 await mkdir('.cache',{recursive:true});let baseline=execFileSync('git',['show','61800af:src/speech/export.mjs'],{encoding:'utf8'});baseline=baseline.replace(/from\s*'\.\/([^']+)'/g,(_m,p)=>`from '${pathToFileURL(resolve('src/speech',p)).href}'`);await writeFile('.cache/encoding-baseline.mjs',baseline);
 try{const rows=[];for(const mode of ['before','yielding','worker'])for(let round=0;round<3;round++)rows.push({round,...JSON.parse(execFileSync(process.execPath,['scripts/benchmark-encoding.mjs',mode],{encoding:'utf8'}))});console.log(JSON.stringify({scope:'Actual MP3 encoding of a 10-second synthetic 440 Hz tone in isolated Node processes; 5 ms main-thread heartbeat. Worker uses actual bundled encoder in node:worker_threads, not Safari. RSS includes full process/worker overhead, not just PCM.',node:process.version,rows},null,2));}finally{await rm('.cache/encoding-baseline.mjs',{force:true});}
}
