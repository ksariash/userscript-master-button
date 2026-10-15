import {MP3Stream} from './mp3-core.mjs';
let encoder;
self.onmessage=({data})=>{
 const {id,action}=data;
 try{let parts=[];if(action==='init')encoder=new MP3Stream(data.quality);else if(action==='chunk'&&encoder)parts=encoder.push(new Uint8Array(data.buffer));else if(action==='finish'&&encoder){parts=encoder.finish();encoder=null;}else throw new Error('Invalid encoder state.');postMessage({id,parts},parts.map(p=>p.buffer));}
 catch{postMessage({id,error:'Local MP3 conversion failed. Retry a smaller recording.'});}
};
