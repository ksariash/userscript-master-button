const STORAGE='master-button:v1';
const defaults=()=>({position:{right:14,bottom:105}, filter:{}, siteCleanup:{}, nsfw:true, autoMaps:true, playbackRate:1,fontSize:17, azure:{region:'eastus',voice:'en-US-JennyNeural',quality:'compact'}, rules:{}, learning:{}, learningEnabled:{}});
let prefs=defaults(), azureKey='', storageOK=false;
async function gmGet(k, def){if(typeof GM==='undefined'||typeof GM.getValue!=='function')return def;return await GM.getValue(k,def);}
async function gmSet(k,v){if(typeof GM==='undefined'||typeof GM.setValue!=='function')throw Error('Protected Userscripts storage unavailable');await GM.setValue(k,v);}
async function readSettings(){try{const saved=await gmGet(STORAGE,null);if(saved&&typeof saved==='object')prefs={...defaults(),...saved,azure:{...defaults().azure,...saved.azure}};azureKey=String(await gmGet(STORAGE+':azure','')||'');storageOK=typeof GM!=='undefined'&&typeof GM.setValue==='function';}catch(e){console.warn('[Master Button] Storage not accessible',e);}}
async function saveSettings(){try{await gmSet(STORAGE,prefs);}catch(e){notify('Cannot save settings; check Userscripts permissions.');}}
const domainKey=()=>location.hostname.toLowerCase().replace(/^www\./,'');
const filterEnabled=()=>prefs.filter[domainKey()]!==false;
const cleanupEnabled=()=>prefs.siteCleanup[siteName()]!==false;
