import {FEATURE_MODEL} from './language-features.mjs';import baseline from './baseline-head.json' with {type:'json'};
export const MODEL_CONFIG=Object.freeze({...FEATURE_MODEL,bytes:FEATURE_MODEL.weightBytes,promptVersion:FEATURE_MODEL.labelsVersion,maxInputTokens:FEATURE_MODEL.contextTokens,license:'Apache-2.0',family:'NLI language model with trained classification head'});
export const EXCLUSION_VALIDATED=baseline.validatedExclusion===true;
export const CONSERVATIVE_EXCLUSION=baseline.conservativeExclusion===true;
export function parseLabel(raw){const s=String(raw).trim();return /^(ARTICLE|NUISANCE|UNCERTAIN)[.!]?$/i.test(s)?s.replace(/[.!]$/,'').toUpperCase():'UNCERTAIN';}
