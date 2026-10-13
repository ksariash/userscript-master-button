export const FEATURE_MODEL={id:'Xenova/nli-deberta-v3-xsmall',revision:'2a4f614a701367a02d51389039afc998faeda637',dtype:'q8',license:'Apache-2.0',weightBytes:87246587,contextTokens:460,labelsVersion:'function-v7-translations'};
export const DESCRIPTIONS=[
 'informative article prose telling a story or explaining a subject',
 'an advertisement, commercial offer or an invitation to sign up, subscribe, or download an app',
 'a recommendation of other stories or articles to read',
 'website menu navigation or footer links',
 'a quotation or list forming part of the article',
 'an article publication date, author byline, or reading time',
 'a translation of the same article into another language'
];
export function featureInput(p,previous='',next=''){
 const short=t=>String(t||'').replace(/\s+/g,' ').slice(0,100);
 return `Webpage passage: ${p.originalText}\nHTML type: ${p.tag}. Location: ${p.role}. Group heading: ${p.groupHeading || 'none'}. Nearby controls: ${(p.nearbyControls || []).join(', ') || 'none'}. Previous passage: ${short(previous)}. Following passage: ${short(next)}.`;
}
export function structuralFeatures(p){
 const text=p.originalText;
 return [Math.min(1,(p.linkCharacters||0)/Math.max(text.length,1)), Number(!!p.extraction?.member),Number(p.role==='aside'),Number(['nav','header','footer'].includes(p.role)),Number(p.role==='header'),Number(p.role==='footer'),Number(/^h[1-6]$/.test(p.tag)),Number(p.tag==='li'),Math.min(text.length,500)/500,p.sameDocumentLinkRatio || 0,Number(!!p.inArticle),Number(['article-header','article-nav','article-footer'].includes(p.role))];
}
