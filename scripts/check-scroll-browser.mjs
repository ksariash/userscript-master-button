// Real Chromium layout check on an isolated authored fixture. No live sites/network.
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'mb-scroll-'));
try {
 const entry=`import {SiteUtilities} from ${JSON.stringify(resolve('src/tools/sites.mjs'))};
 // Mock only the adapter URL on this local fixture; no public site is fetched.
 Object.defineProperty(document,'URL',{value:'https://www.reddit.com/fixture'});
 const checks=[];const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw new Error(name);};
 const tools=new SiteUtilities(document);const frame=()=>new Promise(r=>setTimeout(r,50));
 (async()=>{try{
 check('recognized Reddit nag',tools.startCleanup()===1);await frame();
 check('fixed HTML released',getComputedStyle(document.documentElement).position==='static');
 const feed=document.querySelector('#feed');check('feed pointer lock released',getComputedStyle(feed).pointerEvents==='auto');
 feed.scrollTop=600;window.scrollTo(0,500);await frame();
 check('feed or viewport scrolls with real layout',feed.scrollTop>0||window.scrollY>0);
 check('unrelated widget preserved',document.querySelector('aside').style.overflow==='hidden');
 document.querySelector('#compose').hidden=false;tools.cleanNags();
 check('compose suspends recovery',!tools.scroll.active&&getComputedStyle(document.documentElement).position==='fixed');
 document.querySelector('#compose').hidden=true;tools.cleanNags();await frame();check('recovery resumes',tools.scroll.active);
 tools.undo();check('Undo restores original root lock',document.documentElement.style.position==='fixed');check('Undo restores nag',document.querySelector('[data-testid="app-upsell"]').style.display!=='none');
 }catch(error){checks.push({error:error.message,passed:false});}finally{tools.stop();const result=document.createElement('pre');result.id='result';result.textContent=JSON.stringify(checks);document.body.append(result);}})();`;
 const compiled=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife',platform:'browser'});
 // Serve a fully bundled fixture on loopback; no remote page or resource.
 const {createServer}=await import('node:http');
 const html=`<!doctype html><html style="position:fixed;top:-120px;height:100vh;overflow:hidden"><body><main>First branch</main><section id="feed" style="height:500px;overflow:hidden;pointer-events:none;touch-action:pan-x"><main style="height:3000px">Delivered feed</main></section><aside style="overflow:hidden">Widget</aside><div data-testid="app-upsell" role="dialog">Get the app to keep using Reddit<button>Get the Reddit app</button></div><div id="compose" role="dialog" hidden><textarea>Compose</textarea></div><script>${compiled.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`;
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 // Async spawn leaves the local fixture server responsive.
 const {spawn}=await import('node:child_process');
 const args=['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-proxy-server',`--user-data-dir=${join(dir,'profile')}`,'--virtual-time-budget=3000','--dump-dom',`http://127.0.0.1:${port}/fixture`];
 let stdout='',stderr='';const child=spawn(process.env.MB_CHROMIUM||'chromium',args);
 child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 const timer=setTimeout(()=>child.kill('SIGKILL'),20000);
 let code;try{code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}finally{clearTimeout(timer);server.close();}
 const raw=stdout.match(/<pre id="result">(.*?)<\/pre>/s)?.[1];
 if(code!==0||!raw)throw new Error(`Chromium fixture did not complete (${code}): ${stderr.slice(-600)}`);
 const checks=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
 console.log(JSON.stringify({browser:spawnSync(process.env.MB_CHROMIUM||'chromium',['--version'],{encoding:'utf8'}).stdout.trim(),scope:'authored local fixture; layout only, not iPhone touch or live Reddit',checks},null,2));
 if(checks.some(c=>!c.passed))process.exitCode=1;
}finally{await rm(dir,{recursive:true,force:true});}
