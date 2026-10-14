import baseline from './baseline-head.json' with {type:'json'};import {classifyHead} from './head.mjs';
/** Require semantic nuisance support as well as the trained structural head.
 * Short links can look like widgets while offering translations/references. A
 * semantic disagreement is uncertainty, so layout evidence cannot erase them.
 */
export function assessFeatures(features,head=baseline){
 const result=classifyHead(head,features,{threshold:head.threshold??baseline.threshold});
 if(!features)return result;
 const translationSupport=features[6],articleSupport=Math.max(features[0],features[4],features[5],features[21]||0,features[22]||0),nuisanceSupport=Math.max(features[1],features[2],features[3],features[19]||0,features[20]||0);
 // The broad head failed on supporting references. Only these separately
 // evaluated conservative cases can exclude text; the rest are suggestions.
 const readingLinks=!!features[23]&&features[19]>=.7&&features[22]<=.25&&(features[7]>=.8||features[2]>=.4);
 const invitation=features[20]>=.95&&result.activation>=.5;
 const outsideArticle=result.activation>=.95&&!features[17]&&!features[8];
 const confidencePolicy=translationSupport>=.4?null:readingLinks?'reading-links':invitation?'invitation':outsideArticle?'outside-article':null;
 const evaluated=!!confidencePolicy&&head.conservativeExclusion===true;
 let label=evaluated?'NUISANCE':result.label;
 if(!evaluated&&label==='NUISANCE'&&head.validatedExclusion!==true)label='UNCERTAIN';
 if(translationSupport>=.4&&label==='NUISANCE')label='UNCERTAIN';
 // Absence of nuisance evidence does not positively identify article wording.
 if(label==='ARTICLE'&&(articleSupport<.55||nuisanceSupport>articleSupport-.1))label='UNCERTAIN';
 return{...result,label,validatedExclusion:label==='NUISANCE'&&(evaluated||head.validatedExclusion===true),confidencePolicy,rawHeadLabel:result.label,translationSupport,articleSupport,nuisanceSupport};
}
