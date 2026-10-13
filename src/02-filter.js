// Reversible visual filtering. Learning is a bounded local hash-based classifier,
// NOT a pretrained or fine-tuned LLM. Classifier labels come exclusively from explicit choices.
const hidden=new Map(); let picker=null, pickerMatches=[], preview=false, filterTick=0;
const BAN_SEL='[data-mb-host],html,body,head,main,article,[role="main"],shreddit-post';
function protectedNode(el){return !el || !el.isConnected || el.closest('[data-mb-host]') || el.matches(BAN_SEL) || el.querySelector('article,main,[role="main"],[data-mb-host]') || el===document.documentElement || el===document.body;}
function hideNode(el,reason='Rule'){if(protectedNode(el))return false;if(passageStore.records.some(p=>p.override==='keep'&&p.element&&(el===p.element||el.contains(p.element))))return false;if(hidden.has(el))return false;hidden.set(el,{display:el.style.getPropertyValue('display'),priority:el.style.getPropertyPriority('display'),reason});el.style.setProperty('display','none','important');updateCount();return true;}
function showNode(el){const old=hidden.get(el);if(!old)return;if(old.display)el.style.setProperty('display',old.display,old.priority);else el.style.removeProperty('display');hidden.delete(el);updateCount();}
function showAll(){for(const e of [...hidden.keys()])showNode(e);}
function updateCount(){if(!host)return;for(const n of host.shadowRoot.querySelectorAll('[data-count]'))n.textContent=String([...hidden.keys()].filter(e=>e.isConnected&&!([...hidden.keys()].some(other=>other!==e&&other.contains(e)))).length);}
function activeRules(){return (prefs.rules[domainKey()]||[]).filter(r=>r.enabled!==false);}
function safeMatches(sel){try{return [...document.querySelectorAll(sel)].slice(0,350);}catch{return [];}}
function appliedFilter(){if(!filterEnabled()||state.filterReview)return;const rules=activeRules();for(const rule of rules){for(const el of safeMatches(rule.selector)){if(rule.type==='css'&&!protectedNode(el))hideNode(el,`Custom rule: ${rule.selector}`);}}scheduleSemanticScan();}
function beginFilterReview(){
 if(state.filterReview)return;
 state.reviewHidden=new Map(hidden);state.filterReview=true;toggleRedditCSS(false);showAll();renderPagePassages();render();
}
function endFilterReview(){
 if(!state.filterReview)return;
 state.filterReview=false;state.reviewHidden=null;
 if(cleanupEnabled())siteClean();renderPagePassages();
 if(filterEnabled()){appliedFilter();resetSemanticReview();}
 render();
}
function setFiltering(enabled){prefs.filter[domainKey()]=enabled;saveSettings();if(!enabled){showAll();}else appliedFilter();syncPassageViews();render();}
function nodeSelector(el){
  if(el.id&&/^[a-zA-Z][\w:-]{2,75}$/.test(el.id)&&!/\d{5,}/.test(el.id))return '#'+CSS.escape(el.id);
  let s=el.tagName.toLowerCase();const cls=[...el.classList].filter(c=>/^[a-z][\w-]{2,48}$/i.test(c)&&!/[0-9a-f]{8,}/i.test(c)&&!/^css-|^sc-|^jsx-/i.test(c)).slice(0,2);
  if(cls.length)s+='.'+cls.map(c=>CSS.escape(c)).join('.');
  const ancestor=el.parentElement;if(ancestor?.id&&/^[a-zA-Z][\w:-]{2,75}$/.test(ancestor.id))s='#'+CSS.escape(ancestor.id)+' > '+s;
  return s;
}
function clearPicker(){if(picker)document.removeEventListener('click',picker,true);picker=null;stopPreview();render();}
function stopPreview(){for(const e of pickerMatches){e.removeAttribute('data-mb-preview');e.removeAttribute('data-mb-preview-hide');}pickerMatches=[];preview=false;}
function pickFilter(){clearPicker();beginFilterReview();openView('picker');picker=function(e){if(e.target.closest?.('[data-mb-host]'))return;e.preventDefault();e.stopImmediatePropagation();const target=e.target.closest?.('aside,[role="complementary"],section,div,figure,li,p')||e.target;if(!target||protectedNode(target)){notify('Select a smaller part of the page.');return;}stopPreview();const selector=nodeSelector(target);let ms=safeMatches(selector);if(ms.length>80||ms.length>document.querySelectorAll('p,div,li,section,article').length*.2){notify('Selector is too broad; choose a more specific element.');return;}pickerMatches=ms.filter(n=>!protectedNode(n));for(const n of pickerMatches)n.setAttribute('data-mb-preview','');state.pickerSelector=selector;render();};document.addEventListener('click',picker,true);}
function togglePreview(){preview=!preview;for(const n of pickerMatches){if(preview)n.setAttribute('data-mb-preview-hide','');else n.removeAttribute('data-mb-preview-hide');}render();}
function savePickerRule(){const selector=state.pickerSelector;if(!selector||!pickerMatches.length)return;const arr=prefs.rules[domainKey()]||(prefs.rules[domainKey()]=[]);arr.push({id:Date.now().toString(36),selector,type:'css',enabled:true});stopPreview();clearPicker();endFilterReview();saveSettings();appliedFilter();openView('rules');}
// Anonymous, site-scoped token statistics; hash counts only, no text/body/history.
function classificationScore(v,domain=domainKey()){
 const terms=[...new Set(tokens(v))],model=prefs.learning[domain]||{};let val=0,hits=0;
 for(const t of terms){const data=model[tokenHash(t)];if(data){val+=Math.log((data.skip+1)/(data.keep+1));hits++;}}
 return {score:hits?val/Math.sqrt(hits):0,hits};
}
function learnPassage(v,decision){const domain=domainKey(),model=prefs.learning[domain]||={};for(const t of [...new Set(tokens(v))].slice(0,60)){const k=tokenHash(t);const e=model[k]||={keep:0,skip:0};e[decision]=Math.min(30,e[decision]+1);model[k]=e;}const keys=Object.keys(model);if(keys.length>700)for(const k of keys.slice(0,keys.length-700))delete model[k];saveSettings();}
function nuisanceReason(el,str){
 const feedback=classificationScore(str);
 if(prefs.learningEnabled?.[domainKey()]!==false&&feedback.hits>=2&&feedback.score < -0.8)return '';
 const context=((el?.className&&typeof el.className==='string'?el.className:'')+' '+(el?.id||'')+' '+(el?.getAttribute?.('aria-label')||'')).toLowerCase();
 if(/related|recommend|newsletter|promo|advert|sponsor|outbrain|taboola/.test(context))return 'Promotional or recommendation component';
 if(/(?:^|\W)(?:related articles|you might also like|recommended for you|sign up for our newsletter|from around the web|advertisement)(?:\W|$)/i.test(str.slice(0,170)))return 'Likely recommendation or promotion';
 const s=feedback;if(prefs.learningEnabled?.[domainKey()]!==false&&s.hits>=2&&s.score>1.8)return 'Learned from your corrections';
 return '';
}
function inspectPassage(v,el){const why=nuisanceReason(el,v);return {excluded:!!why,reason:why||'Article text'};}

