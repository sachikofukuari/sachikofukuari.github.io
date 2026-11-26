/**
 * Builds the 3D valley/360 meadow foliage & wildflower particle clouds,
 * stamen pollen glints, ambient dust/fireflies, 100 petal-landing wildflowers,
 * and packs typed arrays for O(N) camera-depth radix sorting.
 */
import {
  LOTUS_PETAL_TIERS,
  SAKURA_X,
  SAKURA_Z,
  TAU,
  inIntroCorridor,
  insideMeadowFrustum,
  insideStaticView,
  meadowFloor,
  surroundFloor,
  valleyCourse,
} from "./geometry.js";

const S = Math.sin;
const C = Math.cos;

function generatePetalLanderSlots(R) {
  const slots = [];
  const outerCoords = [
    [0.48, -0.30],
    [0.56, 0.28],
    [0.68, -0.20],
    [0.76, 0.24],
    [0.87, -0.02],
  ];
  const midCoords = [
    [0.52, -0.26],
    [0.63, 0.26],
    [0.75, -0.16],
    [0.86, 0.14],
  ];
  const innerCoords = [
    [0.66, -0.26],
    [0.76, 0.24],
    [0.87, -0.06],
    [0.72, 0.02],
  ];

  let seq = 0;
  for (let p = 0; p < 8; p++) {
    const azOut = LOTUS_PETAL_TIERS[0].azOffset + (TAU * p) / 8;
    for (let j = 0; j < outerCoords.length; j++) {
      const [u0, v0] = outerCoords[j];
      const flip = (p + j) % 2 ? 1 : -1;
      slots.push({
        ringIdx: 0,
        az: azOut,
        u: u0 + (R() - 0.5) * 0.05,
        v: v0 * flip + (R() - 0.5) * 0.07,
        wantBlue: seq++ % 3 === 1,
      });
    }

    const azMid = LOTUS_PETAL_TIERS[1].azOffset + (TAU * p) / 8;
    for (let j = 0; j < midCoords.length; j++) {
      const [u0, v0] = midCoords[j];
      const flip = (p + j) % 2 ? -1 : 1;
      slots.push({
        ringIdx: 1,
        az: azMid,
        u: u0 + (R() - 0.5) * 0.05,
        v: v0 * flip + (R() - 0.5) * 0.07,
        wantBlue: seq++ % 3 === 2,
      });
    }

    const azIn = LOTUS_PETAL_TIERS[2].azOffset + (TAU * p) / 8;
    const innerCount = p % 2 === 0 ? 4 : 3;
    for (let j = 0; j < innerCount; j++) {
      const [u0, v0] = innerCoords[j];
      const flip = (p + j) % 2 ? 1 : -1;
      slots.push({
        ringIdx: 2,
        az: azIn,
        u: u0 + (R() - 0.5) * 0.04,
        v: v0 * flip + (R() - 0.5) * 0.06,
        wantBlue: seq++ % 3 === 0,
      });
    }
  }
  return slots;
}

export async function buildMeadowData({ lowEnd, R, yieldSlice }) {
  const particles = [];
  function pushParticle(x, y, z, size, tile, pSeed, light, role, e0, e1, e2, e3) {
    particles.push([x, y, z, size, tile, pSeed, light, role, e0, e1, e2, e3]);
  }

  // 1. Lush Dark-Green Siltora V-Valley Foliage Carpet + Foreground Mossy Mound + 360 Amphitheater Surround
  const pushGrass = (x, y, z, size, litScale, roleVal) => {
    if (!insideStaticView(x, y, z, size)) return;
    if (R() < 0.10) return;
    const tile = R() < 0.58 ? 8 + Math.floor(R() * 4) : Math.floor(R() * 8);
    const ang = Math.atan2(z - SAKURA_Z, x - SAKURA_X);
    const r = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
    pushParticle(x, y, z, size, tile, R(), litScale, roleVal, ang, r, 0.52 + R() * 0.72, 0.0);
  };

  const foliageCount = lowEnd ? 4050 : 5420;
  for (let i = 0; i < foliageCount; i++) {
    if (!(i & 511)) await yieldSlice();
    const z = 0.95 + Math.pow(R(), 1.12) * 51.0;
    const side = R() < 0.5 ? -1 : 1;
    const maxOff = Math.min(side > 0 ? 18.8 : 20.5, (z + 0.55) * (side > 0 ? 0.98 : 1.06));
    const off = side * Math.pow(R(), 1.02) * maxOff;
    const x = off + valleyCourse(z);
    if (!insideMeadowFrustum(x, z, true)) continue;

    const y = meadowFloor(x, z) - 0.14 + R() * 0.16;
    const patch = 0.5 + 0.5 * S(off * 1.18 + S(z * 0.28) * 1.8) * C(z * 0.34 + off * 0.38);
    const lit = 0.28 + 0.92 * Math.pow(patch, 1.65) + 0.22 * R();
    const depthMul = z < 2.4 ? 0.86 : z > 14 ? 1.0 + (z - 14) * 0.032 : 1.0;
    const size = (0.65 + R() * 1.18) * depthMul;
    pushGrass(x, y, z, size, lit, 0.0);
  }

  // Dedicated lush foreground central mossy mound framing the lotus root
  const moundCount = lowEnd ? 500 : 720;
  for (let i = 0; i < moundCount; i++) {
    if (!(i & 511)) await yieldSlice();
    const z = 2.6 + R() * 5.0;
    const off = (R() * 2 - 1) * 3.6;
    const x = off + valleyCourse(z);
    if (!insideMeadowFrustum(x, z, true)) continue;
    const y = meadowFloor(x, z) + 0.02 + R() * 0.18;
    const patch = 0.5 + 0.5 * S(off * 1.4) * C(z * 0.65);
    const lit = 0.32 + 0.85 * Math.pow(patch, 1.45) + 0.20 * R();
    const size = 0.64 + R() * 0.94;
    pushGrass(x, y, z, size, lit, 0.0);
  }

  // Targeted grass patches filling bottom-left, bottom-right, mid-left, around & behind lotus
  for (let i = 0; i < (lowEnd ? 120 : 180); i++) {
    const z = 1.80 + R() * 1.30;
    const x = -3.20 + R() * 2.00 + valleyCourse(z);
    const y = meadowFloor(x, z) - 0.14 + R() * 0.28;
    pushGrass(x, y, z, 0.68 + R() * 0.82, 0.42 + R() * 0.65, 0.0);
  }
  for (let i = 0; i < (lowEnd ? 170 : 260); i++) {
    const z = 0.95 + R() * 1.60;
    const x = 0.75 + R() * 2.10 + valleyCourse(z);
    const y = meadowFloor(x, z) - 0.34 + R() * 0.38;
    pushGrass(x, y, z, 0.64 + R() * 0.78, 0.44 + R() * 0.65, 0.0);
  }
  for (let i = 0; i < (lowEnd ? 140 : 220); i++) {
    const z = 3.10 + R() * 4.50;
    const x = -7.40 + R() * 4.20 + valleyCourse(z);
    const y = meadowFloor(x, z) - 0.10 + R() * 0.26;
    pushGrass(x, y, z, 0.70 + R() * 0.90, 0.44 + R() * 0.68, 0.0);
  }
  for (let i = 0; i < (lowEnd ? 110 : 160); i++) {
    const z = 6.00 + R() * 4.60;
    const x = (R() * 2 - 1) * 3.50;
    if (Math.hypot(x - SAKURA_X, z - SAKURA_Z) < 0.85) continue;
    const y = meadowFloor(x, z) + 0.04 + R() * 0.24;
    pushGrass(x, y, z, 0.66 + R() * 0.84, 0.48 + R() * 0.68, 0.0);
  }
  for (let i = 0; i < (lowEnd ? 100 : 160); i++) {
    const z = 10.0 + R() * 10.0;
    const x = (R() * 2 - 1) * 3.80 + valleyCourse(z);
    const y = meadowFloor(x, z) + 0.12 + R() * 0.26;
    pushGrass(x, y, z, 0.72 + R() * 0.88, 0.44 + R() * 0.66, 0.0);
  }
  for (let i = 0; i < (lowEnd ? 110 : 160); i++) {
    const z = 1.55 + R() * 0.90;
    const x = -1.65 + R() * 2.70 + valleyCourse(z);
    const y = meadowFloor(x, z) + 0.08 + R() * 0.30;
    pushGrass(x, y, z, 0.64 + R() * 0.78, 0.44 + R() * 0.66, 0.0);
  }
  for (let i = 0; i < (lowEnd ? 120 : 180); i++) {
    const z = 11.5 + R() * 9.5;
    const x = (R() * 2 - 1) * 5.20 + valleyCourse(z);
    const y = meadowFloor(x, z) + 0.06 + R() * 0.24;
    pushGrass(x, y, z, 0.72 + R() * 0.92, 0.46 + R() * 0.68, 0.0);
  }

  // Dense lower-foreground grass carpet sealing every bottom edge gap on initial POV
  const lowerFgGrass = lowEnd ? 280 : 450;
  for (let i = 0; i < lowerFgGrass; i++) {
    const z = 1.05 + R() * 1.75;
    const x = (R() * 2 - 1) * 4.20 + valleyCourse(z);
    const y = meadowFloor(x, z) - 0.22 + R() * 0.28;
    pushGrass(x, y, z, 0.72 + R() * 0.88, 0.42 + R() * 0.66, 0.0);
  }

  // Uniform 360-degree area-distributed foliage blanket surrounding the intro valley (covers all tab views)
  const surroundGrassCount = lowEnd ? 2600 : 4200;
  const rMinSq = 4.2 * 4.2;
  const rSpanSq = 34.0 * 34.0 - rMinSq;
  for (let i = 0; i < surroundGrassCount; i++) {
    if (!(i & 255)) await yieldSlice();
    const theta = R() * TAU;
    const rr = Math.sqrt(rMinSq + R() * rSpanSq);
    const x = SAKURA_X + C(theta) * rr;
    const z = SAKURA_Z + S(theta) * rr;
    if (inIntroCorridor(x, z) || !insideMeadowFrustum(x, z, false)) continue;
    const y = surroundFloor(x, z) - 0.04 + R() * 0.26;
    const size = (0.76 + R() * 1.08) * (1.0 + Math.max(0, rr - 10) * 0.032);
    pushGrass(x, y, z, size, 0.36 + 0.74 * R(), 0.0);
  }

  // Dedicated grass blanket directly behind the first POV (covers left screen of #contact & #works)
  const rearIntroGrass = lowEnd ? 900 : 1500;
  for (let i = 0; i < rearIntroGrass; i++) {
    if (!(i & 255)) await yieldSlice();
    const x = (R() * 2 - 1) * 22.0;
    const z = -25.0 + R() * 26.4;
    if (inIntroCorridor(x, z) || !insideMeadowFrustum(x, z, false)) continue;
    const y = surroundFloor(x, z) - 0.04 + R() * 0.28;
    const rOrbit = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
    const size = (0.80 + R() * 1.12) * (1.0 + Math.max(0, rOrbit - 10) * 0.034);
    pushGrass(x, y, z, size, 0.36 + 0.76 * R(), 0.0);
  }

  // Extra rear-left transition belt foliage so new flowerbeds sit on lush dark greenery
  const rearLeftFoliage = lowEnd ? 350 : 550;
  for (let i = 0; i < rearLeftFoliage; i++) {
    const x = -18.0 + R() * 24.0;
    const z = -7.0 + R() * 11.0;
    if (inIntroCorridor(x, z) || !insideMeadowFrustum(x, z, false)) continue;
    const y = surroundFloor(x, z) - 0.06 + R() * 0.26;
    pushGrass(x, y, z, 0.76 + R() * 0.96, 0.36 + 0.76 * R(), 0.0);
  }

  // #contact bottom-left gap foliage (x in [3.8, 9.6], z in [-1.8, 5.8], off-screen from Intro)
  const contactBottomLeftFoliage = lowEnd ? 240 : 380;
  for (let i = 0; i < contactBottomLeftFoliage; i++) {
    const x = 3.8 + R() * 5.8;
    const z = -1.8 + R() * 7.6;
    if (inIntroCorridor(x, z) || !insideMeadowFrustum(x, z, false)) continue;
    const y = surroundFloor(x, z) - 0.04 + R() * 0.26;
    pushGrass(x, y, z, 0.78 + R() * 0.98, 0.36 + 0.76 * R(), 0.0);
  }

  // #contact right-of-lotus shoulder foliage (x in [-9.4, -3.6], z in [9.6, 16.8], lower-left Intro hillside)
  const contactRightLotusFoliage = lowEnd ? 200 : 320;
  for (let i = 0; i < contactRightLotusFoliage; i++) {
    const x = -9.4 + R() * 5.8;
    const z = 9.6 + R() * 7.2;
    if (!insideMeadowFrustum(x, z, false)) continue;
    const y = meadowFloor(x, z) + 0.04 + R() * 0.26;
    pushGrass(x, y, z, 0.76 + R() * 0.94, 0.38 + 0.72 * R(), 0.0);
  }

  // 2. Siltora-Style Cascading Diagonal Wildflower Streams (Abundant Pastel Pink + Scattered Pastel Blue)
  const beds = [];
  const streamDensity = lowEnd ? 0.52 : 0.72;

  function addValleyRibbon(zStart, zEnd, steps, offFn, sideSign, kChoices, wBase, dBase, litBoost) {
    const count = Math.max(4, Math.round(steps * streamDensity));
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const z = zStart + (zEnd - zStart) * u + (R() - 0.5) * 1.1;
      const off = sideSign * offFn(u) + (R() - 0.5) * (0.45 + z * 0.04);
      const bx = off + valleyCourse(z);
      if (!insideMeadowFrustum(bx, z, false)) continue;
      const distScale = z > 12 ? 1.0 + (z - 12) * 0.036 : 1.0;
      const k = kChoices[Math.floor(R() * kChoices.length)];
      beds.push([bx, z, k, wBase * distScale * (0.85 + R() * 0.35), dBase * distScale * (0.85 + R() * 0.35), litBoost, 0]);
    }
  }

  const leftPalette = [0, 1, 2, 3, 5, 6, 7];
  const rightPalette = [0, 2, 4, 5, 1, 6, 7];

  // Left canyon wall sweeping cascades
  addValleyRibbon(3.6, 48.0, 32, (u) => 2.5 + Math.pow(u, 0.92) * 17.5 + S(u * 5.2) * 1.2, -1, leftPalette, 0.94, 1.26, 0.95);
  addValleyRibbon(8.5, 52.0, 26, (u) => 5.0 + Math.pow(u, 0.85) * 18.0 + C(u * 4.4) * 1.4, -1, [2, 3, 6, 0, 5], 0.98, 1.32, 0.96);
  addValleyRibbon(2.0, 24.0, 18, (u) => 1.7 + u * 7.2 + S(u * 4.0) * 0.7, -1, [0, 1, 4, 6, 7], 0.86, 1.08, 0.94);
  addValleyRibbon(14.0, 44.0, 16, (u) => 8.2 + u * 12.2 - S(u * 3.8 + 0.5) * 1.1, -1, [1, 5, 6, 2, 7], 0.92, 1.22, 0.96);

  // Right canyon wall iconic S-curved cascades
  addValleyRibbon(3.6, 48.0, 34, (u) => 2.4 + Math.pow(u, 0.95) * 18.0 - S(u * 6.2 + 0.4) * 1.5, 1, rightPalette, 0.96, 1.30, 0.95);
  addValleyRibbon(9.0, 52.0, 26, (u) => 5.2 + Math.pow(u, 0.86) * 18.2 + S(u * 4.8) * 1.3, 1, [4, 2, 7, 1, 5], 0.98, 1.34, 0.96);
  addValleyRibbon(2.0, 25.0, 18, (u) => 1.9 + u * 7.4 - C(u * 3.8) * 0.7, 1, [1, 3, 6, 0, 7], 0.88, 1.10, 0.94);
  addValleyRibbon(14.0, 44.0, 16, (u) => 8.5 + u * 12.0 + C(u * 3.6 + 0.3) * 1.2, 1, [0, 4, 7, 3, 6], 0.92, 1.22, 0.96);
  addValleyRibbon(12.0, 44.0, 20, (u) => 11.5 + u * 10.5 + S(u * 3.0) * 0.9, 1, [0, 6, 2, 7, 1], 1.10, 1.35, 0.96);

  // Foreground low curtain + targeted beds around and behind lotus + #contact gap anchors
  beds.push(
    [-3.0, 2.8, 2, 0.98, 0.88, 0.94],
    [3.1, 2.9, 4, 0.98, 0.88, 0.94],
    [-1.3, 2.3, 5, 0.82, 0.72, 0.94],
    [1.4, 2.4, 1, 0.82, 0.72, 0.94],
    [-0.45, 3.6, 0, 0.74, 0.68, 0.92],
    [0.50, 3.7, 6, 0.74, 0.68, 0.92],
    [-2.2, 4.4, 6, 0.90, 0.85, 0.94],
    [2.3, 4.5, 2, 0.90, 0.85, 0.94],
    [-3.9, 6.8, 2, 1.05, 1.18, 0.93],
    [4.0, 6.9, 4, 1.05, 1.18, 0.93],
    [-1.6, 5.4, 3, 0.76, 0.72, 0.93],
    [1.7, 5.5, 7, 0.76, 0.72, 0.93],
    [-4.6, 4.0, 1, 1.02, 0.95, 0.95],
    [4.8, 4.2, 5, 1.02, 0.95, 0.95],
    [-0.85, 1.9, 2, 0.92, 0.80, 0.95],
    [0.9, 2.0, 7, 0.92, 0.80, 0.95],
    [-2.1, 1.9, 0, 0.98, 0.86, 0.95],
    [2.2, 2.0, 3, 0.98, 0.86, 0.95],
    [-3.9, 2.5, 6, 1.06, 0.94, 0.95],
    [4.0, 2.6, 4, 1.06, 0.94, 0.95],
    [-0.1, 2.6, 1, 0.86, 0.78, 0.94],
    [-2.9, 3.6, 7, 1.02, 0.94, 0.95],
    [3.0, 3.7, 5, 1.02, 0.94, 0.95],
    [-1.2, 4.5, 2, 0.90, 0.84, 0.94],
    [1.3, 4.6, 6, 0.90, 0.84, 0.94],
    [-5.5, 5.2, 0, 1.12, 1.04, 0.95],
    [5.6, 5.3, 4, 1.12, 1.04, 0.95],
    [-2.35, 2.25, 2, 0.92, 0.75, 0.95, -0.04],
    [-1.85, 2.10, 6, 0.88, 0.72, 0.95, -0.06],
    [-2.85, 2.55, 0, 0.96, 0.78, 0.95, -0.05],
    [0.88, 1.45, 6, 0.74, 0.56, 0.95, -0.18],
    [1.20, 1.32, 1, 0.76, 0.54, 0.95, -0.22],
    [1.62, 1.48, 7, 0.82, 0.58, 0.95, -0.28],
    [2.05, 1.75, 3, 0.88, 0.66, 0.95, -0.32],
    [2.48, 2.12, 5, 0.92, 0.72, 0.95, -0.28],
    [-3.95, 3.65, 3, 0.96, 0.86, 0.95, 0.04],
    [-4.75, 4.55, 6, 1.04, 0.94, 0.96, 0.06],
    [-5.55, 5.45, 1, 1.08, 0.98, 0.96, 0.04],
    [-6.45, 6.40, 7, 1.12, 1.02, 0.96, 0.02],
    [-1.55, 6.85, 0, 0.86, 0.78, 0.95, 0.16],
    [1.55, 6.85, 4, 0.86, 0.78, 0.95, 0.24],
    [-2.35, 8.15, 6, 0.94, 0.90, 0.95, 0.22],
    [2.35, 8.15, 2, 0.94, 0.90, 0.95, 0.34],
    [-1.50, 8.55, 1, 0.76, 0.74, 0.95, 0.24],
    [1.50, 8.55, 7, 0.76, 0.74, 0.95, 0.36],
    [0.0, 6.45, 2, 0.92, 0.68, 0.94, 0.14],
    [-1.85, 10.6, 5, 1.05, 0.95, 0.95, 0.30],
    [0.0, 10.8, 0, 1.15, 0.95, 0.94, 0.42],
    [1.85, 10.6, 6, 1.05, 0.95, 0.95, 0.40],
    [-2.55, 13.2, 2, 1.18, 1.10, 0.95, 0.28],
    [0.0, 13.5, 7, 1.25, 1.15, 0.94, 0.46],
    [2.55, 13.2, 1, 1.18, 1.10, 0.95, 0.38],
    [-1.90, 16.8, 3, 1.28, 1.25, 0.95, 0.30],
    [0.0, 17.2, 4, 1.30, 1.25, 0.94, 0.44],
    [1.90, 16.8, 6, 1.28, 1.25, 0.95, 0.36],
    [-1.45, 2.05, 5, 0.86, 0.68, 0.95, 0.25],
    [-1.10, 1.88, 1, 0.84, 0.64, 0.95, 0.35],
    [-0.65, 1.95, 6, 0.84, 0.66, 0.95, 0.35],
    [-0.25, 2.00, 2, 0.84, 0.66, 0.95, 0.30],
    [0.30, 1.85, 7, 0.82, 0.64, 0.95, 0.15],
    [0.75, 1.75, 0, 0.80, 0.62, 0.95, 0.00],
    [-3.40, 12.0, 2, 1.18, 1.05, 0.96, 0.90],
    [-4.40, 15.0, 6, 1.28, 1.15, 0.96, 0.65],
    [-2.50, 13.5, 0, 1.15, 1.05, 0.96, 1.45],
    [-3.20, 17.5, 7, 1.32, 1.20, 0.96, 1.25],
    [-1.10, 12.5, 3, 1.08, 0.98, 0.95, 1.85],
    [0.00, 13.0, 5, 1.12, 1.02, 0.95, 1.95],
    [1.10, 12.5, 6, 1.08, 0.98, 0.95, 1.95],
    [-1.60, 16.5, 1, 1.24, 1.15, 0.95, 1.90],
    [0.00, 17.5, 2, 1.26, 1.18, 0.95, 2.15],
    [1.60, 16.5, 7, 1.24, 1.15, 0.95, 2.00],
    [3.40, 12.0, 4, 1.18, 1.05, 0.96, 1.20],
    [4.40, 15.0, 6, 1.28, 1.15, 0.96, 1.15],
    [2.50, 13.5, 1, 1.15, 1.05, 0.96, 1.75],
    [3.20, 17.5, 5, 1.32, 1.20, 0.96, 1.65],
    [5.20, 19.0, 7, 1.36, 1.22, 0.96, 0.90],
    [-3.40, 1.45, 2, 0.94, 0.70, 0.96, -0.14],
    [-2.45, 1.32, 6, 0.92, 0.68, 0.96, -0.17],
    [-1.55, 1.28, 7, 0.90, 0.66, 0.96, -0.18],
    [-0.75, 1.21, 3, 0.88, 0.64, 0.96, -0.20],
    [0.05, 1.21, 5, 0.86, 0.64, 0.96, -0.20],
    [0.95, 1.25, 6, 0.88, 0.66, 0.96, -0.20],
    [1.90, 1.35, 2, 0.92, 0.68, 0.96, -0.17],
    [2.95, 1.52, 7, 0.96, 0.72, 0.96, -0.12],
    [3.55, 1.68, 0, 1.00, 0.76, 0.96, -0.06],
    [-1.80, 2.50, 1, 0.94, 0.74, 0.96, 0.08],
    [-0.50, 2.45, 6, 0.90, 0.72, 0.96, 0.10],
    [0.65, 2.48, 2, 0.90, 0.72, 0.96, 0.08],
    [1.85, 2.60, 7, 0.94, 0.76, 0.96, 0.06],
    // #contact bottom-left gap anchors (360 surround, off-screen from Intro)
    [5.20, 0.90, 0, 1.18, 1.12, 0.96, 0.26, 1],
    [6.40, 2.50, 6, 1.24, 1.18, 0.96, 0.26, 1],
    [7.50, 4.00, 2, 1.28, 1.20, 0.96, 0.28, 1],
    // #contact right-of-lotus shoulder anchors (lower-left Intro hillside)
    [-4.80, 10.60, 2, 1.14, 1.04, 0.96, 0.38, 0],
    [-5.90, 12.20, 6, 1.20, 1.10, 0.96, 0.42, 0],
    [-6.80, 14.00, 0, 1.24, 1.14, 0.96, 0.46, 0],
    [-7.80, 15.60, 7, 1.26, 1.16, 0.96, 0.50, 0]
  );

  // Five dense serpentine wildflower ribbons directly behind first POV
  const rearRibbons = [
    { steps: 14, x0: 16.0, x1: -16.0, z0: 0.6, z1: -6.5, yBoost: 0.26, pal: [0, 2, 6, 4, 7] },
    { steps: 16, x0: 18.0, x1: -18.0, z0: -3.5, z1: -11.5, yBoost: 0.38, pal: [1, 5, 7, 0, 6] },
    { steps: 16, x0: 17.5, x1: -19.0, z0: -8.5, z1: -16.5, yBoost: 0.48, pal: [2, 0, 6, 3, 7] },
    { steps: 14, x0: 16.0, x1: -18.0, z0: -13.5, z1: -21.0, yBoost: 0.58, pal: [4, 7, 1, 6, 0] },
    { steps: 12, x0: 14.0, x1: -16.0, z0: -17.5, z1: -24.0, yBoost: 0.68, pal: [0, 6, 5, 2, 7] },
  ];
  for (const rib of rearRibbons) {
    for (let rIdx = 0; rIdx < rib.steps; rIdx++) {
      const u = rIdx / Math.max(1, rib.steps - 1);
      const bx = rib.x0 + (rib.x1 - rib.x0) * u + C(u * 4.5) * 1.2;
      const bz = rib.z0 + (rib.z1 - rib.z0) * u + S(u * 5.0) * 1.4;
      if (inIntroCorridor(bx, bz) || !insideMeadowFrustum(bx, bz, false)) continue;
      const pal = rib.pal[rIdx % rib.pal.length];
      const sc = 1.22 + (1.0 - Math.abs(u - 0.5) * 0.4) * 0.45;
      beds.push([bx, bz, pal, sc, sc * 0.96, 0.96, rib.yBoost, 1]);
    }
  }

  // Dedicated gap-fill bands behind first POV & sealing #contact bottom-left / right-of-lotus patches
  const rearAndContactGapBands = [
    { steps: 12, x0: -16.5, x1: 4.5, z0: 3.6, z1: -1.8, yBoost: 0.24, pal: [0, 6, 2, 7, 4], is360: 1 },
    { steps: 14, x0: -18.0, x1: 6.0, z0: 0.6, z1: -4.2, yBoost: 0.30, pal: [2, 7, 1, 6, 5], is360: 1 },
    { steps: 14, x0: -18.5, x1: 5.0, z0: -2.6, z1: -6.8, yBoost: 0.36, pal: [0, 3, 6, 4, 7], is360: 1 },
    { steps: 11, x0: -15.5, x1: -4.2, z0: 14.5, z1: 4.2, yBoost: 0.38, pal: [1, 6, 0, 7, 2], is360: 0 },
    { steps: 9, x0: -21.5, x1: -14.5, z0: 19.5, z1: 8.5, yBoost: 0.42, pal: [0, 6, 2, 7, 1], is360: 0 },
    // #contact bottom-left corner bands (x in [4.0, 8.8], z in [-1.2, 5.4], off-screen from Intro)
    { steps: 10, x0: 4.0, x1: 8.8, z0: -1.2, z1: 3.6, yBoost: 0.24, pal: [0, 6, 2, 7, 4], is360: 1 },
    { steps: 9, x0: 4.8, x1: 8.6, z0: 1.2, z1: 5.4, yBoost: 0.28, pal: [2, 7, 1, 6, 5], is360: 1 },
    // #contact right-of-lotus shoulder bands (x in [-8.6, -3.8], z in [9.8, 16.4])
    { steps: 9, x0: -8.6, x1: -4.2, z0: 16.4, z1: 10.2, yBoost: 0.42, pal: [0, 6, 2, 7, 1], is360: 0 },
    { steps: 8, x0: -7.4, x1: -3.8, z0: 14.8, z1: 9.8, yBoost: 0.36, pal: [2, 7, 4, 6, 0], is360: 0 },
  ];
  for (const band of rearAndContactGapBands) {
    for (let bi = 0; bi < band.steps; bi++) {
      const u = bi / Math.max(1, band.steps - 1);
      const bx = band.x0 + (band.x1 - band.x0) * u + S(u * 4.0) * 0.9;
      const bz = band.z0 + (band.z1 - band.z0) * u + C(u * 3.5) * 0.9;
      if (band.is360 && inIntroCorridor(bx, bz)) continue;
      if (!insideMeadowFrustum(bx, bz, false)) continue;
      const pal = band.pal[bi % band.pal.length];
      const sc = 1.15 + 0.35 * S(u * Math.PI);
      beds.push([bx, bz, pal, sc, sc * 0.95, 0.96, band.yBoost, band.is360]);
    }
  }

  // Uniform 360-degree concentric wildflower rings outside intro valley
  const ringSpecs = [
    { r: 7.0, count: lowEnd ? 10 : 14, scale: 1.02, yBoost: 0.18 },
    { r: 11.8, count: lowEnd ? 14 : 20, scale: 1.18, yBoost: 0.28 },
    { r: 17.2, count: lowEnd ? 18 : 26, scale: 1.38, yBoost: 0.42 },
    { r: 23.2, count: lowEnd ? 22 : 30, scale: 1.62, yBoost: 0.56 },
    { r: 29.8, count: lowEnd ? 24 : 34, scale: 1.88, yBoost: 0.72 },
  ];
  for (let ri = 0; ri < ringSpecs.length; ri++) {
    const ring = ringSpecs[ri];
    for (let a = 0; a < ring.count; a++) {
      const theta = (TAU * (a + (ri % 2) * 0.5)) / ring.count + (R() - 0.5) * 0.16;
      const rr = ring.r + (R() - 0.5) * 2.2;
      const bx = SAKURA_X + C(theta) * rr;
      const bz = SAKURA_Z + S(theta) * rr;
      if (inIntroCorridor(bx, bz)) continue;
      const pal = (a * 3 + ri * 2) % 8;
      beds.push([bx, bz, pal, ring.scale, ring.scale * 0.96, 0.96, ring.yBoost, 1]);
    }
  }

  // Midground valley pockets on slopes + sparse faint center canyon floor wisps
  const pocketCount = lowEnd ? 36 : 52;
  for (let b = 0; b < pocketCount; b++) {
    const z = 4.4 + Math.pow(R(), 0.94) * 34.0;
    const side = R() < 0.5 ? -1 : 1;
    const maxOff = Math.min(22.0, (z + 0.55) * 1.14);
    const minOff = z > 10.5 ? 2.0 : 1.15;
    const off = side * (minOff + Math.pow(R(), 0.84) * Math.max(1.0, maxOff - minOff));
    const bx = off + valleyCourse(z);
    if (!insideMeadowFrustum(bx, z, false)) continue;
    const distScale = z > 12 ? 1.0 + (z - 12) * 0.036 : 1.0;
    beds.push([bx, z, Math.floor(R() * 8), (0.74 + R() * 0.82) * distScale, (0.80 + R() * 1.12) * distScale, 0.95, 0]);
  }

  for (let b = 0; b < beds.length; b++) {
    await yieldSlice();
    const [bx, bz, k, w, d, litBoost, yBoost = 0, is360 = 0] = beds[b];
    const families = is360
      ? Math.min(24, Math.round(w * d * 5.2 + 6))
      : bz < 6.5
        ? Math.min(30, Math.round(w * d * 7.2 + 8))
        : bz < 9.5
          ? Math.min(26, Math.round(w * d * 6.0 + 6))
          : bz < 22.0
            ? Math.min(19, Math.round(w * d * 4.4 + 4))
            : Math.min(11, Math.round(w * d * 2.8 + 2));
    for (let f = 0; f < families; f++) {
      const a = R() * TAU;
      const rr = Math.sqrt(R());
      const fx = bx + C(a) * rr * w * 1.18;
      const fz = bz + S(a) * rr * d * 1.18;
      if (!is360) {
        const fOff = fx - valleyCourse(fz);
        if (fz > 24.0 && Math.abs(fOff) < 1.15 && R() < 0.65) continue;
      }
      if (!insideMeadowFrustum(fx, fz, false)) continue;
      const rOrbitCenter = Math.hypot(fx - SAKURA_X, fz - SAKURA_Z);
      const baseFl = is360
        ? (0.32 + R() * 0.24) * (1.0 + Math.max(0, rOrbitCenter - 10) * 0.042)
        : (0.29 + R() * 0.25) * (fz > 14 ? 1.0 + (fz - 14) * 0.044 : 1.0);
      const lf = (0.90 + R() * 0.12) * litBoost;
      const clusterCount = is360
        ? 3 + Math.floor(R() * 3)
        : bz < 9.5
          ? 3 + Math.floor(R() * 4)
          : bz < 22.0
            ? 2 + Math.floor(R() * 3)
            : 2 + Math.floor(R() * 2);
      const clusterSpread = is360
        ? 0.56 + Math.max(0, rOrbitCenter - 12) * 0.024
        : 0.48 + (fz > 16 ? (fz - 16) * 0.022 : 0);
      for (let i = 0; i < clusterCount; i++) {
        const xx = fx + (R() - 0.5) * clusterSpread;
        const zz = fz + (R() - 0.5) * clusterSpread;
        if (is360 && inIntroCorridor(xx, zz)) continue;
        const baseY = is360 ? surroundFloor(xx, zz) : meadowFloor(xx, zz);
        const yy = baseY + 0.24 + yBoost + R() * 0.22;
        const flSize = baseFl * (0.58 + R() * 0.76);
        if (!insideStaticView(xx, yy, zz, flSize)) continue;
        if (R() < (is360 ? 0.10 : 0.195)) continue;
        const kk = R() < 0.74 ? k : R() < 0.65 ? 6 + Math.floor(R() * 2) : (k + 2) % 6;
        const tileId = 16 + kk + (R() < 0.5 ? 8 : 0);
        const ang = Math.atan2(zz - SAKURA_Z, xx - SAKURA_X);
        const r = Math.hypot(xx - SAKURA_X, zz - SAKURA_Z);
        pushParticle(xx, yy, zz, flSize, tileId, R(), lf * (0.94 + R() * 0.10), 0.0, ang, r, 0.72 + R() * 0.80, 1.0);
      }
    }
  }

  // 3. Soft Sakura Base Calyx Grass Cushion Hugging the Lowered Root (role = 2)
  for (let i = 0; i < (lowEnd ? 280 : 420); i++) {
    const a = R() * TAU;
    const rr = 0.2 + Math.pow(R(), 0.75) * 2.1;
    const px = SAKURA_X + C(a) * rr;
    const pz = SAKURA_Z + S(a) * rr * 0.88;
    const py = 0.56 + Math.max(0, 1.3 - rr) * 0.16 + (R() - 0.5) * 0.08;
    pushParticle(px, py, pz, 0.40 + R() * 0.44, Math.floor(R() * 12), R(), 0.68 + R() * 0.42, 2.0, a, rr, 0.3, 0.0);
  }

  // 4. Floating Golden-Pink Pollen Glints Orbiting the 3D Stamen Crown (role = 1, tile = 15)
  for (let s = 0; s < 72; s++) {
    const a = R() * TAU;
    const r = Math.pow(R(), 0.58) * 1.95;
    const lx = C(a) * r;
    const ly = 0.36 + (1.0 - r * 0.25) * 0.65 + (R() - 0.5) * 0.24;
    const lz = S(a) * r;
    pushParticle(lx, ly, SAKURA_Z + lz, 0.14 + R() * 0.10, 15, R(), 1.12, 1.0, 1.0, a, 0.5, lz);
  }

  // 5. Floating Pastel Pollen Motes (tile = 32)
  for (let i = 0; i < (lowEnd ? 95 : 150); i++) {
    const pz = 2.0 + R() * 26.0;
    const px = (R() * 2 - 1) * (pz + 2.0) * 0.9;
    const py = 0.8 + R() * 6.5;
    pushParticle(px, py, pz, 0.045 + R() * 0.085, 32, R(), 1.0, 0.0, Math.atan2(pz - SAKURA_Z, px), pz, 0.4 + R() * 0.7, 0.0);
  }

  // 6. Pulsing Rose-Gold Fireflies (tile = 33)
  for (let i = 0; i < (lowEnd ? 26 : 42); i++) {
    const fz = 2.6 + R() * 22.0;
    const fx = (R() * 2 - 1) * (fz + 1.5) * 0.85;
    const fy = 1.0 + R() * 4.4;
    pushParticle(fx, fy, fz, 0.32 + R() * 0.18, 33, R(), 1.0, 0.0, Math.atan2(fz - SAKURA_Z, fx), fz, 0.5 + R() * 0.6, 0.0);
  }

  // 7. Select 100 real wildflowers across the broad meadow to catch & rest organically across all 3 lotus petal rings
  await yieldSlice();
  const particleCount = Math.min(65000, particles.length);
  const landSlots = generatePetalLanderSlots(R);
  const assignedLanders = new Set();

  for (let si = 0; si < landSlots.length; si++) {
    const slot = landSlots[si];
    const approxR = 2.8 + (si % 6) * 1.15;
    const azPick = slot.az + ((si % 5) - 2) * 0.16;
    const tx = SAKURA_X + C(azPick) * approxR;
    const tz = SAKURA_Z + S(azPick) * approxR;
    let bestIdx = -1;
    let bestScore = Infinity;
    let fallbackIdx = -1;
    let fallbackScore = Infinity;
    for (let i = 0; i < particleCount; i++) {
      if (assignedLanders.has(i)) continue;
      const pt = particles[i];
      const tid = pt[4];
      if (pt[7] >= 0.5 || tid < 16 || tid >= 32) continue;
      const d2 = (pt[0] - tx) * (pt[0] - tx) + (pt[2] - tz) * (pt[2] - tz);
      const isBluePal = (tid - 16) % 8 >= 6;
      if (isBluePal === slot.wantBlue && d2 < bestScore) {
        bestScore = d2;
        bestIdx = i;
      }
      if (d2 < fallbackScore) {
        fallbackScore = d2;
        fallbackIdx = i;
      }
    }
    const pick = bestIdx !== -1 ? bestIdx : fallbackIdx;
    if (pick !== -1) {
      assignedLanders.add(pick);
      const pt = particles[pick];
      const uClamped = Math.max(0.02, Math.min(0.96, slot.u));
      const vClamped = Math.max(-0.52, Math.min(0.52, slot.v));
      pt[9] = slot.az;
      pt[11] = 10.0 + slot.ringIdx * 100.0 + Math.round(uClamped * 50) + (vClamped * 0.5 + 0.5);
    }
  }

  // 8. Pack VBO & Build O(N) 256-Bucket Camera-Depth Radix Sort Buffers
  const meadowIdxList = [];
  const coreIndices = [];
  const packed = new Float32Array(particleCount * 12);
  for (let i = 0; i < particleCount; i++) {
    const pt = particles[i];
    packed.set(pt, i * 12);
    const roleVal = pt[7];
    if (roleVal > 0.5 && roleVal < 1.5) {
      coreIndices.push(i);
    } else {
      meadowIdxList.push(i);
    }
  }

  const meadowCount = meadowIdxList.length;
  const meadowPosX = new Float32Array(meadowCount);
  const meadowPosY = new Float32Array(meadowCount);
  const meadowPosZ = new Float32Array(meadowCount);
  const meadowLayerBias = new Float32Array(meadowCount);
  const meadowBandOffset = new Uint16Array(meadowCount);
  const meadowOrigIdx = new Uint16Array(meadowCount);
  const sortedMeadow = new Uint16Array(meadowCount);
  const depthKeys = new Uint16Array(meadowCount);
  const tempKeys = new Uint16Array(meadowCount);
  const tempIdx = new Uint16Array(meadowCount);
  let band0Count = 0;

  for (let k = 0; k < meadowCount; k++) {
    const idx = meadowIdxList[k];
    const pt = particles[idx];
    const tid = pt[4];
    meadowPosX[k] = pt[0];
    meadowPosY[k] = pt[1];
    meadowPosZ[k] = pt[2];
    if (tid < 16) band0Count++;
    meadowBandOffset[k] = tid < 16 ? 0 : 32768;
    meadowLayerBias[k] = tid >= 32 ? 0.45 : 0.0;
    meadowOrigIdx[k] = idx;
  }

  return {
    packed,
    coreIndices: new Uint16Array(coreIndices),
    coreCount: coreIndices.length,
    meadowCount,
    meadowFlowerStart: band0Count,
    meadowPosX,
    meadowPosY,
    meadowPosZ,
    meadowLayerBias,
    meadowBandOffset,
    meadowOrigIdx,
    sortedMeadow,
    depthKeys,
    tempKeys,
    tempIdx,
  };
}
