// Production UI with mock GM in a local preview. Never contacts Azure or uses a key.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(join(tmpdir(),'mb-reader-')),output=resolve('prototype/screenshots');
const html=await readFile('prototype/implementation.html');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=spawn(process.env.MB_CHROMIUM||'/usr/lib/chromium/chromium',['--headless','--no-sandbox','--disable-extensions','--disable-gpu','--disable-background-networking','--disable-dev-shm-usage','--no-first-run','--no-proxy-server','--remote-debugging-port=0',`--user-data-dir=${dir}/profile`,'about:blank'],{detached:true,env:{...process.env,XDG_CONFIG_HOME:dir,XDG_CACHE_HOME:dir}});
let stderr='',ws,stopping=false;browser.stderr.on('data',b=>stderr+=b);const rows=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const deadline=async(p,ms=10000)=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Chromium/CDP timeout')),ms))]);}finally{clearTimeout(timer);}};
try{
 let port;await deadline((async()=>{while(!stopping){try{port=Number((await readFile(`${dir}/profile/DevToolsActivePort`,'utf8')).split('\n')[0]);break;}catch{await delay(100);}}})());
 const tabs=await deadline(fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json()));const tab=tabs.find(t=>t.type==='page');if(!tab)throw new Error('No Chromium page target');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await deadline(new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;}));let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
 const call=(method,params={})=>deadline(new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));}));
 await call('Page.enable');await mkdir(output,{recursive:true});
 const cases=[...[[390,844],[320,568],[844,390]].map(([width,height])=>({width,height,view:'reader'})),...['menu','speech','why'].map(view=>({width:390,height:844,view})),{width:390,height:844,view:'reader',options:true},{width:320,height:568,view:'reader',options:true},{width:390,height:844,view:'reader',large:true},{width:390,height:420,view:'speech'}];
 for(const item of cases)for(const theme of ['light','dark']){
  const {width,height,view,options,large}=item;
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/?view=${view}&theme=${theme}&page=busy${options?'&options=1':''}${large?'&text=large':''}`});
  let metrics;for(let attempt=0;attempt<30;attempt++){const r=await call('Runtime.evaluate',{expression:'window.masterButtonImplementationStudy?.measure()',returnByValue:true});metrics=r.result?.value;if(metrics?.surface)break;await delay(100);}
  if(!metrics?.surface)throw new Error('Preview did not initialize');
  const shot=await call('Page.captureScreenshot',{format:'png'}),name=`${view}${options?'-options':''}${large?'-large-text':''}-${width}x${height}-${theme}.png`;await writeFile(join(output,name),Buffer.from(shot.data,'base64'));
  const ratio=metrics.reader?metrics.transcript.height/metrics.reader.height:null,small=metrics.controls.filter(c=>c.width<43.9||c.height<43.9),overflow=metrics.controls.filter(c=>c.x<-.5||c.right>width+.5||(!c.scrollable&&(c.y<-.5||c.bottom>height+.5)));
  rows.push({...item,theme,screenshot:name,transcriptRatio:ratio,small,overflow,passed:!small.length&&!overflow.length&&(view!=='reader'||width!==390||height!==844||large||ratio>=.7),metrics});
 }
 console.log(JSON.stringify({validation:'Desktop Chromium local mock preview; not Safari, VoiceOver or live Azure.',rows},null,2));await writeFile(join(output,'layout.json'),JSON.stringify(rows,null,2));if(rows.some(r=>!r.passed))process.exitCode=1;
}catch(error){console.error(JSON.stringify({blocked:error.message,stderr:stderr.slice(-1000),completed:rows.length}));process.exitCode=1;}
finally{stopping=true;ws?.close();try{process.kill(-browser.pid,'SIGKILL');}catch{}server.close();await rm(dir,{recursive:true,force:true});}
