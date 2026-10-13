import { MODEL_CONFIG, EXCLUSION_VALIDATED } from '../core/model-contract.mjs';
import { SiteHead } from '../core/site-head.mjs';
export class LocalClassifier {
  constructor(store,{workerSource=__MODEL_WORKER__,WorkerClass=globalThis.Worker,onState=()=>{},getSite=()=>({})}={}){
    this.store=store;this.workerSource=workerSource;this.WorkerClass=WorkerClass;this.onState=onState;this.getSite=getSite;this.status='unavailable';this.message='Local model has not been downloaded.';this.counter=0;this.pending=new Map();this.epoch=0;this.running=false;this.budget=200;this.head=new SiteHead(()=>[...this.store.examples.values()],{enabled:()=>this.getSite().learning!==false});
  }
  state(){this.onState({status:this.status,message:this.message,model:MODEL_CONFIG,exclusionValidated:EXCLUSION_VALIDATED});}
  async load(backend='wasm'){
    this.stop();const epoch=this.epoch;this.status='loading';this.message='Downloading the local model. Article text stays on this device.';this.state();
    try{
      if(!this.WorkerClass)throw new Error('This browser cannot create a local inference worker.');
      this.url=URL.createObjectURL(new Blob([this.workerSource],{type:'text/javascript'}));this.worker=new this.WorkerClass(this.url);
      this.worker.onmessage=e=>{if(e.data.progress){const p=e.data.progress;this.message=p.total?`${p.file||'Model'} · ${Math.round((p.loaded||0)/1024/1024)} / ${Math.round(p.total/1024/1024)} MB`:`Preparing ${p.file||'local inference'}…`;this.state();return;} const waiter=this.pending.get(e.data.id);if(!waiter)return;clearTimeout(waiter.timer);this.pending.delete(e.data.id);e.data.error?waiter.reject(new Error(e.data.error)):waiter.resolve(e.data.result);};
      this.worker.onerror=()=>{if(epoch===this.epoch)this.fail('The local inference worker was blocked or stopped. All uncertain text remains included.');};
      await this.call('load',{backend},180000);if(epoch!==this.epoch)return;this.status='ready';this.budget=200;this.message=EXCLUSION_VALIDATED?'Local classification ready.':'Experimental local model ready · exclusions have not met the benchmark.';this.state();this.scan();
    }catch(e){if(epoch!==this.epoch)return;this.fail(e.message);throw e;}
  }
  call(action,data,timeout=60000){return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Local inference timed out. Retry or continue with manual review.'));},timeout);this.pending.set(id,{resolve,reject,timer});this.worker?.postMessage({id,action,data});});}
  async scan(){
    if(this.running||this.status!=='ready'||!this.store.automatic||this.budget<=0||globalThis.document?.hidden)return;this.running=true;const epoch=this.epoch;
    try{
      const all=[...this.store.records.values()].filter(p=>p.scope==='page'); const pending=all.filter(p=>!p.automatic).sort((a,b)=>Number(b.extraction?.member)-Number(a.extraction?.member));
      for(const p of pending){
        if(epoch!==this.epoch||this.status!=='ready'||!this.store.automatic||this.budget<=0||globalThis.document?.hidden)break;this.budget--;
        const revision=p.revision,evidenceRevision=p.evidenceRevision,index=all.findIndex(x=>x.id===p.id), site=this.getSite();
        const assessment=await this.call('classify',{passage:{originalText:p.originalText,tag:p.tag,role:p.role,linkCharacters:p.linkCharacters,extraction:p.extraction,groupHeading:p.groupHeading,sameDocumentLinkRatio:p.sameDocumentLinkRatio,inArticle:p.inArticle,nearbyControls:p.nearbyControls},previous:all[index-1]?.originalText,next:all[index+1]?.originalText});
        if(epoch!==this.epoch)break;
        const learned=this.head.classify(assessment.features);Object.assign(assessment,learned,{validatedExclusion:EXCLUSION_VALIDATED,reason:assessment.features?learned.label==='NUISANCE'?'The local language model and classification head identify a website interruption.':learned.label==='ARTICLE'?'The local language model and classification head identify article content.':'The model is uncertain; original text stays included.':assessment.reason});
        this.store.assess(p.id,assessment,{documentId:this.store.documentId,revision,evidenceRevision});
        // Release the UI between blocks and stop preparation when hidden.
        await new Promise(r=>setTimeout(r,40));
      }
    }catch(e){if(epoch===this.epoch)this.fail(e.message);}finally{if(epoch!==this.epoch)return;this.running=false;if(this.budget<=0){this.message='Analysis paused after 200 passages. Analyze more from Model settings; all remaining text stays included.';this.state();}else if(this.status==='ready'&&this.store.automatic&&[...this.store.records.values()].some(p=>p.scope==='page'&&!p.automatic))setTimeout(()=>this.scan(),250);}
  }
  more(){this.budget=200;this.scan();}
  async proposeURL(url){if(this.status!=='ready')throw new Error('Load the local model in Model settings first.');const u=new URL(url);if(u.username||u.password)throw new Error('Remove embedded credentials first.');return this.call('url',{host:u.hostname,path:u.pathname,parameterNames:[...u.searchParams.keys()]});}
  fail(message){this.status='failed';this.message=message;this.epoch++;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(message));}this.pending.clear();this.worker?.terminate();this.state();}
  stop(){this.epoch++;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Local inference canceled.'));}this.pending.clear();this.worker?.terminate();this.worker=null;if(this.url)URL.revokeObjectURL(this.url);this.status='unavailable';this.running=false;}
}
