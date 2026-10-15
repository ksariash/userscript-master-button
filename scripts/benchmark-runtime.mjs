// Synthetic local CPU baseline. No model, Azure, browser layout or network.
import {performance} from 'node:perf_hooks';
import {JSDOM} from 'jsdom';
import {DecisionStore} from '../core/decisions.mjs';
import {SourceInventory} from '../src/core/source.mjs';
import {SpeechSession} from '../src/speech/session.mjs';
import {ScrollRecovery} from '../src/tools/scroll-recovery.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
function measure(run,n=7){run();const times=[];for(let i=0;i<n;i++){const t=performance.now();run();times.push(performance.now()-t);}return +median(times).toFixed(3);}
const report={environment:{node:process.version,platform:process.platform},kind:'synthetic CPU median; not iPhone, real inference, or Azure latency',metrics:{}};
for(const count of [50,200]){
 const html=`<!doctype html><title>Benchmark article</title><main><article>${Array.from({length:count},(_,i)=>`<p>Paragraph ${i}. ${'Original narrative with a source reference. '.repeat(12)}</p>`).join('')}</article></main>`;
 const dom=new JSDOM(html,{url:'https://example.test/article'}),inventory=new SourceInventory(dom.window.document);
 report.metrics[`inventory_scan_${count}_ms`]=measure(()=>inventory.scan());
 report.metrics[`extract_${count}_ms`]=measure(()=>inventory.extract(),3);
 const store=new DecisionStore(inventory.scan()),audio={addEventListener(){},removeEventListener(){},pause(){},src:'',currentTime:0,duration:NaN};
 const speech=new SpeechSession(store,{}, {audio,getConfig:()=>({region:'eastus',voice:'en-US-JennyNeural'}),onState:()=>{}});
 report.metrics[`speech_emit_100x_${count}_ms`]=measure(()=>{for(let i=0;i<100;i++)speech.emit();});speech.stop();dom.window.close();
}
const dom=new JSDOM('<main><p>Delivered post</p></main>',{url:'https://x.com/a'}),recovery=new ScrollRecovery(dom.window.document,{allowed:()=>true});
report.metrics.scroll_release_20x_ms=measure(()=>{for(let i=0;i<20;i++)recovery.release();});recovery.stop();dom.window.close();
console.log(JSON.stringify(report,null,2));
