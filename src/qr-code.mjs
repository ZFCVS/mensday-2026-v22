/*
 * Compact QR Model 2 encoder for the Good Men Studio share card.
 * Byte mode, error correction level L, versions 10–15. The card share payload
 * is compressed before encoding; no QR or share service is contacted.
 */

const VERSION_TABLE = {
  10: { data: [68, 68, 69, 69], ecc: 18, align: [6, 28, 50] },
  11: { data: [81, 81, 81, 81], ecc: 20, align: [6, 30, 54] },
  12: { data: [92, 92, 93, 93], ecc: 24, align: [6, 32, 58] },
  13: { data: [107, 107, 107, 107], ecc: 26, align: [6, 34, 62] },
  14: { data: [115, 115, 115, 116], ecc: 30, align: [6, 26, 46, 66] },
  15: { data: [87, 87, 87, 87, 87, 88], ecc: 22, align: [6, 26, 48, 70] },
  16: { data: [98, 98, 98, 98, 98, 99], ecc: 24, align: [6, 26, 50, 74] },
  17: { data: [107, 108, 108, 108, 108, 108], ecc: 28, align: [6, 30, 54, 78] },
  18: { data: [120, 120, 120, 120, 120, 121], ecc: 30, align: [6, 30, 56, 82] },
  19: { data: [113, 113, 113, 114, 114, 114, 114], ecc: 28, align: [6, 30, 58, 86] },
  20: { data: [107, 107, 107, 108, 108, 108, 108, 108], ecc: 28, align: [6, 34, 62, 90] },
};

function appendBits(bits, value, count) {
  if (count < 0 || value >>> count !== 0) throw new RangeError('QR bit value does not fit');
  for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree) {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

function reedSolomonRemainder(data, divisor) {
  const result = Array(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= gfMultiply(divisor[i], factor);
  }
  return result;
}

function makeDataCodewords(bytes, count) {
  const bits = [];
  appendBits(bits, 0b0100, 4); // Byte mode
  appendBits(bits, bytes.length, 16); // Versions 10–15 use a 16-bit byte count
  for (const byte of bytes) appendBits(bits, byte, 8);
  const capacity = count * 8;
  for (let i = 0; i < Math.min(4, capacity - bits.length); i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const result = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    result.push(byte);
  }
  for (let pad = 0xec; result.length < count; pad ^= 0xec ^ 0x11) result.push(pad);
  return result;
}

function addErrorCorrection(data, version) {
  const { data: blockLengths, ecc: eccLength } = VERSION_TABLE[version];
  const divisor = reedSolomonDivisor(eccLength);
  const dataBlocks = [];
  const eccBlocks = [];
  let offset = 0;
  for (const length of blockLengths) {
    const block = data.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    eccBlocks.push(reedSolomonRemainder(block, divisor));
  }
  const result = [];
  for (let i = 0; i < Math.max(...blockLengths); i++) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
  }
  for (let i = 0; i < eccLength; i++) for (const block of eccBlocks) result.push(block[i]);
  return result;
}

function matrixFor(version) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const functions = Array.from({ length: size }, () => Array(size).fill(false));
  const setFunction = (x, y, dark) => {
    if (x >= 0 && y >= 0 && x < size && y < size) {
      modules[y][x] = Boolean(dark);
      functions[y][x] = true;
    }
  };
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunction(cx + dx, cy + dy, distance !== 2 && distance !== 4);
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  for (let i = 8; i < size - 8; i++) {
    setFunction(i, 6, i % 2 === 0);
    setFunction(6, i, i % 2 === 0);
  }

  const positions = VERSION_TABLE[version].align;
  for (const cy of positions) for (const cx of positions) {
    if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const versionBits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const bit = ((versionBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, bit);
      setFunction(b, a, bit);
    }
  }

  drawFormatBits(modules, functions, 0);
  return { modules, functions, size };
}

function drawFormatBits(modules, functions, mask) {
  const size = modules.length;
  const data = (0b01 << 3) | mask; // Error-correction level L
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const set = (x, y, dark) => {
    modules[y][x] = Boolean(dark);
    functions[y][x] = true;
  };
  for (let i = 0; i <= 5; i++) set(8, i, ((bits >>> i) & 1) !== 0);
  set(8, 7, ((bits >>> 6) & 1) !== 0);
  set(8, 8, ((bits >>> 7) & 1) !== 0);
  set(7, 8, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) set(14 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, ((bits >>> i) & 1) !== 0);
  set(8, size - 8, true);
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return (x * y) % 2 + (x * y) % 3 === 0;
    case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
    case 7: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    default: throw new RangeError('Invalid QR mask');
  }
}

function addData(modules, functions, codewords, mask) {
  const size = modules.length;
  let bitIndex = 0;
  let right = size - 1;
  let upward = true;
  while (right >= 1) {
    if (right === 6) right = 5; // Skip the vertical timing pattern
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        if (functions[y][x]) continue;
        const raw = bitIndex < codewords.length * 8
          ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0
          : false;
        modules[y][x] = raw !== maskBit(mask, x, y);
        bitIndex++;
      }
    }
    right -= 2;
    upward = !upward;
  }
}

function penaltyScore(modules) {
  const size = modules.length;
  let score = 0;
  const lines = [];
  for (let y = 0; y < size; y++) lines.push(modules[y]);
  for (let x = 0; x < size; x++) lines.push(modules.map(row => row[x]));
  for (const line of lines) {
    let runColor = line[0], runLength = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === runColor) runLength++;
      else {
        if (runLength >= 5) score += 3 + runLength - 5;
        runColor = line[i];
        runLength = 1;
      }
    }
    const bits = line.map(bit => bit ? '1' : '0').join('');
    for (let i = 0; i + 11 <= bits.length; i++) {
      const pattern = bits.slice(i, i + 11);
      if (pattern === '10111010000' || pattern === '00001011101') score += 40;
    }
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const value = modules[y][x];
    if (modules[y][x + 1] === value && modules[y + 1][x] === value && modules[y + 1][x + 1] === value) score += 3;
  }
  const darkCount = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  score += Math.floor(Math.abs(darkCount * 20 - size * size * 10) / (size * size)) * 10;
  return score;
}

export function encodeQrText(text) {
  const bytes = new TextEncoder().encode(String(text));
  let version = null;
  for (let candidate = 10; candidate <= 20; candidate++) {
    const capacity = VERSION_TABLE[candidate].data.reduce((sum, length) => sum + length, 0);
    if (bytes.length * 8 + 20 <= capacity * 8) { version = candidate; break; }
  }
  if (version === null) throw new RangeError('Card QR payload is too long; shorten the message or card name.');
  const dataLength = VERSION_TABLE[version].data.reduce((sum, length) => sum + length, 0);
  const data = makeDataCodewords(bytes, dataLength);
  const codewords = addErrorCorrection(data, version);
  const base = matrixFor(version);
  let best = null;
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const modules = base.modules.map(row => row.slice());
    const functions = base.functions.map(row => row.slice());
    addData(modules, functions, codewords, mask);
    drawFormatBits(modules, functions, mask);
    const score = penaltyScore(modules);
    if (score < bestScore) { best = modules; bestMask = mask; bestScore = score; }
  }
  return { version, size: best.length, mask: bestMask, modules: best };
}

