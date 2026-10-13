import {loadCandidate,CANDIDATES} from './candidate.mjs';
const model = await loadCandidate(CANDIDATES[process.env.MB_CANDIDATE || 'qwen'], '.cache/model');
for (const originalText of ['The bridge was built in 1920 and reopened after repairs last spring.', 'Subscribe to our weekly newsletter. Enter your email address and sign up.', 'Related stories: Five other bridges you should visit. Read more.']) console.log(JSON.stringify(await model.classify({originalText,tag:'p',role:'content',extraction:{member:true},linkCharacters:0},'', '')));
process.exit(0);
