import {abortError} from './azure.mjs';
/** One synthesis per cache key, with independent cancellation for each consumer. */
export class PreparationPool {
  constructor(onValue){this.jobs=new Map();this.onValue=onValue;}
  join(key,{signal,valid,priority=0},perform){
    if(signal?.aborted||!valid())return Promise.reject(abortError());
    let job=this.jobs.get(key);
    if(!job||job.controller.signal.aborted){
      job={controller:new AbortController(),consumers:new Set()};this.jobs.set(key,job);
      const current=job,usable=()=>[...current.consumers].some(c=>!c.signal?.aborted&&c.valid());
      Promise.resolve().then(()=>{if(!usable())throw abortError();return perform(current.controller.signal,usable,()=>Math.max(0,...[...current.consumers].map(c=>c.priority)));}).then(value=>{
        if(current.controller.signal.aborted||!usable())throw abortError();
        if(this.jobs.get(key)===current)this.jobs.delete(key);
        this.onValue(key,value);
        for(const c of [...current.consumers])c.finish(c.valid()?null:abortError(),value);
      }).catch(error=>{if(this.jobs.get(key)===current)this.jobs.delete(key);for(const c of [...current.consumers])c.finish(error);}).finally(()=>{if(this.jobs.get(key)===current)this.jobs.delete(key);});
    }
    const current=job;
    return new Promise((resolve,reject)=>{
      const consumer={signal,valid,priority,finish:(error,value)=>{signal?.removeEventListener('abort',abort);current.consumers.delete(consumer);error?reject(error):resolve(value);}};
      const abort=()=>{consumer.finish(abortError());if(!current.consumers.size){current.controller.abort();if(this.jobs.get(key)===current)this.jobs.delete(key);}};
      current.consumers.add(consumer);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    });
  }
  stop(){for(const job of this.jobs.values()){job.controller.abort();for(const c of [...job.consumers])c.finish(abortError());}this.jobs.clear();}
}
