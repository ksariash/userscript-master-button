import test from 'node:test';
import assert from 'node:assert/strict';
import {exportFilename} from '../src/speech/filename.mjs';
import {shareFile,ExportJob} from '../src/speech/export.mjs';
import {DecisionStore} from '../core/decisions.mjs';
test('Title filenames preserve Unicode and reject path/control tricks and unsafe filesystem names',()=>{
 assert.equal(exportFilename('A café in 東京 🐈','txt'),'A café in 東京 🐈.txt');
 assert.equal(exportFilename(' ../A: "story"/next\\part?\n\u202e ','mp3'),'A story next part.mp3');
 for(const title of ['',null,undefined,'...','\u0000\u2066'])assert.equal(exportFilename(title,'txt'),'Master Button reading.txt');
 assert.equal(exportFilename('CON','txt'),'_CON.txt');assert.equal(exportFilename('LPT1.hidden','mp3'),'_LPT1.hidden.mp3');
 const long=exportFilename('😀'.repeat(200),'mp3');assert.ok(Buffer.byteLength(long)<=184);assert.equal(long.slice(0,-4),'😀'.repeat(45));
 assert.equal(exportFilename('e\u0301','txt'),'é.txt');assert.throws(()=>exportFilename('article','html'),/Unsupported/);
});
test('Prepared audio captures its title at preparation, independent of later title changes',async()=>{
 const store=new DecisionStore([{id:'a',originalText:'Original text'}]),config={region:'eastus',voice:'en-US-JennyNeural'},speech={getConfig:()=>config,ensure:async()=>({pcm:new ArrayBuffer(2),duration:1})};
 let finish;const exporter=new ExportJob(store,speech,{encode:()=>new Promise(resolve=>finish=resolve)}),options={title:'Original article'};
 const pending=exporter.prepare(options);await new Promise(r=>setImmediate(r));options.title='A different page';finish(new Blob(['mock'],{type:'audio/mpeg'}));
 assert.equal((await pending).filename,'Original article.mp3');assert.equal(exporter.currentArtifact().filename,'Original article.mp3');
});
test('Native share and download fallback receive the same title filename',async()=>{
 const name=exportFilename('Article title','txt'),blob=new Blob(['Words'],{type:'text/plain'}),shared=[];
 assert.equal(await shareFile(blob,name,{canShare:()=>true,share:async data=>shared.push(data.files[0])},null),'shared');assert.equal(shared[0].name,name);
 // Immediate fake timer avoids leaving an object-URL cleanup timer in the test runner.
 const oldTimer=globalThis.setTimeout,oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;let clicked,revoked;
 try{globalThis.setTimeout=fn=>{fn();};URL.createObjectURL=()=> 'blob:fixture';URL.revokeObjectURL=url=>revoked=url;
 const link={dataset:{},click(){clicked=this.download;},remove(){}},doc={createElement:()=>link,body:{append(){}}};
 assert.equal(await shareFile(blob,name,{},doc),'save requested');assert.equal(clicked,name);assert.equal(revoked,'blob:fixture');
 }finally{globalThis.setTimeout=oldTimer;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
});
