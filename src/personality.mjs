/** Deterministic content engine. No remote AI calls, no guessed physical traits. */
export const DIMENSIONS = ['warmth','humor','reliability','confidence','creativity','calm','energy','leadership','curiosity','empathy'];
export const TRAITS = Object.freeze({
 Helpful:{warmth:2,reliability:1,empathy:2}, Funny:{humor:3,energy:1,warmth:1}, Humour:{humor:3,energy:1,warmth:1}, Humor:{humor:3,energy:1,warmth:1}, Confident:{confidence:3,leadership:1}, Reliable:{reliability:3,calm:1},
 Kind:{warmth:3,empathy:2}, Kindness:{warmth:3,empathy:2}, Creative:{creativity:3,curiosity:1}, Calm:{calm:3,reliability:1}, Fearless:{confidence:3,energy:1}, Leadership:{leadership:3,confidence:1}, Resilience:{reliability:2,confidence:2},
 Intelligent:{curiosity:2,creativity:1}, Adventurous:{energy:2,curiosity:2}, Friendly:{warmth:2,empathy:1,energy:1}, Energetic:{energy:3},
 Patient:{calm:2,empathy:2}, Loyal:{reliability:2,empathy:2}, Thoughtful:{empathy:2,calm:1,curiosity:1}, Inspiring:{leadership:2,confidence:1,warmth:1},
 Humble:{warmth:2,calm:1}, Optimistic:{warmth:1,energy:2,confidence:1}, Determined:{reliability:1,confidence:2,energy:1}, Courageous:{confidence:3,leadership:1},
 Supportive:{empathy:3,warmth:1}, Witty:{humor:2,creativity:1}, Playful:{humor:2,energy:2}, Ambitious:{confidence:2,leadership:1,energy:1},
 Wise:{calm:1,curiosity:2,reliability:1}, Curious:{curiosity:3,creativity:1}, Analytical:{curiosity:2,reliability:1,calm:1}, Innovative:{creativity:3,curiosity:2},
 Organized:{reliability:3}, Disciplined:{reliability:2,calm:2}, Adaptable:{calm:1,creativity:1,confidence:1}, Charismatic:{confidence:2,leadership:1,energy:1},
 Resilient:{confidence:2,reliability:2}, Generous:{empathy:3,warmth:1}, Honest:{reliability:2,warmth:1}, Gentle:{warmth:2,calm:2},
 Passionate:{energy:2,confidence:1}, Resourceful:{creativity:2,reliability:1}, Visionary:{creativity:2,leadership:2}, Cheerful:{warmth:1,humor:1,energy:2},
 Encouraging:{warmth:2,empathy:2,leadership:1}, Dependable:{reliability:3}, Focused:{reliability:2,calm:1}, Collaborative:{warmth:1,empathy:2,leadership:1},
 Empathetic:{empathy:3,warmth:1}, Inclusive:{empathy:2,warmth:1,leadership:1},
 Daring:{confidence:2,energy:2}, Practical:{reliability:2,calm:1}, Artistic:{creativity:3}, Respectful:{empathy:2,calm:1}
});
const ARCHETYPES = Object.freeze([
 {key:'encourager', label:'The Encourager',weights:{warmth:3,empathy:3,energy:1},titles:['The Everyday Uplifter','Captain Kindness','The Bright-Side Builder','Chief Good Energy','The People Champion'],power:'Turns an ordinary day into a moment when everyone feels valued.',theme:'Warm team hero'},
 {key:'spark',label:'The Social Spark',weights:{humor:3,energy:2,warmth:2},titles:['Captain Good Vibes','The Joy Generator','The Smile Catalyst','Chief Cheer','The Positive Pulse'],power:'Can transform tense situations into laughter and renewed momentum.',theme:'Playful office hero'},
 {key:'anchor',label:'The Calm Anchor',weights:{calm:3,reliability:3,empathy:1},titles:['The Steady Captain','The Quiet Force','The Calm Commander','Captain Unshakable','The Trusted Anchor'],power:'Keeps the team grounded and thinking clearly when pressure rises.',theme:'Composed modern mentor'},
 {key:'guardian',label:'The Guardian',weights:{reliability:3,empathy:2,confidence:1},titles:['The Reliable Ally','The Steady Shield','The Everyday Guardian','Chief Dependable','The Trusted Force'],power:'Shows up when it matters and makes difficult days easier.',theme:'Dependable ally'},
 {key:'inventor',label:'The Inventor',weights:{creativity:3,curiosity:3},titles:['The Idea Spark','Captain What If','The Possibility Maker','Chief Imagine','The Future Sketcher'],power:'Finds new possibilities when everyone else sees a dead end.',theme:'Inventive explorer'},
 {key:'leader',label:'The Trailblazer',weights:{leadership:3,confidence:2,energy:1},titles:['The Path Finder','Captain Momentum','The Bold Compass','Chief Take-Charge','The Forward Force'],power:'Gives others the confidence to take the first step.',theme:'Confident team champion'},
 {key:'thinker',label:'The Problem Solver',weights:{curiosity:3,reliability:2,calm:1},titles:['The Clarity Architect','Captain Solutions','The Logic Lantern','Chief Fix-It','The Sharp Mind'],power:'Untangles the tricky questions and helps everyone move forward.',theme:'Thoughtful strategist'},
 {key:'adventurer',label:'The Explorer',weights:{energy:3,curiosity:2,confidence:1},titles:['The Bold Explorer','Captain New Horizons','The Adventure Engine','Chief Discovery','The Next-Step Hero'],power:'Makes unfamiliar challenges feel like exciting possibilities.',theme:'Dynamic explorer'},
 {key:'creator',label:'The Original',weights:{creativity:3,energy:1,warmth:1},titles:['The Creative Current','Captain Color Outside','The Original Thinker','Chief Spark','The Bright Idea'],power:'Brings a fresh angle that makes ordinary ideas extraordinary.',theme:'Expressive creative'},
 {key:'mentor',label:'The Mentor',weights:{calm:2,empathy:3,curiosity:1},titles:['The Patient Guide','Captain Perspective','The Wisdom Bridge','Chief Perspective','The Guiding Light'],power:'Helps people discover the answer without taking away their confidence.',theme:'Approachable guide'},
 {key:'achiever',label:'The Achiever',weights:{confidence:2,reliability:2,leadership:2},titles:['The Finish-Line Force','Captain Can-Do','The Quiet Achiever','Chief Progress','The Mission Maker'],power:'Turns promises into progress, one thoughtful step at a time.',theme:'Modern achiever'},
 {key:'connector',label:'The Connector',weights:{empathy:3,warmth:2,leadership:1},titles:['The Team Thread','Captain Together','The Trust Builder','Chief Connection','The Human Bridge'],power:'Makes every person feel part of something bigger.',theme:'Welcoming team builder'}
]);
export const VARIATIONS = Object.freeze([
 {tone:'Balanced',description:'A faithful, everyday interpretation',outfit:'Outfit_Polo',hair:'Hair_Quiff',gesture:'idle',smile:45,accent:'#2369ad'},
 {tone:'Bold',description:'A confident, expressive take',outfit:'Outfit_Jacket',hair:'Hair_SidePart',gesture:'wave',smile:62,accent:'#614bb8'},
 {tone:'Warm',description:'A friendly, appreciative interpretation',outfit:'Outfit_Casual',hair:'Hair_Curls',gesture:'wave',smile:82,accent:'#d07851'},
 {tone:'Playful',description:'A light-hearted celebration hero',outfit:'Outfit_Casual',hair:'Hair_Quiff',gesture:'wave',smile:100,accent:'#c84c86'},
 {tone:'Polished',description:'A refined professional take',outfit:'Outfit_Polo',hair:'Hair_SidePart',gesture:'idle',smile:28,accent:'#1b587a'}
]);
export function normalizeTraits(traits){return [...new Set((Array.isArray(traits)?traits:[]).filter(x=>typeof x==='string'&&Object.hasOwn(TRAITS,x)))].slice(0,5);}
function scoreArchetype(a,scores){let sum=0,limit=0;for(const [dim,weight] of Object.entries(a.weights)){sum+=(scores[dim]||0)*weight;limit+=weight;}return sum/limit;}
export function buildProfile(traits,description=''){
 const selected=normalizeTraits(traits),score=Object.fromEntries(DIMENSIONS.map(x=>[x,0]));
 for(const t of selected)for(const [dim,n] of Object.entries(TRAITS[t]))score[dim]+=n;
 // Free text adds only EXACT known adjective tokens and never infers physical appearance.
 const freeText=String(description||'').slice(0,240).toLowerCase();let interpreted=[];
 for(const [trait,dims] of Object.entries(TRAITS)){if(selected.includes(trait))continue;
  if(new RegExp(`\\b${trait.toLowerCase()}\\b`,'i').test(freeText)){interpreted.push(trait);for(const [dim,n] of Object.entries(dims))score[dim]+=n*.5;}}
 const archetypes=ARCHETYPES.map(x=>({...x,match:scoreArchetype(x,score)})).sort((a,b)=>b.match-a.match||a.key.localeCompare(b.key));
 return {traits:selected,interpreted:interpreted.slice(0,8),scores:score,archetypes};
}
function alternateIndexes(ordered,k){return ordered[(k)%ordered.length];}
export function makeConcepts(traits,description='',nonce=0){
 const profile=buildProfile(traits,description);if(profile.traits.length<3)throw new Error('Choose at least three personality traits');
 if(!Number.isInteger(nonce)||nonce<0||nonce>10000)throw new Error('Invalid generation number');
 // Distinct archetypes across tones; variety does not come from arbitrary physical attributes.
 const prominent=profile.archetypes.slice(0,5);
 const chosen=[prominent[0],prominent[1],prominent[2],prominent[3],prominent[4]];
 const usedNames=new Set();
 const concepts=VARIATIONS.map((variant,i)=>{
   const archetype=chosen[i];let identity=archetype.titles[(i+nonce)%archetype.titles.length];
   if(usedNames.has(identity))identity=archetype.titles.find(t=>!usedNames.has(t))||identity;
   usedNames.add(identity);
   const other=alternateIndexes(profile.archetypes.filter(a=>a.key!==archetype.key),i);
   const style={outfit:variant.outfit,hair:variant.hair,gesture:variant.gesture,smile:variant.smile,accent:variant.accent};
   return {id:`${archetype.key}-${i}-${nonce}`,tone:variant.tone,identity,archetype:archetype.label,secondaryArchetype:other.label,
    description:variant.description,visualDirection:`${archetype.theme} · ${variant.tone.toLowerCase()} mood`,style,
    tagline:`${identity} — ${archetype.label.toLowerCase().replace(/^the /,'')} with a ${variant.tone.toLowerCase()} spirit.`,
    powers:[archetype.power,other.power,`A special mix of ${profile.traits.slice(0,3).map(x=>x.toLowerCase()).join(', ')} that the people around him appreciate.`]};
 });
 return {profile,concepts};
}
export function sanitizeName(raw){return String(raw||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,50);}
export function greetingFor(name,identity){return `Happy International Men's Day, ${sanitizeName(name)||'you'}! Thank you for the difference you make, every day. — Your ${identity} is worth celebrating.`;}
