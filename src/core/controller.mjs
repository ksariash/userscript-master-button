import { DecisionStore } from '../../core/decisions.mjs'; import { SourceInventory, PageLifecycle } from './source.mjs'; import {articleScope} from './article-scope.mjs';import { PageTone } from './page-tone.mjs'; import { OwnedStyles } from '../tools/owned-styles.mjs';import { inspectSelector } from '../tools/rules.mjs';import { applyRules } from '../tools/rules.mjs';
export class ArticleController {
  constructor(document,settings,{onNavigate=()=>{},onChange=()=>{}}={}){
    this.document=document;this.settings=settings;this.site=new URL(document.URL).hostname;Object.defineProperty(this,'preferences',{get:()=>settings.site(this.site)});this.inventory=new SourceInventory(document);
    let passages;try{passages=this.inventory.extract();this.extractionError='';}catch{passages=this.inventory.scan();this.extractionError='Defuddle could not extract this page. The original inventory is preserved for manual review.';}
    this.store=new DecisionStore(passages,{documentId:this.inventory.documentId,site:this.site});this.store.setAutomatic(this.preferences.automatic);
    for(const [i,e] of this.preferences.examples.entries())this.store.examples.set(e.id||`stored:${i}`,e);
    this.ruleStyles=new OwnedStyles();this.tone=new PageTone(document);this.tone.mutedOnly=true;this.onChange=onChange;this.applyRules();
    this.unsubscribe=this.store.subscribe(e=>{
      if(e.kind==='reading'&&!this.updatingReading)this.articleReading=false;
      if(e.kind==='assessment'){const p=this.store.records.get(e.id);if(p?.automatic?.features)for(const ex of this.store.examples.values())if(ex.sourceId===p.id&&ex.revision===p.revision&&(ex.featureVersion!==p.automatic.promptVersion||JSON.stringify(ex.features)!==JSON.stringify(p.automatic.features))){ex.features=p.automatic.features;ex.featureVersion=p.automatic.promptVersion;this.preferences.examples=[...this.store.examples.values()];this.settings.save().catch(()=>{});}}
      if(e.kind==='correction'){for(const id of e.ids||[e.id]){const p=this.store.records.get(id);if(p?.correction?.exampleId&&p.automatic?.features){const ex=this.store.examples.get(p.correction.exampleId);if(ex){ex.features=p.automatic.features;ex.featureVersion=p.automatic.promptVersion;}}}
        this.preferences.examples=[...this.store.examples.values()].filter(x=>x.site===this.site).slice(-80);this.settings.site(this.site).examples=this.preferences.examples;
        (this.preferences.examples.length || Object.hasOwn(this.settings.value.sites,this.site) ? this.settings.saveSite(this.site) : this.settings.save()).catch(()=>onChange({kind:'storage-error',message:'Correction works for this page; extension storage could not save its learning contribution.'}));this.applyRememberedRules();this.store.changed(null,'memory');
      }
      this.tone.render(this.store);this.renderRuleDisplays();this.onChange(e);
    });
    this.tone.render(this.store);this.lifecycle=new PageLifecycle(document,this.inventory,{onScan:p=>{this.store.sync(p);this.refreshReading();this.applyRules();},onNavigate});
  }
  readArticle(){this.articleReading=true;this.refreshReading();}
  articleIds(){return articleScope(this.document,[...this.store.records.values()].filter(p=>p.scope==='page'));}
  refreshReading(){if(!this.articleReading)return;const records=[...this.store.records.values()],ids=articleScope(this.document,records.filter(p=>p.scope==='page'));
    for(const id of this.store.readingIds||[])if(this.store.records.get(id)?.scope==='reader'&&!ids.includes(id))ids.push(id);
    if(JSON.stringify(ids)===JSON.stringify(this.store.readingIds))return;this.updatingReading=true;try{this.store.setReading(ids);}finally{this.updatingReading=false;}
  }
  applyRememberedRules(){
    const examples=[...this.store.examples.values()].filter(e=>e.enabled!==false&&e.site===this.site);
    for(const p of this.store.records.values()){
      if(p.scope!=='page')continue;
      const match=this.preferences.learning&&[...examples].reverse().find(e=>e.text===p.originalText);
      if(p.rule?.selectorRule&&(!match||match.label!=='ARTICLE'||p.rule.label==='ARTICLE'))continue;
      this.store.setRule(p.id,match?{enabled:true,label:match.label,reason:`You remembered this exact wording on ${this.site}.`,memoryId:match.id}:null,false);
    }
  }
  applyRules(){applyRules(this.store,this.document,this.settings.site(this.site).rules);for(const p of this.store.records.values())if(p.rule)p.rule.selectorRule=true;this.applyRememberedRules();this.store.changed(null,'rules');}
  renderRuleDisplays(){if(this.tone.showAll){this.ruleStyles.clear();return;}const hidden=new Set();for(const rule of this.preferences.rules.filter(r=>r.enabled&&r.label==='NUISANCE'&&r.display==='hide')){const inspection=inspectSelector(this.document,rule.selector);if(inspection.blocked)continue;for(const node of inspection.matches){const records=[...this.store.records.values()].filter(p=>p.scope==='page'&&node.contains(p.source?.node));if(records.some(p=>this.store.resolve(p.id).included))continue;hidden.add(node);this.ruleStyles.set(node,'display','none');}}this.ruleStyles.keepOnly(hidden);}
  automatic(enabled){this.preferences.automatic=!!enabled;this.settings.site(this.site).automatic=!!enabled;this.store.setAutomatic(enabled);return this.settings.saveSite(this.site);}
  showAll(enabled){this.tone.showAll=!!enabled;this.tone.render(this.store);this.renderRuleDisplays();}
  visualMute(id,enabled){const p=this.store.records.get(id);if(!p)return;this.store.correct(id,'ARTICLE');p.visualMuted=enabled;this.store.changed(id,'display');}
  stop(){this.lifecycle.stop();this.unsubscribe();this.ruleStyles.clear();this.tone.stop();}
}
