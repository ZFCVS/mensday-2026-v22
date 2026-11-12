/* Original procedural block-figure geometry for Good Men Studio.
 * Each visible part is a separate cuboid. Controls rebuild the mesh data.
 * This is an original voxel-toy direction, not Minecraft or LEGO artwork.
 */

export const DEFAULT_FIGURE = Object.freeze({
  name: 'Brightforge',
  tagline: 'Shows up. Sparks ideas. Brings everyone forward.',
  qualities: 'Helpful, Confident, Creative, Energetic, Fearless',
  greeting: 'Happy International Men’s Day! Your courage, creativity and steady support make every day brighter.',
  skin: '#B97855', eyeColor: '#31566B', hairColor: '#252A37', topColor: '#176A76', accentColor: '#F17B63',
  pantsColor: '#263D54', shoeColor: '#F2EEE5', frameColor: '#27344A', age: 34,
  height: 182, headSize: 100, shoulders: 100, legRatio: 100, belly: 0,
  noseScale: 100, smileIntensity: 65, mouthStyle: 'auto', eyeShape: 'classic', browStyle: 'natural', teethVisible: true,
  headwearStyle: 'none', sunglasses: false, sunglassesStyle: 'none',
  build: 'athletic', headShape: 'classic', hairstyle: 'quiff', beard: 'short', expression: 'smile',
  outfit: 'overshirt', bottoms: 'cargo', footwear: 'high-top', pose: 'wave', handStyle: 'open',
  glasses: false, cap: false, headphones: false, headphonesStyle: 'none', backpack: false, bagStyle: 'none', watch: true, pin: true,
  background: '#F4F1EB', cardScene: 'truck', logoTheme: 'zf-blue', personalityProfile: null,
  // New controls are appended after the legacy share fields so older card links remain readable.
  jawline: 'defined', moustache: 'none', teethStyle: 'individual',
  armLength: 100, armMuscle: 100, legMuscle: 100, handSize: 100,
  heroMode: false, heroIdentityId: '', heroIdentityName: '', heroPower: '', heroSuitStyle: 'classic',
  heroCapeStyle: 'none', heroCapeColor: '#D94C48', heroEyeMaskStyle: 'none', heroEmblem: 'star',
  heroGloveStyle: 'none', heroBootStyle: 'armored', heroMaskColor: '#F2B34C', heroLookPreset: 'shield-guardian',
  cardBackground: 'renewable-hills'
});

const enums = {
  build: ['lean', 'average', 'athletic', 'broad', 'stocky'],
  headShape: ['classic', 'square', 'tall', 'wide', 'round', 'oval', 'heart', 'diamond'],
  jawline: ['soft', 'defined', 'angular', 'tapered', 'broad'],
  eyeShape: ['classic','round','narrow','wide'],
  browStyle: ['natural','bold','raised','angled'],
  headwearStyle: ['none','beanie','brimmed-hat'],
  sunglassesStyle: ['none','wayfarer','aviator','round','sport','oversized'],
  headphonesStyle: ['none','studio','wireless','sport','neckband'],
  bagStyle: ['none','backpack','shoulder-bag','sling-bag'],
  hairstyle: ['bald', 'buzz', 'crop', 'quiff', 'curls', 'locs', 'long', 'fade', 'side-part', 'fringe', 'spiky', 'afro', 'mullet', 'flowing'],
  beard: ['none', 'light-stubble', 'stubble', 'short', 'full', 'goatee', 'anchor', 'soul-patch', 'chinstrap', 'sideburns'],
  moustache: ['none', 'pencil', 'classic', 'chevron', 'handlebar', 'walrus', 'horseshoe'],
  teethStyle: ['even', 'small', 'individual', 'gap'],
  mouthStyle: ['auto', 'closed', 'smile', 'open', 'grin', 'laugh', 'wide-grin', 'pursed'],
  expression: ['smile', 'grin', 'calm', 'focused', 'surprised', 'excited', 'joyful', 'laughing', 'astonished', 'determined', 'playful'],
  outfit: ['tee', 'overshirt', 'hoodie', 'bomber', 'blazer', 'utility', 'jersey', 'zf-polo', 'zf-polo-white', 'zf-polo-navy', 'traditional-kurta', 'casual-shirt', 'sweater', 'cardigan', 'denim-jacket', 'zip-jacket','hero-suit'],
  bottoms: ['jeans', 'cargo', 'chinos', 'joggers', 'shorts', 'formal-trousers', 'track-pants'],
  footwear: ['sneaker', 'high-top', 'boot', 'loafer', 'dress-shoe'],
  pose: ['idle', 'wave', 'thumbs-up', 'hands-on-hips', 'crossed-arms', 'hands-behind-back', 'flex', 'victory', 'welcome', 'dance', 'hand-over-heart', 'hands-clasped-front', 'salute', 'both-wave', 'pointing', 'peace', 'wide-stance', 'relaxed-lean'],
  handStyle: ['open', 'fist', 'thumbs-up', 'mitten', 'peace', 'point'],
  heroSuitStyle: ['classic','armored','tech','formal-coat'],
  heroCapeStyle: ['none','short','long','split','flight'],
  heroEyeMaskStyle: ['none','eye-frame','tech-visor','shield-frame','armored-eyeport','radiant-band','thunder-crest','web-frame','shadow-cowl'],
  heroEmblem: ['star','shield','bolt','gear','heart','sun','none'],
  heroGloveStyle: ['none','cuff','gauntlet'],
  heroBootStyle: ['armored','tall','speed','none'],
  heroLookPreset: ['shield-guardian','armored-tech','radiant-hero','thunder-guardian','web-pattern','shadow-cowl','formal-coat'],
  cardBackground: ['renewable-hills','city-skyline','coastal-highway','green-countryside','logistics-hub']
};
const colorKeys = ['skin', 'eyeColor', 'hairColor', 'topColor', 'accentColor', 'pantsColor', 'shoeColor', 'frameColor', 'background','heroCapeColor','heroMaskColor'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || lo));
const validHex = value => /^#[0-9a-f]{6}$/i.test(value || '');
const truncateUtf16 = (value, limit) => {
  let result = '';
  for (const point of String(value ?? '')) {
    if (result.length + point.length > limit) break;
    result += point;
  }
  return result;
};

export function normalizeFigure(input = {}) {
  const compatible = { ...input };
  // Drop retired named-character metadata from saved looks and shared links.
  const retiredIdentity=compatible.featuredCharacter&&compatible.featuredCharacter!=='custom'
    ||String(compatible.heroIdentityId||'').startsWith('featured-');
  if(retiredIdentity){
    compatible.name=DEFAULT_FIGURE.name;
    compatible.heroIdentityId='';
    compatible.heroIdentityName='';
  }
  delete compatible.featuredCharacter;
  // Face masks were retired from the character library. Ignore the old draft
  // field so saved looks remain loadable without rendering the removed option.
  delete compatible.mask;
  // Keep older saved looks useful after separating facial hair into two controls.
  const legacyMoustaches = { moustache: 'classic', handlebar: 'handlebar', chevron: 'chevron' };
  if (!Object.hasOwn(compatible, 'moustache') && legacyMoustaches[compatible.beard]) {
    compatible.moustache = legacyMoustaches[compatible.beard];
    compatible.beard = 'none';
  }
  if (compatible.beard === 'van-dyke') {
    compatible.beard = 'goatee';
    if (!Object.hasOwn(compatible, 'moustache')) compatible.moustache = 'pencil';
  }
  // Upgrade saved looks that used the older on/off accessory controls.
  if (!Object.hasOwn(compatible, 'sunglassesStyle')) compatible.sunglassesStyle = compatible.sunglasses ? 'wayfarer' : 'none';
  if (!Object.hasOwn(compatible, 'headphonesStyle')) compatible.headphonesStyle = compatible.headphones ? 'studio' : 'none';
  if (!Object.hasOwn(compatible, 'bagStyle')) compatible.bagStyle = compatible.backpack ? 'backpack' : 'none';
  const state = { ...DEFAULT_FIGURE, ...compatible };
  for (const key of Object.keys(enums)) if (!enums[key].includes(state[key])) state[key] = DEFAULT_FIGURE[key];
  // Older saved drafts used a mixed vehicle scene; keep them valid with one selected backdrop.
  // Old saved front-angle truck views now resolve to the approved horizontal side view.
  if (state.cardScene === 'truck-front-left' || state.cardScene === 'truck-front-right' || state.cardScene === 'mobility-mix') state.cardScene = 'truck';
  // The current card family offers only the two approved horizontal road assets.
  // Older saved scenes migrate to the closest supported vehicle type.
  if (state.cardScene === 'coach-bus') state.cardScene = 'bus';
  if (!['truck','bus'].includes(state.cardScene)) state.cardScene = DEFAULT_FIGURE.cardScene;
  if (!['white','zf-blue'].includes(state.logoTheme)) state.logoTheme = DEFAULT_FIGURE.logoTheme;
  for (const key of colorKeys) if (!validHex(state[key])) state[key] = DEFAULT_FIGURE[key];
  state.name = String(state.name || 'Brightforge').trim().slice(0, 40) || 'Brightforge';
  state.tagline = String(state.tagline ?? DEFAULT_FIGURE.tagline).slice(0, 130);
  state.qualities = String(state.qualities ?? DEFAULT_FIGURE.qualities).slice(0, 180);
  state.greeting = truncateUtf16(state.greeting ?? DEFAULT_FIGURE.greeting, 320);
  state.age = Math.round(clamp(state.age, 18, 80));
  state.height = Math.round(clamp(state.height, 160, 205));
  state.headSize = Math.round(clamp(state.headSize, 82, 122));
  state.shoulders = Math.round(clamp(state.shoulders, 82, 122));
  state.legRatio = Math.round(clamp(state.legRatio, 85, 115));
  state.belly = Math.round(clamp(state.belly,0,60));
  state.noseScale = Math.round(clamp(state.noseScale,75,125));
  state.smileIntensity = Math.round(clamp(state.smileIntensity,0,100));
  state.armLength = Math.round(clamp(state.armLength,80,120));
  state.armMuscle = Math.round(clamp(state.armMuscle,70,130));
  state.legMuscle = Math.round(clamp(state.legMuscle,70,130));
  state.handSize = Math.round(clamp(state.handSize,80,125));
  state.heroCapePhase = Number.isFinite(Number(state.heroCapePhase)) ? clamp(state.heroCapePhase,-1,1) : 0;
  for (const key of ['glasses', 'cap', 'headphones', 'backpack', 'watch', 'pin','teethVisible','sunglasses','heroMode']) state[key] = state[key] === true;
  for (const key of ['heroIdentityId','heroIdentityName','heroPower']) state[key]=String(state[key]||'').slice(0,key==='heroPower'?250:60);
  state.sunglasses = state.sunglassesStyle !== 'none';
  state.headphones = state.headphonesStyle !== 'none';
  state.backpack = state.bagStyle === 'backpack';
  const p = state.personalityProfile;
  if (p && Array.isArray(p.qualities) && p.qualities.length === 5 && p.qualities.every(q=>typeof q?.trait==='string'&&Number.isFinite(Number(q.score)))) {
    state.personalityProfile = {
      qualities: p.qualities.map(q=>({trait:q.trait.slice(0,36),score:Math.round(clamp(q.score,0,100))})),
      seed: Math.round(clamp(p.seed,0,1000000)),
      variation: Math.round(clamp(p.variation,0,2)),
      dominant: String(p.dominant||'').slice(0,32),
      secondary: String(p.secondary||'').slice(0,32)
    };
  } else state.personalityProfile = null;
  return state;
}

const BUILD = {
  lean:     { torso: 1.43, shoulder: 1.60, arm: .36, thigh: .46, hip: 1.10 },
  average:  { torso: 1.60, shoulder: 1.78, arm: .42, thigh: .52, hip: 1.22 },
  athletic: { torso: 1.70, shoulder: 1.96, arm: .47, thigh: .58, hip: 1.28 },
  broad:    { torso: 1.92, shoulder: 2.15, arm: .53, thigh: .65, hip: 1.48 },
  stocky:   { torso: 2.02, shoulder: 2.08, arm: .56, thigh: .70, hip: 1.58 }
};
const shade = (hex, amount) => {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return '#' + v.map(c => Math.round(clamp(c + 255 * amount, 0, 255)).toString(16).padStart(2, '0')).join('');
};
const mix = (a, b, t) => {
  const av = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const bv = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + av.map((v, i) => Math.round(v + (bv[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export function buildFigureGeometry(input = {}) {
  const s = normalizeFigure(input), parts = [];
  const add = (name, x, y, z, w, h, d, color, group = name, angle = 0) => {
    const c = Math.cos(angle), sn = Math.sin(angle);
    const verts = [
      [-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,h/2,-d/2],[-w/2,h/2,-d/2],
      [-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]
    ].map(([lx, ly, lz]) => [x + lx*c - ly*sn, y + lx*sn + ly*c, z + lz]);
    parts.push({ name, group, color, vertices: verts });
  };
  const addTaperedHead = (name, x, y, z, topWidth, bottomWidth, h, d, color, group='face') => {
    const back=z-d/2,front=z+d/2,top=y+h/2,bottom=y-h/2;
    parts.push({name,group,color,vertices:[
      [x-bottomWidth/2,bottom,back],[x+bottomWidth/2,bottom,back],[x+topWidth/2,top,back],[x-topWidth/2,top,back],
      [x-bottomWidth/2,bottom,front],[x+bottomWidth/2,bottom,front],[x+topWidth/2,top,front],[x-topWidth/2,top,front]
    ]});
  };
  const addShoeUpper = (name,x,y,z,w,h,d,color,group='footwear') => {
    const bottom=y-h/2,top=y+h/2,back=z-d/2,front=z+d/2;
    const backInset=.045,frontInset=.12;
    const backBottom=w*.47,frontBottom=w*.40,backHalf=w*.41,frontHalf=w*.32;
    parts.push({name,group,color,vertices:[
      [x-backBottom,bottom,back],[x+backBottom,bottom,back],[x+backHalf,top,back+backInset],[x-backHalf,top,back+backInset],
      [x-frontBottom,bottom,front],[x+frontBottom,bottom,front],[x+frontHalf,top,front-frontInset],[x-frontHalf,top,front-frontInset]
    ]});
  };
  const addTaperedSole=(name,x,y,z,w,h,d,color)=>{
    const bottom=y-h/2,top=y+h/2,back=z-d/2,front=z+d/2;
    const backHalf=w*.45,frontHalf=w*.36;
    parts.push({name,group:'footwear',color,vertices:[
      [x-backHalf,bottom,back],[x+backHalf,bottom,back],[x+backHalf*.94,top,back+.025],[x-backHalf*.94,top,back+.025],
      [x-frontHalf,bottom,front],[x+frontHalf,bottom,front],[x+frontHalf*.94,top,front-.055],[x-frontHalf*.94,top,front-.055]
    ]});
  };
  const seg = (name, a, b, w, d, color, group) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    add(name, (a[0]+b[0])/2, (a[1]+b[1])/2, ((a[2]||0)+(b[2]||0))/2, w, len, d, color, group, Math.atan2(-dx, dy));
  };
  const heightScale = s.height / 182, legScale = s.legRatio / 100;
  const body = BUILD[s.build], skin = s.skin, accent = s.accentColor;
  const top = s.heroMode ? s.topColor : s.outfit === 'zf-polo-white' ? '#FFFFFF' : s.outfit === 'zf-polo-navy' ? '#0A2042' : s.topColor;
  const torsoW = body.torso * (s.shoulders / 100) * (1+s.belly/360);
  const hair = s.age > 48 ? mix(s.hairColor, '#AEB2B5', clamp((s.age - 48) / 38, 0, .88)) : s.hairColor;
  const beardColor = s.age > 48 ? mix(s.hairColor, '#AEB2B5', clamp((s.age - 48) / 38, 0, .82)) : s.hairColor;
  const H = s.headSize / 100;
  const headDimensions = {
    classic: [1.18,1.31,.94,.82], square: [1.28,1.24,.98,.91], tall: [1.10,1.43,.91,.76], wide: [1.38,1.25,.98,.84],
    round: [1.30,1.30,.98,.90], oval: [1.13,1.40,.92,.78], heart: [1.30,1.31,1.04,.72], diamond: [1.19,1.34,.84,.88]
  }[s.headShape];
  const jawlineRatio={soft:1.04,defined:1,angular:.91,tapered:.82,broad:1.10}[s.jawline];
  const hw = headDimensions[0] * H, hh = headDimensions[1] * H, hd = .94 * H;
  const headTopWidth=hw*headDimensions[2],headBottomWidth=hw*headDimensions[3]*jawlineRatio;
  const headY = 5.18, headZ = .035;

  // Legs and shoes are separate pieces so proportion, trouser and footwear choices all rebuild the mesh.
  const stance = s.pose==='wide-stance' ? .56 : s.pose==='relaxed-lean' ? .40 : .36;
  const legXs = s.pose==='relaxed-lean' ? [-stance*.64,stance*1.08] : [-stance, stance];
  legXs.forEach((x, i) => {
    const side = i ? 'Right' : 'Left', lx = x * (body.hip / 1.28);
    const kneeY = s.bottoms === 'shorts' ? 1.03 : 1.02;
    // Keep a small overlap through the knee instead of leaving a visible floating-leg seam.
    const lowerTop = kneeY + .08;
    const thighH = 2.10 - kneeY;
    const danceAngle = s.pose==='dance' ? (i===0 ? -.18 : .22) : 0;
    const leanAngle = s.pose==='relaxed-lean' ? (i===0 ? -.035 : .13) : 0;
    const legWidth=body.thigh*s.legMuscle/100;
    const shinX=lx+(s.pose==='relaxed-lean'&&i===1?.09:s.pose==='dance'?(i===0?-.06:.08):0);
    add(side+'_thigh', lx, (2.10+kneeY)/2, 0, legWidth, thighH, .68, s.pantsColor, 'trousers', danceAngle+leanAngle);
    const shinColor = s.bottoms === 'shorts' ? skin : s.pantsColor;
    add(side+'_shin', shinX, (lowerTop+.24)/2, .005, legWidth*.86, lowerTop-.24, .60, shinColor, 'trousers', danceAngle*.3+leanAngle*.18);
    if (s.bottoms === 'cargo') {
      add(side+'_cargo_pocket', lx + (i ? -.17 : .17), 1.34, .36, .28, .38, .12, shade(s.pantsColor,.08), 'pockets');
      add(side+'_cargo_flap', lx + (i ? -.17 : .17), 1.54, .43, .28, .08, .07, shade(s.pantsColor,.17), 'pockets');
    }
    if (s.bottoms === 'formal-trousers') add(side+'_trouser_crease',lx,1.49,.344,.04,.82,.025,shade(s.pantsColor,.15),'stitching');
    if (s.bottoms === 'track-pants') [-1,1].forEach(stripe=>add(side+'_track_stripe_'+stripe,lx+stripe*.25,1.48,.35,.06,.92,.03,accent,'stitching'));
    if (s.bottoms === 'jeans') add(side+'_denim_cuff', lx, .33, .31, body.thigh*.90, .12, .08, shade(s.pantsColor,.13), 'stitching');
    if (s.bottoms === 'joggers') add(side+'_cuff', lx, .28, .30, body.thigh*.86, .13, .07, shade(s.pantsColor,-.08), 'stitching');
    const footX=shinX+(s.pose==='relaxed-lean'&&i===1?.025:s.pose==='dance'?(i===0?-.10:.12):0);
    // Layered, tapered uppers make the silhouette read as a shoe instead of a
    // single block: rubber outsole, welt, shaped upper, toe cap and heel counter.
    const casualShoe=s.footwear==='sneaker'||s.footwear==='high-top';
    const outsoleColor=casualShoe?'#263949':shade(s.shoeColor,-.50);
    addTaperedSole(side+'_shoe_sole',footX,.105,.12,.78,.13,.94,outsoleColor);
    addTaperedSole(side+'_shoe_midsole',footX,.195,.12,.75,.075,.88,casualShoe?'#F7F4EE':shade(s.shoeColor,-.17));
    add(side+'_shoe_welt',footX,.239,.10,.715,.028,.83,casualShoe?'#D5DDE1':shade(s.shoeColor,-.32),'footwear');
    const shoeHeight = s.footwear === 'high-top' || s.footwear === 'boot' ? .40 : .31;
    const shoeWidth = s.footwear === 'dress-shoe' ? .66 : s.footwear==='loafer'?.70:.72;
    addShoeUpper(side+'_shoe',footX,.365,.12,shoeWidth,shoeHeight,.82,s.shoeColor);
    add(side+'_shoe_toe', footX, .35, .49, shoeWidth*.69, .115, .19, shade(s.shoeColor,.12), 'footwear');
    add(side+'_shoe_heel_counter',footX,.37,-.285,shoeWidth*.65,.205,.10,shade(s.shoeColor,-.16),'footwear');
    if (s.footwear === 'loafer') {
      add(side+'_loafer_vamp',footX,.43,.26,shoeWidth*.80,.075,.28,shade(s.shoeColor,-.08),'footwear');
      add(side+'_loafer_buckle',footX,.47,.31,.18,.045,.035,accent,'footwear');
    } else if (s.footwear === 'dress-shoe') {
      add(side+'_dress_shoe_cap',footX,.405,.48,shoeWidth*.74,.055,.12,shade(s.shoeColor,-.10),'footwear');
      add(side+'_dress_shoe_heel',footX,.25,-.36,shoeWidth*.54,.19,.14,shade(s.shoeColor,-.30),'footwear');
      for (let j=0;j<3;j++) add(side+'_dress_shoe_lace_'+j, footX, .43+j*.045, .20, .24, .018, .028, shade(s.shoeColor,-.32), 'laces');
    } else {
      add(side+'_shoe_tongue', footX, .49, .34, .25, .23, .075, shade(s.shoeColor,-.10), 'footwear');
      for (let j=0;j<4;j++) {
        add(side+'_lace_eyelet_left_'+j,footX-.105,.405+j*.052,.355-j*.015,.041,.041,.03,'#344455','laces');
        add(side+'_lace_eyelet_right_'+j,footX+.105,.405+j*.052,.355-j*.015,.041,.041,.03,'#344455','laces');
        add(side+'_lace_'+j, footX, .414+j*.052, .382-j*.015, .255, .032, .038, shade(s.shoeColor,-.45), 'laces');
      }
      add(side+'_shoe_side_panel_left',footX-.30,.365,.04,.10,.17,.38,accent,'footwear');
      add(side+'_shoe_side_panel_right',footX+.30,.365,.04,.10,.17,.38,accent,'footwear');
    }
    if (s.footwear === 'high-top' || s.footwear === 'boot') {
      add(side+'_ankle_panel', footX, .58, .16, .72, .12, .62, accent, 'footwear');
      add(side+'_heel_tab',footX,.61,-.24,.22,.17,.08,shade(s.shoeColor,.12),'footwear');
      if (s.footwear === 'boot') {
        add(side+'_boot_shaft', footX, .77, .01, .70, .56, .57, shade(s.shoeColor,-.04), 'footwear');
        add(side+'_boot_collar',footX,1.055,.01,.74,.10,.60,shade(s.shoeColor,-.16),'footwear');
        add(side+'_boot_lace_guard',footX,.80,.315,.27,.43,.06,shade(s.shoeColor,.10),'footwear');
      }
    }
    if(s.heroMode&&s.heroBootStyle!=='none'){
      const guardHeight=s.heroBootStyle==='tall'?.82:s.heroBootStyle==='speed'?.40:.58;
      add(side+'_hero_boot_guard',footX,.76,.39,.48,guardHeight,.10,shade(s.accentColor,-.02),'hero-boots');
      if(s.heroBootStyle==='armored'){
        add(side+'_hero_boot_toe',footX,.36,.61,.58,.20,.08,shade(s.accentColor,.08),'hero-boots');
        add(side+'_hero_boot_ankle_plate',footX,.80,.39,.43,.18,.08,shade(s.accentColor,.04),'hero-boots');
      }
      if(s.heroBootStyle==='speed')[-1,1].forEach(sign=>add(side+'_hero_boot_stripe_'+sign,footX+sign*.13,.74,.45,.09,.33,.04,shade(s.heroCapeColor,.02),'hero-boots',sign*-.11));
    }
  });

  // Waist and torso layers.
  add('waist', 0, 2.12, 0, body.hip, .48, .72, s.pantsColor, 'trousers');
  if(s.heroMode&&s.heroCapeStyle!=='none'){
    const phase=s.heroCapePhase;
    const wind=s.heroCapeStyle==='flight'?.30:s.heroCapeStyle==='split'?.13:.055;
    const capeBack=-.57;
    add('hero_cape_yoke',0,4.00,capeBack,torsoW*.82,.30,.14,shade(s.heroCapeColor,-.08),'hero-cape');
    [-1,1].forEach(side=>{
      add('hero_cape_shoulder_clasp_'+side,side*torsoW*.36,4.01,.47,.22,.24,.10,shade(s.heroMaskColor,-.05),'hero-cape-clasp',side*-.12);
      add('hero_cape_clasp_pin_'+side,side*torsoW*.36,4.01,.535,.075,.075,.035,'#F4D58A','hero-cape-clasp');
    });
    if(s.heroCapeStyle==='flight'){
      [-1,1].forEach(side=>{
        const flare=.30+phase*wind*.20;
        add('hero_cape_panel_'+side,side*(torsoW*.60+flare),3.30,capeBack,torsoW*.54,1.72,.14,s.heroCapeColor,'hero-cape',side*(.44+phase*wind*.55));
        add('hero_cape_flight_edge_'+side,side*(torsoW*.89+flare),3.28,capeBack-.005,torsoW*.18,1.48,.15,shade(s.heroCapeColor,-.13),'hero-cape',side*(.52+phase*wind*.60));
      });
    }else if(s.heroCapeStyle==='split'){
      [-1,1].forEach(side=>add('hero_cape_panel_'+side,side*.31,3.14,capeBack,torsoW*.57,1.78,.13,s.heroCapeColor,'hero-cape',side*(.07+phase*wind)));
      add('hero_cape_split_gap',0,3.42,capeBack-.01,.12,1.18,.14,shade(s.heroCapeColor,-.12),'hero-cape');
    }else{
      const capeHeight=s.heroCapeStyle==='long'?2.35:1.18;
      add('hero_cape_back',phase*wind*.16,3.55-capeHeight*.30,capeBack,torsoW*(s.heroCapeStyle==='long'?1.08:1.00),capeHeight,.13,s.heroCapeColor,'hero-cape',phase*wind*.08);
      if(s.heroCapeStyle==='long')[-1,1].forEach(side=>add('hero_cape_hem_'+side,side*torsoW*.43,2.30,capeBack-.015,torsoW*.15,.46,.14,shade(s.heroCapeColor,-.12),'hero-cape',side*(.09+phase*wind)));
    }
  }
  add('shirt_body', 0, 3.23, .01, torsoW, 1.75, .86, top, 'top');
  add('neck', 0, 4.30, .06, .47, .55, .46, skin, 'skin');
  add('collar_back', 0, 4.05, .08, .66, .24, .53, shade(top,-.05), 'top');
  if (s.outfit === 'hero-suit' && s.heroMode) {
    if(s.heroSuitStyle==='armored'){
      [-1,1].forEach(side=>add('hero_shoulder_plate_'+side,side*.66,4.00,.49,.58,.42,.16,shade(top,.12),'hero-armor',side*.12));
      add('hero_chest_plate',0,3.56,.51,.83,.86,.11,shade(top,.16),'hero-armor');
      add('hero_waist_guard',0,2.68,.50,torsoW*.78,.27,.12,shade(top,-.13),'hero-armor');
    }else if(s.heroSuitStyle==='tech'){
      [-1,1].forEach(side=>add('hero_tech_panel_'+side,side*.40,3.43,.50,.18,.90,.08,shade(accent,.03),'hero-armor',side*-.10));
      add('hero_tech_core',0,3.64,.52,.31,.36,.10,shade(accent,.15),'hero-armor');
      add('hero_tech_belt',0,2.54,.50,torsoW*.78,.13,.09,shade(top,-.14),'hero-armor');
    }else if(s.heroSuitStyle==='formal-coat'){
      [-1,1].forEach(side=>{
        add('hero_formal_lapel_'+side,side*.22,3.76,.62,.30,.76,.09,shade(top,.22),'hero-armor',side*-.20);
        add('hero_formal_coat_panel_'+side,side*.48,3.18,.50,.62,1.53,.13,shade(top,-.08),'hero-armor');
        add('hero_formal_coat_tail_'+side,side*.42,2.54,.43,.70,.54,.12,shade(top,-.10),'hero-armor',side*.06);
      });
      add('hero_formal_shirt',0,3.51,.58,.36,.91,.08,shade(top,.48),'hero-armor');
      add('hero_formal_tie',0,3.51,.64,.13,.56,.045,s.accentColor,'hero-armor');
      add('hero_formal_tie_knot',0,3.83,.655,.19,.14,.05,shade(s.accentColor,.12),'hero-armor');
      const buttonColor=shade(s.heroMaskColor,-.06);
      for(let j=0;j<3;j++)add('hero_formal_button_'+j,0,3.16+j*.23,.625,.055,.055,.035,buttonColor,'hero-armor');
      add('hero_formal_collar',0,4.02,.61,.45,.25,.08,shade(top,.35),'hero-armor');
      add('hero_heroic_belt',0,2.54,.49,torsoW*.78,.17,.10,shade(top,-.12),'hero-armor');
    }else{
      [-1,1].forEach(side=>add('hero_shoulder_trim_'+side,side*.64,4.00,.49,.53,.22,.10,accent,'hero-armor',side*.12));
      add('hero_heroic_belt',0,2.54,.49,torsoW*.78,.17,.10,shade(top,-.12),'hero-armor');
    }
    if(s.heroEmblem==='shield'){
      add('hero_emblem_top',0,3.77,.64,.42,.18,.045,s.heroCapeColor,'hero-emblem');
      add('hero_emblem_left',-.13,3.57,.64,.16,.30,.045,s.heroCapeColor,'hero-emblem',-.12);
      add('hero_emblem_right',.13,3.57,.64,.16,.30,.045,s.heroCapeColor,'hero-emblem',.12);
      add('hero_emblem_point',0,3.39,.64,.20,.19,.045,s.heroCapeColor,'hero-emblem');
    }else if(s.heroEmblem==='bolt'){
      add('hero_emblem_bolt_top',-.05,3.75,.64,.20,.29,.045,s.heroCapeColor,'hero-emblem',-.20);
      add('hero_emblem_bolt_bottom',.05,3.50,.64,.20,.29,.045,s.heroCapeColor,'hero-emblem',-.20);
    }else if(s.heroEmblem==='gear'){
      add('hero_emblem_gear_outer',0,3.61,.64,.38,.38,.045,s.heroCapeColor,'hero-emblem');
      add('hero_emblem_gear_inner',0,3.61,.68,.15,.15,.035,shade(top,.16),'hero-emblem');
    }else if(s.heroEmblem==='heart'){
      add('hero_emblem_heart_left',-.085,3.68,.64,.19,.19,.045,s.heroCapeColor,'hero-emblem',-.15);
      add('hero_emblem_heart_right',.085,3.68,.64,.19,.19,.045,s.heroCapeColor,'hero-emblem',.15);
      add('hero_emblem_heart_point',0,3.50,.64,.20,.22,.045,s.heroCapeColor,'hero-emblem');
    }else if(s.heroEmblem==='sun'){
      add('hero_emblem_sun_center',0,3.61,.64,.24,.24,.045,s.heroCapeColor,'hero-emblem');
      [-1,1].forEach(side=>add('hero_emblem_sun_ray_'+side,side*.20,3.61,.64,.12,.09,.04,s.heroCapeColor,'hero-emblem'));
      [-1,1].forEach(side=>add('hero_emblem_sun_ray_y_'+side,0,3.61+side*.20,.64,.09,.12,.04,s.heroCapeColor,'hero-emblem'));
    }else if(s.heroEmblem==='star'){
      add('hero_emblem_star_core',0,3.61,.64,.19,.38,.045,s.heroCapeColor,'hero-emblem');
      add('hero_emblem_star_cross',0,3.61,.66,.39,.18,.045,s.heroCapeColor,'hero-emblem');
    }
  } else if (s.outfit === 'overshirt') {
    [-1,1].forEach(side => {
      add('overshirt_front_'+side, side*.40, 3.22, .48, .78, 1.64, .12, top, 'top');
      add('overshirt_placket_'+side, side*.075, 3.18, .56, .10, 1.58, .06, shade(top,.12), 'details');
      add('overshirt_pocket_'+side, side*.50, 3.34, .57, .30, .31, .07, shade(top,-.05), 'details');
      add('overshirt_flap_'+side, side*.50, 3.52, .61, .32, .08, .05, accent, 'details');
      for (let j=0;j<3;j++) add('overshirt_button_'+side+'_'+j, side*.075, 2.82+j*.34, .615, .07,.07,.035, shade(accent,.02), 'details');
    });
  } else if (s.outfit === 'hoodie') {
    add('hood', 0, 4.48, -.40, .92,.64,.28,shade(top,-.07),'hood');
    add('hood_face', 0, 4.47, -.22, .52,.34,.12,shade(top,-.16),'hood');
    add('hoodie_pocket', 0, 2.82, .50, .78,.39,.09,shade(top,-.08),'details');
    [-1,1].forEach(side=>add('hood_cord_'+side,side*.13,3.61,.54,.045,.37,.035,shade(top,.18),'details'));
  } else if (s.outfit === 'bomber') {
    add('bomber_zip',0,3.22,.55,.07,1.64,.055,shade(accent,-.18),'details');
    [-1,1].forEach(side=>{
      add('bomber_pocket_'+side,side*.56,3.02,.54,.30,.31,.08,shade(top,-.08),'details');
      add('bomber_cuff_'+side,side*.48,2.37,.02,.66,.15,.74,accent,'details');
    });
    add('bomber_waist',0,2.42,.01,torsoW,.16,.92,accent,'details');
  } else if (s.outfit === 'blazer') {
    [-1,1].forEach(side=>{
      add('blazer_panel_'+side,side*.43,3.22,.49,.79,1.66,.14,top,'top');
      add('blazer_lapel_'+side,side*.19,3.70,.59,.28,.53,.07,accent,'details',side*.23);
      add('blazer_button_'+side,side*.24,2.84,.62,.07,.07,.04,shade(accent,-.14),'details');
    });
    add('blazer_shirt',0,3.55,.48,.50,.88,.12,shade(top,.25),'top');
  } else if (s.outfit === 'utility') {
    [-1,1].forEach(side=>{
      add('vest_panel_'+side,side*.45,3.25,.50,.68,1.58,.16,shade(top,-.12),'top');
      add('vest_pocket_'+side,side*.48,3.05,.61,.38,.41,.07,accent,'details');
      add('vest_strap_'+side,side*.42,3.94,.60,.12,.25,.06,shade(accent,.12),'details');
    });
    add('vest_opening',0,3.23,.59,.18,1.55,.06,shade(top,.18),'details');
  } else if (s.outfit === 'jersey') {
    [-1,1].forEach(side=>add('jersey_shoulder_'+side,side*.63,3.94,.48,.47,.27,.12,accent,'details'));
    add('jersey_number',0,3.23,.51,.48,.52,.035,shade(top,.27),'details');
  } else if (s.outfit === 'tee') {
    add('tee_neckline',0,4.01,.51,.54,.12,.05,accent,'details');
  } else if (s.outfit === 'casual-shirt') {
    [-1,1].forEach(side=>add('shirt_collar_'+side,side*.17,3.99,.55,.30,.22,.09,shade(top,-.12),'details',side*.18));
    add('shirt_placket',0,3.20,.54,.09,1.36,.07,shade(top,-.10),'details');
    [-1,1].forEach(side=>add('shirt_chest_pocket_'+side,side*.48,3.49,.54,.34,.34,.07,shade(top,-.06),'details'));
    for(let j=0;j<4;j++) add('shirt_button_'+j,0,2.83+j*.31,.59,.055,.055,.025,'#F6F2E9','details');
  } else if (s.outfit === 'sweater') {
    add('sweater_neck_rib',0,4.00,.51,.60,.15,.08,shade(top,-.15),'details');
    add('sweater_hem_rib',0,2.42,.48,torsoW,.16,.08,shade(top,-.14),'details');
    [-1,1].forEach(side=>add('sweater_cuff_'+side,side*.49,2.40,.02,.68,.16,.75,shade(top,-.12),'details'));
    for(let j=0;j<3;j++) add('sweater_stitch_'+j,0,3.34+j*.14,.454,torsoW*.74,.025,.025,shade(top,.13),'details');
  } else if (s.outfit === 'cardigan') {
    [-1,1].forEach(side=>add('cardigan_front_'+side,side*.39,3.20,.48,.77,1.60,.14,top,'top'));
    add('cardigan_inner_shirt',0,3.34,.55,.54,1.27,.12,shade(top,.30),'details');
    [-1,1].forEach(side=>add('cardigan_edge_'+side,side*.11,3.20,.58,.09,1.56,.06,shade(top,-.18),'details'));
    for(let j=0;j<4;j++) add('cardigan_button_'+j,-.01,2.74+j*.34,.62,.06,.06,.035,accent,'details');
  } else if (s.outfit === 'denim-jacket') {
    [-1,1].forEach(side=>{
      add('denim_panel_'+side,side*.40,3.20,.48,.78,1.58,.14,top,'top');
      add('denim_pocket_'+side,side*.49,3.49,.57,.34,.30,.08,shade(top,-.10),'details');
      add('denim_pocket_flap_'+side,side*.49,3.66,.61,.37,.09,.06,accent,'details');
      add('denim_seam_'+side,side*.76,3.18,.57,.035,1.48,.035,shade(top,.20),'details');
      add('denim_cuff_'+side,side*.48,2.42,.03,.66,.15,.72,shade(top,-.15),'details');
    });
    add('denim_yoke',0,3.88,.54,torsoW*.88,.12,.07,shade(top,.17),'details');
    add('denim_collar',0,4.01,.54,.59,.15,.09,shade(top,-.12),'details');
  } else if (s.outfit === 'zip-jacket') {
    add('zip_jacket_collar',0,4.05,.49,.62,.24,.13,shade(top,-.14),'details');
    add('zip_jacket_zip',0,3.19,.56,.07,1.55,.06,'#D5DCE5','details');
    [-1,1].forEach(side=>{
      add('zip_jacket_pocket_'+side,side*.52,3.02,.55,.36,.34,.08,shade(top,-.08),'details');
      add('zip_jacket_cuff_'+side,side*.49,2.40,.02,.68,.15,.76,shade(top,-.13),'details');
    });
    add('zip_jacket_hem',0,2.42,.46,torsoW,.16,.09,shade(top,-.12),'details');
  } else if (s.outfit === 'zf-polo' || s.outfit === 'zf-polo-white' || s.outfit === 'zf-polo-navy') {
    add('zf_collar_left',-.19,4.00,.53,.24,.20,.10,shade(top,-.12),'details',-.20);
    add('zf_collar_right',.19,4.00,.53,.24,.20,.10,shade(top,-.12),'details',.20);
    add('zf_placket',0,3.78,.53,.08,.42,.07,shade(top,-.10),'details');
    // The supplied logo is projected onto shirt fabric without a badge or adjustable placement.
    const zfZ=s.outfit==='zf-polo-navy'?.56:.605;
    add('zf_brand_patch',.58,3.76,zfZ,.38,.30,.045,top,'branding');
  } else if (s.outfit === 'traditional-kurta') {
    add('kurta_body',0,3.06,.06,torsoW*.94,2.18,.88,top,'top');
    add('kurta_placket',0,3.72,.52,.11,.53,.055,accent,'details');
    add('kurta_collar',0,4.02,.50,.58,.15,.08,shade(top,-.10),'details');
    for(let j=0;j<3;j++) add('kurta_button_'+j,0,3.55+j*.15,.56,.045,.045,.025,'#F2D08E','details');
    [-1,1].forEach(side=>add('kurta_side_trim_'+side,side*.54,2.70,.52,.055,.32,.04,accent,'details'));
  }
  if(s.belly>0){
    add('belly_form',0,3.02,.465,body.hip*(s.belly/160),.50,.15,top,'body');
  }
  if(s.outfit==='traditional-kurta') add('kurta_lower',0,2.30,.01,body.hip*.86,.46,.78,top,'top');
  if (s.pin) {
    add('appreciation_pin',-.62,3.95,.61,.17,.20,.09,'#F4C55A','pin');
    add('pin_center',-.62,3.95,.67,.07,.09,.025,'#FFFFFF','pin');
  }

  // Shoulder width also moves arm anchors. Build-based arm dimensions change actual cuboids.
  const armPoints = (side) => {
    const sign = side;
    const p = {
      idle: [ [sign*.97,4.05], [sign*1.08,3.25], [sign*1.14,2.63], [0,-1] ],
      wave: [ [sign*.97,4.05], [sign*1.55,4.74], [sign*1.67,5.30], [0,1] ],
      'thumbs-up': [ [sign*.97,4.05], [sign*1.48,3.53], [sign*1.48,2.97], [0,1] ],
      'hands-on-hips': [ [sign*.97,4.05], [sign*1.64,3.12], [sign*.77,2.58], [-sign*.35,-.94] ],
      'crossed-arms': [ [sign*.97,4.05], [sign*.34,3.52], [-sign*.40,3.39], [-sign*.85,-.50] ],
      'hands-behind-back': [ [sign*.97,4.05], [sign*.68,3.48], [sign*.20,3.38], [-sign,0] ],
      flex: [ [sign*.97,4.05], [sign*1.65,4.44], [sign*1.40,5.08], [0,1] ],
      victory: [ [sign*.97,4.05], [sign*1.35,4.95], [sign*1.18,5.74], [0,1] ],
      welcome: [ [sign*.97,4.05], [sign*1.40,4.04], [sign*1.95,4.15], [sign*.15,1] ],
      dance: [ [sign*.97,4.05], [sign*1.55,4.75], [sign*1.28,5.14], [0,1] ],
      'hand-over-heart': [ [sign*.97,4.05], [sign*.72,3.62], [sign*.20,3.72], [-sign,.25] ],
      'hands-clasped-front': [ [sign*.97,4.05], [sign*.62,3.38], [sign*.12,3.14], [-sign,-.08] ],
      salute: [ [sign*.97,4.05], [sign*1.30,4.45], [sign*.79,4.66], [-sign*.2,1] ],
      'both-wave': [ [sign*.97,4.05], [sign*1.45,4.75], [sign*1.55,5.32], [0,1] ],
      pointing: [ [sign*.97,4.05], [sign*1.47,3.72], [sign*1.98,3.82], [1,0] ],
      peace: [ [sign*.97,4.05], [sign*1.28,4.62], [sign*1.05,5.18], [0,1] ],
      'wide-stance': [ [sign*.97,4.05], [sign*1.08,3.25], [sign*1.14,2.63], [0,-1] ]
    };
    const chosen = p[s.pose] || p.idle;
    if (['wave','thumbs-up','victory','hand-over-heart','salute','pointing','peace'].includes(s.pose) && side < 0) return p.idle;
    return chosen;
  };
  [-1,1].forEach(side=>{
    const sideName=side<0?'Left':'Right', pts=armPoints(side), [rawShoulder,rawElbow,rawWrist,handDir]=pts;
    const armScale=s.armLength/100, shoulderPoint=[side*(torsoW*.50+body.arm*.12),4.05];
    const mapArmPoint=([x,y])=>[shoulderPoint[0]+(x-rawShoulder[0])*armScale,shoulderPoint[1]+(y-rawShoulder[1])*armScale];
    const mappedElbow=mapArmPoint(rawElbow),mappedWrist=mapArmPoint(rawWrist);
    const behind=s.pose==='hands-behind-back';
    const front=['hand-over-heart','hands-clasped-front'].includes(s.pose);
    const sh=[shoulderPoint[0],shoulderPoint[1],behind?-.42:front?.35:.03], el=[mappedElbow[0],mappedElbow[1],behind?-.56:front?.44:.035], wr=[mappedWrist[0],mappedWrist[1],behind?-.64:front?.52:.05];
    const upperEnd=[sh[0]+(el[0]-sh[0])*.83,sh[1]+(el[1]-sh[1])*.83,(sh[2]+el[2])*.5];
    const armWidth=body.arm*s.armMuscle/100;
    seg(sideName+'_upper_sleeve',sh,upperEnd,armWidth*1.58,.75,top,'sleeves');
    seg(sideName+'_upper_arm',upperEnd,el,armWidth*1.40,.65,skin,'skin');
    seg(sideName+'_forearm',el,wr,armWidth*1.08,.59,skin,'skin');
    if (s.watch && side < 0) add('watch_band',wr[0],wr[1]+.08,wr[2]+.08,.41,.14,.34,shade(s.frameColor,-.02),'watch');
    if (s.watch && side < 0) add('watch_face',wr[0],wr[1]+.08,wr[2]+.20,.18,.16,.045,'#E7C467','watch');
    const dirLen=Math.hypot(handDir[0],handDir[1])||1, ux=handDir[0]/dirLen, uy=handDir[1]/dirLen;
    const handZ=behind?-.66:front?.54:.05;
    const handScale=s.handSize/100;
    const palm=[wr[0]+ux*.24*handScale,wr[1]+uy*.24*handScale,handZ], tip=[palm[0]+ux*.22*handScale,palm[1]+uy*.22*handScale,handZ];
    const handColor=s.heroMode&&s.heroGloveStyle!=='none'?s.accentColor:skin, handW=body.arm*.98*handScale;
    if(s.heroMode&&s.heroGloveStyle!=='none'){
      const cuffWidth=s.heroGloveStyle==='gauntlet'?body.arm*1.28:body.arm*1.08;
      add(sideName+'_hero_glove_cuff',wr[0],wr[1],handZ+.02,cuffWidth,s.heroGloveStyle==='gauntlet'?.27:.14,.34,shade(s.accentColor,-.04),'hero-gloves');
    }
    const perp=[-uy,ux];
    const raisedThumb=(s.pose==='thumbs-up'&&side>0)||s.handStyle==='thumbs-up';
    const fingersMode=raisedThumb?'fist':s.pose==='peace'?'peace':s.pose==='pointing'?'point':s.handStyle;
    if (fingersMode==='mitten') seg(sideName+'_mitten',wr,tip,handW,.35,handColor,'hands');
    else if (fingersMode==='fist') {
      seg(sideName+'_fist',wr,[wr[0]+ux*.37,wr[1]+uy*.37,handZ],handW,.38,handColor,'hands');
      if(raisedThumb){
        const base=[wr[0]+ux*.16+perp[0]*handW*.45,wr[1]+uy*.16+perp[1]*handW*.45,handZ+.21];
        const joint=[base[0]+ux*.15,base[1]+uy*.15,handZ+.22],tip=[base[0]+ux*.30,base[1]+uy*.30,handZ+.22];
      seg(sideName+'_fist_thumb_proximal',base,joint,handW*.25,.20,handColor,'hands');
        seg(sideName+'_fist_thumb_distal',joint,tip,handW*.22,.18,handColor,'hands');
      }else seg(sideName+'_fist_thumb',[wr[0]+ux*.12,wr[1]+uy*.12,handZ+.21],[wr[0]+ux*.23-uy*.13,wr[1]+uy*.23+ux*.13,handZ+.21],.15,.20,handColor,'hands');
    } else {
      seg(sideName+'_palm',wr,palm,handW,.31,handColor,'hands');
      for(let f=-1;f<=2;f++){
        const offset=(f-.5)*handW*.25;
        const base=[palm[0]+perp[0]*offset,palm[1]+perp[1]*offset,handZ];
        let length=((f===-1||f===2)?.27:.34)*handScale;
        if(fingersMode==='point') length=(f===0?.48:.13)*handScale;
        if(fingersMode==='peace') length=((f===0||f===1)?.45:.15)*handScale;
        const joint=[base[0]+ux*length*.56,base[1]+uy*length*.56,handZ];
        const end=[base[0]+ux*length,base[1]+uy*length,handZ];
        const digitWidth=handW*.20;
        seg(sideName+'_finger_'+(f+1)+'_proximal',base,joint,digitWidth,.22,handColor,'hands');
        seg(sideName+'_finger_'+(f+1)+'_distal',[joint[0]-ux*.018,joint[1]-uy*.018,joint[2]],end,digitWidth*.88,.20,handColor,'hands');
        add(sideName+'_knuckle_'+(f+1),joint[0],joint[1],handZ+.01,digitWidth*.95,digitWidth*.95,.20,handColor,'hands');
      }
      const thumbSign=side>0?1:-1;
      const thumbBase=[wr[0]+perp[0]*thumbSign*handW*.46,wr[1]+perp[1]*thumbSign*handW*.46,handZ+.06];
      let thumbEnd;
      if(s.handStyle==='thumbs-up' || s.pose==='thumbs-up') thumbEnd=[thumbBase[0],thumbBase[1]+.34*handScale,handZ+.07];
      else thumbEnd=[thumbBase[0]-ux*.05*handScale+perp[0]*thumbSign*.21*handScale,thumbBase[1]-uy*.05*handScale+perp[1]*thumbSign*.21*handScale,handZ+.07];
      const thumbJoint=[thumbBase[0]+(thumbEnd[0]-thumbBase[0])*.55,thumbBase[1]+(thumbEnd[1]-thumbBase[1])*.55,handZ+.04];
      seg(sideName+'_thumb_proximal',thumbBase,thumbJoint,handW*.25,.23,handColor,'hands');
      seg(sideName+'_thumb_distal',thumbJoint,thumbEnd,handW*.21,.21,handColor,'hands');
    }
  });

  // Head, face and age details. The lower head contour changes independently from the face shape.
  addTaperedHead('head',0,headY,headZ,headTopWidth,headBottomWidth,hh,hd,skin);
  [-1,1].forEach(side=>add('ear_'+side,side*(hw*.51),headY-.02,.02,.22*H,.31*H,.42*H,skin,'face'));
  const eyeY=headY+.12*H, eyeX=hw*.205, faceZ=headZ+hd*.52+.055;
  const expressiveEyes={
    excited:[.26,.23],joyful:[.23,.12],laughing:[.23,.10],astonished:[.27,.25],determined:[.26,.095],playful:[.23,.18]
  };
  const eyeDim=expressiveEyes[s.expression]||({classic:[.22,.16],round:[.18,.19],narrow:[.25,.10],wide:[.25,.19]}[s.eyeShape]);
  const browDim={natural:[.29,.075],bold:[.31,.11],raised:[.29,.075],angled:[.29,.075]}[s.browStyle];
  const noseScale=s.noseScale/100, smile=s.smileIntensity/100;
  [-1,1].forEach(side=>{
    const playfulEyeDim=s.expression==='playful'&&side<0?[.25,.105]:eyeDim;
    const delighted=['excited','joyful','astonished','surprised'].includes(s.expression);
    add('eye_white_'+side,side*eyeX,eyeY,faceZ,playfulEyeDim[0]*H,playfulEyeDim[1]*H,.085,'#FFF8E9','eyes');
    add('iris_'+side,side*eyeX,eyeY,faceZ+.053,delighted?.09:.075,delighted?.105:.09,.035,s.eyeColor,'eyes');
    add('pupil_'+side,side*eyeX,eyeY,faceZ+.078,.04,.055,.022,'#171A25','eyes');
    const browLift=['excited','joyful','astonished','surprised'].includes(s.expression)?.085:0;
    const browY=eyeY+.18*H+(s.browStyle==='raised'?.05:0)+browLift*H;
    const angled=['angled','focused'].includes(s.browStyle)||['focused','determined'].includes(s.expression);
    const browAngle=angled?side*-.11:s.expression==='playful'&&side>0?-.10:0;
    const activeBrowDim=s.expression==='determined'?[.34,.12]:browDim;
    add('brow_'+side,side*eyeX,browY,faceZ,activeBrowDim[0]*H,activeBrowDim[1]*H,.09,hair,'brows',browAngle);
    if(s.glasses){
      const f=s.frameColor;
      add('glasses_top_'+side,side*eyeX,eyeY+.105*H,faceZ+.095,.36*H,.055,.05,f,'glasses');
      add('glasses_bottom_'+side,side*eyeX,eyeY-.105*H,faceZ+.095,.36*H,.045,.05,f,'glasses');
      add('glasses_outer_'+side,side*(eyeX+side*.15*H),eyeY,faceZ+.095,.05,.25*H,.05,f,'glasses');
      add('glasses_inner_'+side,side*(eyeX-side*.15*H),eyeY,faceZ+.095,.045,.25*H,.05,f,'glasses');
    }
    if(s.age>=56){
      add('age_line_'+side,side*(eyeX+.19),eyeY-.03,faceZ+.08,.11,.025,.02,shade(skin,-.17),'age');
    }
  });
  if(s.heroMode&&s.heroEyeMaskStyle!=='none'){
    const maskColor=s.heroMaskColor,z=faceZ+.145;
    const frame=['eye-frame','tech-visor','shield-frame','armored-eyeport','radiant-band','thunder-crest','web-frame','shadow-cowl'].includes(s.heroEyeMaskStyle);
    if(frame){
      [-1,1].forEach(side=>{
        const cx=side*eyeX;
        // Bars sit outside the maximum eye whites, including the widest expression.
        add('hero_eye_mask_top_'+side,cx,eyeY+.205*H,z,.42*H,.060*H,.06,maskColor,'hero-eye-mask');
        add('hero_eye_mask_bottom_'+side,cx,eyeY-.195*H,z,.42*H,.050*H,.06,maskColor,'hero-eye-mask');
        add('hero_eye_mask_outer_'+side,cx+side*.205*H,eyeY,z,.050*H,.24*H,.06,maskColor,'hero-eye-mask');
        add('hero_eye_mask_inner_'+side,cx-side*.205*H,eyeY,z,.040*H,.24*H,.06,maskColor,'hero-eye-mask');
      });
      add('hero_eye_mask_bridge',0,eyeY,z,.14*H,.075*H,.065,shade(maskColor,-.08),'hero-eye-mask');
    }
    if(s.heroEyeMaskStyle==='tech-visor'){
      add('hero_visor_top_rail',0,eyeY+.275*H,z,.98*H,.07*H,.08,shade(maskColor,-.13),'hero-eye-mask');
      [-1,1].forEach(side=>add('hero_visor_temple_'+side,side*(eyeX+.29*H),eyeY+.015*H,z,.12*H,.34*H,.08,shade(maskColor,-.09),'hero-eye-mask',side*.10));
    }else if(s.heroEyeMaskStyle==='shield-frame'){
      [-1,1].forEach(side=>{
        add('hero_shield_mask_wing_'+side,side*(eyeX+.30*H),eyeY+.015*H,z,.14*H,.31*H,.07,shade(maskColor,-.10),'hero-eye-mask',side*.16);
        add('hero_shield_mask_brow_'+side,side*eyeX,eyeY+.27*H,z,.43*H,.07*H,.07,shade(maskColor,.06),'hero-eye-mask',side*-.04);
      });
    }else if(s.heroEyeMaskStyle==='armored-eyeport'){
      [-1,1].forEach(side=>{
        add('hero_armored_temple_'+side,side*(eyeX+.33*H),eyeY-.07*H,z,.18*H,.39*H,.10,shade(maskColor,-.12),'hero-eye-mask',side*.08);
        add('hero_armored_cheek_'+side,side*.48*H,headY-.28*H,z,.20*H,.31*H,.10,shade(maskColor,-.05),'hero-eye-mask');
        add('hero_armored_brow_'+side,side*eyeX,eyeY+.29*H,z,.46*H,.10*H,.10,shade(maskColor,.10),'hero-eye-mask',side*-.03);
      });
      add('hero_armored_chin_guard',0,headY-.53*H,z,.62*H,.15*H,.10,shade(maskColor,-.08),'hero-eye-mask');
    }else if(s.heroEyeMaskStyle==='radiant-band'){
      add('hero_radiant_forehead_band',0,eyeY+.31*H,z,.92*H,.09*H,.07,shade(maskColor,.08),'hero-eye-mask');
      add('hero_radiant_center_gem',0,eyeY+.37*H,z+.02,.14*H,.12*H,.08,'#F7E7B2','hero-eye-mask');
      [-1,1].forEach(side=>add('hero_radiant_side_fin_'+side,side*(eyeX+.29*H),eyeY+.12*H,z,.12*H,.40*H,.07,shade(maskColor,-.06),'hero-eye-mask',side*.18));
    }else if(s.heroEyeMaskStyle==='thunder-crest'){
      add('hero_thunder_brow_crest',0,eyeY+.30*H,z,.94*H,.09*H,.08,shade(maskColor,.05),'hero-eye-mask');
      [-1,1].forEach(side=>{
        add('hero_thunder_wing_'+side,side*(eyeX+.30*H),eyeY+.04*H,z,.14*H,.32*H,.08,maskColor,'hero-eye-mask',side*.13);
        add('hero_thunder_fin_'+side,side*.51*H,eyeY+.38*H,z,.17*H,.30*H,.08,shade(maskColor,.12),'hero-eye-mask',side*-.20);
      });
    }else if(s.heroEyeMaskStyle==='web-frame'){
      [-1,1].forEach(side=>{
        seg('hero_web_brow_ray_'+side,[0,eyeY+.27*H,z],[side*(eyeX+.34*H),eyeY+.30*H,z],.045*H,.06,shade(maskColor,.13),'hero-eye-mask');
        seg('hero_web_outer_ray_'+side,[side*(eyeX+.22*H),eyeY-.12*H,z],[side*(eyeX+.43*H),eyeY-.30*H,z],.04*H,.06,shade(maskColor,-.10),'hero-eye-mask');
      });
      add('hero_web_center_knot',0,eyeY+.26*H,z,.13*H,.10*H,.07,shade(maskColor,.18),'hero-eye-mask');
    }else if(s.heroEyeMaskStyle==='shadow-cowl'){
      add('hero_cowl_brow_ridge',0,eyeY+.28*H,z,.96*H,.08*H,.10,shade(maskColor,-.14),'hero-eye-mask');
      [-1,1].forEach(side=>{
        add('hero_cowl_temple_'+side,side*(eyeX+.33*H),eyeY+.01*H,z,.16*H,.34*H,.10,shade(maskColor,-.08),'hero-eye-mask',side*.08);
        add('hero_cowl_ear_'+side,side*.50*H,eyeY+.39*H,z-.015,.16*H,.33*H,.10,shade(maskColor,-.06),'hero-eye-mask',side*-.22);
      });
    }
  }
  add('nose',0,headY-.12*H,faceZ+.035,.17*H*noseScale,.24*H*noseScale,.12,shade(skin,-.10),'face');
  const mouthY=headY-.36*H, mouthZ=faceZ+.19;
  const expressionMouth={smile:'smile',grin:'grin',calm:'closed',focused:'closed',surprised:'open',excited:'laugh',joyful:'wide-grin',laughing:'laugh',astonished:'open',determined:'closed',playful:'grin'};
  const mouth=s.mouthStyle==='auto'?expressionMouth[s.expression]||'smile':s.mouthStyle;
  if(mouth==='closed') add('mouth_closed',0,mouthY,mouthZ,.27*H,.035*H,.035,'#54252D','face');
  else if(mouth==='pursed') add('mouth_pursed',0,mouthY-.01*H,mouthZ,.19*H,.115*H,.06,'#54252D','face');
  else if(mouth==='smile'){
    const width=(.24+smile*.32)*H,curve=(.012+smile*.11)*H,steps=4;
    for(let i=0;i<steps;i++){
      const x1=-width/2+width*i/steps,x2=-width/2+width*(i+1)/steps;
      const t1=(i/steps)*2-1,t2=((i+1)/steps)*2-1;
      const y1=mouthY+curve*Math.abs(t1)**1.55,y2=mouthY+curve*Math.abs(t2)**1.55;
      seg('mouth_smile_segment_'+i,[x1,y1,mouthZ],[x2,y2,mouthZ],.042*H,.045,'#54252D','face');
    }
  } else {
    const width=(mouth==='wide-grin'?.62:mouth==='grin'?.50:mouth==='laugh'?.44:.34)*H*(.78+smile*.22);
    const height=(mouth==='wide-grin'?.32:mouth==='grin'?.26:mouth==='laugh'?.31:.24)*H;
    const mouthCenter=mouthY-.025*H;
    add('mouth_open',0,mouthCenter,mouthZ,width,height,.065,'#3A1720','face');
    if(s.teethVisible){
      const toothH=(s.teethStyle==='small'?.035:.064)*H,toothY=mouthCenter+height*.29,toothZ=mouthZ+.052;
      if(s.teethStyle==='individual'||s.teethStyle==='gap'){
        const positions=s.teethStyle==='gap'?[-.35,-.16,.16,.35]:[-.36,-.22,-.075,.075,.22,.36];
        const toothW=(s.teethStyle==='gap'?.13:.11)*width;
        positions.forEach((position,index)=>add(index===0?'teeth':'tooth_'+(index+1),position*width,toothY,toothZ,toothW,toothH,.025,'#FFFDF7','teeth'));
      }else add('teeth',0,toothY,toothZ,width*.78,toothH,.025,'#FFFDF7','teeth');
    }
    if(mouth==='laugh') add('tongue',0,mouthCenter-height*.28,mouthZ+.052,width*.43,.045*H,.025,'#E76F72','face');
  }
  if(s.age>=65){
    [-1,1].forEach(side=>add('forehead_line_'+side,side*.17,headY+.37*H,faceZ+.02,.18,.025,.025,shade(skin,-.11),'age'));
  }

  // Independent block hair families.
  const topY=headY+hh/2;
  if(s.hairstyle!=='bald'){
    const capW=hw*1.04, capD=hd*1.04;
    add('hair_cap',0,topY-.015,.005,capW,.22*H,capD,hair,'hair');
    if(s.hairstyle==='buzz'){
      add('buzz_top',0,topY+.015,headZ,.90*hw,.12*H,.94*hd,hair,'hair');
    } else if(s.hairstyle==='crop'){
      add('crop_front',0,topY-.11,headZ+hd*.49,.67*H,.18*H,.17,hair,'hair');
      [-1,1].forEach(side=>add('crop_side_'+side,side*hw*.49,headY+.23*H,.01,.17,.40*H,hd*.93,hair,'hair'));
    } else if(s.hairstyle==='quiff'){
      add('quiff_base',0,topY+.08,headZ+hd*.15,.82*H,.22*H,.55*H,hair,'hair',-.08);
      add('quiff_lock_left',-.22*H,topY+.22,headZ+hd*.34,.40*H,.27*H,.36*H,shade(hair,.06),'hair',-.30);
      add('quiff_lock_right',.17*H,topY+.18,headZ+hd*.34,.42*H,.24*H,.37*H,hair,'hair',-.20);
    } else if(s.hairstyle==='curls'){
      for(let row=0;row<2;row++) for(let col=-3;col<=3;col++){
        const z=headZ+hd*(row===0?.40:-.05), x=col*.145*H;
        add('curl_'+row+'_'+col,x,topY+.08+(Math.abs(col)%2)*.035,z,.18*H,.17*H,.20*H,(col%2?shade(hair,.05):hair),'hair');
      }
      [-1,1].forEach(side=>add('curl_side_'+side,side*hw*.48,headY+.48*H,.02,.17,.23,.54,hair,'hair'));
    } else if(s.hairstyle==='locs'){
      [-3,-2,-1,0,1,2,3].forEach(col=>{
        const x=col*.15*H;
        add('loc_'+col,x,topY-.03,headZ+hd*.44,.11*H,.46*H,.13,hair,'hair',col*.025);
      });
    } else if(s.hairstyle==='long'){
      [-1,1].forEach(side=>{
        add('long_side_'+side,side*hw*.46,headY-.15,.02,.24*H,.82*H,.62*H,hair,'hair');
        add('long_back_'+side,side*hw*.25,headY-.18,-hd*.37,.24*H,.74*H,.23,hair,'hair');
      });
      add('long_fringe',0,topY-.10,headZ+hd*.48,.72*H,.16*H,.13,hair,'hair');
    } else if(s.hairstyle==='fade'){
      add('fade_top',0,topY+.08,-.01,.88*H,.25*H,.75*H,hair,'hair');
      [-1,1].forEach(side=>add('fade_temple_'+side,side*hw*.48,headY+.34,.02,.13,.28,.50,shade(hair,.10),'hair'));
    } else if(s.hairstyle==='side-part'){
      add('sidepart_top',0,topY+.07,headZ,.92*hw,.22*H,.82*hd,hair,'hair');
      add('sidepart_sweep',-.18*H,topY+.13,headZ+hd*.40,.64*H,.18*H,.20,hair,'hair',-.12);
      add('sidepart_lock',.25*H,topY+.04,headZ+hd*.37,.24*H,.14*H,.20,shade(hair,.07),'hair');
    } else if(s.hairstyle==='fringe'){
      add('fringe_top',0,topY+.06,headZ,.96*hw,.22*H,.86*hd,hair,'hair');
      [-2,-1,0,1,2].forEach(i=>add('fringe_lock_'+i,i*.13*H,topY-.08,headZ+hd*.53,.16*H,.19*H,.16,hair,'hair',i*.035));
    } else if(s.hairstyle==='spiky'){
      add('spiky_base',0,topY+.04,headZ,.94*hw,.17*H,.78*hd,hair,'hair');
      [-2,-1,0,1,2].forEach(i=>add('spike_'+i,i*.16*H,topY+.18+(Math.abs(i)%2)*.035,headZ+hd*.10,.18*H,.23*H,.22,hair,'hair',i*-.10));
    } else if(s.hairstyle==='afro'){
      for(let row=0;row<3;row++) for(let col=-3;col<=3;col++){
        const edge=Math.abs(col)+Math.abs(row-1);
        if(edge<=4)add('afro_'+row+'_'+col,col*.16*H,topY+.08+row*.13*H,headZ+hd*(row===0?.22:-.20),.22*H,.22*H,.24,hair,'hair');
      }
    } else if(s.hairstyle==='mullet'){
      add('mullet_top',0,topY+.07,headZ,.92*hw,.24*H,.77*hd,hair,'hair');
      add('mullet_back',0,headY-.16*H,-hd*.48,hw*.88,.92*H,.30*H,shade(hair,-.04),'hair');
      [-1,1].forEach(side=>{
        add('mullet_side_'+side,side*hw*.47,headY-.05*H,.01,.23*H,.72*H,.52*H,hair,'hair',side*.035);
        add('mullet_flow_'+side,side*.20*H,topY-.10,headZ+hd*.50,.24*H,.34*H,.17,hair,'hair',side*.10);
      });
    } else if(s.hairstyle==='flowing'){
      add('flowing_top',0,topY+.05,headZ,.96*hw,.23*H,.84*hd,hair,'hair',-.04);
      add('flowing_back',0,headY-.14*H,-hd*.46,hw*.90,.76*H,.28*H,shade(hair,-.035),'hair');
      [-1,1].forEach(side=>{
        add('flowing_side_'+side,side*hw*.46,headY-.04*H,.025,.25*H,.86*H,.54*H,hair,'hair',side*.025);
        add('flowing_front_'+side,side*.22*H,topY-.12,headZ+hd*.53,.34*H,.29*H,.17,(side<0?shade(hair,.06):hair),'hair',side*-.18);
      });
    }
  }
  if(s.beard!=='none'){
    const fz=faceZ+.105, softBeard=mix(skin,beardColor,.68);
    if(s.beard==='light-stubble'||s.beard==='stubble'){
      const count=s.beard==='light-stubble'?10:20, shadeMix=s.beard==='light-stubble'?.34:.58;
      for(let i=0;i<count;i++){
        const row=Math.floor(i/5),col=i%5,side=col<2?-1:col>2?1:0;
        const x=side===0?0:side*(.18+((col%2)*.11))*H;
        // Keep stubble on the lower cheeks and chin so it never dots over the mouth.
        const y=headY-(.53+row*.03)*H;
        const size=(s.beard==='light-stubble'?.035:.052)*H;
        add(`stubble_dot_${i}`,x,y,fz+(i%2)*.004,size,size*.85,.025,mix(skin,beardColor,shadeMix),'beard');
      }
    } else if(s.beard==='goatee'||s.beard==='soul-patch'){
      const scale=s.beard==='goatee'?1:.46;
      add(s.beard==='goatee'?'goatee_chin':'soul_patch',0,headY-.70*H,fz,.34*H*scale,.31*H*scale,.09,beardColor,'beard');
    } else if(s.beard==='chinstrap'){
      add('chinstrap_under_chin',0,headY-.76*H,fz,.64*H,.13*H,.09,beardColor,'beard');
      [-1,1].forEach(side=>add('chinstrap_jaw_'+side,side*hw*.39,headY-.54*H,fz,.14*H,.36*H,.08,beardColor,'beard',side*.12));
    } else if(s.beard==='sideburns'){
      [-1,1].forEach(side=>add('sideburn_'+side,side*hw*.48,headY-.31*H,fz-.025,.14*H,.43*H,.09,beardColor,'beard'));
    } else if(s.beard==='anchor'){
      add('anchor_chin',0,headY-.72*H,fz,.43*H,.31*H,.09,beardColor,'beard');
      [-1,1].forEach(side=>add('anchor_jaw_'+side,side*hw*.39,headY-.56*H,fz,.12*H,.25*H,.08,beardColor,'beard',side*.10));
    } else {
      const full=s.beard==='full';
      add('beard_chin',0,headY-(full?.68:.68)*H,fz,(full?.80:.90)*H,(full?.39:.35)*H,.10,beardColor,'beard');
      [-1,1].forEach(side=>add('beard_jaw_'+side,side*hw*(full?.36:.35),headY-(full?.51:.55)*H,fz-.015,(full?.19:.20)*H,(full?.34:.22)*H,.085,beardColor,'beard',side*.09));
      if(full){
        [-1,1].forEach(side=>add('beard_cheek_'+side,side*hw*.33,headY-.37*H,fz-.02,.15*H,.16*H,.07,softBeard,'beard',side*.05));
      }
    }
  }
  if(s.moustache!=='none'){
    const mz=faceZ+.125,my=headY-.14*H;
    const dimensions={pencil:[.34,.055],classic:[.45,.105],chevron:[.49,.14],handlebar:[.45,.105],walrus:[.52,.13],horseshoe:[.35,.085]}[s.moustache];
    const [mw,mh]=dimensions;
    add('moustache_left',-.12*H,my,mz,mw*.50*H,mh*H,.065,beardColor,'moustache',-.10);
    add('moustache_right',.12*H,my,mz,mw*.50*H,mh*H,.065,beardColor,'moustache',.10);
    if(s.moustache==='handlebar')[-1,1].forEach(side=>add('handlebar_tip_'+side,side*.32*H,my+.045*H,mz,.13*H,.13*H,.055,beardColor,'moustache',side*.55));
    if(s.moustache==='horseshoe')[-1,1].forEach(side=>add('horseshoe_drop_'+side,side*.34*H,my-.02*H,mz,.065*H,.08*H,.055,beardColor,'moustache',side*.08));
  }
  if(s.cap){
    add('cap_crown',0,topY+.17,headZ+.01,hw*1.02,.38*H,hd*.96,'#E8A847','cap');
    add('cap_brim',0,topY+.02,headZ+hd*.60,hw*.92,.09,.42,'#D4892C','cap');
    add('cap_badge',0,topY+.20,headZ+hd*.54,.20,.16,.045,accent,'cap');
  }
  if(s.headwearStyle==='beanie'){
    add('beanie_crown',0,topY+.13,headZ-.02,hw*1.04,.38*H,hd*1.02,s.topColor,'headwear');
    add('beanie_fold',0,topY-.03,headZ+hd*.06,hw*1.06,.13*H,hd*1.04,s.accentColor,'headwear');
    add('beanie_top',0,topY+.33,headZ-.02,.22,.10,.24,s.accentColor,'headwear');
  } else if(s.headwearStyle==='brimmed-hat'){
    add('hat_crown',0,topY+.18,headZ-.02,hw*.78,.47*H,hd*.82,s.topColor,'headwear');
    add('hat_brim',0,topY-.02,headZ+.02,hw*1.52,.10,hd*1.32,s.accentColor,'headwear');
    add('hat_band',0,topY+.06,headZ+.015,hw*.82,.09,hd*.86,shade(s.topColor,-.16),'headwear');
  }
  const headphoneStyle=s.headphonesStyle==='none'&&s.headphones?'studio':s.headphonesStyle;
  if(headphoneStyle==='studio'||headphoneStyle==='wireless'){
    const slim=headphoneStyle==='wireless';
    const bandColor=headphoneStyle==='studio'?'#202B3D':s.frameColor;
    add('headphone_band_top',0,topY+.25,.10,.82,.13,.17,bandColor,'headphones');
    add('headphone_band_cushion',0,topY+.33,.105,.58,.055,.18,'#AAB7C7','headphones');
    [-1,1].forEach(side=>{
      const cupX=side*(hw*.50+.16),cupW=slim?.23:.31,cupH=slim?.34:.47;
      add('headphone_band_side_'+side,side*.43,topY+.05,.12,.16,.40,.16,bandColor,'headphones',side*-.17);
      add('headphone_arm_'+side,cupX,headY+.27,.20,.16,.34,.16,bandColor,'headphones',side*-.10);
      add('headphone_cup_'+side,cupX,headY+.02,.24,cupW,cupH,.20,bandColor,'headphones');
      add('headphone_pad_'+side,cupX,headY+.02,.36,cupW*.68,cupH*.72,.08,'#8795A8','headphones');
      if(headphoneStyle==='studio')add('headphone_badge_'+side,cupX,headY+.02,.415,.12,.13,.035,accent,'headphones');
    });
  } else if(headphoneStyle==='sport'){
    add('sport_headphone_band',0,5.02,-.24,.88,.12,.13,s.frameColor,'headphones');
    [-1,1].forEach(side=>{
      const earX=side*(hw*.50+.13);
      add('sport_earbud_'+side,earX,headY+.02,.25,.14,.17,.13,'#E8EDF2','headphones');
      add('sport_earbud_stem_'+side,earX,headY-.09,.28,.07,.12,.09,accent,'headphones');
    });
  } else if(headphoneStyle==='neckband'){
    add('neckband_back',0,4.86,-.18,.72,.13,.15,s.frameColor,'headphones');
    [-1,1].forEach(side=>{
      add('neckband_arm_'+side,side*.31,4.96,-.10,.10,.27,.12,s.frameColor,'headphones',side*-.22);
      add('neckband_earbud_'+side,side*.47,5.12,.18,.12,.16,.10,accent,'headphones');
    });
  }
  if(s.glasses){
    [-1,1].forEach(side=>add('glasses_arm_'+side,side*hw*.58,eyeY,.00,.16,.07,.12,s.frameColor,'glasses'));
    add('glasses_bridge',0,eyeY,faceZ+.12,.16,.06,.045,s.frameColor,'glasses');
  }
  const sunglassStyle=s.sunglassesStyle==='none'&&s.sunglasses?'wayfarer':s.sunglassesStyle;
  if(sunglassStyle!=='none'){
    const lenses={wayfarer:[.32,.23],aviator:[.36,.28],round:[.25,.27],sport:[.40,.20],oversized:[.40,.31]}[sunglassStyle]||[.32,.23];
    [-1,1].forEach(side=>{
      const angle=sunglassStyle==='aviator'?side*.10:sunglassStyle==='sport'?side*-.06:0;
      add('sunglass_frame_'+side,side*eyeX,eyeY,faceZ+.125,(lenses[0]+.08)*H,(lenses[1]+.08)*H,.06,s.frameColor,'sunglasses',angle);
      add('sunglass_lens_'+side,side*eyeX,eyeY,faceZ+.165,lenses[0]*H,lenses[1]*H,.055,'#263746','sunglasses',angle);
      add('sunglass_arm_'+side,side*hw*.58,eyeY,.00,.16,.07,.12,s.frameColor,'sunglasses');
    });
    add('sunglass_bridge',0,eyeY,faceZ+.19,.15,.05,.04,s.frameColor,'sunglasses');
  }
  const bagStyle=s.bagStyle==='none'&&s.backpack?'backpack':s.bagStyle;
  if(bagStyle==='backpack'){
    add('backpack_body',0,3.22,-.57,.92,1.18,.36,shade(accent,-.12),'backpack');
    add('backpack_top',0,3.88,-.54,.65,.28,.33,accent,'backpack');
    [-1,1].forEach(side=>{
      seg('backpack_strap_'+side,[side*.76,4.10,.54],[side*.82,2.68,.54],.12,.065,shade(accent,.10),'bag-straps');
      add('backpack_adjuster_'+side,side*.81,3.14,.59,.16,.12,.06,shade(accent,-.04),'bag-straps');
    });
  } else if(bagStyle==='shoulder-bag'){
    seg('shoulder_bag_strap',[-.76,4.10,.56],[.60,2.56,.56],.09,.055,shade(accent,-.10),'bag-straps');
    add('shoulder_bag_body',.62,2.73,.58,.65,.62,.20,shade(accent,-.12),'bag');
    add('shoulder_bag_flap',.62,2.91,.70,.68,.23,.07,accent,'bag');
    add('shoulder_bag_buckle',.62,2.86,.75,.13,.09,.035,'#D9B765','bag');
  } else if(bagStyle==='sling-bag'){
    seg('sling_bag_strap',[-.76,4.11,.56],[.60,2.78,.56],.09,.055,shade(accent,-.10),'bag-straps');
    add('sling_bag_body',.42,3.04,.59,.58,.62,.20,shade(accent,-.12),'bag');
    add('sling_bag_zip',.42,3.33,.72,.46,.045,.04,'#D9B765','bag');
    add('sling_bag_pocket',.42,3.08,.72,.37,.23,.06,accent,'bag');
  }

  // Convert proportions to the requested overall stature; legs pivot at the ground.
  for(const part of parts){
    part.vertices=part.vertices.map(([x,y,z])=>{
      let py=y;
      if(py<2.10) py*=legScale;
      else py+=(legScale-1)*2.10;
      py*=heightScale;
      return [x,py,z];
    });
  }
  return { state:s, parts };
}
