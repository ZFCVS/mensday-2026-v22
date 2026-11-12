import { DEFAULT_FIGURE } from './block-figure-engine.mjs';
import { TRAIT_NAMES } from './personality-character.mjs';

// Identity label is already carried as `name`; omit this duplicate internal
// label from compact mobile links while retaining it in local save files.
const SHARE_FIELDS=Object.keys(DEFAULT_FIGURE).filter(key=>key!=='qualities'&&key!=='personalityProfile'&&key!=='heroIdentityName');
// Version 1 links used the original figure fields plus a medical-mask slot.
// Do not let later appended controls change that reader's field count/order.
const LATER_FIELDS=new Set(['jawline','moustache','teethStyle','armLength','armMuscle','legMuscle','handSize','heroMode','heroIdentityId','heroIdentityName','heroPower','heroSuitStyle','heroCapeStyle','heroCapeColor','heroEyeMaskStyle','heroEmblem','heroGloveStyle','heroBootStyle','heroMaskColor','heroLookPreset','cardBackground']);
const LEGACY_BASE_FIELDS=SHARE_FIELDS.filter(key=>!LATER_FIELDS.has(key));
const LEGACY_SHARE_FIELDS=[...LEGACY_BASE_FIELDS.slice(0,LEGACY_BASE_FIELDS.indexOf('build')),'mask',...LEGACY_BASE_FIELDS.slice(LEGACY_BASE_FIELDS.indexOf('build'))];
const VERSION2_SHARE_FIELDS=SHARE_FIELDS.filter(key=>key!=='cardBackground');
// Version 3 added a now-retired character preset and two appearance options.
// Keep its field layout solely for reading existing links; retired enum slots
// decode to null and are discarded during normalization.
const VERSION3_SHARE_FIELDS=[...VERSION2_SHARE_FIELDS,'featuredCharacter'];
// Versions 4 and 5 used the same field bitmap as the V18 schema. Keep their
// exact layout frozen while V6 adds the selectable card background.
const VERSION4_SHARE_FIELDS=VERSION2_SHARE_FIELDS;
const VERSION5_SHARE_FIELDS=VERSION2_SHARE_FIELDS;
const ENUMS={
  build:['lean','average','athletic','broad','stocky'],
  headShape:['classic','square','tall','wide','round','oval','heart','diamond'],
  jawline:['soft','defined','angular','tapered','broad'],eyeShape:['classic','round','narrow','wide'],
  browStyle:['natural','bold','raised','angled'],headwearStyle:['none','beanie','brimmed-hat'],
  sunglassesStyle:['none','wayfarer','aviator','round','sport','oversized'],
  headphonesStyle:['none','studio','wireless','sport','neckband'],bagStyle:['none','backpack','shoulder-bag','sling-bag'],
  hairstyle:['bald','buzz','crop','quiff','curls','locs','long','fade','side-part','fringe','spiky','afro','mullet','flowing'],
  beard:['none','light-stubble','stubble','short','full','goatee','anchor','soul-patch','chinstrap','sideburns'],
  moustache:['none','pencil','classic','chevron','handlebar','walrus','horseshoe'],teethStyle:['even','small','individual','gap'],
  mouthStyle:['auto','closed','smile','open','grin','laugh','wide-grin','pursed'],
  expression:['smile','grin','calm','focused','surprised','excited','joyful','laughing','astonished','determined','playful'],
  outfit:['tee','overshirt','hoodie','bomber','blazer','utility','jersey','zf-polo','zf-polo-white','zf-polo-navy','traditional-kurta','casual-shirt','sweater','cardigan','denim-jacket','zip-jacket','hero-suit'],
  bottoms:['jeans','cargo','chinos','joggers','shorts','formal-trousers','track-pants'],footwear:['sneaker','high-top','boot','loafer','dress-shoe'],
  pose:['idle','wave','thumbs-up','hands-on-hips','crossed-arms','hands-behind-back','flex','victory','welcome','dance','hand-over-heart','hands-clasped-front','salute','both-wave','pointing','peace','wide-stance','relaxed-lean'],
  handStyle:['open','fist','thumbs-up','mitten','peace','point'],cardScene:['truck','bus'],logoTheme:['white','zf-blue'],
  cardBackground:['renewable-hills','city-skyline','coastal-highway','green-countryside','logistics-hub'],
  heroSuitStyle:['classic','armored','tech','formal-coat'],heroCapeStyle:['none','short','long','split','flight'],heroEyeMaskStyle:['none','eye-frame','tech-visor','shield-frame','armored-eyeport','radiant-band','thunder-crest','web-frame','shadow-cowl'],
  heroEmblem:['star','shield','bolt','gear','heart','sun','none'],heroGloveStyle:['none','cuff','gauntlet'],heroBootStyle:['armored','tall','speed','none'],
  heroLookPreset:['shield-guardian','armored-tech','radiant-hero','thunder-guardian','web-pattern','shadow-cowl','formal-coat']
};
// Version 4 cards predate the `hero-suit` outfit enum. Preserve that exact
// reader so previously generated V7 cards continue to decode correctly.
const VERSION4_ENUMS={...ENUMS,outfit:ENUMS.outfit.filter(value=>value!=='hero-suit')};
const LEGACY_ENUMS={...VERSION4_ENUMS,cardScene:['truck','bus','car','train','truck-front-left','truck-front-right','coach-bus']};
const LEGACY_V3_ENUMS={...VERSION4_ENUMS,
  hairstyle:[...ENUMS.hairstyle,null],
  heroSuitStyle:[...ENUMS.heroSuitStyle,null],
  featuredCharacter:['custom',null]
};
const COLOR_KEYS=new Set(['skin','eyeColor','hairColor','topColor','accentColor','pantsColor','shoeColor','frameColor','background','heroCapeColor','heroMaskColor']);
// `mask` is read-only compatibility for version 1 card links. New links omit it.
const BOOLEAN_KEYS=new Set(['teethVisible','sunglasses','mask','glasses','cap','headphones','backpack','watch','pin','heroMode']);
const STYLES=['welcome','bold','inventive','dynamic','playful','steady'];
const encoder=new TextEncoder(),decoder=new TextDecoder();
const MAX_TOKEN_CHARS=12000, MAX_COMPRESSED_BYTES=9000, MAX_EXPANDED_BYTES=65536;

class Writer{
  constructor(){this.bytes=[];}
  u8(value){this.bytes.push(Number(value)&255);}
  u16(value){const n=Number(value);this.bytes.push((n>>>8)&255,n&255);}
  i16(value){this.u16(Number(value)&0xffff);}
  u32(value){const n=Number(value)>>>0;this.bytes.push((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);}
  raw(values){this.bytes.push(...values);}
  string(value){const bytes=encoder.encode(String(value??''));if(bytes.length>65535)throw new RangeError('Card text is too long to share.');this.u16(bytes.length);this.raw(bytes);}
  finish(){return new Uint8Array(this.bytes);}
}
class Reader{
  constructor(bytes){this.bytes=bytes;this.offset=0;}
  need(count){if(this.offset+count>this.bytes.length)throw new Error('This card link is incomplete.');}
  u8(){this.need(1);return this.bytes[this.offset++];}
  u16(){this.need(2);return(this.bytes[this.offset++]<<8)|this.bytes[this.offset++];}
  i16(){const n=this.u16();return n&0x8000?n-0x10000:n;}
  u32(){this.need(4);return(this.bytes[this.offset++]<<24|this.bytes[this.offset++]<<16|this.bytes[this.offset++]<<8|this.bytes[this.offset++])>>>0;}
  raw(length){this.need(length);const value=this.bytes.slice(this.offset,this.offset+length);this.offset+=length;return value;}
  string(){return decoder.decode(this.raw(this.u16()));}
}
function base64UrlEncode(bytes){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let result='';
  for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;result+=alphabet[a>>>2]+alphabet[((a&3)<<4)|(b>>>4)];if(i+1<bytes.length)result+=alphabet[((b&15)<<2)|(c>>>6)];if(i+2<bytes.length)result+=alphabet[c&63];}
  return result;
}
function base64UrlDecode(text){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  if(typeof text!=='string'||text.length>MAX_TOKEN_CHARS||!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('Invalid or oversized card link.');
  const clean=text;const output=[];let buffer=0,bits=0;
  for(const char of clean){const value=alphabet.indexOf(char);if(value<0)continue;buffer=(buffer<<6)|value;bits+=6;if(bits>=8){bits-=8;output.push((buffer>>>bits)&255);}}
  return new Uint8Array(output);
}
function writeId(writer,id){
  const uuid=String(id||'').match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  if(!uuid){writer.u8(1);writer.string(id||'');return;}
  writer.u8(0);writer.raw(new Uint8Array(String(id).replaceAll('-','').match(/../g).map(pair=>parseInt(pair,16))));
}
function readId(reader){
  if(reader.u8()!==0)return reader.string();
  const hex=[...reader.raw(16)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function writeFigureValue(writer,key,value){
  if(ENUMS[key]){const index=ENUMS[key].indexOf(value);if(index<0)throw new TypeError(`Unsupported ${key} value in card link.`);writer.u8(index);return;}
  if(BOOLEAN_KEYS.has(key)){writer.u8(value?1:0);return;}
  if(COLOR_KEYS.has(key)){
    if(!/^#[0-9a-f]{6}$/i.test(value))throw new TypeError(`Unsupported ${key} colour in card link.`);
    writer.raw([1,3,5].map(index=>parseInt(value.slice(index,index+2),16)));return;
  }
  if(typeof DEFAULT_FIGURE[key]==='number'){const number=Number(value);if(!Number.isInteger(number)||number<0||number>65535)throw new RangeError(`Unsupported ${key} value in card link.`);writer.u16(number);return;}
  writer.string(value);
}
function readFigureValue(reader,key,version=2){
  const enumOptions=(version===1?LEGACY_ENUMS:version===3?LEGACY_V3_ENUMS:version===4?VERSION4_ENUMS:ENUMS)[key];
  if(enumOptions){const value=enumOptions[reader.u8()];if(value===undefined)throw new Error(`This card link has an unsupported ${key} option.`);return value;}
  if(BOOLEAN_KEYS.has(key))return Boolean(reader.u8());
  if(COLOR_KEYS.has(key))return '#'+[reader.u8(),reader.u8(),reader.u8()].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(typeof DEFAULT_FIGURE[key]==='number')return reader.u16();
  return reader.string();
}
function writeBinaryPayload(payload){
  const writer=new Writer();writer.u8(6);writeId(writer,payload.id);writer.string(payload.recipient||'');writer.string(payload.sender||'');
  const changes=SHARE_FIELDS.map(key=>payload.figure[key]!==DEFAULT_FIGURE[key]);
  const bitmap=new Uint8Array(Math.ceil(SHARE_FIELDS.length/8));changes.forEach((changed,index)=>{if(changed)bitmap[index>>>3]|=1<<(index&7);});writer.raw(bitmap);
  changes.forEach((changed,index)=>{if(changed)writeFigureValue(writer,SHARE_FIELDS[index],payload.figure[SHARE_FIELDS[index]]);});
  const profile=payload.figure.personalityProfile;writer.u8(profile?1:0);
  if(profile){writer.u32(profile.seed||0);writer.u8(profile.variation||0);writer.u8(STYLES.indexOf(profile.dominant));writer.u8(STYLES.indexOf(profile.secondary));writer.u8(profile.qualities.length);for(const quality of profile.qualities){const trait=TRAIT_NAMES.indexOf(quality.trait);if(trait<0)throw new TypeError(`Unsupported personality quality: ${quality.trait}`);writer.u8(trait);writer.u8(quality.score);}}
  const yaw=Number(payload.camera?.yaw)||0,pitch=Number(payload.camera?.pitch)||0,zoom=Number(payload.camera?.zoom)||1;
  const turn=2*Math.PI,yawAngle=((yaw%turn)+turn)%turn;writer.u16(Math.round(yawAngle/turn*65535));writer.i16(Math.round(Math.max(-.2,Math.min(.36,pitch))*1000));writer.u8(Math.round(Math.max(.82,Math.min(1.28,zoom))*100));
  return writer.finish();
}
function readBinaryPayload(bytes){
  if(bytes.length>MAX_EXPANDED_BYTES)throw new Error('Card link exceeds the supported size.');
  const reader=new Reader(bytes),version=reader.u8();if(version!==1&&version!==2&&version!==3&&version!==4&&version!==5&&version!==6)throw new Error('This card link uses an unsupported data version.');
  const id=readId(reader),recipient=reader.string(),sender=reader.string(),figure={...DEFAULT_FIGURE};
  if(recipient.length>50||sender.length>50||id.length>120)throw new Error('Invalid card identity.');
  const fields=version===1?LEGACY_SHARE_FIELDS:version===2?VERSION2_SHARE_FIELDS:version===3?VERSION3_SHARE_FIELDS:version===4?VERSION4_SHARE_FIELDS:version===5?VERSION5_SHARE_FIELDS:SHARE_FIELDS;
  const bitmap=reader.raw(Math.ceil(fields.length/8));
  let retiredIdentity=false;
  fields.forEach((key,index)=>{if(bitmap[index>>>3]&(1<<(index&7))){let value=readFigureValue(reader,key,version);if(key==='cardScene'&&(value==='truck-front-left'||value==='truck-front-right'))value='truck';if(key==='featuredCharacter'&&value!=='custom')retiredIdentity=true;if(key==='heroIdentityId'&&String(value).startsWith('featured-'))retiredIdentity=true;if(key!=='mask'&&key!=='featuredCharacter'&&value!==null)figure[key]=value;}});
  if(retiredIdentity){figure.name=DEFAULT_FIGURE.name;figure.heroIdentityId='';figure.heroIdentityName='';}
  if(reader.u8()){
    const seed=reader.u32(),variation=reader.u8(),dominant=STYLES[reader.u8()],secondary=STYLES[reader.u8()],count=reader.u8();
    if(!dominant||!secondary||count>20)throw new Error('This card link has an invalid personality profile.');
    const qualities=[];for(let i=0;i<count;i++){const trait=TRAIT_NAMES[reader.u8()];const score=reader.u8();if(!trait||score>100)throw new Error('This card link has an invalid personality score.');qualities.push({trait,score});}
    figure.personalityProfile={seed,variation,dominant,secondary,qualities};figure.qualities=qualities.map(q=>q.trait).join(', ');
  }
  const yaw=reader.u16()/65535*(2*Math.PI),pitch=reader.i16()/1000,zoom=reader.u8()/100;
  if(!Number.isFinite(yaw)||pitch<-.21||pitch>.37||zoom<.81||zoom>1.29)throw new Error('Invalid card camera settings.');
  if(typeof figure.greeting!=='string'||figure.greeting.length>320)throw new Error('Card message is too long.');
  if(reader.offset!==reader.bytes.length)throw new Error('This card link contains unexpected extra data.');
  return{schema:'goodmen-share-card-v1',id,recipient,sender,figure,camera:{yaw,pitch,zoom}};
}
function compactLegacyPayload(payload){
  const changes=[];SHARE_FIELDS.forEach((key,index)=>{if(payload.figure[key]!==DEFAULT_FIGURE[key])changes.push([index,payload.figure[key]]);});
  const profile=payload.figure.personalityProfile,compactProfile=profile?[profile.seed,profile.variation,profile.dominant,profile.secondary,profile.qualities.map(q=>[TRAIT_NAMES.indexOf(q.trait)>=0?TRAIT_NAMES.indexOf(q.trait):q.trait,q.score])]:null;
  const camera=[Math.round(payload.camera.yaw*1000),Math.round(payload.camera.pitch*1000),Math.round(payload.camera.zoom*100)];return['gms3',payload.id,payload.recipient,changes,compactProfile,camera,payload.sender||''];
}
function expandLegacyPayload(compact){
  if(!Array.isArray(compact)||!['gms1','gms2','gms3'].includes(compact[0])||!Array.isArray(compact[3]))throw new Error('This card link is incomplete or no longer supported.');
  const fields=compact[0]==='gms1'?LEGACY_SHARE_FIELDS:compact[0]==='gms2'?VERSION3_SHARE_FIELDS:SHARE_FIELDS;
  const figure={...DEFAULT_FIGURE};let retiredIdentity=false;compact[3].forEach(([index,value])=>{const key=Number.isInteger(index)?fields[index]:undefined;if(key==='cardScene'&&(value==='truck-front-left'||value==='truck-front-right'))value='truck';if(key==='featuredCharacter'&&value!=='custom')retiredIdentity=true;if(key==='heroIdentityId'&&String(value).startsWith('featured-'))retiredIdentity=true;const validOption=!key||!ENUMS[key]||ENUMS[key].includes(value);if(key&&key!=='mask'&&key!=='featuredCharacter'&&validOption)figure[key]=value;});
  if(retiredIdentity){figure.name=DEFAULT_FIGURE.name;figure.heroIdentityId='';figure.heroIdentityName='';}
  if(Array.isArray(compact[4])){const[seed,variation,dominant,secondary,qualities]=compact[4];figure.personalityProfile={seed,variation,dominant,secondary,qualities:qualities.map(([trait,score])=>({trait:Number.isInteger(trait)?TRAIT_NAMES[trait]||'Helpful':trait,score}))};figure.qualities=figure.personalityProfile.qualities.map(q=>q.trait).join(', ');}
  const[yaw=420,pitch=100,zoom=100]=compact[5]||[];return{schema:'goodmen-share-card-v1',id:compact[1],recipient:compact[2],sender:String(compact[6]||'').slice(0,50),figure,camera:{yaw:yaw/1000,pitch:pitch/1000,zoom:zoom/100}};
}
async function gzip(bytes,kind){
  const Constructor=kind==='compress'?globalThis.CompressionStream:globalThis.DecompressionStream;
  if(typeof Constructor!=='function')throw new Error('This browser cannot open the compressed card link.');
  if(kind==='decompress' && bytes.length>MAX_COMPRESSED_BYTES)throw new Error('Card link is too large.');
  const reader=new Blob([bytes]).stream().pipeThrough(new Constructor('gzip')).getReader();
  const chunks=[];let total=0;
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      total+=value.byteLength;
      if(total>MAX_EXPANDED_BYTES){await reader.cancel();throw new Error('Card link is too large to open safely.');}
      chunks.push(value);
    }
    const output=new Uint8Array(total);let cursor=0;
    for(const chunk of chunks){output.set(chunk,cursor);cursor+=chunk.byteLength;}
    return output;
  }finally{reader.releaseLock();}
}
function validateDecodedPayload(payload){
  if(!payload||typeof payload!=='object'||typeof payload.recipient!=='string'||payload.recipient.length>50||typeof payload.sender!=='string'||payload.sender.length>50)throw new Error('This card contains invalid names.');
  if(!payload.figure||typeof payload.figure!=='object'||typeof payload.figure.greeting!=='string'||payload.figure.greeting.length>320)throw new Error('This card contains invalid details.');
  const profile=payload.figure.personalityProfile;
  if(profile && (!Array.isArray(profile.qualities)||profile.qualities.length>5||profile.qualities.some(q=>!TRAIT_NAMES.includes(q.trait)||!Number.isInteger(q.score)||q.score<0||q.score>100)))throw new Error('This card contains invalid scores.');
  if(!payload.camera||!['yaw','pitch','zoom'].every(key=>Number.isFinite(payload.camera[key]))||Math.abs(payload.camera.yaw)>7||payload.camera.pitch<-.21||payload.camera.pitch>.37||payload.camera.zoom<.81||payload.camera.zoom>1.29)throw new Error('This card contains invalid camera settings.');
  return payload;
}
export async function encodeShareToken(payload){
  const binary=writeBinaryPayload(payload);
  if(typeof globalThis.CompressionStream==='function')return'b'+base64UrlEncode(await gzip(binary,'compress'));
  return'u'+base64UrlEncode(binary);
}
export async function decodeShareToken(token){
  if(typeof token!=='string'||token.length<2||token.length>MAX_TOKEN_CHARS||!/^[buzj][A-Za-z0-9_-]+$/.test(token))throw new Error('Invalid or oversized card link.');
  const data=base64UrlDecode(token.slice(1));
  if(data.length>MAX_COMPRESSED_BYTES)throw new Error('Card link exceeds size limit.');
  if(token.startsWith('b'))return validateDecodedPayload(readBinaryPayload(await gzip(data,'decompress')));
  if(token.startsWith('u'))return validateDecodedPayload(readBinaryPayload(data));
  const bytes=token.startsWith('z')?await gzip(data,'decompress'):data;
  if(bytes.length>MAX_EXPANDED_BYTES)throw new Error('Card link exceeds size limit.');
  return validateDecodedPayload(expandLegacyPayload(JSON.parse(decoder.decode(bytes))));
}
export { SHARE_FIELDS, LEGACY_SHARE_FIELDS, VERSION2_SHARE_FIELDS, VERSION3_SHARE_FIELDS, VERSION4_SHARE_FIELDS, VERSION5_SHARE_FIELDS };
