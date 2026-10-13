import {readFile,writeFile,mkdir} from 'node:fs/promises'; import {createHash} from 'node:crypto'; import {JSDOM} from 'jsdom'; import {performance} from 'node:perf_hooks'; import {SourceInventory} from '../../src/core/source.mjs'; import {loadCandidate,CANDIDATES} from '../filtering/candidate.mjs';
const spec=[...JSON.parse(await readFile('experiments/evaluation/real-pages.json')).pages,...JSON.parse(await readFile('experiments/evaluation/authored-pages.json')).pages];
const split=process.env.MB_SPLIT || 'development', config={...CANDIDATES[process.env.MB_CANDIDATE||'qwen'],promptVersion:'block-v5'}, rows=[], pages=[]; const cases=[];
const out=`experiments/evaluation/results-${process.env.MB_CANDIDATE||'qwen'}-v5-${split}.json`;
for(const p of spec.filter(p=>p.split===split)){
 const path=p.path?`experiments/evaluation/${p.path}`:`.cache/evaluation/${p.id}.html`; const html=await readFile(path,'utf8');if(createHash('sha256').update(html).digest('hex')!==p.htmlHash)throw new Error(`Capture changed: ${p.id}`);
 const dom=new JSDOM(html,{url:p.url}), inventory=new SourceInventory(dom.window.document,{documentId:p.id}), passages=inventory.extract();
 for(const label of p.labels){const passage=passages.find(x=>x.index===label.index);if(!passage||createHash('sha256').update(passage.originalText).digest('hex')!==label.textHash)throw new Error(`Label mapping changed: ${p.id}:${label.index}`);cases.push({p,passage,label,previous:passages.find(x=>x.index===passage.index-1)?.originalText,next:passages.find(x=>x.index===passage.index+1)?.originalText});}
 pages.push({id:p.id,url:p.url,layout:p.layout,split:p.split,htmlHash:p.htmlHash,labels:p.labels.length,mappingFailures:0}); dom.window.close();
}
const report={date:new Date().toISOString(),validationClass:'actual local tensor inference on desktop Node CPU; not iPhone or browser validation',model:config,split,labeler:'Implementation author labels frozen before benchmark inference; not independently audited',pages,rows,status:'loading',thresholdPolicy:'Strict generated label; no calibrated score. No automatic exclusion unless finite-corpus release targets pass.'};
await writeFile(out,JSON.stringify(report,null,2)+'\n'); console.log(`${cases.length} ${split} cases on ${pages.length} pages.`);
const t=performance.now();let model;
try{
 model=await loadCandidate(config,'.cache/model');report.startupMs=Math.round(performance.now()-t);report.status='ready';
 for(const c of cases){const start=performance.now(), a=await model.classify(c.passage,c.previous,c.next); rows.push({caseId:`${c.p.id}:${c.label.index}`,expected:c.label.label,suggested:a.label,inputTokens:a.inputTokens,textHash:c.label.textHash,latencyMs:Math.round(performance.now()-start),extraction:c.passage.extraction});console.log(`${rows.length}/${cases.length} ${rows.at(-1).caseId}: ${c.label.label} -> ${a.label}`);await writeFile(out,JSON.stringify(report,null,2)+'\n');}
 const tp=rows.filter(r=>r.expected==='NUISANCE'&&r.suggested==='NUISANCE').length,fp=rows.filter(r=>r.expected==='ARTICLE'&&r.suggested==='NUISANCE').length,nuisance=rows.filter(r=>r.expected==='NUISANCE').length;const times=rows.map(r=>r.latencyMs).sort((a,b)=>a-b);
 report.metrics={total:rows.length,article:rows.length-nuisance,nuisance,articleFalseExclusions:fp,nuisancePrecision:tp+fp?tp/(tp+fp):null,nuisanceRecall:tp/nuisance,abstentions:rows.filter(r=>r.suggested==='UNCERTAIN').length,medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.ceil(times.length*.95)-1]};
 report.finiteTargetsPassed=fp===0&&report.metrics.nuisancePrecision>=.95&&report.metrics.nuisanceRecall>=.85;
}catch(e){report.status='failed';report.failure=String(e.message).slice(0,400);process.exitCode=1;}
report.elapsedMs=Math.round(performance.now()-t);try{report.processPeakRssBytes=process.resourceUsage().maxRSS*1024}catch{report.processPeakRssBytes=null;}await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,metrics:report.metrics,finiteTargetsPassed:report.finiteTargetsPassed}));if(model)await Promise.race([model.dispose(),new Promise(r=>setTimeout(r,2000))]);
