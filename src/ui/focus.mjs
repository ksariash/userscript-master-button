/** Exclude disabled/hidden controls and the body of collapsed native disclosures. */
export function dialogFocusables(surface){
 return [...surface.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')].filter(node=>{
  if(node.disabled||node.closest('[hidden]'))return false;
  for(let parent=node.parentElement;parent&&parent!==surface;parent=parent.parentElement){
   if(parent.tagName==='DETAILS'&&!parent.open&&!parent.querySelector(':scope > summary')?.contains(node))return false;
  }
  return true;
 });
}
