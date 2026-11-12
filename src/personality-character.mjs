import { TRAITS } from './personality.mjs';
import { DEFAULT_FIGURE, normalizeFigure } from './block-figure-engine.mjs';

export const DEFAULT_PERSONALITY = Object.freeze([
  Object.freeze({ trait: 'Helpful', score: 82 }),
  Object.freeze({ trait: 'Confident', score: 78 }),
  Object.freeze({ trait: 'Creative', score: 86 }),
  Object.freeze({ trait: 'Energetic', score: 80 }),
  Object.freeze({ trait: 'Fearless', score: 76 })
]);

// The on-screen catalogue uses one plain-language label for each quality.
// Older spellings remain recognized internally by TRAITS for saved links.
export const FEATURED_TRAIT_NAMES = Object.freeze([
  'Helpful','Kind','Confident','Creative','Energetic','Fearless','Reliable','Empathetic','Curious','Adaptable'
]);
// Exactly 50 distinct, gender-neutral qualities: 10 featured choices and 40 more.
// Keep the original 46 labels in their historical positions because compact
// saved card links encode those indexes. New labels are appended for compatibility.
export const TRAIT_NAMES = Object.freeze([
  'Helpful','Kind','Friendly','Supportive','Encouraging','Collaborative','Respectful','Loyal','Honest','Generous','Patient','Thoughtful','Humble','Gentle',
  'Funny','Witty','Playful','Cheerful','Charismatic',
  'Reliable','Calm','Confident','Fearless','Resilient','Determined','Ambitious','Optimistic','Leadership','Inspiring','Wise','Focused','Disciplined','Organized',
  'Creative','Innovative','Curious','Intelligent','Analytical','Artistic','Visionary','Resourceful','Practical','Adaptable','Adventurous','Energetic','Passionate',
  'Empathetic','Inclusive','Courageous','Dependable'
]);
export const TRAIT_CATEGORIES = Object.freeze({
  care: Object.freeze(['Helpful','Kind','Friendly','Supportive','Encouraging','Collaborative','Respectful','Loyal','Honest','Generous','Patient','Thoughtful','Humble','Gentle','Empathetic','Inclusive']),
  character: Object.freeze(['Reliable','Calm','Confident','Fearless','Resilient','Determined','Ambitious','Optimistic','Leadership','Inspiring','Wise','Focused','Disciplined','Organized','Courageous','Dependable']),
  creativity: Object.freeze(['Creative','Innovative','Curious','Intelligent','Analytical','Artistic','Visionary','Resourceful','Practical','Adaptable']),
  energy: Object.freeze(['Adventurous','Energetic','Passionate']),
  joy: Object.freeze(['Funny','Witty','Playful','Cheerful','Charismatic'])
});
export const TRAIT_CATEGORY_LABELS = Object.freeze({
  all: 'All qualities', care: 'Care & connection', character: 'Confidence & character',
  creativity: 'Creativity & curiosity', energy: 'Energy & initiative', joy: 'Joy & humour'
});
export const TRAIT_CATEGORY_BY_NAME = Object.freeze(Object.fromEntries(
  Object.entries(TRAIT_CATEGORIES).flatMap(([category,traits])=>traits.map(trait=>[trait,category]))
));
const DIMENSION_ORDER = ['warmth','empathy','confidence','leadership','creativity','curiosity','energy','humor','reliability','calm'];
const DIMENSION_STYLE = Object.freeze({
  warmth: 'welcome', empathy: 'welcome', confidence: 'bold', leadership: 'bold',
  creativity: 'inventive', curiosity: 'inventive', energy: 'dynamic', humor: 'playful',
  reliability: 'steady', calm: 'steady'
});
const STYLE = Object.freeze({
  welcome: { outfit: ['overshirt','tee','casual-shirt','cardigan','blazer'], gesture: 'wave', expression: 'smile',
    palette: ['#176A76','#F17B63','#263D54'], tagline: 'Makes people feel seen, supported and ready to move forward.', accessory: 'pin' },
  bold: { outfit: ['bomber','blazer','denim-jacket','zip-jacket','overshirt'], gesture: 'hands-on-hips', expression: 'focused',
    palette: ['#244F91','#F2A34A','#263D54'], tagline: 'Brings calm conviction to the moments that need a first step.', accessory: 'watch' },
  inventive: { outfit: ['utility','hoodie','sweater','denim-jacket','bomber'], gesture: 'welcome', expression: 'grin',
    palette: ['#674EA3','#63B6A3','#263D54'], tagline: 'Finds an original route and makes others want to explore it.', accessory: 'backpack' },
  dynamic: { outfit: ['jersey','bomber','zip-jacket','tee'], gesture: 'victory', expression: 'grin',
    palette: ['#2369D4','#F5C95D','#263D54'], tagline: 'Turns good energy into shared momentum.', accessory: 'headphones' },
  playful: { outfit: ['hoodie','jersey','sweater','tee'], gesture: 'dance', expression: 'grin',
    palette: ['#8B4D99','#F3C25E','#263D54'], tagline: 'Brings a lighter touch and helps the whole team enjoy the win.', accessory: 'headphones' },
  steady: { outfit: ['blazer','overshirt','cardigan','casual-shirt','tee'], gesture: 'idle', expression: 'calm',
    palette: ['#2F675E','#D8B579','#263D54'], tagline: 'Keeps his word and helps the team find solid ground.', accessory: 'watch' }
});
const HAIR_VARIANTS = ['quiff','curls','crop','fade','locs','long'];
const VARIATION_TONES = ['Signature','Expressive','Refined'];
const VARIATION_POSES = ['wave','hands-on-hips','victory','welcome','crossed-arms','flex','dance','thumbs-up','idle'];
const NAMES = Object.freeze({
  welcome: ['Kindred Spark','Goodwill Builder','The Welcome Maker','Brightside Ally','The People Champion'],
  bold: ['Bold Compass','Pathstarter','The Forward Force','Steady Trailblazer','The First Mover'],
  inventive: ['Brightforge','Idea Pilot','The Wonder Builder','Curiosity Craft','The New Angle'],
  dynamic: ['Momentum Maker','Joy Engine','The Energy Ally','Brightside Dynamo','The Spark Runner'],
  playful: ['The Joy Generator','Captain Good Energy','The Smile Catalyst','The Playful Original','The Cheerful Current'],
  steady: ['The Steady Force','Quiet Catalyst','The Reliable Light','Calm Momentum','The Trusted Anchor']
});
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));

export function normalizePersonality(qualities) {
  if (!Array.isArray(qualities) || qualities.length!==5) throw new TypeError('Choose exactly five personality qualities');
  const cleaned = qualities.map(item => {
    const trait = typeof item === 'string' ? item : item?.trait;
    const score = typeof item === 'string' ? 75 : Number(item?.score);
    if (!Object.hasOwn(TRAITS, trait)) throw new TypeError(`Unknown personality quality: ${trait}`);
    if (!Number.isFinite(score)) throw new TypeError(`Invalid intensity for ${trait}`);
    return { trait, score: Math.round(clamp(score,0,100)) };
  });
  if (new Set(cleaned.map(x=>x.trait)).size !== 5) throw new TypeError('Choose five different personality qualities');
  return cleaned;
}

export function calculatePersonalitySignals(qualities) {
  const profile = normalizePersonality(qualities);
  const numerators = Object.fromEntries(Object.keys(DIMENSION_STYLE).map(key=>[key,0]));
  const denominators = Object.fromEntries(Object.keys(DIMENSION_STYLE).map(key=>[key,0]));
  for (const {trait,score} of profile) {
    for (const [dimension,weight] of Object.entries(TRAITS[trait])) {
      numerators[dimension] += score * weight;
      denominators[dimension] += weight;
    }
  }
  const signals = Object.fromEntries(Object.keys(DIMENSION_STYLE).map(key=>[
    key, denominators[key] ? Math.round(numerators[key] / denominators[key]) : 0
  ]));
  const ranked = Object.keys(signals).sort((a,b)=>signals[b]-signals[a] || DIMENSION_ORDER.indexOf(a)-DIMENSION_ORDER.indexOf(b));
  const clusterScores = Object.fromEntries(Object.keys(STYLE).map(key=>[key,0]));
  for (const [dimension,value] of Object.entries(signals)) clusterScores[DIMENSION_STYLE[dimension]] += value;
  const clusters = Object.keys(clusterScores).sort((a,b)=>clusterScores[b]-clusterScores[a] || Object.keys(STYLE).indexOf(a)-Object.keys(STYLE).indexOf(b));
  const dominant = Math.max(...Object.values(signals))===0 ? 'steady' : clusters[0];
  const secondary = dominant===clusters[0] ? clusters[1] : clusters[0];
  return { qualities: profile, signals, ranked, clusters, clusterScores, dominant, secondary };
}

function hashSeed(profile, seed) {
  let hash = 2166136261;
  const source = `${profile.qualities.map(q=>`${q.trait}:${q.score}`).join('|')}#${seed}`;
  for (let i=0;i<source.length;i++) hash = Math.imul(hash ^ source.charCodeAt(i),16777619) >>> 0;
  return hash >>> 0;
}

function suggestionExplanation(profile, signals, style, variantIndex) {
  const strongest = [...profile.qualities].sort((a,b)=>b.score-a.score || a.trait.localeCompare(b.trait)).slice(0,3);
  const lead = profile.ranked[variantIndex % profile.ranked.length];
  const leadScore = signals[lead];
  const names = strongest.map(x=>`${x.trait} ${x.score}`).join(', ');
  const influence=leadScore<35
    ? `The strongest visual signal is low (${lead} ${leadScore}/100), so pose and clothing stay as neutral alternatives.`
    : `${style.expression} expression and ${style.gesture.replaceAll('-',' ')} gesture reflect the ${lead} signal (${leadScore}/100).`;
  return `This look blends ${names}. ${influence} ${style.outfit} clothing and its accent colour are styling suggestions.`;
}

function derivedExpression(signals) {
  const smileIntensity=Math.round((signals.warmth*.42)+(signals.empathy*.18)+(signals.humor*.22)+(signals.energy*.18));
  let expression='calm';
  if(signals.humor>=78&&smileIntensity>=62)expression='grin';
  else if(signals.confidence>=70&&signals.warmth<45&&signals.empathy<45)expression='focused';
  else if(smileIntensity>=28)expression='smile';
  return {expression,smileIntensity};
}

export function generateCharacterVariations(qualities, seed = 0) {
  const profile = calculatePersonalitySignals(qualities);
  if (!Number.isInteger(seed) || seed < 0 || seed > 1_000_000) throw new TypeError('Generation seed must be an integer from 0 to 1,000,000');
  const randomSeed = hashSeed(profile,seed);
  const baseStyle = STYLE[profile.dominant];
  const secondaryStyle = STYLE[profile.secondary];
  const expressionResult=derivedExpression(profile.signals);
  const maxSignal=Math.max(...Object.values(profile.signals));
  const names = NAMES[profile.dominant];
  const start = randomSeed % names.length;
  const coreRank = profile.ranked.map(d=>DIMENSION_STYLE[d]);
  const styleQueue = [profile.dominant, profile.secondary, ...coreRank, ...Object.keys(STYLE)];
  const usedPoses = new Set();
  const usedNames = new Set();
  const variations = VARIATION_TONES.map((tone,index) => {
    const cluster = styleQueue[index] || profile.dominant;
    const chosenStyle = STYLE[cluster] || baseStyle;
    const suggestedPose = maxSignal<35 ? 'idle' : (index===0 ? baseStyle.gesture : chosenStyle.gesture);
    const rawPose = suggestedPose;
    const pose = !usedPoses.has(rawPose) ? rawPose : VARIATION_POSES.find(candidate=>!usedPoses.has(candidate));
    usedPoses.add(pose);
    let name = names[(start+index)%names.length];
    if (usedNames.has(name)) name = names.find(candidate=>!usedNames.has(candidate));
    usedNames.add(name);
    const palette = index === 0 ? baseStyle.palette : (index === 1 ? secondaryStyle.palette : chosenStyle.palette);
    const selectedHair = HAIR_VARIANTS[(randomSeed + index * 2) % HAIR_VARIANTS.length];
    const accent = palette[1];
    const figure = normalizeFigure({
      ...DEFAULT_FIGURE,
      name,
      tagline: index === 0 ? baseStyle.tagline : chosenStyle.tagline,
      qualities: profile.qualities.map(q=>q.trait).join(', '),
      skin: DEFAULT_FIGURE.skin,
      age: DEFAULT_FIGURE.age,
      build: DEFAULT_FIGURE.build,
      height: DEFAULT_FIGURE.height,
      headShape: DEFAULT_FIGURE.headShape,
      beard: 'none',
      hairstyle: selectedHair,
      expression: expressionResult.expression,
      smileIntensity: expressionResult.smileIntensity,
      outfit: chosenStyle.outfit[index % chosenStyle.outfit.length],
      pose,
      handStyle: pose === 'thumbs-up' ? 'thumbs-up' : 'open',
      topColor: palette[0], accentColor: accent, pantsColor: palette[2],
      pin: maxSignal>=35 && chosenStyle.accessory === 'pin',
      watch: maxSignal>=35 && chosenStyle.accessory === 'watch',
      headphonesStyle: maxSignal>=35 && chosenStyle.accessory === 'headphones' ? 'studio' : 'none',
      bagStyle: maxSignal>=35 && chosenStyle.accessory === 'backpack' ? 'backpack' : 'none',
      personalityProfile: {
        qualities: profile.qualities,
        signals: profile.signals,
        seed,
        variation: index,
        dominant: profile.dominant,
        secondary: profile.secondary
      }
    });
    const supporting = profile.ranked.slice(1,4).map(dim=>DIMENSION_STYLE[dim]);
    const usedStyle = index===0 ? baseStyle : (STYLE[supporting[index-1]] || chosenStyle);
    return {
      id: `${profile.dominant}-${seed}-${index}`,
      index,
      tone,
      name,
      dominant: profile.dominant,
      secondary: profile.secondary,
      visualDirection: `${chosenStyle.outfit[index % chosenStyle.outfit.length]} · ${expressionResult.expression} · ${pose.replaceAll('-',' ')}`,
      explanation: `${suggestionExplanation(profile,profile.signals,{...usedStyle,expression:expressionResult.expression,gesture:pose,outfit:chosenStyle.outfit[index % chosenStyle.outfit.length]},index)} Hair style is a seed-controlled option and does not assume background or body type.`,
      signals: profile.signals,
      figure
    };
  });
  return { profile, seed, variations };
}

export function makeGreeting(recipient, identity) {
  const name = String(recipient || '').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,50);
  return `Happy International Men’s Day${name ? `, ${name}` : ''}! ${identity} reflects the strengths you bring every day.`;
}
