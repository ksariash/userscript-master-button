import baseline from './baseline-head.json' with {type:'json'};import {classifyHead} from './head.mjs';
/** Require semantic nuisance support as well as the trained structural head.
 * Short links can look like widgets while offering translations/references. A
 * semantic disagreement is uncertainty, so layout evidence cannot erase them.
 */
export function assessFeatures(features,head=baseline){
 const result=classifyHead(head,features,{threshold:baseline.threshold});
 if(!features)return result;
 const translationSupport=features[6];
 return{...result,label:result.label==='NUISANCE'&&translationSupport>=.5?'UNCERTAIN':result.label,translationSupport};
}
