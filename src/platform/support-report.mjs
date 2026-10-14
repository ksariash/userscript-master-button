const known=['getValue','setValue','deleteValue','xmlHttpRequest','setClipboard'];
const bounded=value=>typeof value==='string'&&/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value)&&value.length<80?value:'unavailable';
/** Whitelist fields. Never include stored values, errors, headers, URLs or page text. */
export function supportReport({version,gm,settings,isSetup,connection={state:'not-run'}}){
  const info=gm?.info;
  return {product:'Master Button',installedVersion:bounded(version),manager:['Userscripts','Tampermonkey','Violentmonkey'].includes(info?.scriptHandler)?info.scriptHandler:'unavailable',managerVersion:bounded(info?.version),metadataVersion:bounded(info?.script?.version),injection:['content','auto','page'].includes(info?.script?.['inject-into'])?info.script['inject-into']:'unavailable',
    dedicatedSetup:isSetup===true,apis:Object.fromEntries(known.map(name=>[name,typeof gm?.[name]==='function'])),
    startup:['preferences-loaded','storage-api-missing','preferences-load-failed'].includes(settings.startupState)?settings.startupState:'not-read',
    storage:{state:['passed','failed','checking'].includes(settings.storageCheck?.state)?settings.storageCheck.state:'not-run',stage:['api','read','write','verify','cleanup','read-write-read-delete'].includes(settings.storageCheck?.stage)?settings.storageCheck.stage:null,code:['missing-storage-grants','readback-mismatch','probe-not-deleted','extension-operation-failed'].includes(settings.storageCheck?.code)?settings.storageCheck.code:null},
    azure:{state:['checking','passed','failed'].includes(connection.state)?connection.state:'not-run',code:['voice-list-ready','no-key','request-failed','no-compatible-voices'].includes(connection.code)?connection.code:null,voiceCount:Number.isInteger(connection.voiceCount)?connection.voiceCount:null,httpStatus:Number.isInteger(connection.httpStatus)&&connection.httpStatus>=200&&connection.httpStatus<=599?connection.httpStatus:null}};
}
