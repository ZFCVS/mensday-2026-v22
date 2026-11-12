/** Phase advances uniformly by frame, so the first and last GIF frames meet cleanly. */
export function windTurbinePhaseAtFrame(frame, frameCount, turns = 1, offset = -Math.PI / 2) {
  if (!Number.isFinite(frame) || !Number.isFinite(frameCount) || frameCount < 1) return offset;
  const position = ((frame % frameCount) + frameCount) % frameCount;
  return offset + (position / frameCount) * Math.PI * 2 * turns;
}

function bladePolygon(cx, cy, angle, scale) {
  const dx = Math.cos(angle), dy = Math.sin(angle), px = -dy, py = dx;
  const stations = [[10, 5.2], [28, 7.2], [59, 4.6], [82, 0], [60, -3.1], [29, -5.6], [10, -4.4]];
  return stations.map(([length, width]) => [
    cx + (dx * length + px * width) * scale,
    cy + (dy * length + py * width) * scale
  ]);
}

/** Side-on three-blade turbine. Only the rotor changes angle; the tower stays planted. */
export function drawWindTurbine(context, x, baseY, scale = 1, phase = -Math.PI / 2) {
  const hubY = baseY - 128 * scale;

  // Tapered tower with cool lit and shadow faces for a dimensional card backdrop.
  context.beginPath();
  context.moveTo(x - 2.5 * scale, baseY);
  context.lineTo(x + 2.5 * scale, baseY);
  context.lineTo(x + 1.6 * scale, hubY + 8 * scale);
  context.lineTo(x - 1.6 * scale, hubY + 8 * scale);
  context.closePath();
  context.fillStyle = '#E7F1F3';
  context.fill();
  context.strokeStyle = 'rgba(93,125,143,.72)';
  context.lineWidth = Math.max(1, scale * 1.2);
  context.stroke();

  // Nacelle is horizontal and remains aligned to the turbine tower.
  context.fillStyle = '#D4E4E9';
  context.fillRect(x - 10 * scale, hubY - 4.5 * scale, 21 * scale, 9 * scale);
  context.strokeStyle = 'rgba(68,101,121,.7)';
  context.lineWidth = Math.max(1, scale);
  context.strokeRect(x - 10 * scale, hubY - 4.5 * scale, 21 * scale, 9 * scale);

  for (let blade = 0; blade < 3; blade++) {
    const angle = phase + blade * Math.PI * 2 / 3;
    const points = bladePolygon(x, hubY, angle, scale);
    const shadow = points.map(([px, py]) => [px + 2 * scale, py + 2 * scale]);
    context.beginPath();
    context.moveTo(shadow[0][0], shadow[0][1]);
    for (let i = 1; i < shadow.length; i++) context.lineTo(shadow[i][0], shadow[i][1]);
    context.closePath();
    context.fillStyle = 'rgba(61,91,108,.24)';
    context.fill();

    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1]);
    context.closePath();
    const bladeGradient = context.createLinearGradient(x, hubY, x + Math.cos(angle) * 82 * scale, hubY + Math.sin(angle) * 82 * scale);
    bladeGradient.addColorStop(0, '#FBFDFE');
    bladeGradient.addColorStop(.56, '#E6F0F3');
    bladeGradient.addColorStop(1, '#C5DCE4');
    context.fillStyle = bladeGradient;
    context.fill();
    context.strokeStyle = 'rgba(101,139,158,.72)';
    context.lineWidth = Math.max(1, scale * 1.1);
    context.stroke();
  }

  context.beginPath();
  context.ellipse(x, hubY, 7 * scale, 7 * scale, 0, 0, Math.PI * 2);
  context.fillStyle = '#EAF3F6';
  context.fill();
  context.strokeStyle = '#7896A6';
  context.lineWidth = Math.max(1, scale * 1.25);
  context.stroke();
  context.beginPath();
  context.ellipse(x, hubY, 2.2 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
  context.fillStyle = '#7F9BA8';
  context.fill();
}
