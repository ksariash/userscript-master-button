import baseline from './baseline-head.json' with {type:'json'};import {fitHead} from './head.mjs';import {assessFeatures} from './assessment.mjs';import {MODEL_CONFIG} from './model-contract.mjs';
/** Actual gradient updates of this classification head. Base language-model weights remain frozen. */
export class SiteHead {
  constructor(getExamples,{enabled=()=>true}={}){this.getExamples=getExamples;this.enabled=enabled;this.head=baseline;this.signature='';}
  refresh(){
    const examples=this.enabled()?[...this.getExamples()].filter(e=>e.enabled!==false&&e.featureVersion===MODEL_CONFIG.promptVersion&&Array.isArray(e.features)&&e.features.length===baseline.weights.length&&e.features.every(x=>Number.isFinite(x)&&Math.abs(x)<=1)).sort((a,b)=>String(a.id).localeCompare(String(b.id))):[];
    const signature=JSON.stringify(examples.map(e=>[e.id,e.label,e.features]));if(signature===this.signature)return;this.signature=signature;
    this.head=examples.length?{...fitHead(examples.map(e=>({features:e.features,expected:e.label})),{initial:baseline,epochs:120,rate:.04,l2:0,keepWeight:3,anchor:.3}),threshold:baseline.threshold}:baseline;
  }
  classify(features){this.refresh();const base=assessFeatures(features,baseline),learned=assessFeatures(features,this.head);return{label:base.label==='NUISANCE'&&learned.label!=='NUISANCE'?'UNCERTAIN':base.label,baseLabel:base.label,baseActivation:base.activation,siteActivation:learned.activation,learning:'Gradient-trained classification head from explicit site corrections; frozen base language model.'};}
}
