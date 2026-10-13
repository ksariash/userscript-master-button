import { MODEL_WORKER_SOURCE } from './platform/worker-source.mjs';
import { Settings } from './platform/storage.mjs'; import { ArticleController } from './core/controller.mjs'; import { LocalClassifier } from './platform/classifier.mjs'; import { AzureClient } from './speech/azure.mjs'; import { SpeechSession } from './speech/session.mjs'; import { ExportJob } from './speech/export.mjs'; import { UtilityUI } from './ui/app.mjs';
export async function start({document=globalThis.document,gm=globalThis.GM,version=__VERSION__,workerSource=MODEL_WORKER_SOURCE,WorkerClass=globalThis.Worker,allowFrame=false,audioFactory=()=>document.createElement('audio')}={}){
  if(!document.body||document.documentElement.namespaceURI!=='http://www.w3.org/1999/xhtml')return null;const win=document.defaultView;if(win.top!==win.self&&!allowFrame)return null;
  if(document.querySelector('[data-master-button="host"]'))return null;
  const settings=new Settings(gm);let storageError='';try{await settings.load();}catch{storageError='Extension storage could not be read. Preferences are temporary; existing data was left untouched.';settings.persistent=false;}
  let app,retired=false;
  function mount(){
    let ui,classifier,speech;const controller=new ArticleController(document,settings,{onNavigate:()=>{if(retired)return;app.stop();mount();},onChange:e=>{ui?.patch(e);if(e.kind==='source')classifier?.scan();}}),store=controller.store;
    classifier=new LocalClassifier(store,{workerSource,WorkerClass,getSite:()=>settings.site(store.site),onState:state=>ui?.modelUpdate(state)});
    const client=new AzureClient({request:gm?.xmlHttpRequest?.bind(gm),getKey:()=>settings.getKey()}),audio=audioFactory();audio.className='utility-audio';audio.preload='auto';audio.setAttribute?.('playsinline','');
    speech=new SpeechSession(store,client,{audio,getConfig:()=>({...settings.value.speech,rate:settings.value.rate}),onState:s=>ui?.speechUpdate(s)});speech.title=controller.inventory.title;const exporter=new ExportJob(store,speech);
    ui=new UtilityUI({document,controller,settings,gm,classifier,speech,exporter,version});ui.shadow.append(audio);if(storageError)ui.notify(storageError);if(controller.extractionError)ui.notify(controller.extractionError);
    app={controller,store,classifier,speech,exporter,ui,stop(){exporter.cancel();classifier.dispose();speech.stop();ui.stop();controller.stop();}};
    const visibility=()=>{if(!document.hidden)classifier.scan();};document.addEventListener('visibilitychange',visibility);const originalStop=app.stop;app.stop=()=>{document.removeEventListener('visibilitychange',visibility);originalStop();};
  }
  mount();return {get app(){return app;},settings,stop(){retired=true;app.stop();}};
}
if(typeof __AUTO_START__!=='undefined'&&__AUTO_START__)start().catch(()=>{
  // Keep a failed injection observable without printing page data or secrets.
  const notice=document.createElement('div');notice.dataset.masterButton='failure';notice.textContent='Master Button could not start on this page. Reload after checking Userscripts permissions.';notice.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;padding:12px;background:#fffefa;color:#222927;font:14px system-ui;z-index:2147483646;border:1px solid #dedfd8;border-radius:12px;';document.documentElement.append(notice);setTimeout(()=>notice.remove(),10000);
});
