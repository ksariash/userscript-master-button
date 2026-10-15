import {Mp3Encoder} from '@breezystack/lamejs';
export const QUALITY={compact:64,standard:96,high:128};
export const ENCODING_CHUNK_BYTES=1152*4*2;
/** One encoder for the whole recording; fixed scratch space instead of a full PCM copy. */
export class MP3Stream {
 constructor(quality='standard'){this.encoder=new Mp3Encoder(1,24000,QUALITY[quality]||96);this.samples=new Int16Array(1152);}
 push(bytes){
  if(bytes.byteLength%2)throw new Error('Invalid PCM length.');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),parts=[];
  for(let offset=0;offset<bytes.byteLength;offset+=2304){const count=Math.min(1152,(bytes.byteLength-offset)/2);for(let i=0;i<count;i++)this.samples[i]=view.getInt16(offset+i*2,true);const output=this.encoder.encodeBuffer(this.samples.subarray(0,count));if(output.length)parts.push(new Uint8Array(output));}
  return parts;
 }
 finish(){const output=this.encoder.flush();return output.length?[new Uint8Array(output)]:[];}
}
