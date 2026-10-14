/** Selection is UI state only. Exact-wording leases prevent a later batch from
 * correcting a passage that changed while the user was choosing its neighbors. */
export class PassageSelection {
  constructor(store,{scope='reading'}={}){this.store=store;this.scope=scope;this.selected=new Map();this.rangeStart=null;this.rangePending=false;}
  rows(){return this.scope==='page'?[...this.store.records.values()].filter(p=>p.scope==='page'):this.store.reading();}
  prune(){const rows=new Map(this.rows().map(p=>[p.id,p]));for(const[id,revision]of this.selected)if(rows.get(id)?.revision!==revision)this.selected.delete(id);if(this.rangeStart&&rows.get(this.rangeStart.id)?.revision!==this.rangeStart.revision)this.rangeStart=null;}
  ids(){this.prune();return this.rows().filter(p=>this.selected.has(p.id)).map(p=>p.id);}
  toggle(id){this.prune();const rows=this.rows(),p=rows.find(p=>p.id===id);if(!p)return;
    if(this.rangePending){if(!this.rangeStart){this.rangeStart={id,revision:p.revision};return;}const from=rows.findIndex(p=>p.id===this.rangeStart.id),to=rows.findIndex(p=>p.id===id);if(from>=0)for(const row of rows.slice(Math.min(from,to),Math.max(from,to)+1))this.selected.set(row.id,row.revision);this.rangeStart=null;this.rangePending=false;return;}
    if(this.selected.has(id))this.selected.delete(id);else this.selected.set(id,p.revision);
  }
  allIncluded(ids=null){this.selected.clear();const allowed=ids?new Set(ids):null;for(const p of this.rows())if((!allowed||allowed.has(p.id))&&this.store.resolve(p.id).included)this.selected.set(p.id,p.revision);this.rangeStart=null;this.rangePending=false;}
  clear(){this.selected.clear();this.rangeStart=null;this.rangePending=false;}
  range(){this.rangeStart=null;this.rangePending=true;}
  outside(id,direction){const rows=this.rows(),index=rows.findIndex(p=>p.id===id);return index<0?[]:(direction==='before'?rows.slice(0,index):rows.slice(index+1)).map(p=>p.id);}
}
