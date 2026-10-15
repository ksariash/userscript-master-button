/** One in-flight GM write and one coalesced snapshot. A timed-out write is not assumed canceled. */
export class PreferenceWriter {
  constructor(write,{timeout=3000,onState=()=>{}}={}){this.write=write;this.timeout=timeout;this.onState=onState;this.active=null;this.pending=null;this.blocked=false;}
  save(value){
    if(this.blocked)return Promise.reject(new Error('A preference write is still unresolved. Changes are temporary; reload to retry after Userscripts responds.'));
    if(this.pending){this.pending.value=value;return this.pending.promise;}
    let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});this.pending={value,promise,resolve,reject};this.drain();return promise;
  }
  async drain(){
    if(this.active||!this.pending)return;const job=this.active=this.pending;this.pending=null;this.onState({state:'saving'});
    const original=Promise.resolve().then(()=>this.write(job.value));let timer,timedOut=false;
    try{await Promise.race([original,new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(new Error('Preference save timed out. Its result is unknown; changes are temporary until storage responds.'));},this.timeout);})]);this.onState({state:'saved'});job.resolve(true);}
    catch(error){this.onState({state:'failed',operation:'write',message:error.message});job.reject(error);if(timedOut){this.blocked=true;if(this.pending){this.pending.reject(error);this.pending=null;}}}
    finally{clearTimeout(timer);if(timedOut)await original.catch(()=>{});this.active=null;this.blocked=false;this.drain();}
  }
}
