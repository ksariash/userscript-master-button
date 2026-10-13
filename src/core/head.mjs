const sigmoid=x=>1/(1+Math.exp(-Math.max(-40,Math.min(40,x))));
export function activation(head,features) {
  if(!Array.isArray(features)||features.length!==head.weights.length||!features.every(Number.isFinite))return null;
  return sigmoid(head.bias+features.reduce((sum,x,i)=>sum+x*head.weights[i],0));
}
/** Actual head-weight gradients, never updates to the frozen base language model. */
export function fitHead(rows,{initial=null,epochs=2500,rate=.1,l2=.002,keepWeight=3,anchor=0}={}) {
  const valid=rows.filter(r=>Array.isArray(r.features)&&r.features.every(Number.isFinite)&&['ARTICLE','NUISANCE'].includes(r.expected));
  const size=valid[0]?.features.length||initial?.weights.length||14,head={weights:initial?[...initial.weights]:Array(size).fill(0),bias:initial?.bias||0};
  if(!valid.length)return head;
  for(let epoch=0;epoch<epochs;epoch++) {
    const gradient=Array(size).fill(0);let bias=0,weight=0;
    for(const r of valid) {
      const w=r.expected==='ARTICLE'?keepWeight:1,delta=(activation(head,r.features)-(r.expected==='NUISANCE'?1:0))*w;
      for(let i=0;i<size;i++)gradient[i]+=delta*r.features[i];bias+=delta;weight+=w;
    }
    for(let i=0;i<size;i++)head.weights[i]-=rate*(gradient[i]/weight+l2*head.weights[i]+anchor*(head.weights[i]-(initial?.weights[i]||0)));
    head.bias-=rate*bias/weight;
  }
  return head;
}
export function classifyHead(head,features,{threshold=.9}={}) {
  const score=activation(head,features);
  return {label:score==null?'UNCERTAIN':score>=threshold?'NUISANCE':score<=.5?'ARTICLE':'UNCERTAIN',activation:score};
}
