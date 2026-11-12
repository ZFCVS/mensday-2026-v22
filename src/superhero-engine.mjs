import { DEFAULT_FIGURE, normalizeFigure } from './block-figure-engine.mjs';
import { calculatePersonalitySignals, normalizePersonality } from './personality-character.mjs';

const GROUPS = Object.freeze({
  guardian: new Set(['helpful','kind','friendly','supportive','encouraging','collaborative','respectful','loyal','honest','generous','patient','thoughtful','humble','gentle','empathetic','inclusive']),
  sentinel: new Set(['brave','fearless','courageous','confident','resilient','determined','leadership','ambitious','inspiring']),
  innovator: new Set(['creative','innovative','curious','intelligent','analytical','artistic','visionary','resourceful','adaptable']),
  anchor: new Set(['reliable','dependable','calm','wise','focused','disciplined','organized','practical']),
  spark: new Set(['funny','witty','playful','cheerful','charismatic','optimistic']),
  momentum: new Set(['energetic','passionate','adventurous'])
});
const GROUP_LABEL = Object.freeze({guardian:'Ally',sentinel:'Guardian',innovator:'Inventor',anchor:'Sentinel',spark:'Catalyst',momentum:'Dynamo'});
const PAIRS = Object.freeze({
  'anchor+anchor':['The Steady Shield','The Trusted Sentinel','The Surestep Guardian'],
  'guardian+guardian':['The Heart Protector','The Kindness Sentinel','The Goodwill Guardian'],
  'innovator+innovator':['The Idea Vanguard','The Brightforge Innovator','The Wonder Builder'],
  'momentum+momentum':['The Momentum Maker','The Energy Guardian','The Forward Force'],
  'sentinel+sentinel':['The Fearless Guardian','The Unshaken Sentinel','The Courage Keeper'],
  'spark+spark':['Captain Good Vibes','The Joy Catalyst','The Brightside Dynamo'],
  'guardian+sentinel':['The Fearless Guardian','The Courageous Ally','The Braveheart Sentinel'],
  'guardian+innovator':['The Heart Protector','The Kindred Innovator','The Brightforge Ally'],
  'anchor+guardian':['The Steady Shield','The Trusted Sentinel','The Surestep Ally'],
  'innovator+momentum':['The Momentum Maker','Captain Brightspark','The Future Runner'],
  'momentum+spark':['Captain Good Vibes','The Joy Catalyst','The Radiant Dynamo'],
  'anchor+sentinel':['The Resolve Keeper','The Unshaken Guardian','The Steadfast Defender'],
  'guardian+spark':['The Goodwill Spark','The Cheerful Protector','The Kindness Catalyst'],
  'innovator+sentinel':['The Idea Vanguard','The Fearless Inventor','The Future Guardian'],
  'anchor+innovator':['The Thoughtful Engineer','The Steady Pathfinder','The Insight Sentinel'],
  'anchor+spark':['The Brightside Anchor','The Calm Catalyst','The Steady Spark']
});
const SUIT_PALETTES = Object.freeze([
  {suit:'#174F8C',accent:'#F2B34C',cape:'#D94C48',pants:'#18395E'},
  {suit:'#673C87',accent:'#68C8B1',cape:'#F2B34C',pants:'#3C315C'},
  {suit:'#147A75',accent:'#F2E6CE',cape:'#3153A4',pants:'#164A57'}
]);
export const HERO_LOOK_PRESETS=Object.freeze({
  'shield-guardian':{label:'Shield guardian',heroSuitStyle:'classic',heroEyeMaskStyle:'shield-frame',heroEmblem:'shield',heroCapeStyle:'flight',heroGloveStyle:'cuff',heroBootStyle:'armored',topColor:'#174F8C',accentColor:'#D94C48',pantsColor:'#18395E',heroCapeColor:'#D94C48',heroMaskColor:'#F2B34C'},
  'armored-tech':{label:'Armoured tech suit',heroSuitStyle:'armored',heroEyeMaskStyle:'armored-eyeport',heroEmblem:'gear',heroCapeStyle:'long',heroGloveStyle:'gauntlet',heroBootStyle:'armored',topColor:'#973E35',accentColor:'#F2B34C',pantsColor:'#3C3445',heroCapeColor:'#2D3848',heroMaskColor:'#D9A85B'},
  'radiant-hero':{label:'Radiant suit',heroSuitStyle:'classic',heroEyeMaskStyle:'radiant-band',heroEmblem:'sun',heroCapeStyle:'short',heroGloveStyle:'cuff',heroBootStyle:'speed',topColor:'#147A75',accentColor:'#F2E6CE',pantsColor:'#164A57',heroCapeColor:'#3153A4',heroMaskColor:'#E7B53D'},
  'thunder-guardian':{label:'Thunder suit',heroSuitStyle:'armored',heroEyeMaskStyle:'thunder-crest',heroEmblem:'bolt',heroCapeStyle:'long',heroGloveStyle:'gauntlet',heroBootStyle:'tall',topColor:'#3153A4',accentColor:'#E8B440',pantsColor:'#26395B',heroCapeColor:'#6D4D93',heroMaskColor:'#E8B440'},
  'web-pattern':{label:'Web-pattern suit',heroSuitStyle:'tech',heroEyeMaskStyle:'web-frame',heroEmblem:'bolt',heroCapeStyle:'split',heroGloveStyle:'cuff',heroBootStyle:'speed',topColor:'#174F8C',accentColor:'#D94C48',pantsColor:'#193A63',heroCapeColor:'#D94C48',heroMaskColor:'#C94B42'},
  'shadow-cowl':{label:'Shadow cowl',heroSuitStyle:'armored',heroEyeMaskStyle:'shadow-cowl',heroEmblem:'star',heroCapeStyle:'long',heroGloveStyle:'gauntlet',heroBootStyle:'tall',topColor:'#27334B',accentColor:'#8992A1',pantsColor:'#1E293D',heroCapeColor:'#202735',heroMaskColor:'#303849'},
  'formal-coat':{label:'Formal coat',heroSuitStyle:'formal-coat',heroEyeMaskStyle:'none',heroEmblem:'sun',heroCapeStyle:'short',heroGloveStyle:'cuff',heroBootStyle:'speed',topColor:'#0A4D91',accentColor:'#B77A2C',pantsColor:'#27344A',heroCapeColor:'#153F71',heroMaskColor:'#D9A85B'}
});
const GROUP_HERO_LOOKS=Object.freeze({
  guardian:['radiant-hero','shield-guardian','formal-coat'],sentinel:['shield-guardian','thunder-guardian','shadow-cowl'],
  innovator:['armored-tech','web-pattern','shield-guardian'],anchor:['shadow-cowl','formal-coat','thunder-guardian'],
  spark:['web-pattern','radiant-hero','formal-coat'],momentum:['thunder-guardian','radiant-hero','armored-tech']
});
const GROUP_INDEX = Object.freeze({guardian:0,sentinel:1,innovator:2,anchor:0,spark:1,momentum:2});
const GROUP_POSES = Object.freeze({
  guardian:['welcome','hand-over-heart','hands-clasped-front'],sentinel:['wide-stance','victory','flex'],
  innovator:['pointing','victory','hands-on-hips'],anchor:['crossed-arms','hands-behind-back','wide-stance'],
  spark:['dance','wave','victory'],momentum:['victory','wide-stance','dance']
});
const GROUP_EXPRESSIONS = Object.freeze({guardian:['smile','joyful','determined'],sentinel:['determined','focused','grin'],innovator:['focused','excited','smile'],anchor:['calm','smile','determined'],spark:['excited','joyful','grin'],momentum:['excited','determined','grin']});

function traitId(item) {
  return String(item?.id ?? item?.trait ?? '').trim().toLocaleLowerCase();
}

/** Validate score data and count each quality id exactly once. Duplicate entries
 * collapse deterministically to their highest rating; they can never earn two slots. */
export function getSuperheroEligibility(qualities) {
  if (!Array.isArray(qualities)) throw new TypeError('Personality qualities must be an array');
  const unique = new Map();
  for (const item of qualities) {
    const id = traitId(item);
    const score = item?.score;
    if (!id) throw new TypeError('Each personality quality needs an id or trait name');
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
      throw new TypeError(`Invalid intensity for ${item?.trait || item?.id || 'quality'}: use a finite score from 0 to 100`);
    }
    if (!unique.has(id) || score > unique.get(id).score) {
      unique.set(id, {id, trait:String(item?.trait ?? item?.id).trim(), score});
    }
  }
  const eligibleQualities = [...unique.values()].filter(quality => quality.score >= 80 && quality.score <= 100);
  return {eligibleQualities, count:eligibleQualities.length, unlocked:eligibleQualities.length >= 2};
}

export function isSuperheroUnlocked(qualities) {
  return getSuperheroEligibility(qualities).unlocked;
}

/** Apply one original power-character design family while leaving the selected face and body intact. */
export function applySuperheroLookPreset(currentFigure,presetId){
  const preset=HERO_LOOK_PRESETS[presetId];
  if(!preset)throw new TypeError('Choose a supported superpower character style');
  const current=normalizeFigure(currentFigure);
  const {label,...gear}=preset;
  return normalizeFigure({...current,...gear,heroMode:true,heroLookPreset:presetId,outfit:'hero-suit'});
}

function qualityGroup(trait) {
  const id=String(trait).toLocaleLowerCase();
  return Object.keys(GROUPS).find(group=>GROUPS[group].has(id)) || 'guardian';
}

function identityNames(qualities) {
  const leaders=[...qualities].sort((a,b)=>b.score-a.score||a.trait.localeCompare(b.trait)).slice(0,2);
  const groups=leaders.map(q=>qualityGroup(q.trait)).sort();
  const key=groups.join('+');
  if(PAIRS[key])return PAIRS[key];
  const first=GROUP_LABEL[groups[0]||'guardian'],second=GROUP_LABEL[groups[1]||groups[0]||'sentinel'];
  return [`The ${first} ${second}`,'The Brightside Guardian',`The ${second} Ally`];
}

function powersFor(qualities, identityName) {
  const leaders=[...qualities].sort((a,b)=>b.score-a.score||a.trait.localeCompare(b.trait)).slice(0,2);
  const first=leaders[0]?.trait||'Courage',second=leaders[1]?.trait||'Care';
  return [
    `${first} gives ${identityName} the courage to step forward; ${second} turns that courage into help people can feel.`,
    `He brings ${first} to difficult moments and uses ${second} to leave people stronger than he found them.`,
    `When ${first} meets ${second}, he can rally a team, solve the next challenge and make sure nobody faces it alone.`
  ];
}

/** Create three repeatable, individually editable voxel power-character looks. Appearance
 * traits are copied from baseFigure; personality changes only hero styling. */
export function generateSuperheroVariations(qualities, seed=0, baseFigure=DEFAULT_FIGURE) {
  const profile=calculatePersonalitySignals(normalizePersonality(qualities));
  const eligibility=getSuperheroEligibility(profile.qualities);
  if(!eligibility.unlocked) throw new Error('Two distinct personality qualities must each score 80 or higher to unlock superpower characters.');
  if(!Number.isInteger(seed)||seed<0||seed>1_000_000) throw new TypeError('Generation seed must be an integer from 0 to 1,000,000');
  const names=identityNames(eligibility.eligibleQualities);
  const rankedQualities=[...eligibility.eligibleQualities].sort((a,b)=>b.score-a.score||a.trait.localeCompare(b.trait));
  const groups=rankedQualities.map(q=>qualityGroup(q.trait));
  const dominant=groups[0]||'guardian',secondary=groups[1]||dominant;
  const pairKey=[dominant,secondary].sort().join('+');
  const paletteBase=(GROUP_INDEX[dominant]+GROUP_INDEX[secondary])%SUIT_PALETTES.length;
  const variations=names.map((name,index)=>{
    const palette=SUIT_PALETTES[(paletteBase+seed+index)%SUIT_PALETTES.length];
    const heroLookPreset=(GROUP_HERO_LOOKS[dominant]||GROUP_HERO_LOOKS.guardian)[index];
    const look=HERO_LOOK_PRESETS[heroLookPreset];
    const {label:lookLabel,...lookGear}=look;
    const paletteIndex=(paletteBase+seed+index+(palette.suit===look.topColor?1:0))%SUIT_PALETTES.length;
    const variationPalette=SUIT_PALETTES[paletteIndex];
    const visualGear=(seed+index)%2===0?lookGear:{...lookGear,topColor:variationPalette.suit,accentColor:variationPalette.accent,pantsColor:variationPalette.pants,heroCapeColor:variationPalette.cape,heroMaskColor:variationPalette.accent};
    const powers=powersFor(eligibility.eligibleQualities,name);
    const figure=normalizeFigure({
      ...baseFigure,
      name,
      tagline:`A ${GROUP_LABEL[dominant].toLocaleLowerCase()} shaped by ${eligibility.eligibleQualities.map(q=>q.trait).join(' and ')}.`,
      topColor:look.topColor||palette.suit,accentColor:look.accentColor||palette.accent,pantsColor:look.pantsColor||palette.pants,
      outfit:'hero-suit',footwear:'boot',pose:GROUP_POSES[dominant][index],expression:GROUP_EXPRESSIONS[dominant][index],mouthStyle:'auto',
      heroMode:true,heroIdentityId:`${pairKey}-${seed}-${index}`,heroIdentityName:name,heroPower:powers[0],
      ...visualGear,heroLookPreset,
      personalityProfile:{qualities:profile.qualities,seed,variation:index,dominant:profile.dominant,secondary:profile.secondary}
    });
    return {
      id:figure.heroIdentityId,index,name,identityName:name,
      visualDirection:`${lookLabel} · ${figure.heroEyeMaskStyle==='none'?'open face':figure.heroEyeMaskStyle.replaceAll('-',' ')} · ${figure.heroCapeStyle} cape · ${figure.pose.replaceAll('-',' ')}`,
      explanation:`A distinct block-character superpower concept influenced by ${eligibility.eligibleQualities.map(q=>`${q.trait} ${q.score}`).join(' and ')}. Face, skin, age, hair and body proportions remain independent choices.`,
      powers,figure
    };
  });
  return {seed,profile,qualifyingQualities:eligibility.eligibleQualities,variations};
}

export function applySuperheroIdentity(currentFigure, identity) {
  if(!identity?.figure?.heroMode) throw new TypeError('Choose a generated superpower identity');
  const current=normalizeFigure(currentFigure);
  const hero=identity.figure;
  return normalizeFigure({
    ...current,
    name:hero.name,tagline:hero.tagline,
    heroMode:true,heroIdentityId:hero.heroIdentityId,heroIdentityName:hero.heroIdentityName,
    heroPower:hero.heroPower,
    heroSuitStyle:hero.heroSuitStyle,heroCapeStyle:hero.heroCapeStyle,heroCapeColor:hero.heroCapeColor,
    heroEyeMaskStyle:hero.heroEyeMaskStyle,heroMaskColor:hero.heroMaskColor,heroLookPreset:hero.heroLookPreset,heroEmblem:hero.heroEmblem,heroGloveStyle:hero.heroGloveStyle,heroBootStyle:hero.heroBootStyle,
    outfit:'hero-suit',topColor:hero.topColor,accentColor:hero.accentColor,pantsColor:hero.pantsColor,
    footwear:'boot',pose:hero.pose,expression:hero.expression,
    personalityProfile:current.personalityProfile||hero.personalityProfile
  });
}
