const CARD_VEHICLE_LAYOUTS = Object.freeze({
  truck: { scale: 1, nativeWidth: 496, minX: 510 },
  bus: { scale: 1, nativeWidth: 420, minX: 586 }
});

/** Fixed card camera and scale keep every supported pose inside the illustration
 * panel, with the figure on the left forecourt and clear of the title, turbine,
 * power callout and vehicle lane. The editor camera remains independently movable. */
export const CARD_CHARACTER_FRAME = Object.freeze({ yaw: .42, pitch: .10, scale: 50, cx: 270, ground: 800 });

export function projectedCardFigureBounds(parts, frame = CARD_CHARACTER_FRAME) {
  const { yaw, pitch, scale, cx, ground } = frame;
  let left=Infinity, right=-Infinity, top=Infinity, bottom=-Infinity;
  for (const part of parts) for (const [x,y,z] of part.vertices) {
    const xx=x*Math.cos(yaw)+z*Math.sin(yaw);
    const zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    const yy=y*Math.cos(pitch)-zz*Math.sin(pitch);
    const px=cx+xx*scale, py=ground-yy*scale;
    left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
  }
  return { left, right, top, bottom };
}

/** Place the selected road vehicle in the right lane, clear of the character's
 * left-side forecourt. Bounds include the full horizontal vehicle silhouette. */
export function cardVehicleLayout(scene) {
  const source=CARD_VEHICLE_LAYOUTS[scene]||CARD_VEHICLE_LAYOUTS.truck;
  const width=source.nativeWidth*source.scale;
  return { ...source, width, maxX: Math.max(source.minX, 1006-width), x:(source.minX+Math.max(source.minX,1006-width))/2 };
}

/** Move only the repeated road markings beneath the stationary source vehicle. */
export function roadMotionAtFrame(frame, frameCount, direction = 'left-to-right') {
  if (!Number.isFinite(frame) || !Number.isInteger(frameCount) || frameCount < 2) {
    throw new TypeError('Road motion needs a valid frame and frame count.');
  }
  const index = ((Math.trunc(frame) % frameCount) + frameCount) % frameCount;
  const progress = index / frameCount;
  const phase = progress * Math.PI * 2;
  const rtl = direction === 'right-to-left';
  return {
    // Preserve the vehicle image and move the repeated road markings only.
    // Eight pixels per frame; the 384 px loop is divisible by the 96 px road
    // pattern, avoiding the old three-position, 32 px jump.
    roadOffset: (rtl ? -1 : 1) * progress * 384,
    progress,
    phase
  };
}
