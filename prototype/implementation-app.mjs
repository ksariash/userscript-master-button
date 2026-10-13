import {start} from '../src/main.mjs';
async function initializeStudy(){
const params=new URLSearchParams(location.search),values=new Map(),gm={getValue:async(k,d)=>values.get(k)??d,setValue:async(k,v)=>values.set(k,v),deleteValue:async k=>values.delete(k),setClipboard:async()=>true,xmlHttpRequest:()=>Promise.reject(new Error('Preview: no Azure or extension request was sent.'))};
const instance=await start({document,gm,workerSource:'',WorkerClass:null,allowFrame:true,version:'2.0.0-alpha.1'}),app=instance.app;instance.settings.value.appearance=params.get('theme')==='dark'?'dark':'light';app.ui.appearance();
app.classifier.load=async()=>{throw new Error('Implementation preview: model downloads are not connected. Use the executable experiment for actual inference.');};
const promo=[...app.store.records.values()].find(p=>p.source?.node.id==='promo');if(params.get('skipped')==='1')app.store.correct(promo.id,'NUISANCE');app.ui.select(promo.id);
const view=params.get('view')||'menu';app.ui.open(view==='why'?'review':view);if(['review','why'].includes(view)){promo.source.node.scrollIntoView({block:'center'});app.ui.positionMarkers();}if(view==='why')app.ui.open('why');
document.documentElement.dataset.theme=instance.settings.value.appearance;if(params.get('page')==='busy')document.body.dataset.page='busy';
window.masterButtonImplementationStudy={snapshot:()=>app.store.snapshot(),show:mode=>app.ui.open(mode)};

}
initializeStudy().catch(error=>{const note=document.querySelector('.page-note');note.textContent='Preview startup failed: '+error.message;});
