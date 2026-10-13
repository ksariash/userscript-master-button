import {readFile,writeFile,mkdir} from 'node:fs/promises'; import {createHash} from 'node:crypto'; import {JSDOM} from 'jsdom'; import {SourceInventory} from '../src/core/source.mjs';
const spec=JSON.parse(await readFile('experiments/evaluation/fixtures.json','utf8')); await mkdir('experiments/evaluation/fixtures',{recursive:true}); const out=[];
const esc=s=>s.replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
for(const p of spec.pages){
 const pieces=p.blocks.map(([label,kind,text],index)=>{const [parent,child]=kind.includes(':')?kind.split(':'):[null,kind];const tag=(child||kind)==='link'?'p':child||kind; const body=(child||kind)==='link'?`<a href="/other/${index}">${esc(text)}</a>`:esc(text); const el=`<${tag} id="block-${index}">${body}</${tag}>`;return parent?`<${parent}>${el}</${parent}>`:el;});
 const html=`<!doctype html><html lang="en"><head><title>${esc(p.title)}</title></head><body><main><article>${pieces.join('\n')}</article></main></body></html>`;await writeFile(`experiments/evaluation/fixtures/${p.id}.html`,html);
 const dom=new JSDOM(html,{url:`https://${p.id}.example.org/story`}), records=new SourceInventory(dom.window.document,{documentId:p.id}).extract();
 const labels=p.blocks.map(([label],i)=>{const r=records.find(r=>r.source.node.id===`block-${i}`);if(!r)throw new Error(`Unmapped authored block ${p.id}:${i}`);return {index:r.index,textHash:createHash('sha256').update(r.originalText).digest('hex'),label};});
 out.push({id:p.id,url:`https://${p.id}.example.org/story`,layout:p.layout,split:p.split,htmlHash:createHash('sha256').update(html).digest('hex'),path:`fixtures/${p.id}.html`,labels}); dom.window.close();
}
await writeFile('experiments/evaluation/authored-pages.json',JSON.stringify({frozenAt:new Date().toISOString(),labeler:spec.labeler,provenance:'Original authored pages. Not captures or independent human labels.',pages:out},null,2)+'\n');console.log(`${out.length} pages, ${out.reduce((n,p)=>n+p.labels.length,0)} labels frozen.`);
