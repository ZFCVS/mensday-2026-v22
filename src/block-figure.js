import { DEFAULT_FIGURE, buildFigureGeometry, normalizeFigure } from './block-figure-engine.mjs';
import { FEATURED_TRAIT_NAMES, TRAIT_NAMES, TRAIT_CATEGORIES, TRAIT_CATEGORY_LABELS, generateCharacterVariations, makeGreeting, normalizePersonality } from './personality-character.mjs';
import { applySuperheroIdentity, applySuperheroLookPreset, generateSuperheroVariations, getSuperheroEligibility, HERO_LOOK_PRESETS } from './superhero-engine.mjs';
import { encodeQrText } from './qr-code.mjs';
import { encodeAnimatedGif } from './gif-encoder.mjs';
import { drawWindTurbine, windTurbinePhaseAtFrame } from './wind-turbine.mjs';
import { CARD_CHARACTER_FRAME, cardVehicleLayout, roadMotionAtFrame } from './vehicle-motion.mjs';
import { encodeShareToken, decodeShareToken } from './share-card-token.mjs';
import { recordCardDownload } from './wish-counter.mjs';
import { createShareDelivery } from './share-delivery.mjs';
import { buildEmailMessage, copyEmailMessage } from './email-message.mjs';
import { validatePersonalName } from './name-validation.mjs';

const STORAGE_KEY = 'goodmen.block-figure.draft.v2';
const SHARE_BASE_STORAGE_KEY = 'goodmen.block-figure.share-base.v1';
// Public release: card details are not automatically saved across browser sessions.
const PRIVACY_NOTICE = 'Card links contain shareable names, messages and scores. Do not include confidential information.';
const $ = id => document.getElementById(id);
let state = normalizeFigure({ ...DEFAULT_FIGURE });
// Every new card starts with an empty profile. The sender selects all five qualities.
let selectedQualities = [];
let scoreTouched = new Set();
let recipientName = '', senderName = '', generationSeed = 0, generated = null, heroGenerated = null, selectedBase = null, generatedGreeting = '', activeVariationGallery = 'standard';
let superheroWasUnlocked = false;
let userCustomizedCharacter = false, customizationGuideShown = false;
let yaw = .42, pitch = .10, zoom = 1, drag = null, toastTimer = 0, randomizeCount = 0;
let firstShowSpinFrame = 0;
const stopIntroSpin = () => { if(firstShowSpinFrame) cancelAnimationFrame(firstShowSpinFrame); firstShowSpinFrame=0; };
function syncFrontAngle(){
  document.querySelectorAll('[data-angle]').forEach(button=>{
    button.classList.toggle('active',button.dataset.angle==='0');
  });
}
function startIntroSpin(){
  stopIntroSpin();
  // The character's actual front is yaw=0. Run exactly 360 degrees and
  // normalize the camera to zero at the end (never leave it at a side angle).
  const front=0;
  pitch=.08;
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){yaw=front;syncFrontAngle();draw();return;}
  const startedAt=performance.now(),duration=2000;
  yaw=front;
  syncFrontAngle();
  const frame=now=>{
    if($('studio-grid').hidden){stopIntroSpin();return;}
    const t=Math.min(1,(now-startedAt)/duration);
    if(t>=1){
      firstShowSpinFrame=0;
      yaw=front;pitch=.08;syncFrontAngle();draw();
      return;
    }
    const eased=t*t*(3-2*t);
    yaw=front+Math.PI*2*eased;
    renderMesh(canvas,ctx,state);
    firstShowSpinFrame=requestAnimationFrame(frame);
  };
  firstShowSpinFrame=requestAnimationFrame(frame);
}

let undoStack = [], redoStack = [];
const canvas = $('figure-canvas'), ctx = canvas.getContext('2d');
const shareCardPreview = $('share-card-preview'), shareCardPreviewCtx = shareCardPreview.getContext('2d');
const gifCardPoster = $('gif-card-poster'), gifCardPosterCtx = gifCardPoster.getContext('2d'), gifPreviewImage = $('gif-preview-image');
const mobileCardPreview = $('mobile-card-preview'), mobileCardPreviewCtx = mobileCardPreview?.getContext('2d');
const brandLogos = { blue: null, white: null };
let truckBrandingPanel = null;
let currentQrMatrix = null, currentShareUrl = '', qrRefreshTimer = 0, qrRefreshRevision = 0, drawingRefreshedQr = false;
let mobileShareActive = false, cardShareId = createCardShareId();
let previewRotorPhase = -Math.PI / 2, previewRotorFrame = 0, previewLastPaint = 0, previewRoadFrame = 0;
let cachedGifBlob = null, cachedGifKey = '', gifPreviewUrl = '';
let sharePrepareTimer=0,shareOpening=false;
const shareDelivery=createShareDelivery({getKey:deliveryCacheKey,buildFiles:async()=>{
  const png=await createCardPngBlob(),gif=await createAnimatedGifBlob();
  if(!png||!gif)throw new Error('Could not prepare both card files.');
  return [new File([png],`${safeName(state.name)}-mens-day-card.png`,{type:'image/png'}),new File([gif],`${safeName(state.name)}-mens-day-card.gif`,{type:'image/gif'})];
},onStatus:updateSharePreparation});
const PROMETO_FAMILY = '"ZF Prometo", Arial, sans-serif';
const brandLogoFiles = {
  blue: new URL('../assets/brand/zf-logo-blue.png', import.meta.url).href,
  white: new URL('../assets/brand/zf-logo-white.png', import.meta.url).href
};
const vehicleImages = { truck: null, bus: null };
const vehicleImageFiles = {
  truck: new URL('../assets/vehicles/eu-truck.png', import.meta.url).href,
  bus: new URL('../assets/vehicles/eu-electric-bus.png', import.meta.url).href
};
const brandLogosReady = typeof Image === 'undefined' ? null : Promise.all(Object.entries(brandLogoFiles).map(([name,src])=>new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve([name,image]);
  image.onerror=()=>resolve([name,null]);
  image.src=src;
}))).then(entries=>{
  entries.forEach(([name,image])=>{brandLogos[name]=image;});
  draw();
  return Object.values(brandLogos).every(Boolean);
});
const vehicleAssetsReady = typeof Image === 'undefined' ? null : Promise.all(Object.entries(vehicleImageFiles).map(([name,src])=>new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>resolve([name,image]);
  image.onerror=()=>resolve([name,null]);
  image.src=src;
}))).then(entries=>{
  entries.forEach(([name,image])=>{vehicleImages[name]=image;});
  draw();
  return Object.values(vehicleImages).every(Boolean);
});

const FACE_DEF = [
  { key: 'back', ids: [0,1,2,3], shade: -.26 },
  { key: 'bottom', ids: [0,1,5,4], shade: -.22 },
  { key: 'right', ids: [1,2,6,5], shade: -.15 },
  { key: 'top', ids: [3,2,6,7], shade: .12 },
  { key: 'front', ids: [4,5,6,7], shade: 0 },
  { key: 'left', ids: [0,3,7,4], shade: -.08 }
];
const poseNames = {
  idle: 'EASY STANCE', wave: 'WAVE HELLO', 'thumbs-up': 'THUMBS-UP', 'hands-on-hips': 'HANDS ON HIPS',
  flex: 'FLEX', victory: 'VICTORY', welcome: 'OPEN WELCOME', dance: 'CELEBRATE',
  'hand-over-heart':'HAND OVER HEART','both-wave':'BOTH HANDS WAVE',pointing:'POINTING GESTURE',peace:'PEACE SIGN','wide-stance':'WIDE STANCE','relaxed-lean':'RELAXED ONE-LEG STANCE'
};
const LOOK_PRESETS = Object.freeze({
  'zf-white': {outfit:'zf-polo-white',bottoms:'chinos',footwear:'sneaker',bagStyle:'sling-bag',sunglassesStyle:'aviator',headphonesStyle:'studio',accentColor:'#0A4D91'},
  'zf-navy': {outfit:'zf-polo-navy',bottoms:'formal-trousers',footwear:'dress-shoe',bagStyle:'shoulder-bag',sunglassesStyle:'wayfarer',headphonesStyle:'wireless',accentColor:'#E8AB39'},
  'office-smart': {outfit:'casual-shirt',bottoms:'formal-trousers',footwear:'dress-shoe',bagStyle:'none',sunglassesStyle:'none',headphonesStyle:'none',glasses:true},
  'weekend-denim': {outfit:'denim-jacket',bottoms:'jeans',footwear:'high-top',bagStyle:'backpack',sunglassesStyle:'sport',headphonesStyle:'sport'},
  'creative-layer': {outfit:'cardigan',bottoms:'chinos',footwear:'loafer',bagStyle:'sling-bag',sunglassesStyle:'round',headphonesStyle:'none'}
});

function colorShade(hex, amount) {
  const chars = [1,3,5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return '#' + chars.map(c => Math.max(0,Math.min(255,Math.round(c + 255 * amount))).toString(16).padStart(2,'0')).join('');
}
function fitCanvas(target) {
  const rect = target.getBoundingClientRect();
  const dpr = target === canvas ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const w = Math.max(1, Math.round((rect.width || target.width || 1) * dpr));
  const h = Math.max(1, Math.round((rect.height || target.height || 1) * dpr));
  if(target.width !== w || target.height !== h){ target.width = w; target.height = h; }
  return { w, h };
}
function transformed(p, a, b) {
  const [x,y,z] = p;
  const xx = x * Math.cos(a) + z * Math.sin(a);
  const zz = -x * Math.sin(a) + z * Math.cos(a);
  const yy = y * Math.cos(b) - zz * Math.sin(b);
  const depth = y * Math.sin(b) + zz * Math.cos(b);
  return [xx, yy, depth];
}
function projectPoint(point, frame=CARD_CHARACTER_FRAME){
  const [xx,yy]=transformed(point,frame.yaw,frame.pitch);
  return [frame.cx + xx * frame.scale, frame.ground - yy * frame.scale];
}
function getCardPoloLogoPlacement(figureState, frame=CARD_CHARACTER_FRAME){
  if(!(figureState.outfit==='zf-polo-white' || figureState.outfit==='zf-polo-navy')) return null;
  const patch=buildFigureGeometry(figureState).parts.find(part=>part.name==='zf_brand_patch');
  if(!patch) return null;
  const projected=patch.vertices.map(point=>projectPoint(point, frame));
  const center=projected.reduce((acc,[x,y])=>[acc[0]+x,acc[1]+y],[0,0]).map(value=>value/4);
  const width=(Math.hypot(projected[1][0]-projected[0][0], projected[1][1]-projected[0][1]) + Math.hypot(projected[2][0]-projected[3][0], projected[2][1]-projected[3][1]))/2;
  const height=(Math.hypot(projected[3][0]-projected[0][0], projected[3][1]-projected[0][1]) + Math.hypot(projected[2][0]-projected[1][0], projected[2][1]-projected[1][1]))/2;
  return { x:center[0], y:center[1], size:Math.max(20, Math.min(32, Math.max(width,height)*1.08)), variant:figureState.outfit==='zf-polo-white'?'blue':'white' };
}
function blinkAtFrame(index, frameCount){
  const closeEnough=(target,width=1)=>Math.abs(index-target)<=width;
  if(closeEnough(Math.round(frameCount*0.22),1) || closeEnough(Math.round(frameCount*0.66),1)){
    return Math.abs(index-Math.round(frameCount*(index<frameCount*0.5?0.22:0.66)))===0 ? 1 : 0.55;
  }
  return 0;
}
function renderMesh(target, targetCtx, figureState, options = {}) {
  const { w, h } = options.fixedResolution ? {w:target.width,h:target.height} : fitCanvas(target), dpr = target === canvas ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  targetCtx.setTransform(1,0,0,1,0,0);
  const bg = options.background || figureState.background;
  if(!options.preserveBackground){targetCtx.fillStyle = bg; targetCtx.fillRect(0,0,w,h);}
  const halo = targetCtx.createRadialGradient(w*.50,h*.40,Math.min(w,h)*.06,w*.50,h*.44,Math.max(w,h)*.64);
  halo.addColorStop(0,options.preserveBackground?'rgba(255,255,255,.12)':'rgba(255,255,255,.66)'); halo.addColorStop(1,'rgba(255,255,255,0)');
  targetCtx.fillStyle=halo;targetCtx.fillRect(0,0,w,h);
  const viewYaw = options.yaw ?? yaw, viewPitch = options.pitch ?? pitch;
  const shadowScale=options.shadowScale??1;
  const mesh = buildFigureGeometry(figureState), faces = [];
  let scale = options.scale || Math.min(w/5.6,h/8.0) * (options.zoom ?? zoom);
  let cx = options.cx ?? w*.50, ground = options.ground ?? h*.86;
  if(options.fitToBounds){
    const bounds=mesh.parts.flatMap(part=>part.vertices.map(point=>transformed(point,viewYaw,viewPitch)));
    const xs=bounds.map(point=>point[0]),ys=bounds.map(point=>point[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const padX=options.fitPaddingX??16,padY=options.fitPaddingY??16;
    scale=Math.min((w-padX*2)/(maxX-minX||1),(h-padY*2)/(maxY-minY||1))*(options.zoom??1);
    cx=(w-(minX+maxX)*scale)/2;
    ground=h-padY+minY*scale;
  }
  targetCtx.save(); targetCtx.globalAlpha=.17; targetCtx.fillStyle='#253248';
  targetCtx.beginPath();targetCtx.ellipse(cx,ground,w*.18*shadowScale,Math.max(5,h*.022*shadowScale),0,0,Math.PI*2);targetCtx.fill();targetCtx.restore();
  for(const part of mesh.parts){
    const points = part.vertices.map(p => transformed(p,viewYaw,viewPitch));
    for(const face of FACE_DEF){
      const transformedFace = face.ids.map(i=>points[i]);
      const depth = transformedFace.reduce((a,p)=>a+p[2],0)/4;
      faces.push({ part, face, points:transformedFace, depth });
    }
  }
  faces.sort((a,b)=>a.depth-b.depth);
  targetCtx.lineJoin='round';
  for(const item of faces){
    const projected = item.points.map(([x,y])=>[cx+x*scale,ground-y*scale]);
    targetCtx.beginPath();targetCtx.moveTo(projected[0][0],projected[0][1]);
    for(let i=1;i<projected.length;i++)targetCtx.lineTo(projected[i][0],projected[i][1]);
    targetCtx.closePath();targetCtx.fillStyle=colorShade(item.part.color,item.face.shade);targetCtx.fill();
    if(item.part.name==='zf_brand_patch'&&item.face.key==='front'){
      const poloLogo=figureState.outfit==='zf-polo-white'?'blue':'white';
      drawPoloLogo(targetCtx,projected,poloLogo);
    }
  }
  return mesh.parts.length;
}
function profileDisplay(profile) {
  return profile?.qualities?.map(q=>`${q.trait} ${q.score}`).join(' · ') || state.qualities;
}
function draw() {
  const count = renderMesh(canvas,ctx,state);
  if(mobileShareActive&&mobileCardPreviewCtx) paintShareCard(mobileCardPreview,mobileCardPreviewCtx,currentQrMatrix,{rotorAngle:previewRotorPhase});
  else if(!$('share-panel').hidden){
    paintShareCard(shareCardPreview,shareCardPreviewCtx,currentQrMatrix);
    if(gifCardPosterCtx&&!gifPreviewUrl)paintShareCard(gifCardPoster,gifCardPosterCtx,currentQrMatrix);
  }
  $('part-count').textContent=String(count);
  $('figure-name').textContent=state.name;
  $('pose-caption').textContent=poseNames[state.pose]||'CUSTOM POSE';
  $('canvas-frame').style.setProperty('--stage-color',state.background);
  $('personality-summary').textContent=profileDisplay(state.personalityProfile);
  for(const key of ['age','height','headSize','shoulders','legRatio','belly','noseScale','smileIntensity','armLength','armMuscle','legMuscle','handSize']){
    const label=$(key+'-label');if(label)label.textContent=key==='height'?`${state[key]} cm`:key==='age'?String(state[key]):`${state[key]}%`;
  }
  document.querySelectorAll('[data-skin]').forEach(button=>button.classList.toggle('active',button.dataset.skin===state.skin));
  $('undo').disabled=undoStack.length===0;$('redo').disabled=redoStack.length===0;
  window.__goodmenBlockFigure={state:structuredClone(state),partCount:count,geometry:buildFigureGeometry(state).parts.map(p=>({name:p.name,group:p.group,color:p.color,vertices:p.vertices}))};
  if(!drawingRefreshedQr) scheduleShareQrRefresh();
}
function clone(value){return structuredClone(value);}
function setState(patch, record = true) {
  const next=normalizeFigure({...state,...patch});
  if(JSON.stringify(next)!==JSON.stringify(state)){
    if(record){undoStack.push(clone(state));if(undoStack.length>80)undoStack.shift();redoStack=[];}
    state=next;invalidateGifCache();
  }
  syncControls();draw();
}
function updateSmileOptions(){
  const selector=$('mouthStyle');
  if(!selector)return;
  const teethOn=state.teethVisible;
  const allowed = new Set(['auto','grin','open','laugh','wide-grin']);
  for(const option of selector.options){
    const blocked=teethOn&&!allowed.has(option.value);
    option.disabled=blocked;
    option.hidden=blocked;
  }
  const label=$('teeth-rule-hint');
  if(label)label.textContent=teethOn?'Teeth enabled: only open-smile choices are available.':'Teeth off: all mouth styles are available.';
  const teethStyle=$('teethStyle');if(teethStyle)teethStyle.disabled=!teethOn;
}
function syncControls() {
  document.querySelectorAll('[data-key]').forEach(el=>{
    const key=el.dataset.key;if(!(key in state))return;
    if(el.type==='checkbox')el.checked=state[key];
    else if(el.value!==String(state[key]))el.value=state[key];
  });
  updateSmileOptions();
  const brandedPolo=state.outfit==='zf-polo-white'||state.outfit==='zf-polo-navy';
  $('topColor').disabled=brandedPolo;
  $('top-color-note').textContent=brandedPolo
    ? state.outfit==='zf-polo-white'?'White fabric with the official blue ZF logo on the left chest.':'Navy fabric with the official white ZF logo on the left chest.'
    : 'Choose a fabric colour.';
  renderHeroCustomization();
}
function updateHistoryButtons(){ $('undo').disabled=undoStack.length===0;$('redo').disabled=redoStack.length===0; }
function toast(message) {
  const node=$('toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>node.classList.remove('show'),2600);
}
function guidePopup(title, message, actionLabel='Continue', onAction=null, secondaryLabel=null, onSecondary=null) {
  const dialog=$('ux-guide-dialog');
  if(!dialog?.showModal){toast(message);onAction?.();return;}
  $('ux-guide-title').textContent=title;
  $('ux-guide-message').textContent=message;
  const primary=$('ux-guide-primary'),secondary=$('ux-guide-secondary');
  primary.textContent=actionLabel;
  secondary.hidden=!secondaryLabel;
  if(secondaryLabel)secondary.textContent=secondaryLabel;
  const dismiss=()=>{if(dialog.open)dialog.close();};
  primary.onclick=()=>{dismiss();onAction?.();};
  secondary.onclick=()=>{dismiss();onSecondary?.();};
  dialog.showModal();primary.focus();
}
function focusInput(id){const field=$(id);if(field){field.scrollIntoView({behavior:'smooth',block:'center'});field.focus();}}
function firstUntouchedSlider(){return selectedQualities.find(q=>!scoreTouched.has(q.trait));}
function promptCustomization(){
  const panel=$('customization-guide');if(panel)panel.hidden=false;
  const details=document.querySelector('.control-panel .control-section');
  if(details)details.open=true;
  $('studio-grid').scrollIntoView({behavior:'smooth',block:'start'});
}
function download(blob, filename) {
  const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function safeName(name){return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'character';}
function downloadCardBlob(blob){
  if(!blob){toast('Could not create the greeting card PNG.');return false;}
  recordCardDownload();download(blob,safeName(state.name)+'-mens-day-card.png');return true;
}
function invalidateGifCache(){
  shareDelivery.invalidate();queueSharePreparation();
  cachedGifBlob=null;cachedGifKey='';
  if(gifPreviewUrl){URL.revokeObjectURL(gifPreviewUrl);gifPreviewUrl='';}
  if(gifPreviewImage){gifPreviewImage.removeAttribute?.('src');gifPreviewImage.hidden=true;}
  if(gifCardPoster)gifCardPoster.hidden=false;
}
function exportSettings() {
  const file={schema:'goodmen-block-figure',version:2,recipient:recipientName,sender:senderName,appearance:state};
  download(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}),safeName(state.name)+'-figure.json');
}
function saveDraft() {
  // Do not persist personal drafts in localStorage.
  return false;
}
function objGeometry() {
  const {parts}=buildFigureGeometry(state), stem=safeName(state.name);let lines=[`# Good Men Studio original editable block figure`,`# ${state.name} — geometry exported in metres (approximate scale)`,`mtllib ${stem}-figure.mtl`];
  let offset=1;
  for(const part of parts){
    const objectName=part.name.replace(/[^a-zA-Z0-9_]+/g,'_');
    lines.push(`o ${objectName}`,`usemtl M_${part.color.slice(1).toUpperCase()}`);
    for(const [x,y,z] of part.vertices) lines.push(`v ${(x*.29).toFixed(5)} ${(y*.29).toFixed(5)} ${(z*.29).toFixed(5)}`);
    for(const face of FACE_DEF) lines.push(`f ${face.ids.map(i=>offset+i).join(' ')}`);
    offset+=part.vertices.length;
  }
  return lines.join('\n')+'\n';
}
function objMaterials() {
  const colors=[...new Set(buildFigureGeometry(state).parts.map(p=>p.color))];
  return colors.map(color=>{
    const r=parseInt(color.slice(1,3),16)/255,g=parseInt(color.slice(3,5),16)/255,b=parseInt(color.slice(5,7),16)/255;
    return `newmtl M_${color.slice(1).toUpperCase()}\nKd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}\nKa ${(r*.22).toFixed(4)} ${(g*.22).toFixed(4)} ${(b*.22).toFixed(4)}\nKs 0.0800 0.0800 0.0800\nNs 18.0000\nd 1.0`;
  }).join('\n\n')+'\n';
}
function wrapText(context,text,maxWidth) {
  const words=String(text).split(/\s+/), lines=[];let line='';
  for(const word of words){const candidate=line?`${line} ${word}`:word;if(context.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;}else line=candidate;}
  if(line)lines.push(line);return lines;
}
function qualityRows(context, profile, x, y, width) {
  const qualities=profile?.qualities||[];if(qualities.length!==5)return;
  const gap=10, cell=(width-gap*4)/5;
  qualities.forEach((quality,index)=>{
    const left=x+index*(cell+gap);if(index){context.beginPath();context.moveTo(left-gap/2,y);context.lineTo(left-gap/2,y+75);context.strokeStyle='#CFC7BC';context.lineWidth=1;context.stroke();}
    context.fillStyle='#454A4D';context.font=`500 16px ${PROMETO_FAMILY}`;context.letterSpacing='0px';
    wrapText(context,quality.trait.toUpperCase(),cell-14).slice(0,2).forEach((line,lineIndex)=>context.fillText(line,left+3,y+19+lineIndex*18));
    context.fillStyle='#D84F1D';context.font=`500 21px ${PROMETO_FAMILY}`;context.fillText(`${quality.score}/100`,left+3,y+65);
  });
  context.beginPath();context.moveTo(x,y+76);context.lineTo(x+width,y+76);context.strokeStyle='#CFC7BC';context.lineWidth=1;context.stroke();
}
function fallbackLogo(context,x,y,size,color){
  context.beginPath();context.ellipse(x,y,size/2,size*.37,0,0,Math.PI*2);context.strokeStyle=color;context.lineWidth=Math.max(2,size*.05);context.stroke();
  context.fillStyle=color;context.font=`900 ${Math.round(size*.34)}px Arial,sans-serif`;context.textAlign='center';context.textBaseline='middle';context.fillText('ZF',x,y+1,size*.78);context.textAlign='start';context.textBaseline='alphabetic';
}
function drawOfficialLogo(context,x,y,size,variant='blue',backing=false){
  const image=brandLogos[variant];
  if(variant==='white'&&backing){context.beginPath();context.ellipse(x,y,size*.57,size*.57,0,0,Math.PI*2);context.fillStyle='#0A4D91';context.fill();}
  if(image?.complete&&image.naturalWidth&&typeof context.drawImage==='function')context.drawImage(image,x-size/2,y-size/2,size,size);
  else fallbackLogo(context,x,y,size,variant==='white'?'#FFFFFF':'#0A4D91');
}
function cardLogo(context,x,y,size,color,backing=false){
  if(backing){context.fillStyle='#FFFFFF';context.fillRect(x-size-10,y-size-8,size*2+20,size*2+16);}
  drawOfficialLogo(context,x,y,size*2,color.toLowerCase()==='#ffffff'||color.toLowerCase()==='#fff'?'white':'blue',false);
}
function drawPoloLogo(context,face,variant){
  const image=brandLogos[variant];
  const [bottomLeft,bottomRight,topRight,topLeft]=face;
  const sourceWidth=image?.naturalWidth||100,sourceHeight=image?.naturalHeight||100;
  const ax=(topRight[0]-topLeft[0])/sourceWidth, ay=(topRight[1]-topLeft[1])/sourceWidth;
  const cx=(bottomLeft[0]-topLeft[0])/sourceHeight, cy=(bottomLeft[1]-topLeft[1])/sourceHeight;
  context.save();context.setTransform(ax,ay,cx,cy,topLeft[0],topLeft[1]);
  if(image?.complete&&image.naturalWidth&&typeof context.drawImage==='function')context.drawImage(image,0,0,sourceWidth,sourceHeight);
  else{context.fillStyle=variant==='white'?'#FFFFFF':'#0A4D91';context.font='900 47px Arial,sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText('ZF',sourceWidth/2,sourceHeight/2);}
  context.restore();
}
function polygon(context,points,fill){context.beginPath();context.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)context.lineTo(points[i][0],points[i][1]);context.closePath();context.fillStyle=fill;context.fill();}
function drawWindmill(context,x,y,scale=1,phase=-Math.PI/2){drawWindTurbine(context,x,y,scale,phase);}
function animateCardPreview(timestamp=0){
  if(!mobileShareActive&&$('share-panel').hidden){previewRotorFrame=0;return;}
  if(timestamp-previewLastPaint>=85){
    previewLastPaint=timestamp;
    previewRotorPhase=(previewRotorPhase+Math.PI/18)%(Math.PI*2);
    if(mobileShareActive&&mobileCardPreviewCtx)paintShareCard(mobileCardPreview,mobileCardPreviewCtx,currentQrMatrix,{rotorAngle:previewRotorPhase});
    else if(gifCardPosterCtx&&!gifPreviewUrl){
      const direction=$('animationDirection').value==='right-to-left'?'right-to-left':'left-to-right';
      const motion=roadMotionAtFrame(previewRoadFrame++%48,48,direction);
      paintShareCard(gifCardPoster,gifCardPosterCtx,currentQrMatrix,{rotorAngle:previewRotorPhase,motion});
    }
  }
  previewRotorFrame=requestAnimationFrame(animateCardPreview);
}
function startCardPreview(){
  if(typeof requestAnimationFrame==='function'&&!previewRotorFrame)previewRotorFrame=requestAnimationFrame(animateCardPreview);
}
function stopCardPreview(){
  if(previewRotorFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(previewRotorFrame);
  previewRotorFrame=0;
}
function drawTruckBranding(context,x,base,width,height){
  // The source artwork already has a painted ZF mark and slogan. Cover that
  // print with a small sampled-color field that follows the trailer's own
  // left-to-right highlight and top-to-bottom shading. A flat gradient left a
  // visible sticker seam, especially after GIF palette reduction.
  const left=x+width*.239,top=base-height*.91,panelWidth=width*.683,panelHeight=height*.54;
  if(!truckBrandingPanel&&typeof document!=='undefined'){
    const panel=document.createElement('canvas');panel.width=3;panel.height=5;
    const panelContext=panel.getContext('2d'),colors=[
      [[128,169,226],[80,121,179],[97,138,195]],
      [[108,149,206],[73,114,171],[85,126,183]],
      [[83,124,181],[62,103,160],[70,111,168]],
      [[60,101,158],[53,94,152],[56,97,154]],
      [[43,85,142],[45,86,143],[45,86,143]]
    ],pixels=panelContext.createImageData(3,5);
    colors.forEach((row,y)=>row.forEach((rgb,xIndex)=>{const offset=(y*3+xIndex)*4;pixels.data[offset]=rgb[0];pixels.data[offset+1]=rgb[1];pixels.data[offset+2]=rgb[2];pixels.data[offset+3]=255;}));
    panelContext.putImageData(pixels,0,0);truckBrandingPanel=panel;
  }
  if(truckBrandingPanel){context.save();context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(truckBrandingPanel,left,top,panelWidth,panelHeight);context.restore();}
  else{context.fillStyle='#537CB5';context.fillRect(left,top,panelWidth,panelHeight);}
  drawOfficialLogo(context,x+width*.31,top+panelHeight*.51,height*.29,'white');
  context.fillStyle='#FFFFFF';context.textAlign='left';context.textBaseline='middle';
  context.shadowColor='rgba(8,34,67,.65)';context.shadowBlur=1.5;
  context.font=`500 ${Math.max(9,height*.12)}px ${PROMETO_FAMILY}`;
  context.fillText('Driving Commercial Vehicle Innovation',x+width*.39,top+panelHeight*.52,width*.51);
  context.shadowColor='transparent';context.shadowBlur=0;
  context.textAlign='start';context.textBaseline='alphabetic';
}
function drawBusBranding(context,x,base,width,height){
  // The transparent blue EV bus reference has no mark, so add the supplied
  // white ZF logo to its mid-side body, upright and clear of doors and wheels.
  drawOfficialLogo(context,x+width*.52,base-height*.49,height*.24,'white',true);
}
function drawVehicleArtwork(context,scene,x,base,layout,{direction='right-to-left'}={}){
  scene=scene==='bus'?'bus':'truck';
  const image=vehicleImages[scene];
  if(!image?.complete||!image.naturalWidth||typeof context.drawImage!=='function')return;
  const width=layout.width,height=width*image.naturalHeight/image.naturalWidth;
  const mirror=direction==='left-to-right';
  if(mirror){context.save();context.translate(2*x+width,0);context.scale(-1,1);}
  context.drawImage(image,x,base-height,width,height);
  if(mirror)context.restore();
  if(scene==='truck')drawTruckBranding(context,x,base,width,height);
  if(scene==='bus')drawBusBranding(context,x,base,width,height);
}
function drawCardBackground(context,style='renewable-hills'){
  const palettes={
    'renewable-hills':['#DFEDF0','#C7D8D2','#B9C9BE'],
    'city-skyline':['#DCEAF4','#B9D2E2','#A8C0CE'],
    'coastal-highway':['#D7ECF2','#A8D1D5','#86B8B8'],
    'green-countryside':['#E1EEE7','#C8DED0','#AFC8B5'],
    'logistics-hub':['#E5ECF1','#C9D7E0','#ADBDC8']
  };
  const colors=palettes[style]||palettes['renewable-hills'];
  const sky=context.createLinearGradient(0,374,0,936);sky.addColorStop(0,colors[0]);sky.addColorStop(.68,colors[1]);sky.addColorStop(1,colors[2]);context.fillStyle=sky;context.fillRect(54,374,972,562);
  context.fillStyle='rgba(255,255,255,.43)';context.beginPath();context.ellipse(220,453,112,30,0,0,Math.PI*2);context.fill();
  if(style==='city-skyline'){
    polygon(context,[[54,720],[54,655],[112,655],[112,594],[171,594],[171,652],[217,652],[217,563],[285,563],[285,631],[339,631],[339,587],[407,587],[407,650],[472,650],[472,585],[529,585],[529,641],[594,641],[594,571],[654,571],[654,635],[718,635],[718,598],[777,598],[777,650],[841,650],[841,567],[911,567],[911,625],[969,625],[969,574],[1026,574],[1026,792],[54,792]],'#AFC2CF');
    polygon(context,[[54,733],[54,682],[95,682],[95,622],[153,622],[153,699],[207,699],[207,614],[260,614],[260,677],[314,677],[314,600],[369,600],[369,688],[425,688],[425,624],[480,624],[480,682],[541,682],[541,595],[596,595],[596,680],[655,680],[655,625],[710,625],[710,697],[767,697],[767,610],[823,610],[823,679],[882,679],[882,596],[938,596],[938,670],[1026,670],[1026,811],[54,811]],'#8FA9B9');
    for(const [x,y,w,h] of [[112,611,3,40],[228,579,4,42],[356,603,4,54],[494,600,3,53],[558,611,4,44],[672,589,3,59],[735,615,3,32],[858,585,4,64],[985,592,3,52]]){
      context.fillStyle='rgba(241,248,245,.48)';for(let row=y;row<y+h;row+=13)context.fillRect(x,row,w,5);
    }
  }else if(style==='coastal-highway'){
    context.fillStyle='#91C8D0';context.fillRect(54,555,972,249);
    context.fillStyle='rgba(236,249,244,.44)';for(let row=584;row<780;row+=31){context.fillRect(54,row,972,2);}
    polygon(context,[[54,699],[153,650],[247,674],[340,612],[443,672],[532,634],[631,685],[731,627],[849,679],[934,633],[1026,665],[1026,812],[54,812]],'#8FB6A9');
    polygon(context,[[54,734],[168,695],[258,711],[364,653],[480,713],[581,670],[692,718],[809,672],[930,715],[1026,682],[1026,827],[54,827]],'#6F9F93');
    context.fillStyle='rgba(255,255,255,.65)';context.beginPath();context.ellipse(868,461,37,37,0,0,Math.PI*2);context.fill();
  }else if(style==='green-countryside'){
    polygon(context,[[54,696],[148,617],[252,670],[349,592],[458,666],[548,606],[663,670],[785,588],[901,666],[1000,606],[1026,622],[1026,820],[54,820]],'#AAC5A9');
    polygon(context,[[54,735],[176,676],[291,711],[398,647],[516,709],[628,665],[754,714],[873,654],[982,702],[1026,681],[1026,833],[54,833]],'#80A98B');
    for(const [x,y,s] of [[120,648,.8],[278,675,.65],[443,642,.72],[814,648,.8],[955,656,.62]]){
      context.fillStyle='#527B62';context.fillRect(x-3*s,y,6*s,29*s);context.beginPath();context.arc(x,y-5*s,19*s,0,Math.PI*2);context.fill();
    }
    context.fillStyle='rgba(241,226,171,.5)';for(let x=86;x<1026;x+=96)context.fillRect(x,768,42,2);
  }else if(style==='logistics-hub'){
    polygon(context,[[54,644],[132,594],[215,612],[278,573],[362,604],[423,573],[506,605],[575,578],[655,607],[739,572],[815,608],[898,580],[980,613],[1026,599],[1026,809],[54,809]],'#BBC9D1');
    context.fillStyle='#8298A6';context.fillRect(93,632,396,149);context.fillStyle='#738B9A';polygon(context,[[74,634],[278,562],[507,634]],'#7C929E');
    context.fillStyle='#D7E1E6';for(let x=117;x<475;x+=87){context.fillRect(x,680,57,88);context.fillStyle='#536C7A';context.fillRect(x+5,688,47,80);context.fillStyle='#D7E1E6';}
    context.fillStyle='#C6D6DD';polygon(context,[[651,658],[819,603],[988,658],[988,786],[651,786]],'#C6D6DD');
    context.fillStyle='#8299A5';for(let x=676;x<968;x+=58)context.fillRect(x,690,42,75);
    context.fillStyle='#587E91';for(let x=176;x<438;x+=54)polygon(context,[[x,622],[x+38,609],[x+48,633],[x+9,646]],'#587E91');
  }else{
    polygon(context,[[54,675],[188,586],[342,657],[485,577],[636,655],[790,572],[925,647],[1026,590],[1026,839],[54,839]],'#ADBFAF');
    polygon(context,[[54,712],[219,639],[365,697],[541,622],[705,697],[850,641],[1026,699],[1026,844],[54,844]],'#91AB9E');
  }
}
function drawMobilityBackdrop(context,scene,motion=null,rotorAngle=-Math.PI/2,background='renewable-hills'){
  scene=scene==='bus'?'bus':'truck';
  context.save();
  drawCardBackground(context,background);
  context.fillStyle='rgba(255,255,255,.32)';context.beginPath();context.ellipse(834,442,140,34,0,0,Math.PI*2);context.fill();
  // The wind turbine is a fixed part of the card's mobility landscape, never a picker option.
  // The turbine sits on the distant ridge above the enlarged vehicle lane.
  drawWindmill(context,660,757,.86,rotorAngle);
  context.fillStyle='rgba(18,31,38,.24)';context.fillRect(54,832,972,104);
  const asphalt=context.createLinearGradient(0,832,0,936);asphalt.addColorStop(0,'#40515A');asphalt.addColorStop(.46,'#34434B');asphalt.addColorStop(1,'#2C3A42');context.fillStyle=asphalt;context.fillRect(54,835,972,101);
  context.fillStyle='rgba(255,255,255,.72)';context.fillRect(54,832,972,3);
  const roadOffset=((motion?.roadOffset||0)%96+96)%96;
  // Subtle asphalt highlights scroll with the lane dashes, so the road visibly
  // flows beneath the untouched source vehicle image.
  for(let x=54-roadOffset;x<1026;x+=96){
    let left=Math.max(54,x+8),right=Math.min(1026,x+40);
    if(right>left){context.fillStyle='rgba(218,229,229,.16)';context.fillRect(left,850,right-left,2);}
    left=Math.max(54,x+53);right=Math.min(1026,x+89);
    if(right>left){context.fillStyle='rgba(10,20,26,.17)';context.fillRect(left,913,right-left,2);}
    left=Math.max(54,x);right=Math.min(1026,x+54);
    if(right>left){context.fillStyle='rgba(247,240,220,.88)';context.fillRect(left,878,right-left,4);}
  }
  // A separate raised forecourt keeps the standing character physically apart
  // from the bus/truck road and the vehicle silhouette in every exported frame.
  context.fillStyle='#D5D8D3';context.fillRect(54,803,510,29);context.fillStyle='#F7F8F4';context.fillRect(54,803,510,3);context.fillStyle='#B9C1BC';context.fillRect(54,829,510,3);
  for(let x=76;x<550;x+=76){context.fillStyle='rgba(112,126,119,.18)';context.fillRect(x,810,1,14);}
  // Draw the supplied source vehicle at the exact same coordinates in every
  // frame. Motion is carried only by the road markings and turbine rotor.
  const layout=cardVehicleLayout(scene);drawVehicleArtwork(context,scene,layout.x,921,layout,{direction:'right-to-left'});
  context.restore();
}
function drawTextFit(context,text,x,y,maxWidth,size,minSize,color,bold=true){
  let fontSize=size;context.fillStyle=color;context.font=`${bold?'500':'300'} ${fontSize}px ${PROMETO_FAMILY}`;
  while(fontSize>minSize&&context.measureText(text).width>maxWidth){fontSize-=1;context.font=`${bold?'500':'300'} ${fontSize}px ${PROMETO_FAMILY}`;}
  context.fillText(text,x,y);return fontSize;
}
function cardTitleText(){
  const recipient=recipientName.trim();
  return recipient?`${state.name} - ${recipient.toUpperCase()}`:state.name;
}
function displaySender(){return senderName.trim()||'A FRIEND';}
function cardQrPlaceholder(){
  if(!getShareBaseUrl())return 'ADD HOST URL';
  if(!currentQrMatrix)return 'QR NOT READY';
  return 'SCAN TO VIEW';
}
function drawQrCode(context,qr,x,y,size){
  context.fillStyle='#FFFFFF';context.fillRect(x,y,size,size);
  if(!qr?.modules?.length){
    context.strokeStyle='#C9D3DE';context.lineWidth=2;context.strokeRect(x+10,y+10,size-20,size-20);
    context.fillStyle='#0A4D91';context.font=`500 15px ${PROMETO_FAMILY}`;context.textAlign='center';context.textBaseline='middle';context.fillText(cardQrPlaceholder(),x+size/2,y+size/2);context.textAlign='start';context.textBaseline='alphabetic';return;
  }
  const quiet=4,total=qr.size+quiet*2,module=size/total;
  context.fillStyle='#000000';
  for(let row=0;row<qr.size;row++)for(let col=0;col<qr.size;col++)if(qr.modules[row][col]){
    const left=Math.round(x+(col+quiet)*module),top=Math.round(y+(row+quiet)*module);
    const right=Math.round(x+(col+quiet+1)*module),bottom=Math.round(y+(row+quiet+1)*module);
    context.fillRect(left,top,right-left,bottom-top);
  }
}
function paintShareCard(target,context,qr=currentQrMatrix,animation=null){
  context.fillStyle='#27292A';context.fillRect(0,0,1080,1512);context.fillStyle='#F2ECE3';context.fillRect(12,12,1056,1488);
  context.strokeStyle='#B9B1A7';context.lineWidth=1.5;context.strokeRect(28,28,1024,1456);
  drawOfficialLogo(context,91,82,74,'blue',false);
  context.strokeStyle='#2C2D2E';context.lineWidth=1.2;context.strokeRect(795,43,226,91);
  ['DIVISION CVS','MEN’S DAY','COLLECTIBLE'].forEach((line,index)=>{const y=65+index*27;if(index)context.beginPath(),context.moveTo(795,y-19),context.lineTo(1021,y-19),context.stroke();context.fillStyle='#232526';context.font=`500 13px ${PROMETO_FAMILY}`;context.fillText(line,812,y);});
  context.fillStyle='#27292A';context.textAlign='center';context.letterSpacing='0px';
  let titleSize=39;context.font=`500 ${titleSize}px ${PROMETO_FAMILY}`;while(titleSize>31&&context.measureText('International Men’s Day 2026').width>944){titleSize--;context.font=`500 ${titleSize}px ${PROMETO_FAMILY}`;}
  context.fillText('International Men’s Day 2026',540,174);
  context.fillStyle='#34465A';context.font=`500 20px ${PROMETO_FAMILY}`;context.fillText('The Future Is Everyone.',540,205);context.textAlign='start';
  context.beginPath();context.moveTo(56,226);context.lineTo(1022,226);context.strokeStyle='#7E7B76';context.lineWidth=1.4;context.stroke();
  context.fillStyle='#D84F1D';context.font=`500 16px ${PROMETO_FAMILY}`;context.letterSpacing='1.3px';context.fillText('ZF MEN’S DAY CHARACTER',56,257);
  context.letterSpacing='-1.1px';drawTextFit(context,cardTitleText(),55,316,966,54,20,'#202223',true);
  context.letterSpacing='0px';drawTextFit(context,state.tagline,57,351,950,21,15,'#45515D',true);
  drawMobilityBackdrop(context,state.cardScene,animation?.motion||null,animation?.rotorAngle??previewRotorPhase,state.cardBackground);
  if(state.heroMode&&state.heroPower){
    // Keep the power callout in the open upper-right sky area. The figure is
    // anchored left at cx=350; placing the box there caused hands and capes to
    // cover its text in wide poses.
    const box={x:650,y:390,w:356,h:96};
    context.fillStyle='#0A4D91';context.fillRect(box.x,box.y,box.w,box.h);
    context.fillStyle='#D84F1D';context.fillRect(box.x,box.y,box.w,5);
    context.strokeStyle='rgba(255,255,255,.72)';context.lineWidth=1.4;context.strokeRect(box.x+1,box.y+1,box.w-2,box.h-2);
    context.fillStyle='#FFFFFF';context.textAlign='left';context.letterSpacing='1.2px';context.font=`500 16px ${PROMETO_FAMILY}`;context.fillText('SECRET POWER',box.x+17,box.y+29);
    context.letterSpacing='0px';context.font=`500 18px ${PROMETO_FAMILY}`;
    let powerLines=wrapText(context,state.heroPower,box.w-34);
    if(powerLines.length>2){powerLines=powerLines.slice(0,2);powerLines[1]=powerLines[1].replace(/[.,;:]?$/,'…');}
    powerLines.forEach((line,index)=>context.fillText(line,box.x+17,box.y+56+index*22));
  }
  const characterFrame=(animation?.capePhase===undefined && animation?.blink===undefined)
    ? state
    : {...state, ...(animation?.capePhase===undefined?{}:{heroCapePhase:animation.capePhase}), ...(animation?.blink===undefined?{}:{blink:animation.blink})};
  // The collectible card uses a fixed, fit-safe camera. This keeps raised hands,
  // capes and tallest hair below the title while placing the shoes on the left
  // forecourt, clear of the turbine, right-side power panel and vehicle lane.
  renderMesh(target,context,characterFrame,{preserveBackground:true,fixedResolution:true,...CARD_CHARACTER_FRAME,shadowScale:.25});
  const poloLogoPlacement=getCardPoloLogoPlacement(characterFrame,CARD_CHARACTER_FRAME);
  if(poloLogoPlacement) drawOfficialLogo(context,poloLogoPlacement.x,poloLogoPlacement.y,poloLogoPlacement.size,poloLogoPlacement.variant,poloLogoPlacement.variant==='white');
  context.beginPath();context.moveTo(56,953);context.lineTo(1022,953);context.strokeStyle='#7E7B76';context.lineWidth=1.4;context.stroke();
  context.fillStyle='#D84F1D';context.font=`500 17px ${PROMETO_FAMILY}`;context.letterSpacing='1.1px';context.fillText(`FOR ${recipientName?recipientName.toUpperCase():'SOMEONE WHO SHINES'}`,56,979);
  context.fillStyle='#5D6263';context.font=`500 14px ${PROMETO_FAMILY}`;context.textAlign='right';context.fillText('CHARACTER PROFILE · ZF MOBILITY',1022,979);context.textAlign='start';
  context.fillStyle='#252728';context.font=`500 18px ${PROMETO_FAMILY}`;context.letterSpacing='1px';context.fillText('FIVE QUALITIES · PERSONALITY SCORES',56,1014);
  qualityRows(context,state.personalityProfile,56,1024,966);
  context.beginPath();context.moveTo(56,1110);context.lineTo(1022,1110);context.strokeStyle='#7E7B76';context.lineWidth=1.2;context.stroke();
  context.fillStyle='#D84F1D';context.font=`500 17px ${PROMETO_FAMILY}`;context.letterSpacing='1.2px';context.fillText('A MESSAGE TO SHARE',56,1142);
  context.fillStyle='#282B2C';context.letterSpacing='0px';let messageSize=23;context.font=`500 ${messageSize}px ${PROMETO_FAMILY}`;
  let messageLines=wrapText(context,state.greeting,625);while(messageLines.length>5&&messageSize>18){messageSize-=1;context.font=`500 ${messageSize}px ${PROMETO_FAMILY}`;messageLines=wrapText(context,state.greeting,625);}
  if(messageLines.length>5){messageLines=messageLines.slice(0,5);messageLines[4]=messageLines[4].replace(/[.,;:]?$/,'…');}
  messageLines.forEach((line,i)=>context.fillText(line,57,1180+i*31));
  context.fillStyle='#45515D';context.font=`500 17px ${PROMETO_FAMILY}`;context.letterSpacing='0px';
  drawTextFit(context,`FROM ${displaySender().toUpperCase()}`,57,1343,625,17,13,'#45515D',true);
  // QR lives entirely in the right-hand message lane: x=762..1016,
  // y=1140..1394. It must never overlap qualities (above y=1110),
  // the left-hand greeting (ends before x=682), or the footer (y>=1420).
  drawQrCode(context,qr,762,1140,254);
  context.fillStyle='#0A4D91';context.font=`500 14px ${PROMETO_FAMILY}`;context.textAlign='center';context.fillText(cardQrLabel(),889,1410);context.textAlign='start';
  context.beginPath();context.moveTo(56,1420);context.lineTo(1022,1420);context.strokeStyle='#7E7B76';context.lineWidth=1.3;context.stroke();
  const columns=[['EDITION','2026'],['COLLECTION','MEN’S DAY'],['FORMAT','DIGITAL CARD'],['STATUS','MADE WITH APPRECIATION']];
  const colWidth=966/4;
  columns.forEach(([label,value],index)=>{const x=56+index*colWidth;if(index){context.beginPath();context.moveTo(x,1434);context.lineTo(x,1485);context.strokeStyle='#CFC7BC';context.lineWidth=1;context.stroke();}context.fillStyle='#D84F1D';context.font=`500 12px ${PROMETO_FAMILY}`;context.letterSpacing='1px';context.fillText(label,x+10,1447);context.fillStyle='#2C3031';context.font=`500 16px ${PROMETO_FAMILY}`;context.letterSpacing='0px';drawTextFit(context,value,x+10,1475,colWidth-20,16,12,'#2C3031',true);});
  // The template's bottom-most copy sat below the border and was cropped in
  // exports. The collectible ends cleanly after its metadata row.
}
async function createCardPngBlob(){
  if(document.fonts?.ready)await document.fonts.ready;
  await Promise.all([brandLogosReady,vehicleAssetsReady].filter(Boolean));
  if(!await refreshShareQr({redraw:false}))throw new Error('Set a phone-accessible app URL first so the card can include a working QR code.');
  drawingRefreshedQr=true;draw();drawingRefreshedQr=false;
  const card=document.createElement('canvas');card.width=1080;card.height=1512;const context=card.getContext('2d');
  paintShareCard(card,context,currentQrMatrix);
  return new Promise(resolve=>card.toBlob(resolve,'image/png'));
}
async function createAnimatedGifBlob(){
  if(document.fonts?.ready)await document.fonts.ready;
  await Promise.all([brandLogosReady,vehicleAssetsReady].filter(Boolean));
  if(!await refreshShareQr({redraw:false}))throw new Error('Set a phone-accessible app URL first so the card can include a working QR code.');
  drawingRefreshedQr=true;draw();drawingRefreshedQr=false;
  const key=deliveryCacheKey();
  if(cachedGifBlob&&cachedGifKey===key)return cachedGifBlob;
  const width=1080,height=1512,scene=state.cardScene,frameCount=48;
  const direction=$('animationDirection').value==='right-to-left'?'right-to-left':'left-to-right';
  const source=document.createElement('canvas');source.width=width;source.height=height;const sourceContext=source.getContext('2d');
  const frameCanvas=document.createElement('canvas');frameCanvas.width=width;frameCanvas.height=height;const frameContext=frameCanvas.getContext('2d');
  const renderFrame=async index=>{
    await new Promise(resolve=>setTimeout(resolve,0));
    if(deliveryCacheKey()!==key)throw Object.assign(new Error('The card changed during preparation.'),{name:'StaleShareError'});
    const motion=roadMotionAtFrame(index,frameCount,direction);
    const capePhase=Math.sin(motion.phase*Math.PI*2);
    const rotorAngle=windTurbinePhaseAtFrame(index,frameCount,1);
    const blink=blinkAtFrame(index,frameCount);
    paintShareCard(source,sourceContext,currentQrMatrix,{motion,capePhase,rotorAngle,blink});
    frameContext.clearRect(0,0,width,height);frameContext.drawImage(source,0,0,width,height);
    return frameContext.getImageData(0,0,width,height).data;
  };
  const vehiclePriorityRect=scene==='bus'?{x:580,y:744,width:430,height:192}:{x:505,y:804,width:515,height:132};
  const gif=await encodeAnimatedGif({width,height,frameCount,delayCentiseconds:12,priorityRect:vehiclePriorityRect,renderFrame});
  cachedGifBlob=gif;cachedGifKey=key;showGifPreview(gif);
  return gif;
}
function deliveryCacheKey(){return JSON.stringify([state,recipientName,senderName,currentShareUrl,$('animationDirection').value]);}
function showGifPreview(blob){
  if(!gifPreviewImage||!gifCardPoster)return;
  if(gifPreviewUrl)URL.revokeObjectURL(gifPreviewUrl);
  gifPreviewUrl=URL.createObjectURL(blob);gifPreviewImage.src=gifPreviewUrl;gifPreviewImage.hidden=false;gifCardPoster.hidden=true;
}
async function exportCard(){
  if(!requireSender())return;
  const button=$('card-button');button.disabled=true;
  try{const png=await createCardPngBlob();if(downloadCardBlob(png))toast('High-resolution card PNG downloaded.');}
  catch(error){$('share-qr-note').textContent=error.message;toast('PNG export failed. Please check the QR link settings.');}
  finally{button.disabled=!currentQrMatrix;}
}
async function exportAnimatedGif(){
  if(!requireSender())return;
  const button=$('gif-button'),note=$('gif-export-note');button.disabled=true;note.textContent='Preparing the animation…';
  try{
    const gif=await createAnimatedGifBlob();
    recordCardDownload();download(gif,`${safeName(state.name)}-mens-day-card.gif`);
    note.textContent='GIF ready · original vehicle stays fixed · road markings move beneath it · turbine rotates.';toast('Animated card GIF downloaded.');
  }catch(error){note.textContent=`GIF export failed: ${error.message}`;toast('GIF export failed. Check the QR link settings and try again.');}
  finally{button.disabled=!currentQrMatrix;}
}
function createCardShareId(){
  return globalThis.crypto?.randomUUID?.()||`gms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
function setQrActionsReady(ready){
  for(const id of ['card-button','gif-button','share-card-button','mobile-download-card','mobile-share-card']){
    const button=$(id);if(button)button.disabled=!ready;
  }
}
function startNewCardShareId(){
  cardShareId=createCardShareId();currentShareUrl='';currentQrMatrix=null;qrRefreshRevision++;
  if($('copy-share-link-button'))$('copy-share-link-button').disabled=true;
  setQrActionsReady(false);
  window.__goodmenShareQr={url:'',ready:false,cardId:cardShareId};
}
// V22 public deployment: derive links from the actual approved project path.
// Never trust saved URL overrides or a manually typed remote host.
const APPROVED_GITHUB_ORIGIN='https://zfcvs.github.io';
const APPROVED_PROJECTS=new Set(['/mensday-2026-v22','/Mensday_V22']);
const GITHUB_SITE_HOME='https://zfcvs.github.io/mensday-2026-v22/';
function approvedSiteHome(){
  try{
    const loc=new URL(globalThis.location.href);
    if(loc.protocol!=='https:')return null;
    const path=loc.pathname.replace(/\/+$/,'').replace(/\/(?:index|block-figure)\.html$/i,'');
    if(loc.origin===APPROVED_GITHUB_ORIGIN && APPROVED_PROJECTS.has(path))return `${loc.origin}${path}/`;
    // Deliberately no arbitrary production-site override. Corporate deployment
    // must add its explicitly approved HTTPS origin and path here.
    return null;
  }catch{return null;}
}
function onCanonicalGitHubPages(){return approvedSiteHome()!==null;}
function getShareBaseUrl(){
  const site=approvedSiteHome();
  return site?new URL('block-figure.html',site).href:null;
}
function getCreateAnotherUrl(){
  const card=getShareBaseUrl();
  return card?new URL('./',card).href:null;
}
function shareLocationNote(){
  if(!getShareBaseUrl())return 'Enter a phone-accessible app URL below. A file or localhost address cannot open on another phone.';
  return 'Scan to open this exact card on a phone. Card details stay in the link and are not uploaded.';
}
function cardQrLabel(){
  if(!getShareBaseUrl())return 'PASTE HOSTED APP URL';
  if(!currentQrMatrix)return 'QR LINK UNAVAILABLE';
  return 'SCAN TO VIEW & DOWNLOAD';
}
async function copyShareLink(noteId='share-link-note'){
  if(!currentShareUrl)await refreshShareQr({redraw:false});
  const note=$(noteId);
  if(!currentShareUrl){
    if(note)note.textContent='Add your name and a phone-accessible app URL to prepare this card link.';
    toast('Add your name and a hosted or phone-accessible app URL first.');
    return false;
  }
  let copied=false;
  try{
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(currentShareUrl);copied=true;}
  }catch{}
  if(!copied){
    const field=document.createElement('textarea');field.value=currentShareUrl;field.readOnly=true;
    field.setAttribute('aria-hidden','true');field.style.position='fixed';field.style.opacity='0';
    document.body.append(field);field.select();
    try{copied=Boolean(document.execCommand?.('copy'));}catch{}
    field.remove();
  }
  if(!copied){if(note)note.textContent='Copy was blocked by this browser. Select the card link from the address bar to share it.';toast('This browser blocked clipboard access.');return false;}
  if(note)note.textContent='Card link copied. Paste it into a message or post to share this exact card.';
  toast('Personalized card link copied.');
  return true;
}
function getNameValidationProblem(){
  for(const [id,label] of [['recipient-input','recipient'],['sender-input','sender']]){
    const result=validatePersonalName($(id)?.value ?? (id==='recipient-input'?recipientName:senderName));
    if(!result.valid)return {id,label,reason:result.reason};
  }
  return null;
}
function setNameValidationNote(id,message=''){
  const note=$(id==='recipient-input'?'recipient-name-warning':'sender-name-warning');
  if(note)note.textContent=message;
  const field=$(id);
  if(field)field.setAttribute('aria-invalid',message?'true':'false');
}
function registerNameInput(id){
  const field=$(id);let accepted='';
  field.addEventListener('beforeinput',event=>{
    // Prevent forbidden characters before they appear; paste is validated as a whole below.
    if(event.inputType?.startsWith('insert')&&event.data && /[@.\d:/\\?&#]/u.test(event.data)){
      event.preventDefault();setNameValidationNote(id,'Names only — email addresses and domain names are not allowed.');
    }
  });
  field.addEventListener('paste',event=>{
    const pasted=event.clipboardData?.getData('text')??'';
    const proposed=field.value.slice(0,field.selectionStart??field.value.length)+pasted+field.value.slice(field.selectionEnd??field.value.length);
    // Disallow invalid or email-like pastes completely, rather than turning a
    // pasted email into a misleading name by stripping @ or punctuation.
    if(!validatePersonalName(proposed).valid){event.preventDefault();setNameValidationNote(id,'Paste a name only, not an email address or website.');}
  });
  field.addEventListener('input',()=>{
    const proposed=field.value;
    if(proposed && !/^[\p{L}\p{M} '’-]*$/u.test(proposed)){
      field.value=accepted;setNameValidationNote(id,'Names only — no @, email address, domain, dots, digits or symbols.');
    }else{
      accepted=field.value;
      setNameValidationNote(id,'');
    }
    if(id==='recipient-input')recipientName=field.value.slice(0,50);
    else senderName=field.value.slice(0,50);
    updateProfileReadiness();updateScoreReadiness();
  });
  field.addEventListener('blur',()=>{
    if(field.value.trim()&&!validatePersonalName(field.value).valid){
      setNameValidationNote(id,validatePersonalName(field.value).reason);
    }
  });
}
function requireSender(){
  const problem=getNameValidationProblem();
  if(!problem){recipientName=$('recipient-input').value.trim();senderName=$('sender-input').value.trim();return true;}
  setNameValidationNote(problem.id,problem.reason);
  toast(problem.reason);
  $(problem.id)?.focus();
  return false;
}
function safeUtf16Prefix(value,maxLength){
  let result='';
  for(const point of String(value)){
    if(result.length+point.length>maxLength)break;
    result+=point;
  }
  return result;
}
function addEmojiToGreeting(emoji){
  const input=$('greeting'),value=input.value||'';
  const start=Number.isInteger(input.selectionStart)?input.selectionStart:value.length;
  const end=Number.isInteger(input.selectionEnd)?input.selectionEnd:start;
  const max=Number(input.maxLength)>0?Number(input.maxLength):320;
  const next=safeUtf16Prefix(value.slice(0,start)+emoji+value.slice(end),max);
  input.value=next;
  setState({greeting:next});
  const caret=Math.min(start+emoji.length,next.length);
  input.focus();input.setSelectionRange?.(caret,caret);
}
async function refreshShareQr({redraw=true}={}){
  if(!mobileShareActive&&$('share-panel').hidden)return null;
  const revision=++qrRefreshRevision;
  const base=getShareBaseUrl();
  if(!base){
    currentShareUrl='';currentQrMatrix=null;
    setQrActionsReady(false);
    if($('copy-share-link-button'))$('copy-share-link-button').disabled=true;
    window.__goodmenShareQr={url:'',ready:false,cardId:cardShareId};
    const note=shareLocationNote();$('share-qr-note').textContent=note;
    if(!mobileShareActive)$('share-action-note').textContent=`${note} PNG, GIF and sharing stay unavailable until the QR has a phone-accessible destination.`;
    if(mobileShareActive)$('mobile-share-note').textContent=note;
    if(redraw){drawingRefreshedQr=true;draw();drawingRefreshedQr=false;}
    return null;
  }
  const payload={schema:'goodmen-share-card-v1',id:cardShareId,recipient:recipientName,sender:displaySender(),figure:state,camera:{yaw,pitch,zoom}};
  try{
    const token=await encodeShareToken(payload);
    const shareUrl=`${base}#gms=${token}`;
    const encoded=encodeQrText(shareUrl);
    if(revision!==qrRefreshRevision)return null;
    if(currentShareUrl!==shareUrl)invalidateGifCache();
    currentShareUrl=shareUrl;currentQrMatrix=encoded;
    queueSharePreparation();
    setQrActionsReady(true);
    if($('copy-share-link-button'))$('copy-share-link-button').disabled=false;
    window.__goodmenShareQr={url:shareUrl,version:encoded.version,size:encoded.size,cardId:cardShareId,ready:true};
    const locationNote=shareLocationNote();
    $('share-qr-note').textContent=locationNote;
    if(!mobileShareActive)$('share-action-note').textContent=`Use Share card to copy the formatted email with both labelled hyperlinks, then open your email app with PNG + GIF and paste into the draft. The subject “${cardShareSubject()}” is passed where supported. ${locationNote}`;
    if(mobileShareActive)$('mobile-share-note').textContent=locationNote;
    if(redraw){drawingRefreshedQr=true;draw();drawingRefreshedQr=false;}
    return encoded;
  }catch(error){
    if(revision===qrRefreshRevision){currentShareUrl='';currentQrMatrix=null;setQrActionsReady(false);if($('copy-share-link-button'))$('copy-share-link-button').disabled=true;window.__goodmenShareQr={url:'',ready:false,cardId:cardShareId};$('share-qr-note').textContent=`The QR could not be prepared: ${error.message}`;if(mobileShareActive)$('mobile-share-note').textContent=error.message;if(redraw){drawingRefreshedQr=true;draw();drawingRefreshedQr=false;}}
    return null;
  }
}
function scheduleShareQrRefresh(){
  if(!mobileShareActive&&$('share-panel').hidden)return;
  clearTimeout(qrRefreshTimer);qrRefreshTimer=setTimeout(()=>refreshShareQr(),180);
}
async function openMobileShare(token){
  mobileShareActive=true;document.body.classList.add('mobile-share-mode');
  startCardPreview();
  $('studio-header').hidden=true;$('page-intro').hidden=true;$('personality-gate').hidden=true;$('studio-grid').hidden=true;$('studio-actions').hidden=true;$('studio-footer').hidden=true;
  $('mobile-share-view').hidden=false;
  try{
    const payload=await decodeShareToken(token);
    if(!payload || typeof payload.recipient!=='string' || typeof payload.sender!=='string')throw Error('Invalid card details.');
    if(!validatePersonalName(payload.recipient).valid || !validatePersonalName(payload.sender).valid)throw Error('This card contains an invalid recipient or sender name.');
    cardShareId=String(payload.id||createCardShareId());
    state=normalizeFigure(payload.figure);recipientName=String(payload.recipient||'').slice(0,50);senderName=String(payload.sender||'A friend').slice(0,50);
    yaw=Number(payload.camera?.yaw??.42);pitch=Number(payload.camera?.pitch??.10);zoom=Number(payload.camera?.zoom??1);
    $('mobile-share-intro').textContent=recipientName?`A character card for ${recipientName}, from ${senderName}.`:`A character card from ${senderName}, made with appreciation.`;
    $('mobile-share-view').dataset.ready='true';
    syncControls();draw();await refreshShareQr({redraw:true});
  }catch(error){
    $('mobile-share-intro').textContent='This card link could not be opened.';
    $('mobile-share-note').textContent=error.message;
  }
}
function downloadCanvasCard(card){
  if(!card?.toBlob){toast('Could not create the greeting card PNG.');return;}
  card.toBlob(blob=>downloadCardBlob(blob),'image/png');
}
function cardShareSubject(){return `International Men’s Day 2026 card for ${recipientName}`;}
function cardShareMessage(){
  return currentEmailMessage().plain;
}
function currentEmailMessage(){return buildEmailMessage({recipient:recipientName,greeting:state.greeting,sender:displaySender(),cardUrl:currentShareUrl,createUrl:getCreateAnotherUrl()});}
function renderEmailPreview(){
  const preview=$('email-message-preview');if(!preview||!currentShareUrl)return;
  const message=currentEmailMessage(),salutation=document.createElement('p'),greeting=document.createElement('p'),sender=document.createElement('p');
  salutation.textContent=`Dear ${recipientName.trim()},`;greeting.textContent=state.greeting;sender.textContent=`Warm regards, ${displaySender()}`;
  preview.replaceChildren(salutation,greeting);
  for(const [label,url] of [['View your card',message.cardUrl],['Create a card for someone else',message.createUrl]]){
    const p=document.createElement('p'),link=document.createElement('a');link.textContent=label;link.href=url;link.target='_blank';link.rel='noopener noreferrer';p.append(link);preview.append(p);
  }
  preview.append(sender);
}
function copyFormattedEmail(){
  const note=$('share-email-copy-status');
  try{
    const message=currentEmailMessage();
    Promise.resolve(copyEmailMessage(navigator.clipboard,globalThis.ClipboardItem,message)).then(()=>{
      note.textContent='Copied. Paste (Ctrl+V) into your Outlook draft.';
    }).catch(()=>{note.textContent='Copy blocked. Use “Preview email text” below.';});
  }catch(error){note.textContent=error.message;}
}
function updateSharePreparation(status,error){
  const busy=shareOpening||status==='preparing';
  for(const id of ['share-card-button','mobile-share-card']){
    const button=$(id);if(!button)continue;
    button.classList.toggle('is-busy',busy);button.setAttribute('aria-busy',String(busy));
    button.textContent=shareOpening?'Opening share menu…':busy?'Preparing card…':'Share card';
  }
  const native=$('share-native-button');if(native)native.disabled=shareOpening||!shareDelivery.getReady();
  for(const id of ['share-download-png','share-download-gif']){const button=$(id);if(button)button.disabled=!shareDelivery.getReady();}
  const copy=$('share-copy-email');if(copy)copy.disabled=!currentShareUrl;
  if(status==='ready')renderEmailPreview();
  const note=$('share-preparation-note');if(note)note.textContent=error?.name==='StaleShareError'?'Updating your latest card…':error?error.message:shareOpening?'Your device’s share menu is opening. Return here to retry or choose another route.':status==='preparing'?'Preparing PNG + GIF…':shareDelivery.getReady()?'Card ready. Downloads are optional.':'Preparing optional downloads…';
}
function queueSharePreparation(){
  clearTimeout(sharePrepareTimer);
  if(!currentQrMatrix||(!mobileShareActive&&$('share-panel').hidden))return;
  sharePrepareTimer=setTimeout(()=>shareDelivery.prepare().catch(error=>{
    if(error.name==='StaleShareError')queueSharePreparation();
  }),250);
}
function shareCard(){
  if(!requireSender())return;
  const dialog=$('share-dialog');
  if(!dialog.open)dialog.showModal();
  renderEmailPreview();
  updateSharePreparation(shareDelivery.getReady()?'ready':'preparing');
  shareDelivery.prepare().catch(error=>{if(error.name==='StaleShareError')queueSharePreparation();});
}
function openOutlookWebDraft(){
  // Outlook deep links can fail when a personalized card token makes the
  // compose URL too long. Never navigate to an oversized compose URL.
  const note=$('share-preparation-note');
  let message;
  try { message=currentEmailMessage(); }
  catch(error){if(note)note.textContent='Card link unavailable: '+error.message;return;}

  const subjectOnly=new URL('https://outlook.office.com/mail/deeplink/compose');
  subjectOnly.searchParams.set('subject',cardShareSubject());

  const fullDraft=new URL(subjectOnly.href);
  fullDraft.searchParams.set('body',message.plain.replace(/\r?\n/g,'\r\n')+'\r\n');

  // Conservative URL-length guard. This is a compatibility safeguard, not an
  // officially published Outlook limit.
  const LONG_DRAFT_THRESHOLD=1100;
  if(fullDraft.href.length<=LONG_DRAFT_THRESHOLD){
    const tab=window.open(fullDraft.href,'_blank');
    if(tab){
      try{tab.opener=null;}catch{}
      if(note)note.textContent='Outlook opened with your subject, greeting and both card URLs. Enter the recipient and send.';
    }else if(note){
      note.textContent='Outlook pop-up blocked. Allow pop-ups for this site, then try again.';
    }
    return;
  }

  // A long card URL cannot reliably be prefilled through a compose deep link.
  // Request clipboard copying within the button click before opening a short URL.
  let copyResult;
  try {
    copyResult=copyEmailMessage(navigator.clipboard,globalThis.ClipboardItem,message);
  } catch(error) {
    copyResult=Promise.reject(error);
  }
  const tab=window.open(subjectOnly.href,'_blank');
  if(tab){try{tab.opener=null;}catch{}}
  if(note)note.textContent=tab
    ? 'Long card link: preparing the complete email for copying. Outlook opens with the subject.'
    : 'Outlook pop-up blocked. Allow pop-ups, or open Outlook manually.';

  Promise.resolve(copyResult).catch(async()=>{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
    return navigator.clipboard.writeText(message.plain);
  }).then(()=>{
    if(note)note.textContent='Full email copied, including both card links. In Outlook, click the message body and press Ctrl+V, then send.';
  }).catch(()=>{
    if(note)note.textContent='Automatic copy was blocked. Open “Preview email text” and use “Copy formatted email”, then paste into Outlook.';
  });
}


function downloadPreparedAttachment(extension){
  const prepared=shareDelivery.getReady();
  const note=$('share-preparation-note');
  if(!prepared){if(note)note.textContent='Attachments are still preparing. Try again when PNG + GIF are ready.';return;}
  const file=prepared.files.find(item=>item.name.toLowerCase().endsWith('.'+extension));
  if(!file){if(note)note.textContent='Could not find the '+extension.toUpperCase()+' attachment.';return;}
  download(file,file.name);
  if(note)note.textContent=extension.toUpperCase()+' downloaded. Attach it only if you wish.';
}
function sharePreparedFiles(){
  if(shareOpening)return;
  const note=$('share-preparation-note');
  try{
    shareOpening=true;updateSharePreparation('ready');
    // The native share call must happen in this click's synchronous stack.
    const request=shareDelivery.shareNow(navigator,{title:cardShareSubject(),text:cardShareMessage()});
    Promise.resolve(request).then(()=>{
      if(note)note.textContent='Files handed to your email app. Paste the copied formatted message into the draft body to include both labelled hyperlinks. Check the draft before sending.';
    }).catch(error=>{
      if(note)note.textContent=error.name==='AbortError'?'Sharing was cancelled or the selected app did not accept the files. Your card is still ready.':error.name==='NotAllowedError'?'The browser blocked file sharing. Try again from this button, or copy the card link below.':error.message;
    }).finally(()=>{shareOpening=false;updateShareButtonsAfterHandoff();});
  }catch(error){shareOpening=false;updateShareButtonsAfterHandoff();if(note)note.textContent=error.message;}
}
function updateShareButtonsAfterHandoff(){
  for(const id of ['share-card-button','mobile-share-card']){const b=$(id);if(b){b.classList.remove('is-busy');b.setAttribute('aria-busy','false');b.textContent='Share card';}}
  $('share-native-button').disabled=!shareDelivery.getReady();
}
function exportAvatar() {
  canvas.toBlob(blob=>{if(blob)download(blob,safeName(state.name)+'-character.png');else toast('Could not create the figure PNG.');},'image/png');
}
function renderTraitSelector() {
  const selector=$('trait-selector');selector.replaceChildren();
  const query=String($('trait-search').value||'').trim().toLocaleLowerCase();
  const activeCategory=$('trait-category').value||'all';
  const categoryTraits=activeCategory==='all'?TRAIT_NAMES:TRAIT_CATEGORIES[activeCategory]||TRAIT_NAMES;
  const visibleTraits=categoryTraits.filter(trait=>trait.toLocaleLowerCase().includes(query));
  const makeTraitButton=trait=>{
    const isSelected=selectedQualities.some(q=>q.trait===trait);
    const button=document.createElement('button');button.type='button';button.className='trait-chip';
    const label=document.createElement('span');label.className='trait-name';label.textContent=trait;
    const marker=document.createElement('span');marker.className='trait-mark';marker.setAttribute('aria-hidden','true');marker.textContent=isSelected?'✓':'+';
    button.append(label,marker);
    button.dataset.trait=trait;button.setAttribute('aria-pressed',String(selectedQualities.some(q=>q.trait===trait)));
    button.disabled=selectedQualities.length===5&&!isSelected;
    button.addEventListener('click',()=>{
      if(selectedQualities.some(q=>q.trait===trait)){selectedQualities=selectedQualities.filter(q=>q.trait!==trait);scoreTouched.delete(trait);}
      else if(selectedQualities.length<5){selectedQualities.push({trait,score:50});scoreTouched.delete(trait);}
      renderTraitSelector();renderScoreControls();
    });
    return button;
  };
  const catalogueLabel=$('featured-trait-label');
  if(activeCategory==='all'&&!query){
    catalogueLabel.textContent='10 featured · 40 more qualities';
    for(const trait of FEATURED_TRAIT_NAMES)selector.append(makeTraitButton(trait));
    const divider=document.createElement('div');divider.className='trait-group-divider';divider.textContent='40 more qualities';divider.setAttribute('aria-hidden','true');selector.append(divider);
    for(const trait of TRAIT_NAMES.filter(trait=>!FEATURED_TRAIT_NAMES.includes(trait)))selector.append(makeTraitButton(trait));
  }else{
    const groupName=TRAIT_CATEGORY_LABELS[activeCategory]||TRAIT_CATEGORY_LABELS.all;
    catalogueLabel.textContent=query?`${visibleTraits.length} matching ${activeCategory==='all'?'qualities':`in ${groupName.toLowerCase()}`}`:`${groupName} · ${visibleTraits.length} qualities`;
    for(const trait of visibleTraits)selector.append(makeTraitButton(trait));
  }
  $('trait-empty-state').hidden=visibleTraits.length>0;
  const count=selectedQualities.length;
  $('quality-count').textContent=`${count} of 5 chosen`;
  $('quality-progress-fill').style.width=`${count*20}%`;
  $('quality-progress').setAttribute('aria-valuenow',String(count));
  $('quality-helper').textContent=count===5
    ? 'Five qualities selected. Continue to review all five scores.'
    : count===0
      ? 'Nothing is preselected. Choose five qualities that feel true to the person.'
      : `Choose ${5-count} more ${5-count===1?'quality':'qualities'} to complete the profile.`;
  updateProfileReadiness();
}
function renderScoreControls() {
  const list=$('score-list');list.replaceChildren();
  $('score-empty').hidden=selectedQualities.length>0;
  selectedQualities.forEach((quality,index)=>{
    const row=document.createElement('div');row.className=`score-row${scoreTouched.has(quality.trait)?' score-set':''}`;
    const label=document.createElement('label');label.textContent=quality.trait;label.htmlFor=`quality-score-${index}`;
    const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value=String(quality.score);range.id=`quality-score-${index}`;range.setAttribute('aria-label',`${quality.trait} intensity`);range.dataset.qualityScore=quality.trait;
    const output=document.createElement('output');output.textContent=String(quality.score);output.htmlFor=range.id;
    const status=document.createElement('span');status.className='score-status';status.textContent=scoreTouched.has(quality.trait)?'Adjusted':'Default · 50';
    const markTouched=()=>{scoreTouched.add(quality.trait);quality.score=Number(range.value);output.textContent=range.value;row.classList.add('score-set');status.textContent='Adjusted';renderSuperheroUnlock();updateScoreReadiness();};
    range.addEventListener('input',markTouched);range.addEventListener('change',markTouched);
    row.append(label,range,output,status);list.append(row);
  });
  renderSuperheroUnlock();updateScoreReadiness();
}
function renderSuperheroUnlock() {
  const card=$('hero-unlock-card');if(!card)return {unlocked:false,count:0,eligibleQualities:[]};
  let eligibility;
  try{eligibility=getSuperheroEligibility(selectedQualities);}catch{eligibility={unlocked:false,count:0,eligibleQualities:[]};}
  const unlocked=eligibility.unlocked;
  card.classList.toggle('is-unlocked',unlocked);
  $('hero-unlock-icon').textContent=unlocked?'✦':'🔒';
  $('hero-unlock-title').textContent=unlocked?'Superpower Unlocked!':'A superpower look is waiting';
  $('hero-unlock-message').textContent=unlocked
    ? 'Superpower Unlocked! Two extraordinary qualities. One extraordinary character.'
    : 'Rate any two selected qualities 80 or higher to unlock superpower characters.';
  $('hero-qualifying-count').textContent=`${eligibility.count} qualifying ${eligibility.count===1?'quality':'qualities'} · 2 needed`;
  if(unlocked&&!superheroWasUnlocked){
    card.classList.remove('hero-unlock-pop');void card.offsetWidth;card.classList.add('hero-unlock-pop');
  }
  superheroWasUnlocked=unlocked;
  const preserve=state.heroMode&&!unlocked;
  const notice=$('hero-preservation-note');
  if(notice){
    notice.hidden=!preserve;
    notice.textContent=preserve
      ? 'Superpower access is locked because fewer than two distinct qualities are at 80+. The current appearance is kept in this session. Raise two ratings to 80+ to unlock the gallery, or choose a standard character.'
      : '';
  }
  return eligibility;
}
function heroVariationsForCurrentFigure(){
  if(heroGenerated?.variations?.length)return heroGenerated.variations;
  const profile=state.personalityProfile;
  if(!profile?.qualities)return [];
  try{return generateSuperheroVariations(profile.qualities,profile.seed||0,state).variations;}catch{return [];}
}
function renderHeroCustomization(){
  const details=$('hero-gear-controls'),identity=$('heroIdentity'),powerOptions=$('hero-power-options');
  if(!details||!identity||!powerOptions)return;
  details.hidden=!state.heroMode;
  identity.replaceChildren();powerOptions.replaceChildren();
  if(!state.heroMode)return;
  const options=heroVariationsForCurrentFigure();
  if(state.heroIdentityId&&!options.some(hero=>hero.id===state.heroIdentityId)){
    const selected=document.createElement('option');selected.value=state.heroIdentityId;selected.textContent=state.heroIdentityName||state.name;identity.append(selected);
  }
  options.forEach(hero=>{const option=document.createElement('option');option.value=hero.id;option.textContent=hero.name;identity.append(option);});
  identity.value=state.heroIdentityId&&[...identity.children].some(option=>option.value===state.heroIdentityId)?state.heroIdentityId:(options[0]?.id||'');
  const active=options.find(hero=>hero.id===identity.value);
  (active?.powers||[]).forEach((power,index)=>{
    const button=document.createElement('button');button.type='button';button.className='hero-power-choice';button.textContent=`${index+1}. ${power}`;
    button.setAttribute('aria-pressed',String(state.heroPower===power));
    button.addEventListener('click',()=>setState({heroPower:power}));powerOptions.append(button);
  });
}
function renderHeroVariations() {
  const section=$('hero-variation-section'),grid=$('hero-variation-grid');grid.replaceChildren();
  section.hidden=!heroGenerated?.variations?.length;
  if(section.hidden)return;
  const summary=heroGenerated.profile.qualities.map(q=>`${q.trait} ${q.score}`).join(' · ');
  heroGenerated.variations.forEach(hero=>{
    const card=document.createElement('article');card.className='hero-variation-card';
    const preview=document.createElement('canvas');preview.width=300;preview.height=270;preview.setAttribute('aria-label',`Voxel superpower character concept: ${hero.name}`);
    const copy=document.createElement('div');copy.className='hero-variation-copy';
    const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent=`POWER ${String(hero.index+1).padStart(2,'0')}`;
    const title=document.createElement('h3');title.textContent=hero.name;
    const direction=document.createElement('div');direction.className='variation-direction';direction.textContent=hero.visualDirection;
    const explanation=document.createElement('p');explanation.textContent=hero.explanation;
    const scoreLine=document.createElement('div');scoreLine.className='variation-scoreline';scoreLine.textContent=summary;
    const power=document.createElement('p');power.textContent=`Secret power: ${hero.powers[0]}`;
    const choose=document.createElement('button');choose.type='button';choose.className='button primary variation-select';choose.textContent='Choose this power look';
    choose.addEventListener('click',()=>chooseVariation(hero));
    copy.append(eyebrow,title,direction,explanation,scoreLine,power,choose);card.append(preview,copy);grid.append(card);
    renderMesh(preview,preview.getContext('2d'),hero.figure,{yaw:.27,pitch:.08,zoom:.96,background:hero.figure.background,fitToBounds:true,fitPaddingX:18,fitPaddingY:16});
  });
}
function updateProfileReadiness() {
  const namesReady=!getNameValidationProblem();
  const ready=selectedQualities.length===5&&namesReady;
  $('continue-to-scores').disabled=false;
  $('continue-to-scores').setAttribute('aria-describedby','profile-ready-note');
  $('profile-ready-note').textContent=ready
    ? 'Both names and five qualities are set. Continue to rate every quality.'
    : !String($('recipient-input').value||'').trim()||!String($('sender-input').value||'').trim()
      ? 'Enter both names. Click Next for help with any missing field.'
      : `Choose ${5-selectedQualities.length} more ${5-selectedQualities.length===1?'quality':'qualities'} to continue. Click Next for guidance.`;
}
function updateScoreReadiness(){
  const count=selectedQualities.filter(q=>scoreTouched.has(q.trait)).length;
  const ready=selectedQualities.length===5&&count===5&&!getNameValidationProblem();
  $('generate-characters').disabled=false;
  $('generate-characters').setAttribute('aria-describedby','score-ready-note');
  $('score-progress-label').textContent=`${count} of 5 adjusted`;
  $('score-ready-note').textContent=ready
    ? 'All five scores have been reviewed. Choose your character options.'
    : `Please try every slider: ${count} of 5 adjusted. ${5-count} remaining. You can return a slider to 50 after trying it.`;
}
function setFlowStep(index){
  const steps=$('creation-progress').querySelectorAll('span');
  steps.forEach((step,stepIndex)=>{
    const current=stepIndex===index;step.classList.toggle('current',current);
    if(current)step.setAttribute('aria-current','step');else step.removeAttribute?.('aria-current');
  });
}
function showScoreStep(){
  $('profile-error').textContent='';
  const missingRecipient=!String($('recipient-input').value||'').trim();
  const missingSender=!String($('sender-input').value||'').trim();
  if(missingRecipient||missingSender){
    const message=missingRecipient&&missingSender?'Enter the recipient’s name and your name before continuing.':missingRecipient?'Enter the recipient’s name (the person receiving the card).':'Enter your name (the sender of the card).';
    $('profile-error').textContent=message;
    guidePopup('A name is missing',message,'Enter name',()=>focusInput(missingRecipient?'recipient-input':'sender-input'));
    return;
  }
  const problem=getNameValidationProblem();
  if(problem){
    $('profile-error').textContent=problem.reason;
    setNameValidationNote(problem.id,problem.reason);
    guidePopup('Please enter a name',problem.reason,'Correct the name',()=>focusInput(problem.id));
    return;
  }
  if(selectedQualities.length!==5){
    const left=5-selectedQualities.length;
    const message=`You have chosen ${selectedQualities.length} of 5 qualities. Choose ${left} more ${left===1?'quality':'qualities'} to continue. Use the categories or search to find a good match.`;
    $('profile-error').textContent=message;
    guidePopup('Choose five qualities',message,'Choose qualities',()=>{$('trait-selector').scrollIntoView({behavior:'smooth',block:'center'});$('trait-selector').focus?.();});
    return;
  }
  recipientName=$('recipient-input').value.trim();senderName=$('sender-input').value.trim();
  $('profile-step').hidden=true;$('score-step').hidden=false;$('variation-step').hidden=true;
  renderScoreControls();setFlowStep(1);$('score-step').scrollIntoView?.({behavior:'smooth',block:'start'});
}
function renderVariations() {
  const grid=$('variation-grid');grid.replaceChildren();
  if(!generated)return;
  const summary=generated.profile.qualities.map(q=>`${q.trait} ${q.score}`).join(' · ');
  $('profile-summary').textContent=`${recipientName} · ${summary}. These scores stay attached to whichever figure you select.`;
  generated.variations.forEach(variation=>{
    const card=document.createElement('article');card.className='variation-card';
    const preview=document.createElement('canvas');preview.width=260;preview.height=230;preview.setAttribute('aria-label',`${variation.tone} character preview: ${variation.name}`);
    const copy=document.createElement('div');copy.className='variation-copy';
    const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent=`0${variation.index+1} · ${variation.tone}`;
    const title=document.createElement('h3');title.textContent=variation.name;
    const direction=document.createElement('div');direction.className='variation-direction';direction.textContent=variation.visualDirection;
    const explanation=document.createElement('p');explanation.textContent=variation.explanation;
    const scores=document.createElement('div');scores.className='variation-scoreline';scores.textContent=summary;
    const choose=document.createElement('button');choose.type='button';choose.className='button primary variation-select';choose.textContent='Choose this base character';
    choose.addEventListener('click',()=>chooseVariation(variation));
    copy.append(eyebrow,title,direction,explanation,scores,choose);card.append(preview,copy);grid.append(card);
    renderMesh(preview,preview.getContext('2d'),variation.figure,{yaw:.27,pitch:.08,zoom:.96,background:variation.figure.background,fitToBounds:true,fitPaddingX:18,fitPaddingY:16});
  });
  renderHeroVariations();
  updateVariationGallery();
}
function updateVariationGallery(){
  const hasPowerLooks=Boolean(heroGenerated?.variations?.length);
  if(!hasPowerLooks)activeVariationGallery='standard';
  const showingPower=hasPowerLooks&&activeVariationGallery==='power';
  $('variation-grid').hidden=showingPower;
  $('hero-variation-section').hidden=!showingPower;
  $('show-other-gallery').hidden=!hasPowerLooks;
  $('show-other-gallery').textContent=showingPower?'Browse standard characters':'Browse superpower characters';
  $('variation-eyebrow').textContent=showingPower?'SUPERPOWER UNLOCKED · THREE PERSONALITY-BASED LOOKS':'SAME PROFILE · THREE VISUAL INTERPRETATIONS';
  $('variation-title').textContent=showingPower?'Choose a superpower character.':'Choose a starting character.';
  $('regenerate-characters').textContent=showingPower?'Regenerate 3 power looks ↻':'Regenerate 3 character looks ↻';
}
function generateOptions(preferredGallery='power') {
  try {
    $('profile-error').textContent='';
    recipientName=$('recipient-input').value.trim();senderName=$('sender-input').value.trim();
    const problem=getNameValidationProblem();
    if(problem)throw new Error(problem.reason);
    if(selectedQualities.length!==5) throw new Error('Choose exactly five different qualities to continue.');
    const remaining=selectedQualities.filter(q=>!scoreTouched.has(q.trait));
    if(remaining.length){
      const message=`Please try all five sliders before choosing a character. ${5-remaining.length} of 5 have been adjusted. Still to try: ${remaining.map(q=>q.trait).join(', ')}. You can put a score back at 50 if that feels right.`;
      guidePopup('Rate every quality',message,'Take me to the next slider',()=>focusInput(`quality-score-${selectedQualities.indexOf(remaining[0])}`));
      return;
    }
    const profile=normalizePersonality(selectedQualities);
    startNewCardShareId();
    generated=generateCharacterVariations(profile,generationSeed);
    heroGenerated=getSuperheroEligibility(profile).unlocked
      ? generateSuperheroVariations(profile,generationSeed,DEFAULT_FIGURE)
      : null;
    activeVariationGallery=heroGenerated?.variations?.length&&preferredGallery!=='standard'?'power':'standard';
    $('score-step').hidden=true;$('profile-step').hidden=true;$('variation-step').hidden=false;
    setFlowStep(2);$('variation-step').scrollIntoView?.({behavior:'smooth',block:'start'});
    renderVariations();
  } catch(error) { $('profile-error').textContent=error.message; }
}
function chooseVariation(variation) {
  selectedBase=clone(variation.figure);
  generatedGreeting=makeGreeting(recipientName,selectedBase.name);
  state=normalizeFigure({...selectedBase,greeting:generatedGreeting});
  $('share-recipient-display').textContent=recipientName;$('share-sender-display').textContent=senderName;$('greeting').value=state.greeting;
  $('personality-gate').hidden=true;$('studio-grid').hidden=false;$('studio-actions').hidden=false;$('share-panel').hidden=true;
  $('studio-grid').classList.remove('message-active');undoStack=[];redoStack=[];yaw=0;pitch=.08;zoom=1;syncFrontAngle();setFlowStep(3);
  userCustomizedCharacter=false;
  syncControls();draw();
  if(!customizationGuideShown){
    customizationGuideShown=true;
    guidePopup('Make this character your own','Explore the controls on the left: try a hairstyle, outfit, expression, pose or accessory. You can undo changes or restore the original at any time.','Explore customization',()=>{startIntroSpin();promptCustomization();},'Keep this look',()=>{startIntroSpin();$('customization-guide').hidden=true;});
  }else{startIntroSpin();promptCustomization();}
  toast(`${variation.name} selected. Your personality profile is attached.`);
}
function showVariations() {
  $('personality-gate').hidden=false;$('profile-step').hidden=true;$('variation-step').hidden=false;
  $('studio-grid').hidden=true;$('studio-actions').hidden=true;$('share-panel').hidden=true;
  activeVariationGallery=heroGenerated?.variations?.length?'power':'standard';
  $('score-step').hidden=true;setFlowStep(2);
  renderVariations();
}
function showProfile() {
  $('profile-step').hidden=false;$('score-step').hidden=true;$('variation-step').hidden=true;setFlowStep(0);
  renderSuperheroUnlock();
}
function randomGenerator(seed) {
  let x=(seed>>>0)||1;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
function setupExclusiveAccordions(){
  const groups=[...document.querySelectorAll('[data-exclusive-accordion]')];
  groups.forEach(section=>section.addEventListener('toggle',()=>{
    if(!section.open)return;
    groups.forEach(other=>{if(other!==section)other.open=false;});
  }));
}
function randomizeCharacter() {
  const profile=state.personalityProfile;
  const rng=randomGenerator((profile?.seed||0)+(++randomizeCount)*0x9E3779B9);
  const pick=values=>values[Math.floor(rng()*values.length)];
  const randomLook={
    name:state.name,
    skin:pick(['#F2D2BA','#E5B997','#D69B75','#B97855','#905B43','#603B2D']),eyeColor:pick(['#31566B','#483529','#385B48','#6A4A7B']),
    hairColor:pick(['#252A37','#49301F','#84572F','#B06D37','#5A5350']),hairstyle:pick(['buzz','crop','quiff','curls','afro','locs','long','fade','side-part','fringe','spiky','mullet','flowing']),beard:pick(['none','light-stubble','stubble','short','full','goatee','anchor','soul-patch','chinstrap','sideburns']),moustache:pick(['none','pencil','classic','chevron','handlebar','walrus','horseshoe']),
    headShape:pick(['classic','square','tall','wide','round','oval','heart','diamond']),jawline:pick(['soft','defined','angular','tapered','broad']),
    expression:pick(['smile','grin','calm','focused','surprised','excited','joyful','laughing','astonished','determined','playful']),eyeShape:pick(['classic','round','narrow','wide']),browStyle:pick(['natural','bold','raised','angled']),
    mouthStyle:pick(['auto','closed','smile','open','grin','laugh','wide-grin','pursed']),teethStyle:pick(['even','small','individual','gap']),
    age:Math.floor(18+rng()*63),build:pick(['lean','average','athletic','broad','stocky']),height:Math.floor(160+rng()*46),headSize:Math.floor(82+rng()*41),shoulders:Math.floor(82+rng()*41),legRatio:Math.floor(85+rng()*31),belly:Math.floor(rng()*61),
    armLength:Math.floor(80+rng()*41),armMuscle:Math.floor(70+rng()*61),legMuscle:Math.floor(70+rng()*61),handSize:Math.floor(80+rng()*46),
    outfit:state.heroMode?'hero-suit':pick(['tee','overshirt','casual-shirt','sweater','cardigan','denim-jacket','zip-jacket','hoodie','bomber','blazer','utility','jersey','zf-polo-white','zf-polo-navy','traditional-kurta']),bottoms:pick(['jeans','cargo','chinos','joggers','shorts','formal-trousers','track-pants']),footwear:state.heroMode?'boot':pick(['sneaker','high-top','boot','loafer','dress-shoe']),
    pose:pick(['idle','wave','thumbs-up','hands-on-hips','flex','victory','welcome','dance','hand-over-heart','both-wave','pointing','peace','wide-stance','relaxed-lean']),handStyle:pick(['open','fist','thumbs-up','peace','point','mitten']),glasses:rng()>.5,sunglassesStyle:pick(['none','wayfarer','aviator','round','sport','oversized']),cap:rng()>.5,headwearStyle:pick(['none','beanie','brimmed-hat']),headphonesStyle:pick(['none','studio','wireless','sport','neckband']),bagStyle:pick(['none','backpack','shoulder-bag','sling-bag']),watch:rng()>.5,pin:false,
    topColor:pick(['#176A76','#244F91','#674EA3','#2369D4','#8B4D99','#2F675E']),accentColor:pick(['#F17B63','#F2A34A','#63B6A3','#F5C95D','#D8B579']),background:pick(['#F4F1EB','#E8F0F6','#F2E8E5','#EAF1E6']),
  };
  if(state.heroMode){
    const look=pick(Object.keys(HERO_LOOK_PRESETS));
    setState(applySuperheroLookPreset({...state,...randomLook},look));
  }else setState(randomLook);
  toast(`New look randomized; ${profile?.qualities.length||0} qualities and scores are retained.`);
}
function restoreOriginal(resetCamera = false) {
  if(!selectedBase)return;
  undoStack=[];redoStack=[];state=normalizeFigure({...clone(selectedBase),greeting:generatedGreeting});
  if(resetCamera){yaw=.42;pitch=.10;zoom=1;}
  syncControls();draw();toast(resetCamera?'Edits reset to the selected generated character.':'Original generated character restored.');
}
function historyUndo(){if(!undoStack.length)return;redoStack.push(clone(state));state=undoStack.pop();syncControls();draw();}
function historyRedo(){if(!redoStack.length)return;undoStack.push(clone(state));state=redoStack.pop();syncControls();draw();}

function applyCharacterControl(key,value){
  stopIntroSpin();
  try{
    if(key==='heroLookPreset')setState(applySuperheroLookPreset(state,value));
    else setState({[key]:value});
  }catch(error){syncControls();toast(error.message||'Could not apply that character preset.');}
}
document.addEventListener('input',event=>{
  const el=event.target,key=el.dataset.key;if(!key)return;
  const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
  if(!($('studio-grid').hidden))userCustomizedCharacter=true;
  applyCharacterControl(key,value);
});
document.addEventListener('change',event=>{
  const el=event.target,key=el.dataset.key;
  if(!key){const preset=el.dataset.lookPreset?LOOK_PRESETS[el.value]:null;if(preset){setState(preset);el.value='';}return;}
  const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
  if(!($('studio-grid').hidden))userCustomizedCharacter=true;
  applyCharacterControl(key,value);
});
document.querySelectorAll('[data-skin]').forEach(button=>button.addEventListener('click',()=>{userCustomizedCharacter=true;setState({skin:button.dataset.skin});}));
 $('heroIdentity').addEventListener('change',event=>{
  const hero=heroVariationsForCurrentFigure().find(candidate=>candidate.id===event.target.value);
  if(!hero)return;
  const preserveGeneratedGreeting=state.greeting===generatedGreeting;
  const next=applySuperheroIdentity(state,hero);
  if(preserveGeneratedGreeting){generatedGreeting=makeGreeting(recipientName,hero.name);next.greeting=generatedGreeting;$('greeting').value=generatedGreeting;}
  setState(next);
  toast(`${hero.name} selected. Face, hair, skin and proportions are preserved.`);
});
document.querySelectorAll('[data-angle]').forEach(button=>button.addEventListener('click',()=>{stopIntroSpin();
  yaw=Number(button.dataset.angle);pitch=.08;document.querySelectorAll('[data-angle]').forEach(item=>item.classList.toggle('active',item===button));draw();
}));
setupExclusiveAccordions();renderTraitSelector();renderScoreControls();
$('continue-to-scores').addEventListener('click',showScoreStep);
$('back-to-qualities').addEventListener('click',showProfile);
$('generate-characters').addEventListener('click',generateOptions);
registerNameInput('recipient-input');
registerNameInput('sender-input');
$('trait-search').addEventListener('input',renderTraitSelector);
$('trait-category').addEventListener('change',renderTraitSelector);
$('edit-profile').addEventListener('click',showProfile);
$('regenerate-characters').addEventListener('click',()=>{generationSeed++;generateOptions(activeVariationGallery);toast('Three new looks generated from the same scored profile.');});
$('show-other-gallery').addEventListener('click',()=>{activeVariationGallery=activeVariationGallery==='power'?'standard':'power';updateVariationGallery();});
$('choose-another').addEventListener('click',showVariations);
function proceedToMessage(){
  $('studio-grid').hidden=true;$('studio-actions').hidden=true;$('share-panel').hidden=false;
  $('share-recipient-display').textContent=recipientName;$('share-sender-display').textContent=senderName;
  startCardPreview();
  setFlowStep(4);
  draw();
  refreshShareQr();$('share-panel').scrollIntoView?.({behavior:'smooth',block:'start'});$('greeting').focus();
}
$('continue-message').addEventListener('click',()=>{
  if(!userCustomizedCharacter){
    guidePopup('Try the character controls','You haven’t tried the customization options on the left yet. Change at least one hairstyle, expression, outfit, pose or accessory to see what is possible. If you like this look already, you can continue unchanged.','Try customization',promptCustomization,'Continue unchanged',proceedToMessage);
    return;
  }
  proceedToMessage();
});
$('back-to-customize').addEventListener('click',()=>{
  $('share-panel').hidden=true;$('studio-grid').hidden=false;$('studio-actions').hidden=false;stopCardPreview();setFlowStep(3);
  $('studio-grid').scrollIntoView?.({behavior:'smooth',block:'start'});
});
$('undo').addEventListener('click',historyUndo);$('redo').addEventListener('click',historyRedo);
$('randomize').addEventListener('click',randomizeCharacter);
$('reset').addEventListener('click',()=>restoreOriginal(true));
$('restore-original').addEventListener('click',()=>restoreOriginal(false));
$('share-base-url').value=getShareBaseUrl()||'';
if($('share-base-url')){
  $('share-base-url').readOnly=true;
  $('share-base-url').title='This public GitHub Pages release uses the verified GitHub address automatically.';
}
// Do not allow public users to override the trusted QR/email destination.
document.querySelectorAll('[data-emoji]').forEach(button=>button.addEventListener('click',()=>addEmojiToGreeting(button.dataset.emoji)));
$('png-button').addEventListener('click',exportAvatar);
$('card-button').addEventListener('click',exportCard);
$('gif-button').addEventListener('click',exportAnimatedGif);
$('copy-share-link-button').addEventListener('click',()=>copyShareLink());
$('mobile-copy-share-link').addEventListener('click',()=>copyShareLink('mobile-share-note'));
$('share-card-button').addEventListener('click',shareCard);
$('mobile-share-card').addEventListener('click',shareCard);
$('share-outlook-web').addEventListener('click',openOutlookWebDraft);
$('share-download-png').addEventListener('click',()=>downloadPreparedAttachment('png'));
$('share-download-gif').addEventListener('click',()=>downloadPreparedAttachment('gif'));
$('share-native-button').addEventListener('click',sharePreparedFiles);
$('share-copy-email').addEventListener('click',copyFormattedEmail);
$('share-dialog-close').addEventListener('click',()=>$('share-dialog').close());
$('share-dialog-copy').addEventListener('click',()=>copyShareLink('share-preparation-note'));
$('animationDirection').addEventListener('change',()=>{invalidateGifCache();draw();});
$('mobile-download-card').addEventListener('click',async()=>{
  if(document.fonts?.ready)await document.fonts.ready;
  if(!await refreshShareQr({redraw:false})){toast('This card needs a phone-accessible app URL to include a working QR code.');return;}
  drawingRefreshedQr=true;draw();drawingRefreshedQr=false;
  downloadCanvasCard(mobileCardPreview);
});
$('create-for-others').addEventListener('click',()=>{
  const cleanUrl=String(globalThis.location?.href||'').split('#')[0];
  if(globalThis.location?.replace)globalThis.location.replace(cleanUrl);
  else if(window.location)window.location.href=cleanUrl;
});
$('mesh-button').addEventListener('click',()=>{
  const stem=safeName(state.name);
  download(new Blob([objGeometry()],{type:'text/plain'}),stem+'-figure.obj');
  download(new Blob([objMaterials()],{type:'text/plain'}),stem+'-figure.mtl');
  toast('OBJ geometry and colour materials exported');
});
$('copy-button').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(state.greeting);toast('Greeting copied to clipboard');}
  catch{const input=$('greeting');input.focus();input.select();document.execCommand('copy');toast('Greeting selected for copying');}
});
$('save-state').addEventListener('click',()=>{exportSettings();toast('Settings downloaded as a JSON file; no draft saved in browser storage');});
$('load-state').addEventListener('click',()=>$('state-file').click());
$('state-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{
    const loaded=JSON.parse(await file.text());
    if(loaded.schema!=='goodmen-block-figure'||loaded.version!==2||!loaded.appearance)throw Error('Unsupported settings file; load a personality-first version 2 file.');
    state=normalizeFigure(loaded.appearance);
    const scoredQualities=normalizePersonality(state.personalityProfile?.qualities);
    state=normalizeFigure({...state,personalityProfile:{...state.personalityProfile,qualities:scoredQualities}});
    selectedQualities=scoredQualities.map(q=>({...q}));
    heroGenerated=getSuperheroEligibility(scoredQualities).unlocked
      ? generateSuperheroVariations(scoredQualities,state.personalityProfile?.seed||0,state)
      : null;
    if(!validatePersonalName(loaded.recipient).valid || !validatePersonalName(loaded.sender).valid)throw Error('Saved names must be personal names, not email addresses or domains.');
    recipientName=String(loaded.recipient||'').slice(0,50);senderName=String(loaded.sender||'').slice(0,50);selectedBase=clone(state);generatedGreeting=state.greeting;
    scoreTouched=new Set(scoredQualities.map(q=>q.trait));
    $('recipient-input').value=recipientName;$('sender-input').value=senderName;renderTraitSelector();renderScoreControls();
    $('share-recipient-display').textContent=recipientName;$('share-sender-display').textContent=senderName;$('greeting').value=state.greeting;renderSuperheroUnlock();syncControls();draw();toast('Figure settings loaded');
  }catch(error){toast(`Settings not loaded: ${error.message}`);}
});
$('greeting').addEventListener('input',event=>setState({greeting:event.target.value}));

try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(SHARE_BASE_STORAGE_KEY);}catch{}
syncControls();
const initialShareToken=globalThis.location?.hash?.startsWith('#gms=')?globalThis.location.hash.slice(5):'';
if(initialShareToken)openMobileShare(initialShareToken);else draw();
const frame=$('canvas-frame');
frame.addEventListener('pointerdown',event=>{stopIntroSpin();drag={x:event.clientX,y:event.clientY,yaw,pitch};canvas.setPointerCapture(event.pointerId);});
frame.addEventListener('pointermove',event=>{if(!drag)return;yaw=drag.yaw+(event.clientX-drag.x)*.009;pitch=Math.max(-.20,Math.min(.36,drag.pitch+(event.clientY-drag.y)*.004));draw();});
const finishDrag=()=>{drag=null;};frame.addEventListener('pointerup',finishDrag);frame.addEventListener('pointercancel',finishDrag);
frame.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.max(.82,Math.min(1.28,zoom+(event.deltaY<0?.055:-.055)));draw();},{passive:false});
new ResizeObserver(draw).observe(frame);new ResizeObserver(draw).observe(shareCardPreview);
