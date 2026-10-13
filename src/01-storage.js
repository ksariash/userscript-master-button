const STORAGE='master-button:v1';
const defaults=()=>({position:{right:14,bottom:105},filter:{},siteCleanup:{},nsfw:true,autoMaps:true,playbackRate:1,fontSize:17,azure:{region:'eastus',voice:'en-US-JennyNeural',quality:'compact'},rules:{},learning:{},learningEnabled:{},semanticAuto:true,semanticExamples:{},semanticThreshold:0.79,semanticSeedThreshold:0.89,hideSkipped:false,schemaVersion:2});
let prefs=defaults(),azureKey='',storageOK=false,settingsQueue=Promise.resolve();
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safeEntries=v=>record(v)?Object.entries(v).filter(([k])=>!['__proto__','constructor','prototype'].includes(k)):[];
function normalizeExamples(raw){
 const values=Array.isArray(raw)?raw:record(raw)&&Array.isArray(raw.examples)?raw.examples:safeEntries(raw).map(([,v])=>v);
 return values.filter(x=>record(x)&&['keep','skip'].includes(x.d)&&Array.isArray(x.v)&&x.v.length>0&&x.v.length<=1024&&x.v.every(Number.isFinite)).slice(-24).map(x=>({h:String(x.h||''),d:x.d,reason:typeof x.reason==='string'?x.reason:'offtopic',v:x.v,contextV:Array.isArray(x.contextV)&&x.contextV.length===x.v.length&&x.contextV.every(Number.isFinite)?x.contextV:undefined}));
}
function normalizeSettings(saved){
 const d=defaults(),s=record(saved)?saved:{};const p={...d,...Object.fromEntries(safeEntries(s))};
 for(const k of ['filter','siteCleanup','learningEnabled'])p[k]=Object.fromEntries(safeEntries(s[k]).filter(([,v])=>typeof v==='boolean'));
 p.rules=Object.fromEntries(safeEntries(s.rules).map(([k,v])=>[k,Array.isArray(v)?v.filter(r=>record(r)&&typeof r.selector==='string').slice(0,100):[]]));
 p.learning=Object.fromEntries(safeEntries(s.learning).map(([k,v])=>[k,Object.fromEntries(safeEntries(v).filter(([,x])=>record(x)&&Number.isFinite(x.keep)&&Number.isFinite(x.skip)).map(([h,x])=>[h,{keep:Math.max(0,Math.min(30,x.keep)),skip:Math.max(0,Math.min(30,x.skip))}]))]));
 p.semanticExamples=Object.fromEntries(safeEntries(s.semanticExamples).map(([k,v])=>[k,normalizeExamples(v)]));
 p.azure={...d.azure,...Object.fromEntries(safeEntries(s.azure))};p.position={...d.position,...Object.fromEntries(safeEntries(s.position))};
 for(const k of ['right','bottom'])if(!Number.isFinite(p.position[k])||p.position[k]<0)p.position[k]=d.position[k];
 for(const k of ['semanticThreshold','semanticSeedThreshold'])p[k]=Number.isFinite(p[k])?Math.max(.6,Math.min(.96,p[k])):d[k];
 p.playbackRate=Number.isFinite(p.playbackRate)?Math.max(.5,Math.min(2,p.playbackRate)):1;
 p.fontSize=Number.isFinite(p.fontSize)?Math.max(14,Math.min(26,p.fontSize)):17;
 for(const k of ['nsfw','autoMaps','semanticAuto','hideSkipped'])if(typeof p[k]!=='boolean')p[k]=d[k];
 p.schemaVersion=2;return p;
}
async function gmGet(k,def){if(typeof GM==='undefined'||typeof GM.getValue!=='function')return def;return await GM.getValue(k,def);}
async function gmSet(k,v){if(typeof GM==='undefined'||typeof GM.setValue!=='function')throw Error('Protected Userscripts storage unavailable');await GM.setValue(k,v);}
async function readSettings(){try{prefs=normalizeSettings(await gmGet(STORAGE,null));azureKey=String(await gmGet(STORAGE+':azure','')||'');storageOK=typeof GM!=='undefined'&&typeof GM.setValue==='function';}catch(e){console.warn('[Master Button] Storage not accessible',e);}}
function saveSettings(){
 // Snapshot and serialize writes: slower earlier requests must not overwrite later choices.
 const snapshot=JSON.parse(JSON.stringify(prefs));
 const work=settingsQueue.catch(()=>{}).then(()=>gmSet(STORAGE,snapshot));settingsQueue=work;
 return work.then(()=>true,()=>{notify('Cannot save settings; check Userscripts permissions.');return false;});
}
const domainKey=()=>location.hostname.toLowerCase().replace(/^www\./,'');
const filterEnabled=()=>prefs.filter[domainKey()]!==false;
const cleanupEnabled=()=>prefs.siteCleanup[siteName()]!==false;
