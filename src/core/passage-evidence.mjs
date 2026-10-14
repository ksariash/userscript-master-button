import{PASSAGE_DESCRIPTIONS,FEATURE_MODEL}from'./language-features.mjs';
export const LINK_DESCRIPTIONS=['a recommended reading list','citations or reference links supporting the article'];
export async function passageEvidence(model,passage,cache=new Map()){
 const raw=await model.scores(passage.originalText,PASSAGE_DESCRIPTIONS);let reference=0,groupUsed=0;
 if(passage.linkContext&&model.tokenCount(passage.linkContext)<=FEATURE_MODEL.contextTokens){
  let group=cache.get(passage.linkContext);
  if(!group){group=await model.scores(passage.linkContext,LINK_DESCRIPTIONS);if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(passage.linkContext,group);}
  raw[0]=group[0];reference=group[1];groupUsed=1;
 }
 return[...raw,reference,groupUsed];
}
