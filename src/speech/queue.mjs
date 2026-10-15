/** Serial transport: interactive work overtakes queued background work, never a live request. */
export class SpeechQueue {
  constructor(){this.pending=[];this.active=false;}
  run(task,{signal,priority=()=>0}={}){
    return new Promise((resolve,reject)=>{
      const job={task,priority,resolve,reject,signal};
      job.abort=()=>{const i=this.pending.indexOf(job);if(i<0)return;this.pending.splice(i,1);reject(new DOMException('Canceled','AbortError'));};
      this.pending.push(job);signal?.addEventListener('abort',job.abort,{once:true});
      if(signal?.aborted)job.abort();
      queueMicrotask(()=>this.drain());
    });
  }
  async drain(){
    if(this.active)return;this.active=true;
    try{while(this.pending.length){
      // Stable sort preserves FIFO within a priority; priority can increase when playback joins a job.
      this.pending.sort((a,b)=>b.priority()-a.priority());const job=this.pending.shift();job.signal?.removeEventListener('abort',job.abort);
      try{job.resolve(await job.task());}catch(error){job.reject(error);}
    }}finally{this.active=false;}
  }
}
