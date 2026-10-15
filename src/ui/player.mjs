import {icons} from './icons.mjs';
const time=s=>s==null?'—':`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
/** Time updates only touch transport controls, never transcript rows or marker geometry. */
export function patchPlayer(ui){
 const {reader,mini,speechState:s,settings,document,follow}=ui;
 if(reader){
reader.querySelector('.audio-status').textContent=s.status==='error'?'Retry needed':s.status==='buffering'?'Preparing first usable audio…':s.status==='playing'?'Listening':s.status==='paused'?'Paused':s.status==='demo'?'Voice demo':'Ready to listen';reader.querySelector('.duration').textContent=`${time(s.currentTime)} / ${time(s.duration)}`;reader.querySelector('[data-action=rate]').textContent=`${settings.value.rate}×`;
      const icon=reader.querySelector('[data-action=play] i');if(icon){const name=s.status==='playing'?'pause':'play';if(icon.dataset.icon!==name){icon.dataset.icon=name;icons(icon.parentElement,document);}}reader.querySelector('.follow').textContent=follow?'Following':'Return to current';
 }
    if(mini)mini.querySelector('.mini-state').textContent=s.status==='playing'?'Listening':s.status==='buffering'?'Preparing…':'Paused';
}
