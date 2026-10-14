import test from 'node:test';import assert from 'node:assert/strict';import{Settings,SPEECH_KEY}from'../src/platform/storage.mjs';import{supportReport}from'../src/platform/support-report.mjs';
function mock(){const values=new Map();return{values,gm:{getValue:async(k,d)=>values.get(k)??d,setValue:async(k,v)=>values.set(k,v),deleteValue:async k=>values.delete(k)}};}
test('Storage diagnostic is key-free, cleans its probe and identifies a failed write/verify',async()=>{
 const {gm,values}=mock(),settings=new Settings(gm);values.set(SPEECH_KEY,'k'.repeat(32));assert.equal((await settings.checkStorage()).state,'passed');assert.deepEqual([...values.keys()],[SPEECH_KEY]);
 const failed=new Settings({...gm,setValue:async()=>{throw new Error('private response');}});assert.deepEqual(await failed.checkStorage(),{state:'failed',stage:'write',code:'extension-operation-failed'});
 const mismatch=new Settings({...gm,setValue:async()=>{}});assert.deepEqual(await mismatch.checkStorage(),{state:'failed',stage:'verify',code:'readback-mismatch'});
 assert.equal(JSON.stringify(failed.storageCheck).includes('private response'),false);
});
test('Key saving accepts opaque header-safe keys, verifies readback and never exposes storage exception text',async()=>{
 const {gm,values}=mock(),settings=new Settings(gm),key='ab+/=_-'.repeat(8);await settings.replaceKey(key);assert.equal(values.get(SPEECH_KEY),key);
 const failed=new Settings({...gm,setValue:async()=>{throw new Error(key);}});await assert.rejects(()=>failed.replaceKey(key),e=>!e.message.includes(key)&&/could not write/.test(e.message));
 const mismatch=new Settings({...gm,setValue:async()=>{}});await assert.rejects(()=>mismatch.replaceKey('x'.repeat(32)),/did not retain/);
 await assert.rejects(()=>settings.replaceKey('x'.repeat(32)+'\r\nInjected: bad'),/without spaces or line breaks/);
 await settings.forgetKey();assert.equal(values.has(SPEECH_KEY),false);
});
test('Support report whitelists fields and never includes key, settings, page, raw error, headers or storage names',()=>{
 const secret='k'.repeat(32),{gm}=mock(),settings=new Settings(gm);gm.info={scriptHandler:'Userscripts',version:'4.8.2',script:{version:'2.0.0-alpha.4','inject-into':'content'},headers:{key:secret},values:{key:secret}};settings.value.legacy={azureKey:secret};settings.storageCheck={state:'failed',stage:'write',code:'extension-operation-failed',message:secret};
 const report=supportReport({version:'2.0.0-alpha.4',gm,settings,isSetup:true,connection:{state:'failed',code:'request-failed',httpStatus:401,response:secret}});assert.equal(report.managerVersion,'4.8.2');assert.equal(report.injection,'content');assert.equal(report.azure.httpStatus,401);assert.equal(JSON.stringify(report).includes(secret),false);assert.equal('value' in report,false);
});
