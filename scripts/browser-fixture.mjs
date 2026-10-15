import {spawn} from 'node:child_process';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {createServer} from 'node:http';import {tmpdir} from 'node:os';import {join} from 'node:path';
/** Isolated local Chromium harness; no external page or privileged extension APIs. */
export async function browserFixture(html,run){
 const dir=await mkdtemp(join(tmpdir(),'mb-fixture-')),server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=spawn(process.env.MB_CHROMIUM||'/usr/lib/chromium/chromium',['--headless','--no-sandbox','--disable-extensions','--disable-gpu','--disable-background-networking','--disable-dev-shm-usage','--no-first-run','--no-proxy-server','--remote-debugging-port=0',`--user-data-dir=${dir}/profile`,'about:blank'],{detached:true,env:{...process.env,XDG_CONFIG_HOME:dir,XDG_CACHE_HOME:dir}});browser.stderr.resume();let ws,stopping=false;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));const deadline=async p=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Local Chromium fixture timed out')),15000))]);}finally{clearTimeout(timer);}};
 try{
  let port;await deadline((async()=>{while(!stopping){try{port=Number((await readFile(`${dir}/profile/DevToolsActivePort`,'utf8')).split('\n')[0]);break;}catch{await wait(100);}}})());
  const tabs=await deadline(fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json()));ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await deadline(new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;}));
  let id=0;const pending=new Map();ws.onmessage=({data})=>{const m=JSON.parse(data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const call=(method,params={})=>deadline(new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));}));
  await call('Page.enable');await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});return await run(call,wait);
 }finally{stopping=true;ws?.close();try{process.kill(-browser.pid,'SIGKILL');}catch{}server.close();await rm(dir,{recursive:true,force:true});}
}
