/** Bounded consecutive outgoing links, with their original introductory row.
 * This supplies context to the language model; it never assigns a decision.
 */
export function attachLinkContext(records){
 const linked=p=>p.sameDocumentLinkRatio===0&&(p.linkCharacters||0)/Math.max(1,p.originalText.length)>=.8;
 const root=p=>p.source?.node.closest('article,[role="article"],main,[role="main"]');
 for(let i=0;i<records.length;i++){
  if(!linked(records[i]))continue;let end=i+1;
  while(end<records.length&&end-i<8&&linked(records[end])&&records[end].role===records[i].role&&root(records[end])===root(records[i]))end++;
  if(end-i<2)continue;
  const before=records[i-1],intro=before&&before.originalText.length<=160&&!linked(before)&&before.role===records[i].role&&root(before)===root(records[i])?before:null;
  const after=records[end],closing=after&&after.tag==='p'&&after.originalText.length<=120&&!linked(after)&&after.role===records[i].role&&root(after)===root(records[i])?after:null;
  const group=[...(intro?[intro]:[]),...records.slice(i,end)],text=[...group,...(closing?[closing]:[])].map(p=>p.originalText).join('\n');
  if(text.length<=800)for(const p of group)p.linkContext=text;
  i=end-1;
 }
 return records;
}
