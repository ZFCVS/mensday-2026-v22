const ascii=text=>[...text].map(character=>character.charCodeAt(0));

// Keep six bits of green for better fidelity in the ZF blue vehicle gradients
// and the cool gray road while preserving a compact histogram.
function colorKey(red,green,blue){return((red>>>3)<<11)|((green>>>2)<<5)|(blue>>>3);}
function splitPalette(histogram,maxColors=256){
  const colors=[...histogram].map(([key,count])=>({r:(key>>>11)&31,g:(key>>>5)&63,b:key&31,count}));
  if(!colors.length)colors.push({r:0,g:0,b:0,count:1});
  const bounds=box=>{
    const min=[31,31,31],max=[0,0,0];let weight=0;
    for(const color of box){const channels=[color.r,color.g,color.b];weight+=color.count;for(let i=0;i<3;i++){min[i]=Math.min(min[i],channels[i]);max[i]=Math.max(max[i],channels[i]);}}
    const ranges=max.map((value,index)=>value-min[index]);return{min,max,ranges,weight};
  };
  const boxes=[colors];
  while(boxes.length<maxColors){
    let selected=-1,selectedAxis=0,best=-1;
    boxes.forEach((box,index)=>{
      if(box.length<2)return;const stats=bounds(box);
      const axis=stats.ranges.indexOf(Math.max(...stats.ranges));const score=stats.ranges[axis]*Math.sqrt(stats.weight);
      if(score>best){best=score;selected=index;selectedAxis=axis;}
    });
    if(selected<0)break;
    const box=boxes[selected];box.sort((a,b)=>[a.r,a.g,a.b][selectedAxis]-[b.r,b.g,b.b][selectedAxis]);
    const total=box.reduce((sum,color)=>sum+color.count,0);let accumulated=0,split=1;
    for(let i=0;i<box.length-1;i++){accumulated+=box[i].count;if(accumulated>=total/2){split=i+1;break;}}
    boxes.splice(selected,1,box.slice(0,split),box.slice(split));
  }
  const palette=[];
  for(const box of boxes){let r=0,g=0,b=0,count=0;for(const color of box){r+=color.r*color.count;g+=color.g*color.count;b+=color.b*color.count;count+=color.count;}
    palette.push([Math.round((r/count)*8+4),Math.round((g/count)*4+2),Math.round((b/count)*8+4)]);
  }
  while(palette.length<256)palette.push(palette.at(-1));
  return palette;
}
function makePaletteLookup(palette){
  const representatives=palette.map(([r,g,b])=>[r>>>3,g>>>2,b>>>3]),lookup=new Uint8Array(65536);
  for(let key=0;key<65536;key++){
    const r=key>>>11,g=(key>>>5)&63,b=key&31;let bestIndex=0,bestDistance=Infinity;
    representatives.forEach(([pr,pg,pb],index)=>{const dr=r-pr,dg=g-pg,db=b-pb,distance=2*dr*dr+4*dg*dg+db*db;if(distance<bestDistance){bestDistance=distance;bestIndex=index;}});
    lookup[key]=bestIndex;
  }
  return lookup;
}
function lzw(indices){
  const clear=256,end=257;let next=258,size=9,bitBuffer=0,bits=0;const compressed=[];
  const write=code=>{bitBuffer|=code<<bits;bits+=size;while(bits>=8){compressed.push(bitBuffer&255);bitBuffer>>>=8;bits-=8;}};
  const dictionary=new Map();write(clear);if(!indices.length){write(end);if(bits)compressed.push(bitBuffer&255);return compressed;}
  let prefix=indices[0];
  for(let i=1;i<indices.length;i++){
    const symbol=indices[i],key=(prefix<<8)|symbol,existing=dictionary.get(key);
    if(existing!==undefined){prefix=existing;continue;}
    write(prefix);
    if(next<4096){
      dictionary.set(key,next++);
      // The decoder is one dictionary entry behind the encoder. Delay the
      // width increase until the next emitted code needs the extra bit.
      if(next>(1<<size)&&size<12)size++;
    }
    else{write(clear);dictionary.clear();next=258;size=9;}
    prefix=symbol;
  }
  write(prefix);write(end);if(bits)compressed.push(bitBuffer&255);return compressed;
}
function appendSubBlocks(output,data){
  for(let offset=0;offset<data.length;offset+=255){const length=Math.min(255,data.length-offset);output.push(length);for(let i=0;i<length;i++)output.push(data[offset+i]);}
  output.push(0);
}

/** Encode a looping GIF from a frame-render callback without retaining all frames in memory. */
export async function encodeAnimatedGif({width,height,frameCount,delayCentiseconds=10,renderFrame,priorityRect=null}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>65535||height>65535)throw new RangeError('GIF dimensions are invalid.');
  if(!Number.isInteger(frameCount)||frameCount<2||typeof renderFrame!=='function')throw new TypeError('GIF export needs at least two rendered frames.');
  // Build a two-part palette: the card gets 112 colours, while 144 are reserved
  // for the vehicle lane. The detailed EU truck has a broad blue gradient; a
  // balanced whole-card palette produced visible bands and color seams there.
  const histogram=new Map(),vehicleHistogram=new Map(),sampleStride=16,expectedLength=width*height*4;
  const priority={x:Math.max(0,Math.floor(Number(priorityRect?.x)||0)),y:Math.max(0,Math.floor(Number(priorityRect?.y)||0)),width:Math.floor(Number(priorityRect?.width)||0),height:Math.floor(Number(priorityRect?.height)||0)};
  priority.width=Math.max(0,Math.min(width-priority.x,priority.width));priority.height=Math.max(0,Math.min(height-priority.y,priority.height));
  for(let frame=0;frame<frameCount;frame++){
    const pixels=await renderFrame(frame);if(pixels?.length!==expectedLength)throw new TypeError('A GIF frame has the wrong pixel dimensions.');
    for(let i=0;i<expectedLength;i+=sampleStride){const key=colorKey(pixels[i],pixels[i+1],pixels[i+2]);histogram.set(key,(histogram.get(key)||0)+1);}
    for(let y=priority.y;y<priority.y+priority.height;y++)for(let x=priority.x;x<priority.x+priority.width;x++){
      const i=(y*width+x)*4,key=colorKey(pixels[i],pixels[i+1],pixels[i+2]);vehicleHistogram.set(key,(vehicleHistogram.get(key)||0)+1);
    }
  }
  const fullPalette=splitPalette(histogram,112),vehiclePalette=priority.width&&priority.height?splitPalette(vehicleHistogram,144):[],palette=[];
  for(const color of [...vehiclePalette,...fullPalette])if(!palette.some(existing=>existing[0]===color[0]&&existing[1]===color[1]&&existing[2]===color[2]))palette.push(color);
  while(palette.length<256)palette.push(palette.at(-1)||[0,0,0]);
  const lookup=makePaletteLookup(palette),output=[...ascii('GIF89a'),width&255,width>>>8,height&255,height>>>8,0xF7,0,0];
  for(const [r,g,b] of palette)output.push(r,g,b);
  output.push(0x21,0xFF,0x0B,...ascii('NETSCAPE2.0'),0x03,0x01,0x00,0x00,0x00);
  const delay=Math.max(2,Math.min(65535,Math.round(delayCentiseconds)));
  for(let frame=0;frame<frameCount;frame++){
    const pixels=await renderFrame(frame),indices=new Uint8Array(width*height);
    for(let i=0,p=0;i<expectedLength;i+=4,p++)indices[p]=lookup[colorKey(pixels[i],pixels[i+1],pixels[i+2])];
    output.push(0x21,0xF9,0x04,0x00,delay&255,delay>>>8,0,0,0x2C,0,0,0,0,width&255,width>>>8,height&255,height>>>8,0,8);
    appendSubBlocks(output,lzw(indices));
  }
  output.push(0x3B);return new Blob([Uint8Array.from(output)],{type:'image/gif'});
}
