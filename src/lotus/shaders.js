/**
 * WebGL shader compiler and shader source programs for the 3D lotus meadow scene:
 * 1. Background 360-degree twilight sky + periodic aurora
 * 2. Layered 3D curved lotus petals
 * 3. Sculpted 3D receptacle dome, arched stamen filaments, calyx & sepals
 * 4. Soft additive screen-blend radial glow billboard
 * 5. Full-depth meadow, pollen, firefly & 3-ring petal-landing point sprites
 */

export function compileProgram(targetGl, vSrc, fSrc) {
  const prog = targetGl.createProgram();
  for (const [src, type] of [
    [vSrc, targetGl.VERTEX_SHADER],
    [fSrc, targetGl.FRAGMENT_SHADER],
  ]) {
    const sh = targetGl.createShader(type);
    targetGl.shaderSource(sh, src);
    targetGl.compileShader(sh);
    if (!targetGl.getShaderParameter(sh, targetGl.COMPILE_STATUS)) {
      throw new Error(targetGl.getShaderInfoLog(sh) || "Shader compile error");
    }
    targetGl.attachShader(prog, sh);
  }
  targetGl.linkProgram(prog);
  if (!targetGl.getProgramParameter(prog, targetGl.LINK_STATUS)) {
    throw new Error(targetGl.getProgramInfoLog(prog) || "Program link error");
  }
  return prog;
}

export const BG_VERT = `attribute vec2 pos;
varying vec2 uv;
void main() {
  gl_Position = vec4(pos, 0.0, 1.0);
  uv = pos;
}`;

export const BG_FRAG = `precision highp float;
varying vec2 uv;
uniform float uTime;
uniform float uAspect;
uniform float uFocal;
uniform mat3 uViewMat;
uniform vec2 uAim;
uniform float uSettle;
uniform float uSkyFade;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float starLayer360(float azNorm, float el, float cols, float threshold, float coreK, float sparkleWeight, float phaseShift) {
  float uCell = azNorm * cols;
  float vCell = el * (cols / 6.2831853) * 1.15;
  vec2 grid = vec2(uCell, vCell);
  vec2 gv = fract(grid) - 0.5;
  vec2 id = vec2(mod(floor(uCell), cols), floor(vCell));
  float rnd = hash21(id + phaseShift);
  if (rnd < threshold) return 0.0;
  vec2 rVec = vec2(hash21(id + vec2(13.7, 29.1) + phaseShift), hash21(id + vec2(71.3, 19.7) + phaseShift));
  vec2 offs = (rVec - 0.5) * 0.34;
  vec2 fp = gv - offs;
  float dist = length(fp);
  float cellWin = smoothstep(0.34, 0.08, dist);
  if (cellWin <= 0.001) return 0.0;
  float d2 = dist * dist;
  float twinkle = 0.54 + 0.46 * sin(uTime * (1.15 + rVec.y * 2.1) + rVec.x * 28.0);
  float core = exp(-d2 * coreK);
  float halo = exp(-d2 * 28.0) * 0.24;
  float crossRays = exp(-abs(fp.x) * 82.0 - abs(fp.y) * 20.0) + exp(-abs(fp.y) * 82.0 - abs(fp.x) * 20.0);
  float starVal = (core + halo + crossRays * sparkleWeight * 0.48) * cellWin;
  return starVal * twinkle * (0.65 + 0.50 * rVec.x);
}

void main() {
  vec3 col = vec3(0.0);

  vec2 ndc = uv - uAim * vec2(mix(0.032, 0.018, uSettle), mix(0.020, 0.014, uSettle));
  vec3 rayView = normalize(vec3((ndc.x * uAspect) / max(0.2, uFocal), ndc.y / max(0.2, uFocal), 1.0));
  vec3 rayWorld = normalize(vec3(
    dot(uViewMat[0], rayView),
    dot(uViewMat[1], rayView),
    dot(uViewMat[2], rayView)
  ));
  float az = atan(rayWorld.x, rayWorld.z);
  float el = asin(clamp(rayWorld.y, -1.0, 1.0));
  float azNorm = az / 6.2831853 + 0.5;

  // Intro V-valley sill that dissolves smoothly as the camera orbits around 360 degrees
  float sillScale = clamp((uAspect - 0.45) / 1.15, 0.28, 1.0) * uSkyFade;
  float ax = abs(uv.x);
  float asym = uv.x < 0.0 ? 1.06 : 0.94;
  float vWall = (0.04 + (ax * 0.44 + ax * ax * 0.44) * asym) * sillScale;
  float sillEdge = mix(-0.45, vWall - 0.06 + 0.015 * sin(az * 6.0), uSkyFade);
  float sillMask = (1.0 - smoothstep(sillEdge - 0.14, sillEdge + 0.04, uv.y)) * uSkyFade;
  col = mix(col, vec3(0.010, 0.012, 0.010), sillMask * 0.85);

  // 360-degree seamless twilight aurora ribbons & twinkling spherical stars
  float skyMask = smoothstep(sillEdge - 0.04, sillEdge + 0.14, uv.y) * smoothstep(-0.22, 0.04, el);
  if (skyMask > 0.004) {
    float curveP = 0.24 + 0.08 * sin(az * 2.0 + 0.4 + uTime * 0.05)
      + 0.045 * cos(az * 4.0 - uTime * 0.07)
      + 0.025 * sin(az * 7.0 + uTime * 0.04);
    float dyP = el - curveP;

    float curveB = 0.30 + 0.075 * cos(az * 2.0 - 0.8 - uTime * 0.04)
      + 0.04 * sin(az * 3.0 + uTime * 0.06)
      + 0.02 * cos(az * 6.0 - uTime * 0.05);
    float dyB = el - curveB;

    float curtainP = dyP >= 0.0 ? exp(-dyP * 7.2) : exp(dyP * 16.0);
    if (dyP > -0.02) {
      curtainP += exp(-max(0.0, dyP - 0.04) * 3.8) * 0.25 * smoothstep(-0.02, 0.04, dyP);
    }
    float curtainB = dyB >= 0.0 ? exp(-dyB * 6.6) : exp(dyB * 14.5);
    if (dyB > -0.02) {
      curtainB += exp(-max(0.0, dyB - 0.04) * 3.6) * 0.24 * smoothstep(-0.02, 0.04, dyB);
    }

    float shimmerP = 0.68 + 0.32 * (0.6 * (0.5 + 0.5 * sin(az * 12.0 - dyP * 4.0 + uTime * 0.14)) + 0.4 * (0.5 + 0.5 * cos(az * 19.0 + uTime * 0.10)));
    float shimmerB = 0.66 + 0.34 * (0.6 * (0.5 + 0.5 * cos(az * 11.0 + dyB * 4.0 - uTime * 0.12)) + 0.4 * (0.5 + 0.5 * sin(az * 17.0 + uTime * 0.09)));

    float topFade = 1.0 - smoothstep(0.95, 1.35, el);
    vec3 pinkCol = mix(vec3(1.0, 0.48, 0.76), vec3(0.88, 0.58, 0.92), clamp(dyP * 3.8 + 0.25, 0.0, 1.0));
    vec3 blueCol = mix(vec3(0.46, 0.80, 1.0), vec3(0.68, 0.72, 1.0), clamp(dyB * 3.4 + 0.25, 0.0, 1.0));
    col += pinkCol * (curtainP * shimmerP * topFade * skyMask) * 0.165;
    col += blueCol * (curtainB * shimmerB * topFade * skyMask) * 0.145;

    float s1 = starLayer360(azNorm, el, 96.0, 0.88, 165.0, 0.0, 0.0) * 0.58;
    float s2 = starLayer360(azNorm, el, 48.0, 0.87, 110.0, 0.0, 19.3) * 0.76;
    float s3 = starLayer360(azNorm, el, 24.0, 0.88, 110.0, 1.0, 47.9) * 0.86;
    vec3 starCol = vec3(1.0, 0.97, 1.0) * (s1 + s3) + vec3(1.0, 0.84, 0.93) * s2;
    col += starCol * skyMask;
  }

  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.006 * step(0.01, col.r + col.g + col.b);
  gl_FragColor = vec4(col, 1.0);
}`;

export const SAKURA_VERT = `precision highp float;
attribute vec4 aPetalUV;   // x: u (0..1), y: v (-1..1), z: ringNorm, w: petalAz
attribute vec4 aPetalDim;  // x: len, y: maxW, z: seed, w: ringIndex

uniform vec3 uCamPos;
uniform mat3 uViewMat;
uniform vec4 uLens;
uniform vec4 uAction;      // x: time, y: bloom, z: diveMix, w: mouseActive
uniform vec2 uState;       // x: settle, y: aspect
uniform vec2 uAim;

varying vec2 vUv;
varying vec2 vNdc;
varying float vDist;
varying float vSide;
varying float vRing;
varying float vBloom;
varying vec3 vNormal;
varying vec3 vWorldPos;

float lotusWidthClosed(float u) {
  float t = clamp(u, 0.0, 1.0);
  if (t <= 0.0001 || t >= 0.9999) return 0.0;
  return sin(pow(t, 0.60) * 3.14159265) * (1.0 - 0.10 * t * t);
}

float lotusWidthOpen(float u) {
  float t = clamp(u, 0.0, 1.0);
  if (t >= 0.9999) return 0.0;
  float baseJoin = 0.62 * pow(max(0.0, 1.0 - t), 1.75);
  return (baseJoin + sin(pow(max(0.0001, t), 0.68) * 3.14159265)) * (1.0 - 0.10 * t * t);
}

vec3 evalSakuraPoint(float u, float v, float ringNorm, float petalAz, float len, float maxW, float rb, float t, float settle) {
  float uSafe = max(0.0001, u);
  float wClosed = lotusWidthClosed(u);
  float wOpen = lotusWidthOpen(u);
  float wEnv = mix(wClosed, wOpen, rb);
  float breath = sin(t * 0.85 + petalAz * 2.0 + u) * mix(0.008, 0.020, rb);

  // 1. Fully closed, sealed teardrop lotus bud (rb = 0)
  float budH = 3.66 - 0.22 * ringNorm;
  float yClosed = pow(uSafe, 0.96) * budH;
  float shellR = mix(1.48, 0.94, ringNorm);
  float baseC = mix(0.05, 0.015, ringNorm) * (1.0 - u) * (1.0 - u);
  float rClosed = baseC + shellR * wClosed * (1.0 - 0.08 * u) + 0.015 * (1.0 - ringNorm) * (1.0 - u);

  // 2. Fully open lush overlapping lotus bowl (rb = 1)
  float dive = uAction.z;
  float openTilt = mix(1.24, 0.76, ringNorm) + breath + dive * 0.04 * (1.0 - ringNorm * 0.3);
  float along = u * len * (1.0 - 0.08 * rb);
  float baseO = mix(0.48, 0.36, ringNorm);
  float baseYO = mix(0.18, 0.38, ringNorm);
  float bellyArc = sin(u * 3.14159265) * mix(0.34, 0.18, ringNorm);
  float tipLift = pow(uSafe, 2.1) * mix(0.42, 0.30, ringNorm);
  float spoon = mix(0.11, 0.065, ringNorm) * wOpen * (1.0 - v * v);
  float nRadO = cos(openTilt);
  float nYO = -sin(openTilt);
  float rOpen = baseO + sin(openTilt) * along + nRadO * (bellyArc + spoon);
  float yOpen = baseYO + cos(openTilt) * along + nYO * (bellyArc + spoon) + tipLift;

  float peel = sin(rb * 3.14159265) * (0.16 * (1.0 - ringNorm)) * sin(u * 3.14159265);
  float radial = mix(rClosed, rOpen, rb) + peel + breath * u * 0.42;
  float height = mix(yClosed, yOpen, rb);

  float effTilt = mix(0.12 + 0.14 * (1.0 - ringNorm), openTilt, rb);
  float nRad = cos(effTilt);
  float nY = -sin(effTilt);
  float petalPillow = mix(0.022, 0.016, ringNorm) * wEnv * (1.0 - v * v) * (1.0 - rb * 0.65);
  float shingle = v * wEnv * (0.078 + 0.018 * rb);

  float rEff = radial + nRad * (petalPillow + shingle);
  float yEff = height + nY * (petalPillow + shingle);

  float halfW = wEnv * (maxW * 0.5) * (1.22 + 0.16 * rb);
  float wrapR = max(rEff, 0.04);
  float arcAng = clamp((v * halfW) / wrapR, -0.76, 0.76) * (1.0 - rb);
  float tangOpen = v * halfW * rb;

  float ang = petalAz + arcAng;
  float ca = cos(ang);
  float sa = sin(ang);
  float rx = rEff * ca - tangOpen * sa;
  float rz = rEff * sa + tangOpen * ca;

  float bloomLift = smoothstep(0.0, 1.0, uAction.y) * 2.10;
  float scaleL = 1.0 + rb * 0.40 + settle * 0.08;
  vec3 anchor = vec3(0.0, 0.42 + bloomLift, 8.5);
  return anchor + vec3(rx, yEff + settle * 0.04 * u, rz) * scaleL;
}

void main() {
  float u = aPetalUV.x;
  float v = aPetalUV.y;
  float ringNorm = aPetalUV.z;
  float petalAz = aPetalUV.w;
  float len = aPetalDim.x;
  float maxW = aPetalDim.y;
  float rb = smoothstep(ringNorm * 0.18, ringNorm * 0.18 + 0.78, uAction.y);
  float t = uAction.x;
  float settle = uState.x;

  vec3 wPos = evalSakuraPoint(u, v, ringNorm, petalAz, len, maxW, rb, t, settle);

  float uN = clamp(u, 0.04, 0.96);
  float vN = clamp(v, -0.90, 0.90);
  vec3 p0 = (abs(u - uN) + abs(v - vN)) < 0.0001
    ? wPos
    : evalSakuraPoint(uN, vN, ringNorm, petalAz, len, maxW, rb, t, settle);
  vec3 pU1 = evalSakuraPoint(uN + 0.025, vN, ringNorm, petalAz, len, maxW, rb, t, settle);
  vec3 pV1 = evalSakuraPoint(uN, vN + 0.030, ringNorm, petalAz, len, maxW, rb, t, settle);
  vec3 rawN = cross(pU1 - p0, pV1 - p0);
  vec3 nrm = rawN / max(length(rawN), 0.0001);

  vec3 view = uViewMat * (wPos - uCamPos);
  float dep = max(0.35, view.z);

  vec2 p = vec2((view.x * uLens.x) / uLens.y, view.y * uLens.x);
  p.x += uAim.x * dep * mix(0.032, 0.018, settle);
  p.y += uAim.y * dep * mix(0.020, 0.014, settle);

  float zn = ((dep - 0.35) / 78.0) * 2.0 - 1.0;
  gl_Position = vec4(p, zn * dep, dep);

  vUv = vec2(u, v);
  vNdc = p / max(0.1, dep);
  vDist = clamp(u, 0.0, 1.0);
  vSide = v * lotusWidthClosed(u);
  vRing = ringNorm;
  vBloom = rb;
  vNormal = nrm;
  vWorldPos = wPos;
}`;

export function getSakuraFrag(hasDerivatives) {
  return `${hasDerivatives ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n" : "#define HAS_DERIV 0\n"}precision highp float;
uniform float uSettle;
uniform float uAaPass;
uniform vec3 uCamPos;
uniform vec4 uAction;
uniform vec2 uState;
uniform vec2 uAim;

varying vec2 vUv;
varying vec2 vNdc;
varying float vDist;
varying float vSide;
varying float vRing;
varying float vBloom;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  float u = vUv.x;
  float v = vUv.y;
  float d = vDist;

  vec3 throat = vec3(0.96, 0.44, 0.58);
  vec3 mid = vec3(0.99, 0.64, 0.75);
  vec3 edge = vec3(1.00, 0.80, 0.86);

  vec3 col = mix(throat, mid, smoothstep(0.05, 0.48, d));
  col = mix(col, edge, smoothstep(0.68, 1.0, d) * 0.72);
  col = mix(col, mix(col * 1.05, edge, 0.16), vRing * 0.30);

  float veinWave = 0.5 + 0.5 * cos(v * 22.0);
  float veinMask = smoothstep(0.14, 0.38, d) * (1.0 - smoothstep(0.76, 0.98, d)) * (1.0 - uSettle * 0.25);
  col *= 1.0 - veinWave * veinMask * 0.05;

  float ao = 0.65 + 0.35 * smoothstep(-0.35, 0.18, vSide);
  col = mix(col * vec3(0.80, 0.46, 0.58), col, ao);

  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 viewDir = normalize(uCamPos - vWorldPos);
  vec3 introLight = normalize(vec3(-0.32, 0.72, -0.62));
  vec3 openLight = normalize(viewDir * 0.42 + vec3(0.0, 0.90, 0.0));
  vec3 lightDir = normalize(mix(introLight, openLight, vBloom * 0.72));
  float diff = max(dot(n, lightDir), 0.0);
  float wrap = 0.5 + 0.5 * dot(n, lightDir);
  float shadeT = clamp(wrap * 0.70 + diff * 0.38, 0.0, 1.0);
  float bounce = max(dot(n, normalize(vec3(0.25, -0.55, -0.45))), 0.0);
  vec3 lightTint = mix(vec3(0.76, 0.49, 0.59), vec3(1.08, 0.91, 0.96), shadeT);
  lightTint += vec3(0.14, 0.08, 0.10) * bounce;
  lightTint = mix(lightTint, vec3(0.97, 0.81, 0.87), uSettle * 0.10);
  col *= lightTint;

  vec3 halfVec = normalize(lightDir + viewDir);
  float sss = pow(clamp(dot(-viewDir, lightDir) * 0.5 + 0.5, 0.0001, 1.0), 1.5) * (0.35 + 0.65 * d);
  float rim = pow(clamp(1.0 - max(dot(n, viewDir), 0.0), 0.0001, 1.0), 2.2);
  float spec = pow(max(dot(n, halfVec), 0.0001), 16.0) * (1.0 - uSettle * 0.8);
  col += vec3(1.00, 0.46, 0.64) * exp(-d * 1.85) * (0.22 + 0.18 * vBloom);
  col += vec3(1.00, 0.56, 0.72) * sss * (0.18 + 0.15 * vBloom);
  col += vec3(1.00, 0.86, 0.90) * spec * 0.18;

  float rimEdge = max(smoothstep(0.76, 0.99, abs(v)), smoothstep(0.80, 0.995, u)) * (1.0 - uSettle * 0.06);
  col = mix(col, vec3(1.00, 0.77, 0.86), clamp(rimEdge * 0.42 + rim * 0.34 * (1.0 - uSettle * 0.12), 0.0, 0.54));
  col += vec3(1.00, 0.56, 0.72) * (pow(rim, 2.0) * (0.24 + 0.16 * vBloom) + rimEdge * (0.16 + 0.12 * vBloom));

  vec2 hDiff = vNdc - uAim;
  hDiff.x *= uState.y;
  float hoverClos = exp(-dot(hDiff, hDiff) * 7.5) * uAction.w * (1.0 - uSettle * 0.72);
  col *= 1.0 + hoverClos * 0.14;
  col += vec3(1.00, 0.66, 0.78) * hoverClos * (0.10 + 0.06 * vBloom + 0.04 * d);

  // Soft rolloff preserving shadow-to-rim dynamic range -> clamp BEFORE chroma ceilings (never flat/white/purple)
  col = col / (vec3(1.0) + col * 0.42);
  col = clamp(col * 1.22, 0.0, 1.0);
  col.g = min(col.g, col.r * 0.785);
  col.b = min(col.b, min(col.r * 0.87, col.g + 0.098));

  float veilSoft = smoothstep(0.35, 1.0, uSettle);
  col *= mix(1.0, 0.98, veilSoft);

  float av = abs(v);
  #if HAS_DERIV
    float fwV = clamp(fwidth(av), 0.0025, 0.20);
    float fwU = clamp(fwidth(u), 0.0025, 0.15);
  #else
    float fwV = 0.014;
    float fwU = 0.014;
  #endif
  float aaV = 1.0 - smoothstep(1.0 - fwV * 1.45, 1.0, av);
  float aaTip = 1.0 - smoothstep(1.0 - fwU * 1.45, 1.0, u);
  float aaBase = mix(smoothstep(0.0, fwU * 1.0, u), 1.0, vBloom);
  float aaCov = aaV * aaTip * aaBase;

  if (uAaPass < 0.5) {
    if (aaCov < 0.88) discard;
    gl_FragColor = vec4(col, 1.0);
  } else {
    if (aaCov >= 0.88 || aaCov <= 0.02) discard;
    gl_FragColor = vec4(col * aaCov, aaCov);
  }
}`;
}

export const STAMEN_VERT = `precision highp float;
attribute vec4 aPart;  // x: u (0..1), y: v (-1..1 or az), z: kind (0=dome, 1=fil, 2=calyx/stem, 3=sepal), w: ringOrSeed
attribute vec4 aGeom;  // kind 0/2: base,r,h | kind 1: az,baseR,spanR,tipH | kind 3: az,len,maxW,0

uniform vec3 uCamPos;
uniform mat3 uViewMat;
uniform vec4 uLens;
uniform vec4 uAction;  // x: time, y: bloom, z: diveMix, w: mouseActive
uniform vec2 uState;   // x: settle, y: aspect
uniform vec2 uAim;

varying vec4 vMeta;    // x: u, y: v, z: kind, w: reveal
varying vec2 vNdc;
varying float vRing;
varying vec3 vNormal;
varying vec3 vWorldPos;

vec3 evalFilCenter(float u, float az, float baseR, float spanR, float tipH, float rNorm, float t, float bloomOpen) {
  float sway = sin(t * 1.15 + az * 3.0 + rNorm * 2.1) * (0.04 * u * u);
  float rr = (baseR + pow(max(0.0001, u), 0.86) * spanR + 0.06 * sin(u * 3.14159265)) * mix(0.26, 1.0, bloomOpen);
  float yy = 0.56 + (sin(u * 2.05) * tipH + u * (0.30 - 0.16 * rNorm)) * mix(0.30, 1.0, bloomOpen);
  float ca = cos(az + sway);
  float sa = sin(az + sway);
  return vec3(ca * rr, yy, sa * rr);
}

vec2 evalCalyxProfile(float u, float chaliceR, float stemLen) {
  float rr;
  float yy;
  if (u < 0.45) {
    float s = u / 0.45;
    rr = mix(chaliceR, 0.32, smoothstep(0.0, 1.0, pow(s, 0.72)));
    yy = mix(0.14, -0.32, smoothstep(0.0, 1.0, s));
  } else {
    float s = (u - 0.45) / 0.55;
    rr = mix(0.32, 0.14, pow(s, 0.55));
    yy = mix(-0.32, -0.32 - stemLen, s);
  }
  return vec2(rr, yy);
}

void main() {
  float u = aPart.x;
  float v = aPart.y;
  float kind = aPart.z;
  float rNorm = aPart.w;

  float t = uAction.x;
  float bloom = uAction.y;
  float settle = uState.x;

  float reveal = kind < 1.5
    ? smoothstep(0.18, 0.82, bloom)
    : smoothstep(0.08, 0.65, bloom);
  if (reveal < 0.002) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vMeta = vec4(u, v, kind, 0.0);
    vNdc = vec2(0.0);
    vRing = rNorm;
    vNormal = vec3(0.0, 1.0, 0.0);
    vWorldPos = vec3(0.0);
    return;
  }

  float bloomScale = smoothstep(0.0, 0.92, bloom);
  float bloomLift = smoothstep(0.0, 1.0, bloom) * 2.10;
  float scaleL = 1.0 + bloomScale * 0.40 + settle * 0.08;
  vec3 anchor = vec3(0.0, 0.42 + bloomLift, 8.5);
  vec3 wPos;
  vec3 nrm = vec3(0.0, 1.0, 0.0);

  if (kind < 0.5) {
    float domeScale = mix(0.35, 1.0, reveal);
    float rr = (u < 0.68
      ? sin((u / 0.68) * 1.5707963)
      : mix(1.0, 0.44, (u - 0.68) / 0.32)) * aGeom.z * domeScale;
    float yy = aGeom.y + mix(aGeom.w, -0.08, pow(max(0.0001, u), 1.45)) * domeScale + 0.010 * sin(t * 0.9 + u * 3.0);
    wPos = anchor + vec3(cos(v) * rr, yy, sin(v) * rr) * scaleL;

    if (u > 0.03) {
      float u1 = min(1.0, u + 0.02);
      float rr1 = (u1 < 0.68
        ? sin((u1 / 0.68) * 1.5707963)
        : mix(1.0, 0.44, (u1 - 0.68) / 0.32)) * aGeom.z * domeScale;
      float yy1 = aGeom.y + mix(aGeom.w, -0.08, pow(max(0.0001, u1), 1.45)) * domeScale;
      float dR = rr1 - rr;
      float dY = yy1 - yy;
      vec3 slopeN = normalize(vec3(cos(v) * (-dY), dR, sin(v) * (-dY)));
      nrm = normalize(mix(vec3(0.0, 1.0, 0.0), slopeN, smoothstep(0.03, 0.14, u)));
    }
  } else if (kind < 1.5) {
    float az = aGeom.x;
    float baseR = aGeom.y;
    float spanR = aGeom.z;
    float tipH = aGeom.w;
    float bloomOpen = smoothstep(0.28, 0.94, bloom);

    vec3 c0 = anchor + evalFilCenter(u, az, baseR, spanR, tipH, rNorm, t, bloomOpen) * scaleL;
    float uNext = u > 0.96 ? u - 0.025 : u + 0.025;
    vec3 cOther = anchor + evalFilCenter(uNext, az, baseR, spanR, tipH, rNorm, t, bloomOpen) * scaleL;
    vec3 tang = normalize(u > 0.96 ? (c0 - cOther) : (cOther - c0));
    vec3 toCam = normalize(uCamPos - c0);
    vec3 rawSide = cross(tang, toCam);
    vec3 sideAxis = length(rawSide) > 0.001 ? normalize(rawSide) : vec3(-sin(az), 0.0, cos(az));

    float stalkW = mix(0.024, 0.016, clamp(u / 0.72, 0.0, 1.0));
    float antherT = clamp((u - 0.72) / 0.28, 0.0, 1.0);
    float antherW = 0.058 * pow(sin(antherT * 3.14159265), 0.68);
    float halfW = (u < 0.72 ? stalkW : max(stalkW * (1.0 - antherT), antherW)) * mix(0.4, 1.0, bloomOpen);
    wPos = c0 + sideAxis * (v * halfW * scaleL);
    nrm = normalize(sideAxis * v + toCam * sqrt(max(0.05, 1.0 - v * v)));
  } else if (kind < 2.5) {
    vec2 p0 = evalCalyxProfile(u, aGeom.y, aGeom.z);
    float u1 = min(1.0, u + 0.025);
    vec2 p1 = evalCalyxProfile(u1, aGeom.y, aGeom.z);
    float stemSway = sin(t * 0.75 + u * 2.4) * (0.04 * u * u);
    vec3 localPos = vec3(cos(v) * p0.x + stemSway, p0.y * mix(0.45, 1.0, reveal), sin(v) * p0.x);
    wPos = anchor + localPos * scaleL;
    float dR = p1.x - p0.x;
    float dY = (p1.y - p0.y) * mix(0.45, 1.0, reveal);
    nrm = normalize(vec3(cos(v) * dY, -dR, sin(v) * dY));
  } else {
    float az = aGeom.x;
    float sLen = aGeom.y;
    float sMaxW = aGeom.z;
    float sepTilt = 1.48 + sin(t * 0.8 + az * 2.0) * 0.012;
    float sAlong = u * sLen * mix(0.45, 1.0, reveal);
    float cup = sin(u * 3.14159265) * 0.10;
    float rr = 0.48 + sin(sepTilt) * sAlong + cos(sepTilt) * cup;
    float yy = 0.10 + cos(sepTilt) * sAlong - sin(sepTilt) * cup + pow(max(0.0001, u), 2.0) * 0.06 - settle * 0.08;
    float wEnv = sin(pow(clamp(u, 0.001, 0.999), 0.70) * 3.14159265) * 0.5 * sMaxW;
    float ca = cos(az);
    float sa = sin(az);
    vec3 localPos = vec3(rr * ca - v * wEnv * sa, yy, rr * sa + v * wEnv * ca);
    wPos = anchor + localPos * scaleL;
    nrm = normalize(vec3(cos(sepTilt) * ca, sin(sepTilt) * 0.85, cos(sepTilt) * sa));
  }

  vec3 view = uViewMat * (wPos - uCamPos);
  float dep = max(0.35, view.z);
  vec2 p = vec2((view.x * uLens.x) / uLens.y, view.y * uLens.x);
  p.x += uAim.x * dep * mix(0.032, 0.018, settle);
  p.y += uAim.y * dep * mix(0.020, 0.014, settle);

  float zn = ((dep - 0.35) / 78.0) * 2.0 - 1.0;
  gl_Position = vec4(p, zn * dep, dep);

  vMeta = vec4(u, v, kind, reveal);
  vNdc = p / max(0.1, dep);
  vRing = rNorm;
  vNormal = nrm;
  vWorldPos = wPos;
}`;

export const STAMEN_FRAG = `precision highp float;
uniform float uSettle;
uniform float uAaPass;
uniform vec3 uCamPos;
uniform vec4 uAction;
uniform vec2 uState;
uniform vec2 uAim;

varying vec4 vMeta;
varying vec2 vNdc;
varying float vRing;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  float reveal = vMeta.w;
  if (reveal < 0.004) discard;
  float u = vMeta.x;
  float v = vMeta.y;
  float kind = vMeta.z;

  vec2 hDiff = vNdc - uAim;
  hDiff.x *= uState.y;
  float hoverGlow = exp(-dot(hDiff, hDiff) * 7.5) * uAction.w * (1.0 - uSettle * 0.55);

  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 viewDir = normalize(uCamPos - vWorldPos);
  vec3 lightDir = normalize(vec3(-0.32, 0.78, -0.52));
  float diff = max(dot(n, lightDir), 0.0);
  float wrap = 0.5 + 0.5 * dot(n, lightDir);
  float bounce = max(dot(n, normalize(vec3(0.25, -0.55, -0.45))), 0.0);
  float rim = pow(clamp(1.0 - max(dot(n, viewDir), 0.0), 0.0001, 1.0), 2.2);

  vec3 col;
  float aaCov = 1.0;

  if (kind < 0.5) {
    float centerFade = exp(-u * u * 2.2);
    float podPattern = 0.5 + 0.5 * cos(u * 28.0) * cos(v * 14.0 + u * 6.0);
    float seedPit = smoothstep(0.68, 0.96, podPattern) * smoothstep(0.06, 0.72, u) * (1.0 - smoothstep(0.75, 0.96, u));

    vec3 crownCol = vec3(1.0, 0.82, 0.34);
    vec3 midCol = vec3(0.98, 0.64, 0.36);
    vec3 rimCol = vec3(0.94, 0.52, 0.62);
    col = mix(midCol, crownCol, centerFade);
    col = mix(col, rimCol, smoothstep(0.55, 1.0, u));
    col = mix(col, vec3(0.80, 0.46, 0.30), seedPit * 0.22 * (1.0 - uSettle * 0.45));
    col *= mix(0.76, 1.12, clamp(wrap * 0.65 + diff * 0.35, 0.0, 1.0));
    col += vec3(0.26, 0.14, 0.12) * bounce;
    col += vec3(1.0, 0.78, 0.24) * (0.22 + 0.20 * centerFade);
    col += vec3(1.0, 0.72, 0.22) * rim * 0.36;
  } else if (kind < 1.5) {
    aaCov = 1.0 - smoothstep(0.62, 1.0, abs(v));
    float cyl = sqrt(max(0.05, 1.0 - v * v));
    float isAnther = smoothstep(0.66, 0.82, u);
    vec3 stalkCol = mix(vec3(0.94, 0.54, 0.64), vec3(0.98, 0.72, 0.56), smoothstep(0.0, 0.68, u));
    float antherCore = 1.0 - abs(v) * 0.72;
    vec3 antherCol = mix(vec3(1.0, 0.72, 0.22), vec3(1.0, 0.92, 0.48), antherCore * smoothstep(0.70, 0.92, u));
    col = mix(stalkCol, antherCol, isAnther);
    col *= (0.82 + 0.26 * cyl) * (0.92 + 0.16 * (1.0 - vRing * 0.5));
    col += vec3(1.0, 0.78, 0.26) * isAnther * (0.34 + 0.28 * cyl);
    col += vec3(1.0, 0.68, 0.48) * smoothstep(0.35, 0.75, u) * 0.12;
  } else if (kind < 2.5) {
    vec3 cupRim = vec3(0.74, 0.44, 0.56);
    vec3 jadeMid = vec3(0.24, 0.48, 0.32);
    vec3 stemDeep = vec3(0.14, 0.32, 0.20);
    col = mix(cupRim, jadeMid, smoothstep(0.0, 0.24, u));
    col = mix(col, stemDeep, smoothstep(0.45, 0.98, u));
    col *= mix(0.62, 1.08, clamp(wrap * 0.68 + diff * 0.32, 0.0, 1.0));
    col += vec3(0.32, 0.16, 0.24) * bounce;
    col += vec3(0.55, 0.84, 0.68) * rim * 0.22;
  } else {
    aaCov = (1.0 - smoothstep(0.84, 1.0, abs(v))) * (1.0 - smoothstep(0.88, 1.0, u));
    vec3 sepBase = vec3(0.22, 0.46, 0.30);
    vec3 sepTip = vec3(0.78, 0.46, 0.62);
    col = mix(sepBase, sepTip, smoothstep(0.35, 0.95, u));
    col *= mix(0.64, 1.08, clamp(wrap * 0.68 + diff * 0.32, 0.0, 1.0));
    col += vec3(0.26, 0.14, 0.20) * bounce;
    col += vec3(0.92, 0.72, 0.84) * rim * 0.18;
  }

  col += vec3(1.0, 0.82, 0.42) * hoverGlow * 0.16;
  col = (col / (vec3(1.0) + col * 0.22)) * 1.10;
  col *= mix(1.0, 0.94, smoothstep(0.35, 1.0, uSettle));
  col = clamp(col, 0.0, 1.0);

  if (uAaPass < 0.5) {
    if (aaCov < 0.82) discard;
    gl_FragColor = vec4(col * reveal, reveal);
  } else {
    if (aaCov >= 0.82 || aaCov <= 0.02) discard;
    float a = aaCov * reveal;
    gl_FragColor = vec4(col * a, a);
  }
}`;

export const GLOW_VERT = `precision highp float;
attribute vec2 aQuad;
uniform vec3 uCamPos;
uniform mat3 uViewMat;
uniform vec4 uLens;
uniform vec2 uAim;
uniform float uSettle;
uniform vec4 uGlowCenter; // xyz: world center, w: world radius

varying vec2 vQuad;

void main() {
  vec3 view = uViewMat * (uGlowCenter.xyz - uCamPos);
  view.xy += aQuad * uGlowCenter.w;
  float dep = max(0.35, view.z);
  vec2 p = vec2((view.x * uLens.x) / uLens.y, view.y * uLens.x);
  p.x += uAim.x * dep * mix(0.032, 0.018, uSettle);
  p.y += uAim.y * dep * mix(0.020, 0.014, uSettle);
  float zn = ((dep - 0.35) / 78.0) * 2.0 - 1.0;
  gl_Position = vec4(p, zn * dep, dep);
  vQuad = aQuad;
}`;

export const GLOW_FRAG = `precision mediump float;
uniform vec4 uGlowColorA; // rgb: inner col, a: opacity
uniform vec4 uGlowColorB; // rgb: outer col, a: sharpness

varying vec2 vQuad;

void main() {
  float r2 = dot(vQuad, vQuad);
  if (r2 >= 1.0) discard;
  float edgeFade = smoothstep(1.0, 0.12, r2);
  float inner = exp(-r2 * uGlowColorB.a);
  float outer = exp(-r2 * 3.4);
  vec3 col = mix(uGlowColorB.rgb, uGlowColorA.rgb, clamp(inner * 1.15, 0.0, 1.0));
  float a = (outer * 0.52 + inner * 0.48) * edgeFade * uGlowColorA.a;
  gl_FragColor = vec4(col * a, a);
}`;

export const PV_VERT = `precision highp float;
attribute vec4 aBase;
attribute vec4 aStyle;
attribute vec4 aExtra;

uniform vec3 uCamPos;
uniform mat3 uViewMat;
uniform vec4 uLens;
uniform vec4 uAction;   // x: time, y: bloom, z: flyMix, w: mouseActive
uniform vec3 uState;    // x: settle, y: aspect, z: diveMix
uniform vec2 uAim;
uniform vec2 uOverlay;

varying vec4 vBot;
varying vec4 vColor;
varying vec2 vRotCS;
varying vec2 vDepthFx;
varying vec3 vTileInfo;

void main() {
  float t = uAction.x;
  float bloom = uAction.y;
  float fly = uAction.z;
  float settle = uState.x;

  float tile = aStyle.x;
  float seed = aStyle.y;
  float lit = aStyle.z;
  float role = aStyle.w; // 0: meadow/dust/bug, 1: sakura stamen pollen, 2: calyx pads

  float x = aBase.x;
  float y = aBase.y;
  float z = aBase.z;
  float ptSize = aBase.w;

  float blossom = step(15.9, tile);
  float dust = step(31.9, tile);
  float bug = step(32.9, tile);
  float isHeart = step(0.5, role) * (1.0 - step(1.5, role));
  float isPad = step(1.5, role);

  float ang = seed * 53.0;
  float defocus = 0.0;
  float opacity = 1.0;
  float spriteRot = ang * 0.35;
  float scatterGlow = 0.0;
  float landedAmt = 0.0;

  float dive = uState.z;
  if (isHeart > 0.5) {
    float bloomLift = smoothstep(0.0, 1.0, bloom) * 2.10;
    float heartScale = 1.0 + bloom * 0.40 + settle * 0.08;
    vec3 anchor = vec3(0.0, 0.42 + bloomLift, 8.5);
    float hReveal = smoothstep(0.24, 0.88, bloom);
    float lx = aBase.x * (0.65 + 0.85 * hReveal) * heartScale + 0.04 * sin(t * 1.3 + ang);
    float ly = (0.72 + 0.78 * bloom + aBase.y * (0.55 + 0.45 * hReveal)) * heartScale + 0.03 * cos(t * 1.0 + ang);
    float lz = aExtra.w * (0.65 + 0.85 * hReveal) * heartScale;
    x = anchor.x + lx;
    y = anchor.y + ly;
    z = anchor.z + lz;
    opacity = hReveal * mix(0.75, 0.65, dive) * (0.45 + 0.55 * sin(t * 1.8 + ang) * 0.5 + 0.5);
    spriteRot = ang * 0.4 + t * 0.1;
    scatterGlow = hReveal * 0.48 * (1.0 - settle * 0.35);
    defocus = mix(0.0, 0.25, settle);
  } else {
    float gust = sin(t * 1.05 - z * 0.26 + x * 0.30) + 0.36 * sin(t * 0.62 + x * 0.52 + z * 0.18);
    float flex = mix(0.065, 0.145, blossom) * (0.76 + 0.32 * seed);
    x += gust * flex + 0.02 * sin(t * 1.65 + ang);
    y += flex * (0.26 * cos(t * 1.05 - z * 0.26 + x * 0.30) - 0.15 * gust * gust);

    if (dust > 0.5 && bug < 0.5) {
      y += sin(t * 0.24 + ang) * 0.65;
      x += cos(t * 0.15 + ang) * 0.48;
    }

    if (bug > 0.5) {
      x += 0.45 * sin(t * (0.55 + 0.22 * seed) + ang) + 0.14 * cos(t * 1.12 + ang);
      y += 0.22 * sin(t * 0.88 + ang * 1.25);
      z += 0.35 * cos(t * 0.48 + ang * 1.55);
    }

    if (isPad < 0.5) {
      float radialAngle = aExtra.x;
      float liftWeight = aExtra.z;
      float isLander = step(9.5, aExtra.w) * blossom * (1.0 - dust);

      if (isLander > 0.5) {
        // 3-ring petal lander decoding: 10 + ringIdx*100 + round(u*50) + (v*0.5 + 0.5)
        float rawCode = aExtra.w - 10.0;
        float lRingIdx = clamp(floor(rawCode / 100.0 + 0.001), 0.0, 2.0);
        float lRingNorm = lRingIdx * 0.5;
        float uCode = rawCode - lRingIdx * 100.0;
        float uLand = floor(uCode + 0.001) / 50.0;
        float vLand = clamp((fract(uCode) - 0.5) * 2.0, -0.56, 0.56);
        float lPetalAz = aExtra.y;

        float rbL = smoothstep(lRingNorm * 0.18, lRingNorm * 0.18 + 0.78, bloom);
        float isMid = step(0.5, lRingIdx) * (1.0 - step(1.5, lRingIdx));
        float isIn = step(1.5, lRingIdx);
        float lLen = mix(mix(3.65, 3.40, isMid), 3.12, isIn);
        float lMaxW = mix(mix(1.92, 1.76, isMid), 1.56, isIn);
        float lBreath = sin(t * 0.85 + lPetalAz * 2.0 + uLand) * mix(0.008, 0.020, rbL);
        float lTilt = mix(1.24, 0.76, lRingNorm) + lBreath + dive * 0.04 * (1.0 - lRingNorm * 0.3);
        float lAlong = uLand * lLen * (1.0 - 0.08 * rbL);
        float lBaseO = mix(0.48, 0.36, lRingNorm);
        float lBaseYO = mix(0.18, 0.38, lRingNorm);
        float lBelly = sin(uLand * 3.14159265) * mix(0.34, 0.18, lRingNorm);
        float lTipLift = pow(uLand, 2.1) * mix(0.42, 0.30, lRingNorm);
        float lWOpen = (0.62 * pow(1.0 - uLand, 1.75) + sin(pow(uLand, 0.68) * 3.14159265)) * (1.0 - 0.10 * uLand * uLand);
        float lSpoon = mix(0.11, 0.065, lRingNorm) * lWOpen * (1.0 - vLand * vLand);
        float lShingle = vLand * lWOpen * (0.078 + 0.018 * rbL);
        float lROpen = lBaseO + sin(lTilt) * lAlong + cos(lTilt) * (lBelly + lSpoon + lShingle);
        float lYOpen = lBaseYO + cos(lTilt) * lAlong - sin(lTilt) * (lBelly + lSpoon + lShingle) + lTipLift;
        float lTang = vLand * lWOpen * (lMaxW * 0.5) * (1.22 + 0.16 * rbL) * rbL;
        float lCa = cos(lPetalAz);
        float lSa = sin(lPetalAz);
        float lScale = 1.0 + rbL * 0.40 + settle * 0.08;
        float lAnchorY = 0.42 + smoothstep(0.0, 1.0, bloom) * 2.10;

        float landX = (lROpen * lCa - lTang * lSa) * lScale - cos(lTilt) * lCa * 0.15;
        float landY = lAnchorY + (lYOpen + settle * 0.04 * uLand) * lScale + sin(lTilt) * 0.15;
        float landZ = 8.5 + (lROpen * lSa + lTang * lCa) * lScale - cos(lTilt) * lSa * 0.15;

        float pOpen = smoothstep(0.0, 0.95, bloom);
        float flyAbove = max(0.0, fly - 0.22 * settle);
        float softAir = (flyAbove * flyAbove) / (flyAbove + 0.16);
        landedAmt = smoothstep(0.08, 0.90, settle) * (1.0 - smoothstep(0.01, 0.28, flyAbove));

        float swirlAmt = softAir * liftWeight;
        float calmWind = 1.0 - landedAmt;
        float windY = flex * (0.26 * cos(t * 1.05 - aBase.z * 0.26 + aBase.x * 0.30) - 0.15 * gust * gust);
        float baseX = mix(aBase.x + (gust * flex + 0.02 * sin(t * 1.65 + ang)) * calmWind, landX, pOpen);
        float baseZ = mix(aBase.z, landZ, pOpen);
        float baseY = mix(aBase.y + windY * calmWind, landY, pOpen);
        x = baseX + cos(radialAngle + t * 0.12) * swirlAmt * 0.75;
        z = baseZ + sin(radialAngle + t * 0.10) * swirlAmt * 0.22;
        y = baseY + swirlAmt * (3.2 + seed * 1.3);
        scatterGlow = softAir * 0.72;
      } else {
        float frontMask = 1.0 - smoothstep(4.5, 8.2, aBase.z);
        float centerCorridor = exp(-aBase.x * aBase.x * 0.35) * frontMask;
        float partDir = (aBase.x + (seed - 0.5) * 0.18) >= 0.0 ? 1.0 : -1.0;
        float hoverBob = settle * (0.14 * sin(t * 0.85 + radialAngle * 2.0) + 0.08 * cos(t * 0.55 + seed * 12.0));
        float rise = (fly * (0.28 + blossom * 2.45) + hoverBob * (0.35 + blossom * 0.65)) * liftWeight;
        float yLiftMult = (1.05 + seed * 1.15) * (1.0 - centerCorridor * 0.55);

        // Tuck resting baseline gently beneath the open lotus bowl during launch (driven only by bloom),
        // so the fall curve itself decelerates monotonically to the ground with ZERO end-of-fall jerk.
        float rBase = length(vec2(aBase.x, aBase.z - 8.5));
        float underMask = (1.0 - smoothstep(4.8, 7.2, rBase)) * smoothstep(0.10, 0.85, bloom);
        float uApprox = clamp((rBase - 0.9) / 4.6, 0.0, 1.0);
        float lotusFloorY = 0.42 + smoothstep(0.0, 1.0, bloom) * 2.10;
        float restLiftY = (0.22 * (0.28 + blossom * 2.45)) * liftWeight * yLiftMult;
        float underCeil = lotusFloorY - 0.56 + uApprox * uApprox * 1.56 - restLiftY;
        float diffU = underCeil - y;
        float smoothMinY = underCeil - 0.5 * (diffU + sqrt(diffU * diffU + 0.36));
        y = mix(y, smoothMinY, underMask);

        x += cos(radialAngle + t * 0.12) * rise * 0.65 + partDir * fly * blossom * centerCorridor * (1.25 + seed * 0.55);
        y += rise * yLiftMult;
        z += sin(radialAngle + t * 0.10) * rise * 0.18 * (1.0 - frontMask * 0.85);
        scatterGlow = fly * blossom * 0.72 * (1.0 - settle * 0.55);
      }
    } else {
      y -= bloom * 0.22;
      opacity = 1.0 - smoothstep(0.15, 0.75, bloom);
    }

    spriteRot = ang * 0.28 + gust * mix(0.048, 0.12, blossom) + sin(t * 1.1 + ang) * 0.02 + fly * 0.52;
    if (landedAmt > 0.001) {
      spriteRot = mix(spriteRot, aExtra.y * 0.65 + seed * 6.28318 + sin(t * 0.85 + aExtra.y * 2.0) * 0.03, landedAmt);
    }
  }

  vec3 view = uViewMat * (vec3(x, y, z) - uCamPos);
  float dep = view.z;

  if (isHeart < 0.5) {
    float nearBlur = (1.0 - smoothstep(1.0, 2.8, dep)) * 0.62;
    float farBlur = smoothstep(32.0, 62.0, dep) * 0.72;
    float bgBokeh = smoothstep(12.0, 26.0, dep) * smoothstep(0.25, 0.95, settle) * 0.64;
    defocus = max(max(nearBlur, farBlur), bgBokeh) * (1.0 - landedAmt);
    float nearAlpha = smoothstep(mix(0.55, 1.35, dive), mix(1.28, 3.0, dive), dep);
    float farHorizon = 1.0 - smoothstep(62.0, 76.0, dep);
    opacity *= nearAlpha * farHorizon;
  }

  vec2 p = vec2((view.x * uLens.x) / uLens.y, view.y * uLens.x);
  p.x += uAim.x * dep * mix(0.032, 0.018, settle);
  p.y += uAim.y * dep * mix(0.020, 0.014, settle);

  vec2 diff = p / max(0.1, dep) - uAim;
  diff.x *= uLens.y;
  float clos = exp(-dot(diff, diff) * 14.0) * uAction.w;
  vec2 push = diff * clos * 0.12 * dep * (1.0 - dive * 0.7) * (1.0 - landedAmt);
  push.x /= uLens.y;
  p += push;

  float zn = ((dep - 0.35) / 78.0) * 2.0 - 1.0;
  gl_Position = vec4(p, zn * dep, dep);

  float sizePx = (ptSize * uLens.z * uLens.x * 0.5) / max(0.65, dep);
  float flyShrink = 1.0 - fly * blossom * (1.0 - isHeart) * 0.22;
  float landerScale = mix(0.48, 0.72, fract(seed * 7.13));
  float finalPtSize = sizePx * flyShrink * mix(1.0, landerScale, landedAmt);
  gl_PointSize = clamp(finalPtSize, 1.0, uLens.w);

  float farFade = 1.0 - smoothstep(14.0, 56.0, dep) * mix(0.58, 0.28, max(blossom, isHeart));
  float backLift = smoothstep(10.0, 32.0, dep) * mix(0.06, 0.12, blossom);
  float hillTex = 0.88 + 0.24 * (0.5 + 0.5 * sin(x * 0.45 + z * 0.30) * cos(x * 0.28 - z * 0.38));
  float bright = (0.30 + 0.70 * farFade + backLift) * lit * mix(0.76, 1.02, max(blossom, isHeart));
  bright *= mix(1.0, hillTex, smoothstep(10.0, 20.0, dep));
  bright *= 1.0 + clos * 0.30 * max(blossom, isHeart);
  bright *= mix(1.0, 0.76, settle);
  bright = mix(bright, (0.94 + 0.14 * lit), landedAmt);

  if (bug > 0.5) {
    float beat = 0.5 + 0.5 * sin(t * (1.6 + seed * 0.85) + ang);
    opacity = (0.18 + 0.82 * smoothstep(0.24, 0.94, beat)) * (1.0 - smoothstep(16.0, 36.0, dep));
  }
  if (uOverlay.y > 0.5) {
    if (isPad > 0.5 || dep > 18.5) opacity = 0.0;
    else if (blossom < 0.5) opacity *= 1.0 - smoothstep(0.08, 0.35, bloom);
  }
  opacity *= uOverlay.x;

  float ptMargin = (finalPtSize / max(1.0, uLens.z)) * 1.15;
  float clipX = dep * (1.06 + ptMargin / max(0.35, uLens.y));
  float clipY = dep * (1.06 + ptMargin);
  if (dep < 0.55 || dep > 77.0 || opacity < 0.004 || abs(p.x) > clipX || abs(p.y) > clipY) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
  }

  float tileCol = mod(tile, 8.0);
  float tileRow = floor(tile / 8.0);
  float isBlue = step(15.9, tile) * (1.0 - dust) * step(5.5, tileCol);

  vBot = vec4(tile, clamp(defocus, 0.0, 1.0), seed, max(blossom * (1.0 - dust), isHeart));
  vColor = vec4(bright, scatterGlow, dust, clamp(opacity, 0.0, 1.0));
  vRotCS = vec2(cos(spriteRot), sin(spriteRot));
  vDepthFx = vec2(
    smoothstep(42.0, 74.0, dep) * 0.18,
    smoothstep(11.0, 44.0, dep)
  ) * (1.0 - dust) * (1.0 - bug) * (1.0 - isHeart);
  vTileInfo = vec3(tileCol, tileRow, isBlue);
}`;

export const PV_FRAG = `precision mediump float;
uniform sampler2D uImage;
varying vec4 vBot;
varying vec4 vColor;
varying vec2 vRotCS;
varying vec2 vDepthFx;
varying vec3 vTileInfo;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float q2 = dot(q, q);
  if (vBot.x > 32.9) {
    float core = exp(-q2 * 310.0);
    float aura = exp(-q2 * 24.0);
    float a = clamp((core + 0.46 * aura) * vColor.w, 0.0, 1.0);
    if (a < 0.008) discard;
    vec3 fireCol = mix(vec3(1.0, 0.74, 0.85), vec3(1.0, 0.97, 0.88), core);
    gl_FragColor = vec4(fireCol * a, a);
    return;
  }

  if (vColor.z > 0.5) {
    float a = exp(-q2 * 26.0) * (0.12 + vBot.z * 0.32) * vColor.w;
    gl_FragColor = vec4(vec3(0.98, 0.84, 0.91) * a, a);
    return;
  }

  if (q2 > 0.248) discard;

  vec2 uv = mat2(vRotCS.x, -vRotCS.y, vRotCS.y, vRotCS.x) * q + 0.5;
  if (any(lessThan(uv, vec2(0.003))) || any(greaterThan(uv, vec2(0.997)))) discard;

  vec2 loc = (vTileInfo.xy + uv) / 8.0;

  float blurMix = smoothstep(0.22, 0.62, vBot.y);
  vec4 texel;
  if (blurMix <= 0.004) {
    texel = texture2D(uImage, loc);
  } else if (blurMix >= 0.996) {
    texel = texture2D(uImage, loc + vec2(0.0, 0.5));
  } else {
    texel = mix(texture2D(uImage, loc), texture2D(uImage, loc + vec2(0.0, 0.5)), blurMix);
  }

  if (texel.a < 0.015) discard;

  float isBlue = vTileInfo.z;
  vec3 pinkTint = mix(vec3(1.04, 0.94, 1.00), vec3(1.14, 0.78, 0.98), vDepthFx.y * mix(0.45, 1.0, vBot.w));
  vec3 blueTint = mix(vec3(0.94, 1.00, 1.08), vec3(0.76, 0.93, 1.16), vDepthFx.y);
  vec3 backTint = mix(pinkTint, blueTint, isBlue);
  vec3 rgb = texel.rgb * vColor.x * backTint;
  float bloomGlow = vBot.w * (0.30 + vColor.y * 0.34 + vDepthFx.y * 0.32);
  vec3 glowCol = mix(vec3(0.34, 0.14, 0.24), vec3(0.14, 0.26, 0.40), isBlue);
  rgb += glowCol * texel.a * bloomGlow * min(vColor.x, 1.15);
  rgb += vec3(0.04, 0.01, 0.03) * texel.a * vDepthFx.y * (1.0 - vBot.w);
  if (vBot.w > 0.5) {
    vec3 straight = rgb / max(texel.a, 0.001);
    straight = (straight / (vec3(1.0) + straight * 0.28)) * 1.14;
    if (isBlue > 0.5) {
      straight.r = min(straight.r, straight.b * 0.84);
      straight.g = min(straight.g, straight.b * 0.93);
    } else {
      straight.g = min(straight.g, straight.r * 0.82);
    }
    rgb = clamp(straight, 0.0, 1.0) * texel.a;
  }
  vec3 mistCol = vec3(0.16, 0.04, 0.10);
  rgb = mix(rgb, mistCol * texel.a, vDepthFx.x);
  gl_FragColor = vec4(rgb * vColor.w, texel.a * vColor.w);
}`;
