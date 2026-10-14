import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{assessFeatures}from'../src/core/assessment.mjs';import baseline from'../src/core/baseline-head.json'with{type:'json'};
const measured=JSON.parse(await readFile(new URL('../experiments/evaluation/features-wasm-v11.json',import.meta.url))),byId=new Map(measured.rows.map(r=>[r.caseId,r]));
test('Recorded genuine model feature regression: conservative policy preserves all author-labeled ARTICLE cases; CI does not execute inference',()=>{
 assert.equal(measured.complete,true);assert.equal(measured.rows.length,731);let excluded=0;
 for(const row of measured.rows){const a=assessFeatures(row.features);if(a.validatedExclusion&&a.label==='NUISANCE'){excluded++;assert.equal(row.expected,'NUISANCE',row.caseId);}}
 assert.equal(excluded,56);assert.equal(baseline.validatedExclusion,false);assert.equal(baseline.conservativeExclusion,true);
});
test('Recorded BBC evidence: related-link groups exclude; positive caption, reference and uncertain oversized text stay included',()=>{
 for(const i of[25,26,27,28,29,30,66,67,68,69,70,71,73,74,75])assert.equal(assessFeatures(byId.get('bbc-dahl-current:'+i).features).validatedExclusion,true);
 for(const id of['bbc-dahl-current:51','w3c-headings:193','mdn-quote:270'])assert.equal(assessFeatures(byId.get(id).features).validatedExclusion,false,id);
 assert.equal(assessFeatures(null).label,'UNCERTAIN');assert.equal(assessFeatures(byId.get('bbc-dahl-current:26').features,{...baseline,conservativeExclusion:false}).validatedExclusion,false);
});
