/** Source selection for Read, separate from ARTICLE/NUISANCE decisions.
 * Keep the complete primary content container, including uncertain interruptions,
 * and every exact Defuddle member. Omitted inventory remains available in Review.
 */
export function articleScope(document,records){
 const mapped=records.filter(p=>p.extraction?.member&&p.source),roots=[...document.querySelectorAll('article,[role="article"],main,[role="main"]')].filter(n=>!n.closest('[data-master-button]'));
 const score=root=>mapped.filter(p=>p.source.nodes?.some(n=>root.contains(n))).reduce((sum,p)=>sum+p.originalText.length,0);
 const candidates=roots.map(root=>({root,score:score(root),size:records.filter(p=>p.source?.nodes?.some(n=>root.contains(n))).length})).filter(x=>x.size);
 candidates.sort((a,b)=>b.score-a.score||a.size-b.size);const primary=candidates[0]?.root;
 if(primary)return records.filter(p=>p.extraction?.member||p.source?.nodes?.some(n=>primary.contains(n))).map(p=>p.id);
 // Legacy unstructured pages keep the full span between exact extracted blocks.
 // A matching source headline before that span is retained as well.
 if(mapped.length){const first=records.indexOf(mapped[0]),last=records.indexOf(mapped.at(-1)),title=String(mapped[0].articleTitle||document.title).toLowerCase();return records.filter((p,i)=>i>=first&&i<=last||/^h[1-6]$/.test(p.tag)&&title.includes(p.originalText.toLowerCase())).map(p=>p.id);}
 return records.map(p=>p.id);
}
