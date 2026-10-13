/** Restore only values we still own; preserve subsequent website changes. */
export class OwnedStyles {
  constructor(){this.entries=new Map();}
  set(node,name,value,priority='important'){
    const props=this.entries.get(node)||new Map();if(!props.has(name))props.set(name,{value:node.style.getPropertyValue(name),priority:node.style.getPropertyPriority(name),ours:value,ourPriority:priority});this.entries.set(node,props);node.style.setProperty(name,value,priority);
  }
  restore(node){const props=this.entries.get(node);if(!props)return;for(const [name,old] of props)if(node.style.getPropertyValue(name)===old.ours&&node.style.getPropertyPriority(name)===old.ourPriority)old.value?node.style.setProperty(name,old.value,old.priority):node.style.removeProperty(name);this.entries.delete(node);}
  keepOnly(nodes){for(const node of this.entries.keys())if(!nodes.has(node))this.restore(node);}
  clear(){for(const node of [...this.entries.keys()])this.restore(node);}
}
