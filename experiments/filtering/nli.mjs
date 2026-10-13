import { pipeline, env } from '@huggingface/transformers';
export const NLI_MODEL = { id: 'Xenova/nli-deberta-v3-xsmall', revision: '2a4f614a701367a02d51389039afc998faeda637', base: 'cross-encoder/nli-deberta-v3-xsmall', dtype:'q8', license:'Apache-2.0', bytes:87246587, backend:'onnxruntime-node CPU', promptVersion:'nli-v1' };
export const LABELS = [
  'part of the actual article: narrative, explanation, analysis, quotation, heading, caption or a list',
  'a website widget soliciting a newsletter subscription, signup, purchase or app installation',
  'a related-story widget recommending links to other articles, outside the actual article'
];
export function nliInput(p, previous='', next='') {
  const context = t => String(t || '').replace(/\s+/g,' ').slice(0,120);
  return `Target webpage block: "${p.originalText}". HTML element: ${p.tag}. Page role: ${p.role}. ${p.linkCharacters > 0 ? 'Contains hyperlinks.' : 'Plain text.'} Article extraction: ${p.extraction?.member ? 'found' : 'not found, but preserved'}. Context before: "${context(previous)}". Context after: "${context(next)}".`;
}
export async function loadNLI(cacheDir) {
  env.cacheDir=cacheDir;
  const classifier = await pipeline('zero-shot-classification',NLI_MODEL.id,{revision:NLI_MODEL.revision,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
  return { async classify(p,previous,next) {
    const input=nliInput(p,previous,next), tokens=classifier.tokenizer(input).input_ids.data.length;
    if(tokens>430) return {label:'UNCERTAIN',raw:'UNCERTAIN',inputTokens:tokens,reason:'Full block exceeds the NLI context budget.',validatedExclusion:false};
    const output=await classifier(input,LABELS,{hypothesis_template:'The target webpage block is {}.',multi_label:false});
    const scores=Object.fromEntries(output.labels.map((l,i)=>[LABELS.indexOf(l),output.scores[i]]));
    const nuisance=Math.max(scores[1],scores[2]), label=nuisance>.8 && nuisance>scores[0] ? 'NUISANCE' : scores[0]>.6 ? 'ARTICLE' : 'UNCERTAIN';
    return {label,raw:label,inputTokens:tokens,scores,validatedExclusion:false,reason:'Local NLI language model assessment. Relative entailment scores are not calibrated probabilities.'};
  },dispose:()=>classifier.dispose() };
}
