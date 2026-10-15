import { MODEL_WORKER_SOURCE } from './worker-source.mjs';
import { MODEL_CONFIG, EXCLUSION_VALIDATED, CONSERVATIVE_EXCLUSION } from '../core/model-contract.mjs';
import { SiteHead } from '../core/site-head.mjs';
export class LocalClassifier {
  constructor(store,{workerSource=MODEL_WORKER_SOURCE,WorkerClass=globalThis.Worker,onState=()=>{},getSite=()=>({})}={}){
    this.store=store;this.workerSource=workerSource;this.WorkerClass=WorkerClass;this.onState=onState;this.getSite=getSite;this.status='unavailable';this.message='Local model has not been downloaded.';this.counter=0;this.pending=new Map();this.epoch=0;this.running=false;this.budget=200;this.head=new SiteHead(()=>[...this.store.examples.values()],{enabled:()=>this.getSite().learning!==false});this.head.refresh();this.unsubscribe=store.subscribe(()=>this.reassess());
  }
  state(){this.onState({status:this.status,message:this.message,model:MODEL_CONFIG,exclusionValidated:EXCLUSION_VALIDATED,conservativeExclusion:CONSERVATIVE_EXCLUSION});}
  async load(backend='wasm'){
    this.stop();const epoch=this.epoch;this.status='loading';this.message='Downloading the local model. Article text stays on this device.';this.state();
    try{
      if(!this.WorkerClass)throw new Error('This browser cannot create a local inference worker.');
      this.url=URL.createObjectURL(new Blob([this.workerSource],{type:'text/javascript'}));this.worker=new this.WorkerClass(this.url);
      this.worker.onmessage=e=>{if(e.data.progress){const p=e.data.progress;this.message=p.total?`${p.file||'Model'} · ${Math.round((p.loaded||0)/1024/1024)} / ${Math.round(p.total/1024/1024)} MB`:`Preparing ${p.file||'local inference'}…`;this.state();return;} const waiter=this.pending.get(e.data.id);if(!waiter)return;clearTimeout(waiter.timer);this.pending.delete(e.data.id);e.data.error?waiter.reject(new Error(e.data.error)):waiter.resolve(e.data.result);};
      this.worker.onerror=()=>{if(epoch===this.epoch)this.fail('The local inference worker was blocked or stopped. All uncertain text remains included.');};
      await this.call('load',{backend},180000);if(epoch!==this.epoch)return;this.releaseURL();this.status='ready';this.budget=200;this.message=CONSERVATIVE_EXCLUSION?'Conservative local filter ready. Uncertain passages remain included; broader recall still misses the target.':EXCLUSION_VALIDATED?'Local classification ready.':'Experimental local model ready · suggestions only.';this.state();this.scan();
    }catch(e){if(epoch!==this.epoch)return;this.fail(e.message);throw e;}
  }
  call(action,data,timeout=60000){return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Local inference timed out. Retry or continue with manual review.'));},timeout);this.pending.set(id,{resolve,reject,timer});this.worker?.postMessage({id,action,data});});}
  async scan(){
    if(this.running||this.status!=='ready'||!this.store.automatic||this.budget<=0||globalThis.document?.hidden)return;this.running=true;const epoch=this.epoch;
    try{
      const all=[...this.store.records.values()].filter(p=>p.scope==='page'),reading=new Set(this.store.reading().map(p=>p.id)); const pending=all.filter(p=>!p.automatic).sort((a,b)=>Number(reading.has(b.id))-Number(reading.has(a.id))||Number(b.extraction?.member)-Number(a.extraction?.member));
      for(const p of pending){
        if(epoch!==this.epoch||this.status!=='ready'||!this.store.automatic||this.budget<=0||globalThis.document?.hidden)break;this.budget--;
        const revision=p.revision,evidenceRevision=p.evidenceRevision,index=all.findIndex(x=>x.id===p.id), site=this.getSite();
        const assessment=await this.call('classify',{passage:{articleTitle:p.articleTitle,linkContext:p.linkContext,originalText:p.originalText,tag:p.tag,role:p.role,linkCharacters:p.linkCharacters,extraction:p.extraction,groupHeading:p.groupHeading,sameDocumentLinkRatio:p.sameDocumentLinkRatio,inArticle:p.inArticle,nearbyControls:p.nearbyControls},previous:all[index-1]?.originalText,next:all[index+1]?.originalText});
        if(epoch!==this.epoch)break;
        const learned=this.head.classify(assessment.features);Object.assign(assessment,learned,{reason:assessment.features?learned.label==='NUISANCE'?learned.confidencePolicy==='reading-links'?'The local model identifies this outgoing-link group as recommended reading, with weak supporting-reference evidence.':learned.confidencePolicy==='invitation'?'The local model identifies a promotional invitation.':'The local model and head strongly identify page chrome outside article content.':learned.label==='ARTICLE'?'Positive local-model evidence supports article content.':'The model is uncertain; original text stays included.':assessment.reason});
        this.store.assess(p.id,assessment,{documentId:this.store.documentId,revision,evidenceRevision});
        // Release the UI between blocks and stop preparation when hidden.
        await new Promise(r=>setTimeout(r,40));
      }
    }catch(e){if(epoch===this.epoch)this.fail(e.message);}finally{if(epoch!==this.epoch)return;this.running=false;if(this.budget<=0){this.message='Analysis paused after 200 passages. Analyze more from Model settings; all remaining text stays included.';this.state();}else if(this.status==='ready'&&this.store.automatic&&[...this.store.records.values()].some(p=>p.scope==='page'&&!p.automatic))setTimeout(()=>this.scan(),250);}
  }
  more(){this.budget=200;this.scan();}
  reassess(){
    if(this.reassessing||!this.head.refresh())return;this.reassessing=true;
    try{for(const p of this.store.records.values())if(p.automatic?.features){
      const learned=this.head.classify(p.automatic.features);if(learned.label===p.automatic.label&&learned.siteActivation===p.automatic.siteActivation)continue;
      const assessment={...p.automatic,...learned,reason:learned.label==='UNCERTAIN'?'Your remembered examples make this assessment uncertain; original text stays included.':learned.label==='ARTICLE'?'Positive local-model evidence supports article content.':'The local model identifies a conservative nuisance exclusion.'};
      this.store.assess(p.id,assessment,{documentId:this.store.documentId,revision:p.revision,evidenceRevision:p.evidenceRevision});
    }}finally{this.reassessing=false;}
  }
  async proposeURL(url){if(this.status!=='ready')throw new Error('Load the local model in Model settings first.');const u=new URL(url);if(u.username||u.password)throw new Error('Remove embedded credentials first.');return this.call('url',{host:u.hostname,path:u.pathname,parameterNames:[...u.searchParams.keys()]});}
  releaseURL(){if(this.url){URL.revokeObjectURL(this.url);this.url=null;}}
  fail(message){this.status='failed';this.message=message;this.epoch++;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(message));}this.pending.clear();this.worker?.terminate();this.worker=null;this.running=false;this.releaseURL();this.state();}
  stop(){this.epoch++;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Local inference canceled.'));}this.pending.clear();this.worker?.terminate();this.worker=null;this.releaseURL();this.status='unavailable';this.running=false;}
  dispose(){this.stop();this.unsubscribe();}
}
