import test from 'node:test'; import assert from 'node:assert/strict';
import { DecisionStore } from '../core/decisions.mjs'; import { AzureClient, ssml } from '../src/speech/azure.mjs'; import { SpeechSession } from '../src/speech/session.mjs';
import { ExportJob, transcript, encodeMP3 } from '../src/speech/export.mjs'; import { splitText, segmentsFor } from '../src/speech/audio.mjs';
class FakeAudio extends EventTarget {
  constructor() { super(); this.src=''; this.duration=1; this.currentTime=0; this.paused=true; this.playbackRate=1; this.plays=0; }
  pause() { this.paused=true; this.dispatchEvent(new Event('pause')); }
  async play() { this.paused=false; this.plays++; this.dispatchEvent(new Event('playing')); }
}
const config = {region:'eastus',voice:'en-US-JennyNeural',rate:1};
const pcm = () => new ArrayBuffer(48000);
const waitTick = () => new Promise(r=>setTimeout(r,0));
test('Mock Azure regional catalogue is required before paid synthesis; unavailable voice never sends text',async()=>{
 const requests=[];const client=new AzureClient({getKey:async()=> 'k'.repeat(32),request:async d=>{requests.push(d);if(d.method==='GET')return{status:200,responseText:JSON.stringify([{ShortName:'en-US-AriaNeural',DisplayName:'Aria',Locale:'en-US',LocaleName:'English (United States)',Gender:'Female',VoiceType:'Neural',Status:'GA'}])};return{status:200,response:pcm()};}});
 await assert.rejects(()=>client.synthesize('Do not send',config),/voice is unavailable/);assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');
 await client.synthesize('Original wording',{...config,voice:'en-US-AriaNeural'});assert.equal(requests.length,2);assert.equal(requests[1].method,'POST');assert.ok(requests[1].data.includes('Original wording'));
});
test('Mock cancellation clears only the owned system-media session and releases its audio source',async()=>{
 const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator'),metadataDescriptor=Object.getOwnPropertyDescriptor(globalThis,'MediaMetadata'),previous={title:'Website player'},handlers=new Map(),media={metadata:previous,setActionHandler:(name,handler)=>handlers.set(name,handler)};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaSession:media}});Object.defineProperty(globalThis,'MediaMetadata',{configurable:true,value:class{constructor(data){Object.assign(this,data);}}});
 try{const s=setup();await s.speech.play('a');assert.notEqual(media.metadata,previous);assert.equal(typeof handlers.get('play'),'function');s.speech.cancel();assert.equal(media.metadata,previous);assert.equal(handlers.get('play'),null);assert.equal(s.audio.src,'');
 await s.speech.play('a');const other={title:'New website player'};media.metadata=other;s.speech.cancel();assert.equal(media.metadata,other);s.speech.stop();
 }finally{navigatorDescriptor?Object.defineProperty(globalThis,'navigator',navigatorDescriptor):delete globalThis.navigator;metadataDescriptor?Object.defineProperty(globalThis,'MediaMetadata',metadataDescriptor):delete globalThis.MediaMetadata;}
});
const setup = request => {
  const store = new DecisionStore([{id:'a',originalText:'Original one.'},{id:'b',originalText:'Original two.'}],{documentId:'d'}), audio = new FakeAudio(), calls=[];
  const client = new AzureClient({getKey: async()=> 'k'.repeat(32),request: details=> {calls.push(details); return request ? request(details) : Promise.resolve({status:200,response:pcm()});}});
  client.voicesCache.set(config.region,[{id:config.voice,locale:'en-US'}]);
  const speech = new SpeechSession(store,client,{audio,getConfig:()=>config,makeURL:()=>`blob:test:${calls.length}`,revokeURL:()=>{}});
  return {store,audio,calls,speech,client};
};
test('Mock late resume cannot turn cancellation into a playing state',async()=>{
 const s=setup();await s.speech.play('a');await s.speech.toggle();let resolve;s.audio.play=()=>new Promise(r=>resolve=r);const resumed=s.speech.toggle();s.speech.cancel();resolve();await resumed;assert.equal(s.speech.status,'idle');assert.equal(s.speech.current,null);assert.equal(s.audio.src,'');s.speech.stop();
});
test('Mock Azure transport rechecks inclusion after awaiting the key and never sends a skipped block', async()=>{
  let unlock; const key = new Promise(r=>unlock=r), calls=[], store=new DecisionStore([{id:'a',originalText:'Never send'}],{documentId:'d'});
  const client=new AzureClient({getKey:()=>key,request:d=> {calls.push(d);return Promise.resolve({status:200,response:pcm()});}}), audio=new FakeAudio();
  client.voicesCache.set(config.region,[{id:config.voice,locale:'en-US'}]);
  const speech=new SpeechSession(store,client,{audio,getConfig:()=>config,makeURL:()=> 'blob:x',revokeURL:()=>{}}); const job=speech.play(); await waitTick(); store.correct('a','NUISANCE'); unlock('k'.repeat(32)); await job;
  assert.equal(calls.length,0); assert.equal(audio.plays,0); speech.stop();
});
test('Mock narration reuses compatible PCM after corrections, and late jobs cannot take over a new reading', async()=>{
  const {store,speech,audio,calls}=setup(); await speech.play('a'); await waitTick(); await waitTick(); const before=calls.length;
  store.correct('b','NUISANCE'); await speech.play('a'); assert.equal(calls.length,before); assert.equal(audio.plays,2);
  assert.ok(calls.every(d=>d.url==='https://eastus.tts.speech.microsoft.com/cognitiveservices/v1')); assert.ok(calls.every(d=>d.headers['Ocp-Apim-Subscription-Key']==='k'.repeat(32)));
  speech.stop();
  let release; const late=setup(()=>new Promise(r=>release=r)); const first=late.speech.play('a'); await waitTick(); late.speech.cancel(); release({status:200,response:pcm()}); await first; assert.equal(late.audio.plays,0); late.speech.stop();
});
test('Mock export aborts on selection changes and transcripts use exactly the enabled sequence', async()=>{
  let release; const s=setup(()=>new Promise(r=>release=r)); const exporter=new ExportJob(s.store,s.speech,{encode:async()=>new Blob(['mock'],{type:'audio/mpeg'})}); const job=exporter.prepare(); await waitTick(); s.store.correct('b','NUISANCE'); release({status:200,response:pcm()}); await assert.rejects(job,e=>e.name==='AbortError'); assert.equal(exporter.currentArtifact(),null); assert.equal(transcript(s.store.snapshot()),'Original one.'); s.store.undo(); assert.equal(transcript(s.store.snapshot()),'Original one.\n\nOriginal two.'); s.speech.stop();
});
test('Mock service failure does not retry invalid credentials or leak its response body', async()=>{
  let count=0; const client=new AzureClient({getKey:async()=> 'k'.repeat(32),request:()=>{count++;return Promise.resolve({status:401,responseText:'secret body'});}});
  client.voicesCache.set(config.region,[{id:config.voice,locale:'en-US'}]);
  await assert.rejects(client.synthesize('Safe text',config),e=>e.message.includes('key or region')&&!e.message.includes('secret')); assert.equal(count,1);
  assert.equal(ssml('<script>& "quote"',config.voice).includes('<script>'),false); assert.throws(()=>ssml('x','evil" onload="x'));
});
test('Long speech passages are not truncated, chunks maintain exact wording and distinct identities',()=>{
  const text='A long sentence with 😀 and punctuation. '.repeat(100); const chunks=splitText(text); assert.equal(chunks.map(x=>x.text).join(''),text); assert.ok(chunks.every(x=>x.text.length<=800));
  const segments=segmentsFor({passages:[{id:'a',revision:1,text}]}); assert.equal(new Set(segments.map(s=>s.id)).size,segments.length);
});
test('Actual local MP3 encoder produces a compact MPEG recording from PCM, separately from Azure',async()=>{
  const buffer=new ArrayBuffer(24000*2), view=new DataView(buffer); for(let i=0;i<24000;i++)view.setInt16(i*2,Math.sin(i/24000*Math.PI*2*440)*8000,true);
  const blob=await encodeMP3([buffer],{quality:'standard'}); assert.equal(blob.type,'audio/mpeg'); assert.ok(blob.size>5000&&blob.size<20000);
  const bytes=new Uint8Array(await blob.arrayBuffer()); assert.equal(bytes[0],0xff); assert.equal(bytes[1]&0xe0,0xe0);
});
test('Mock late voice demo is canceled before article playback or settings changes, and retired sessions cannot synthesize',async()=>{
 let release;const s=setup(()=>new Promise(r=>release=r));const demo=s.speech.demo();await waitTick();s.speech.cancel();release({status:200,response:pcm()});await demo;assert.equal(s.audio.plays,0);s.speech.stop();const before=s.calls.length;await assert.rejects(s.speech.play('a'),e=>e.name==='AbortError');assert.equal(s.calls.length,before);
});
test('Mock export sees a whole batch correction, cancels its stale job, and one Undo restores the exact transcript',async()=>{
 let release;const s=setup(()=>new Promise(r=>release=r)),exporter=new ExportJob(s.store,s.speech,{encode:async()=>new Blob(['mock'],{type:'audio/mpeg'})});
 try{const job=exporter.prepare();await waitTick();s.store.correctMany(['a','b'],'NUISANCE');release({status:200,response:pcm()});await assert.rejects(job,e=>e.name==='AbortError');assert.equal(exporter.currentArtifact(),null);assert.equal(transcript(s.store.snapshot()),'');assert.equal(s.store.undo(),true);assert.equal(transcript(s.store.snapshot()),'Original one.\n\nOriginal two.');}finally{exporter.cancel();s.speech.stop();}
});
