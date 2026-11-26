/**
 * Valley/meadow terrain heights, frustum culling, camera view matrix,
 * and 3D lotus petal / stamen / calyx / sepal mesh data builders.
 */

export const TAU = Math.PI * 2;
export const SAKURA_X = 0.0;
export const SAKURA_Z = 8.5;

const S = Math.sin;
const C = Math.cos;

export const LOTUS_PETAL_TIERS = [
  { count: 8, ringNorm: 0.0, len: 3.65, maxW: 1.92, azOffset: 0.18, ringIdx: 0 },
  { count: 8, ringNorm: 0.5, len: 3.40, maxW: 1.76, azOffset: 0.18 + Math.PI / 8, ringIdx: 1 },
  { count: 8, ringNorm: 1.0, len: 3.12, maxW: 1.56, azOffset: 0.18 + Math.PI / 4, ringIdx: 2 },
];

export function valleyCourse(z) {
  const t = Math.max(0, (z - 8.5) / 56.0);
  return 1.55 * S(t * 2.8 + 0.30) * Math.min(1, t * 2.2) - 0.50 * S(t * 6.0) * Math.min(1, t * 1.8);
}

export function meadowFloor(x, z) {
  const off = x - valleyCourse(z);
  const w = Math.abs(off);
  const asym = off < 0 ? 1.07 : 0.94;
  const wall = w * (0.19 + 0.31 * Math.min(1.0, w / 7.2)) * asym;
  const wave = (TAU * z) / 88.0;
  const ridge = 0.11 * w * (S(wave * 5.0 + off * 0.31) + 0.63 * C(wave * 3.0 - off * 0.49));
  const undul =
    0.36 * S(off * 0.88 + wave * 4.0) +
    0.18 * C(off * 1.62 - wave * 7.0) +
    0.22 * S(wave * 4.0 + 0.3);
  const lotusCradle = -0.36 * Math.exp(-(off * off + (z - SAKURA_Z) * (z - SAKURA_Z)) / 7.8);
  const fgMound = 0.34 * Math.exp(-(off * off / 9.0 + ((z - 4.8) * (z - 4.8)) / 5.2));
  const farRise = 0.014 * Math.max(0, z - 12.0);
  return 0.38 + wall + ridge + undul + lotusCradle + fgMound + farRise;
}

export function surroundFloor(x, z) {
  const dx = x - SAKURA_X;
  const dz = z - SAKURA_Z;
  const r = Math.hypot(dx, dz);
  const rise = Math.max(0, r - 3.0) * (0.24 + 0.085 * Math.min(1.0, r / 18.0));
  const wave =
    0.38 * S(dx * 0.42 + dz * 0.36) +
    0.24 * C(dx * 0.68 - dz * 0.54) +
    0.16 * S((dx - dz) * 0.25);
  const cradle = -0.32 * Math.exp(-(r * r) / 7.5);
  return 0.44 + rise + wave + cradle;
}

export function inIntroCorridor(x, z) {
  if (z < 1.15 || z > 58.0) return false;
  const maxX = Math.min(20.0, (z + 0.45) * 1.04);
  return Math.abs(x - valleyCourse(z)) <= maxX;
}

export function insideMeadowFrustum(x, z, allowRoot) {
  const dx = x - SAKURA_X;
  const dz = z - SAKURA_Z;
  const rOrbit = Math.hypot(dx, dz);
  const minR = allowRoot ? 0.45 : 1.25;
  if (rOrbit < minR && z > 6.2 && z < 10.5) return false;
  if (rOrbit <= 36.0) return true;
  if (z < 0.90 || z > 60.0) return false;
  const maxX = Math.min(22.0, (z + 0.55) * 1.15);
  return Math.abs(x - valleyCourse(z)) <= maxX;
}

export function insideStaticView(x, y, z, size) {
  const rOrbit = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
  if (rOrbit <= 36.0) return true;
  const dep = z + 0.35;
  if (dep < 0.65 || dep > 62.0) return false;
  const rad = (size * 1.72 * 0.5) / Math.max(0.65, dep);
  const nxWide = (x * 1.72) / (2.15 * dep);
  const ny = ((y - 2.58) * 1.72) / dep - 0.02;
  if (Math.abs(nxWide) > 1.12 + rad) return false;
  if (ny < -1.14 - rad || ny > 1.18 + rad) return false;
  return true;
}

export function buildViewMatrix(cx, cy, cz, tx, ty, tz) {
  let fx = tx - cx;
  let fy = ty - cy;
  let fz = tz - cz;
  const fLen = Math.hypot(fx, fy, fz) || 1;
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;
  let rx = fz;
  let ry = 0;
  let rz = -fx;
  const rLen = Math.hypot(rx, rz) || 1;
  rx /= rLen;
  rz /= rLen;
  const ux = fy * rz - fz * ry;
  const uy = fz * rx - fx * rz;
  const uz = fx * ry - fy * rx;
  return new Float32Array([rx, ux, fx, ry, uy, fy, rz, uz, fz]);
}

export function buildStamenMeshData(R) {
  const domeRings = 16;
  const domeSegs = 32;
  const domeVerts = (domeRings + 1) * (domeSegs + 1);
  const domeIndices = domeRings * domeSegs * 6;

  const filRings = [
    { count: 32, baseR: 0.58, spanR: 0.36, tipH: 0.90, rNorm: 0.0 },
    { count: 40, baseR: 0.68, spanR: 0.44, tipH: 0.78, rNorm: 0.5 },
    { count: 48, baseR: 0.78, spanR: 0.52, tipH: 0.66, rNorm: 1.0 },
  ];
  const filUSegs = 9;
  const filVertsPer = (filUSegs + 1) * 2;
  const filIndicesPer = filUSegs * 6;
  const totalFils = filRings.reduce((s, r) => s + r.count, 0);

  const calyxRings = 14;
  const calyxSegs = 28;
  const calyxVerts = (calyxRings + 1) * (calyxSegs + 1);
  const calyxIndices = calyxRings * calyxSegs * 6;

  const sepalCount = 8;
  const sepU = 10;
  const sepV = 6;
  const sepVertsPer = (sepU + 1) * (sepV + 1);
  const sepIndicesPer = sepU * sepV * 6;

  const totalVerts = domeVerts + totalFils * filVertsPer + calyxVerts + sepalCount * sepVertsPer;
  const totalIndices = domeIndices + totalFils * filIndicesPer + calyxIndices + sepalCount * sepIndicesPer;
  const data = new Float32Array(totalVerts * 8);
  const indices = new Uint16Array(totalIndices);
  let vc = 0;
  let ic = 0;
  let vBase = 0;

  function pushStVert(u, v, kind, rNorm, az, g1, g2, g3) {
    data[vc++] = u;
    data[vc++] = v;
    data[vc++] = kind;
    data[vc++] = rNorm;
    data[vc++] = az;
    data[vc++] = g1;
    data[vc++] = g2;
    data[vc++] = g3;
  }

  const domeRad = 0.76;
  const domeH = 0.82;
  const domeBaseY = 0.52;
  for (let ir = 0; ir <= domeRings; ir++) {
    const u = ir / domeRings;
    for (let is = 0; is <= domeSegs; is++) {
      const vAng = (is / domeSegs) * TAU;
      pushStVert(u, vAng, 0.0, 0.0, 0.0, domeBaseY, domeRad, domeH);
    }
  }
  const dCols = domeSegs + 1;
  for (let ir = 0; ir < domeRings; ir++) {
    for (let is = 0; is < domeSegs; is++) {
      const i00 = vBase + ir * dCols + is;
      const i10 = vBase + (ir + 1) * dCols + is;
      const i01 = i00 + 1;
      const i11 = i10 + 1;
      indices[ic++] = i00;
      indices[ic++] = i10;
      indices[ic++] = i11;
      indices[ic++] = i00;
      indices[ic++] = i11;
      indices[ic++] = i01;
    }
  }
  vBase += domeVerts;

  for (let ri = 0; ri < filRings.length; ri++) {
    const ring = filRings[ri];
    const azShift = ri * 0.13;
    for (let f = 0; f < ring.count; f++) {
      const az = azShift + (TAU * f) / ring.count + (R() - 0.5) * 0.04;
      const baseR = ring.baseR + (R() - 0.5) * 0.05;
      const spanR = ring.spanR * (0.90 + R() * 0.20);
      const tipH = ring.tipH * (0.88 + R() * 0.22);
      for (let iu = 0; iu <= filUSegs; iu++) {
        const u = iu / filUSegs;
        pushStVert(u, -1.0, 1.0, ring.rNorm, az, baseR, spanR, tipH);
        pushStVert(u, 1.0, 1.0, ring.rNorm, az, baseR, spanR, tipH);
      }
      for (let iu = 0; iu < filUSegs; iu++) {
        const i00 = vBase + iu * 2;
        const i01 = i00 + 1;
        const i10 = i00 + 2;
        const i11 = i00 + 3;
        indices[ic++] = i00;
        indices[ic++] = i10;
        indices[ic++] = i11;
        indices[ic++] = i00;
        indices[ic++] = i11;
        indices[ic++] = i01;
      }
      vBase += filVertsPer;
    }
  }

  const chaliceR = 0.86;
  const stemLen = 2.13;
  for (let ir = 0; ir <= calyxRings; ir++) {
    const u = ir / calyxRings;
    for (let is = 0; is <= calyxSegs; is++) {
      const vAng = (is / calyxSegs) * TAU;
      pushStVert(u, vAng, 2.0, 0.0, 0.0, chaliceR, stemLen, 0.0);
    }
  }
  const cCols = calyxSegs + 1;
  for (let ir = 0; ir < calyxRings; ir++) {
    for (let is = 0; is < calyxSegs; is++) {
      const i00 = vBase + ir * cCols + is;
      const i10 = vBase + (ir + 1) * cCols + is;
      const i01 = i00 + 1;
      const i11 = i10 + 1;
      indices[ic++] = i00;
      indices[ic++] = i10;
      indices[ic++] = i11;
      indices[ic++] = i00;
      indices[ic++] = i11;
      indices[ic++] = i01;
    }
  }
  vBase += calyxVerts;

  const sCols = sepV + 1;
  for (let s = 0; s < sepalCount; s++) {
    const az = 0.18 + Math.PI / 8 + (TAU * s) / sepalCount;
    for (let iu = 0; iu <= sepU; iu++) {
      const u = iu / sepU;
      for (let iv = 0; iv <= sepV; iv++) {
        const v = (iv / sepV) * 2 - 1;
        pushStVert(u, v, 3.0, 0.0, az, 1.25, 0.62, 0.0);
      }
    }
    for (let iu = 0; iu < sepU; iu++) {
      for (let iv = 0; iv < sepV; iv++) {
        const i00 = vBase + iu * sCols + iv;
        const i10 = vBase + (iu + 1) * sCols + iv;
        const i01 = i00 + 1;
        const i11 = i10 + 1;
        indices[ic++] = i00;
        indices[ic++] = i10;
        indices[ic++] = i11;
        indices[ic++] = i00;
        indices[ic++] = i11;
        indices[ic++] = i01;
      }
    }
    vBase += sepVertsPer;
  }

  return { data, indices, indexCount: totalIndices };
}

export function buildSakuraMeshData(R) {
  const U_SEGS = 18;
  const V_SEGS = 12;
  const uCols = U_SEGS + 1;
  const vRows = V_SEGS + 1;
  const totalPetals = LOTUS_PETAL_TIERS.reduce((sum, t) => sum + t.count, 0);
  const vertsPerPetal = uCols * vRows;
  const indicesPerPetal = U_SEGS * V_SEGS * 6;
  const meshData = new Float32Array(totalPetals * vertsPerPetal * 8);
  const indexData = new Uint16Array(totalPetals * indicesPerPetal);
  let vCursor = 0;
  let iCursor = 0;
  let vertOffset = 0;

  function pushVert(u, v, ringNorm, az, len, maxW, pSeed, ringIdx) {
    meshData[vCursor++] = u;
    meshData[vCursor++] = v;
    meshData[vCursor++] = ringNorm;
    meshData[vCursor++] = az;
    meshData[vCursor++] = len;
    meshData[vCursor++] = maxW;
    meshData[vCursor++] = pSeed;
    meshData[vCursor++] = ringIdx;
  }

  for (const tier of LOTUS_PETAL_TIERS) {
    for (let p = 0; p < tier.count; p++) {
      const az = tier.azOffset + (TAU * p) / tier.count + (R() - 0.5) * 0.003;
      const pSeed = R();
      const len = tier.len * (0.992 + R() * 0.016);
      const maxW = tier.maxW * (0.992 + R() * 0.016);

      for (let iu = 0; iu <= U_SEGS; iu++) {
        const u = iu / U_SEGS;
        for (let iv = 0; iv <= V_SEGS; iv++) {
          const v = (iv / V_SEGS) * 2 - 1;
          pushVert(u, v, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);
        }
      }

      for (let iu = 0; iu < U_SEGS; iu++) {
        for (let iv = 0; iv < V_SEGS; iv++) {
          const i00 = vertOffset + iu * vRows + iv;
          const i10 = vertOffset + (iu + 1) * vRows + iv;
          const i01 = i00 + 1;
          const i11 = i10 + 1;

          indexData[iCursor++] = i00;
          indexData[iCursor++] = i10;
          indexData[iCursor++] = i11;

          indexData[iCursor++] = i00;
          indexData[iCursor++] = i11;
          indexData[iCursor++] = i01;
        }
      }
      vertOffset += vertsPerPetal;
    }
  }

  return { meshData, indexData, indexCount: totalPetals * indicesPerPetal };
}
