/* ============================================================
   Linkey · QR code encoder (zero dependencies, no network)

   Encodes text into a QR code SVG. Alphanumeric mode
   (0-9, A-Z, space, $%*+-./:) and byte mode (everything else,
   including lowercase). Error correction: level M (~15%).
   ============================================================ */

/* ---- Galois field (256) for Reed-Solomon ---- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
function gmul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}
function polyMultiply(a, b) {
  const out = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      out[i + j] ^= gmul(a[i], b[j]);
  return out;
}
function polyMod(dividend, generator) {
  const result = new Uint8Array(dividend);
  for (let i = 0; i < dividend.length - generator.length + 1; i++) {
    const coef = result[i];
    if (coef !== 0) {
      const lg = LOG[coef];
      for (let j = 1; j < generator.length; j++)
        result[i + j] ^= EXP[lg + generator[j]];
    }
  }
  return result.subarray(dividend.length - generator.length + 1);
}

/* ---- Version / capacity table ---- */
const VERSIONS = [
  [1,  26,  7,  1], [2,  44, 10,  1], [3,  70, 15,  1], [4, 100, 20,  1],
  [5, 134, 26,  1], [6, 172, 36,  1], [7, 212, 48,  1], [8, 256, 60,  1],
  [9, 308, 72,  1], [10, 356, 84,  1], [11, 412, 96,  1], [12, 464, 108, 1],
  [13, 520, 120, 1], [14, 584, 132, 1], [15, 656, 144, 1], [16, 728, 156, 1],
  [17, 808, 168, 2], [18, 896, 180, 2], [19, 988, 196, 2], [20, 1072, 216, 2],
  [21, 1168, 236, 2], [22, 1272, 252, 2], [23, 1372, 272, 2], [24, 1480, 292, 2]
];

function bestVersion(bits) {
  for (const v of VERSIONS) if (bits <= v[1] * 8) return v;
  return VERSIONS[VERSIONS.length - 1];
}

const ALPHANUM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const ALPHANUM_VAL = new Uint8Array(256);
for (let i = 0; i < ALPHANUM_CHARS.length; i++) ALPHANUM_VAL[ALPHANUM_CHARS.charCodeAt(i)] = i + 1; // +1 so 0 = unset

function isAlphaNum(ch) {
  return ALPHANUM_VAL[ch.charCodeAt(0)] !== 0;
}

/* ---- Encode text into {mode, items: [{val, bits}]} ---- */

function encodeText(text) {
  let allAlpha = true;
  for (let i = 0; i < text.length; i++) {
    if (!isAlphaNum(text[i])) { allAlpha = false; break; }
  }
  const items = [];
  if (allAlpha) {
    const upper = text.toUpperCase();
    let i = 0;
    while (i < upper.length) {
      if (i + 1 < upper.length) {
        const c1 = ALPHANUM_VAL[upper.charCodeAt(i)] - 1;
        const c2 = ALPHANUM_VAL[upper.charCodeAt(i + 1)] - 1;
        items.push({ val: c1 * 45 + c2, bits: 11 });
        i += 2;
        continue;
      }
      items.push({ val: ALPHANUM_VAL[upper.charCodeAt(i)] - 1, bits: 6 });
      i++;
    }
    return { mode: 0, items };
  }
  for (let i = 0; i < text.length; i++)
    items.push({ val: text.charCodeAt(i) & 0xff, bits: 8 });
  return { mode: 1, items };
}

/* ---- Reed-Solomon generator ---- */

function buildGenerator(degree) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < degree; i++)
    g = polyMultiply(g, new Uint8Array([1, EXP[i]]));
  return g;
}

/* ---- Module placement ---- */

function getAlignmentPositions(version) {
  const standard = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
    [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
    [6, 28, 48, 70], [6, 30, 52, 74], [6, 32, 56, 78], [6, 34, 60, 82], [6, 30, 54, 78, 102],
    [6, 32, 58, 82, 106], [6, 34, 62, 86, 110], [6, 30, 54, 78, 102, 126],
    [6, 32, 58, 86, 110, 134], [6, 34, 62, 90, 114, 138], [6, 30, 54, 78, 102, 126, 150],
    [6, 32, 58, 86, 114, 142, 158], [6, 34, 62, 90, 118, 146, 162]
  ];
  return standard[version] || [];
}

function placeFinder(matrix, x, y) {
  for (let dy = 0; dy < 7; dy++)
    for (let dx = 0; dx < 7; dx++) {
      const v = (dy === 0 || dy === 6 || dx === 0 || dx === 6) ? 1 :
                (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4) ? 1 : 0;
      matrix[y + dy][x + dx] = v;
    }
}

function placeTiming(matrix, size) {
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === undefined) matrix[6][i] = (i + 1) % 2;
    if (matrix[i][6] === undefined) matrix[i][6] = (i + 1) % 2;
  }
}

function placeAlignment(matrix, positions) {
  for (const py of positions)
    for (const px of positions) {
      if (px === 6 || py === 6 || px < 8 || py < 8 || px > matrix.length - 9 || py > matrix.length - 9) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const v = (Math.abs(dx) === 2 || Math.abs(dy) === 2 || (dx === 0 && dy === 0)) ? 1 : 0;
          matrix[py + dy][px + dx] = v;
        }
    }
}

function placeFormat(matrix, size, mask) {
  const dataBits = [1, 1, 0, 0, 1, 0, 0, (mask >> 1) & 1, mask & 1]; // ec M=11, type 00, fixed 100, mask
  const fixed = [1, 1, 1, 0, 1, 1, 1, 1];
  const allBits = [...dataBits, ...fixed];
  const formatMask = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 15; i++) allBits[i] ^= formatMask[i];

  const s = matrix.length;
  for (let i = 0; i < 8; i++) matrix[8][i] = allBits[i];
  matrix[8][7] = allBits[6];
  matrix[8][8] = allBits[7];
  for (let i = 0; i < 8; i++) matrix[i][8] = allBits[i];
  matrix[7][8] = allBits[6];
  matrix[8][8] = allBits[7];
  for (let i = 0; i < 7; i++) matrix[s - 1 - i][8] = allBits[i];
  for (let i = 0; i < 7; i++) matrix[8][s - 1 - i] = allBits[14 - i];
}

function applyMask(matrix, size, mask) {
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = matrix[y][x];
      if (v === undefined) continue;
      let cond = false;
      switch (mask) {
        case 0: cond = (x + y) % 2 === 0; break;
        case 1: cond = y % 2 === 0; break;
        case 2: cond = x % 3 === 0; break;
        case 3: cond = (x + y) % 3 === 0; break;
        case 4: cond = (Math.floor(x / 2) + Math.floor(y / 3)) % 2 === 0; break;
        case 5: cond = (x * y) % 2 + (x * y) % 3 === 0; break;
        case 6: cond = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
        case 7: cond = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
      }
      if (cond) matrix[y][x] ^= 1;
    }
}

/* ---- Main encoder ---- */

function qrEncode(text, size = 256) {
  const enc = encodeText(text);
  let bitCount = 4; // mode indicator
  const ccBits = enc.mode === 0 ? 9 : 8;
  bitCount += ccBits;
  for (const it of enc.items) bitCount += it.bits;

  const ver = bestVersion(bitCount);
  const version = ver[0];
  const totalDataBytes = ver[1];
  const ecPerBlock = ver[2];
  const ecBlocks = ver[3];

  // Build bit stream
  const bits = [];
  // Mode indicator: alphanumeric=0010, byte=0100
  bits.push(0, 0, enc.mode === 0 ? 1 : 0, enc.mode === 0 ? 0 : 1);

  // Character count indicator
  const cc = enc.items.length;
  for (let i = ccBits - 1; i >= 0; i--) bits.push((cc >> i) & 1);

  // Data
  for (const it of enc.items) {
    for (let b = it.bits - 1; b >= 0; b--) bits.push((it.val >> b) & 1);
  }

  // Terminator + pad to byte boundary
  while (bits.length % 8 !== 0 && bits.length < totalDataBytes * 8) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const pad = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalDataBytes * 8) {
    const p = pad[pi % 2];
    for (let b = 7; b >= 0; b--) bits.push((p >> b) & 1);
    pi++;
  }

  // Convert bits to bytes
  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | (bits[i * 8 + b] || 0);
    dataBytes[i] = byte;
  }

  // Split into blocks and compute EC
  const perBlock = Math.floor(totalDataBytes / ecBlocks);
  const blocks = [];
  let off = 0;
  for (let b = 0; b < ecBlocks; b++) {
    const block = dataBytes.subarray(off, off + perBlock);
    const gen = buildGenerator(ecPerBlock);
    const ec = polyMod(block, gen);
    blocks.push({ data: Array.from(block), ec: Array.from(ec) });
    off += perBlock;
  }

  // Interleave data and EC
  const interleaved = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  const maxEc = Math.max(...blocks.map((b) => b.ec.length));
  for (let i = 0; i < maxData; i++)
    for (const b of blocks) if (i < b.data.length) interleaved.push(b.data[i]);
  for (let i = 0; i < maxEc; i++)
    for (const b of blocks) if (i < b.ec.length) interleaved.push(b.ec[i]);

  const allBits = [];
  for (const b of interleaved)
    for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);

  // Build matrix
  const mSize = 17 + version * 4;
  const matrix = [];
  for (let y = 0; y < mSize; y++) matrix[y] = [];

  placeFinder(matrix, 0, 0);
  placeFinder(matrix, mSize - 7, 0);
  placeFinder(matrix, 0, mSize - 7);
  placeTiming(matrix, mSize);
  placeAlignment(matrix, getAlignmentPositions(version));
  placeFormat(matrix, mSize, 2);

  // Place data (zig-zag)
  let bi = 0;
  let dir = -1;
  let x = mSize - 1, y = mSize - 1;
  const occupied = new Uint8Array(mSize * mSize);
  for (let yy = 0; yy < mSize; yy++)
    for (let xx = 0; xx < mSize; xx++)
      if (matrix[yy][xx] !== undefined) occupied[yy * mSize + xx] = 1;

  while (bi < allBits.length) {
    if (!occupied[y * mSize + x]) matrix[y][x] = allBits[bi++];
    if (dir === -1) {
      if (y > 0) y--; else { x--; dir = 1; }
      if (x === 6) { x--; y = mSize - 1; }
    } else {
      if (y < mSize - 1) y++; else { x--; dir = -1; }
      if (x === 6) { x--; y = 0; }
    }
  }

  applyMask(matrix, mSize, 2);

  // Render SVG
  const cell = size / mSize;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${mSize} ${mSize}" shape-rendering="crispEdges">`;
  svg += `<rect width="${mSize}" height="${mSize}" fill="#ffffff"/>`;
  for (let y = 0; y < mSize; y++)
    for (let x = 0; x < mSize; x++)
      if (matrix[y][x] === 1)
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="#000000"/>`;
  svg += `</svg>`;
  return svg;
}

window.QR = { encode: qrEncode };
