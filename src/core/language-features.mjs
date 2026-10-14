export const FEATURE_MODEL={id:'Xenova/nli-deberta-v3-xsmall',revision:'2a4f614a701367a02d51389039afc998faeda637',dtype:'q8',license:'Apache-2.0',weightBytes:87246587,contextTokens:460,labelsVersion:'function-v11-positive-article-links'};
export const DESCRIPTIONS=[
 'part of the main article narrative, introduction, headline or image caption',
 'an advertisement, commercial offer or an invitation to sign up, subscribe, or download an app',
 'a website widget recommending other stories to read',
 'website menu navigation or footer links',
 'a quotation, reference or list supporting the main article',
 'the main article publication date, author byline or reading time',
 'a translation of the same main article into another language'
];
// These additional entailment tests use the unmodified passage, separate from
// its HTML context. Positive caption evidence counters short-text exclusions.
export const PASSAGE_DESCRIPTIONS=['a recommended reading list','a social media or newsletter invitation','a caption or photo credit'];
export function featureInput(p,previous='',next=''){
 const short=t=>String(t||'').replace(/\s+/g,' ').slice(0,100);
 return `Main article title: ${short(p.articleTitle)}.\nWebpage passage: ${p.originalText}\nHTML type: ${p.tag}. Location: ${p.role}. Inside article: ${p.inArticle?'yes':'no'}. Defuddle retained this passage: ${p.extraction?.member?'yes':'no'}. Linked text: ${Math.round((p.linkCharacters||0)/Math.max(p.originalText.length,1)*100)}%. Group heading: ${short(p.groupHeading)||'none'}. Nearby controls: ${(p.nearbyControls || []).join(', ') || 'none'}. Previous passage: ${short(previous)}. Following passage: ${short(next)}.`;
}
export function structuralFeatures(p){
 const text=p.originalText;
 return [Math.min(1,(p.linkCharacters||0)/Math.max(text.length,1)), Number(!!p.extraction?.member),Number(p.role==='aside'),Number(['nav','header','footer'].includes(p.role)),Number(p.role==='header'),Number(p.role==='footer'),Number(/^h[1-6]$/.test(p.tag)),Number(p.tag==='li'),Math.min(text.length,500)/500,p.sameDocumentLinkRatio || 0,Number(!!p.inArticle),Number(['article-header','article-nav','article-footer'].includes(p.role))];
}
