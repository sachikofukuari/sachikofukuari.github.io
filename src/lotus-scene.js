/**
 * WebGL Botanical Lotus Blossom & Full-Depth Bokeh Meadow Scene Orchestrator.
 * Coordinates shader compilation, procedural atlas generation, mesh/meadow buffers,
 * radix depth sorting, and C1-smooth flight animation across intro & inner tabs.
 */
import { isTouchDevice as detectTouchDevice } from "./utils.js";
import { buildBotanicalAtlas, makeSvgFallbackMarkup } from "./lotus/atlas.js";
import { SAKURA_X, SAKURA_Z, buildSakuraMeshData, buildStamenMeshData, buildViewMatrix } from "./lotus/geometry.js";
import { buildMeadowData } from "./lotus/meadow.js";
import {
  BG_FRAG,
  BG_VERT,
  GLOW_FRAG,
  GLOW_VERT,
  PV_VERT,
  SAKURA_VERT,
  STAMEN_FRAG,
  STAMEN_VERT,
  compileProgram,
  getPvFrag,
  getSakuraFrag,
} from "./lotus/shaders.js";

const S = Math.sin;
const C = Math.cos;

export function createLotusScene(canvas, options) {
  const opts = options || {};
  const onFallback = typeof opts.onFallback === "function" ? opts.onFallback : function () {};
  const skyCanvas = opts.skyCanvas || document.getElementById("sky-canvas");

  let disposed = false;
  let paused = !!opts.paused;
  let bloomTarget = opts.initialOpen ? 1 : 0;
  let bloomMix = bloomTarget;
  let settleTarget = opts.initialOpen ? 1 : 0;
  let settleMix = settleTarget;
  let flyTarget = opts.initialOpen ? 0.22 : 0;
  let flyStage0 = flyTarget;
  let flyStage1 = flyTarget;
  let flyMix = flyTarget;
  let fallElapsed = opts.initialOpen ? 10 : 0;

  const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  function createNoopApi() {
    return {
      setBloom() {},
      setTabIndex() {},
      setPaused() {},
      destroy() {},
    };
  }

  function triggerFallback() {
    document.body.classList.add("webgl-fallback");
    const fb = document.getElementById("lotus-svg-fallback");
    if (fb) {
      fb.innerHTML = makeSvgFallbackMarkup();
      fb.hidden = false;
    }
    onFallback();
  }

  if (!canvas) {
    triggerFallback();
    return createNoopApi();
  }

  const isSmallScreen =
    window.innerWidth <= 820 ||
    (window.matchMedia("(pointer: coarse)").matches &&
      Math.min(window.innerWidth, window.innerHeight) <= 900);
  const lowEnd = isSmallScreen;
  const isTouchDevice = detectTouchDevice();
  const sceneInitMs = performance.now();

  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    depth: true,
    stencil: true,
    antialias: true,
    preserveDrawingBuffer: false,
    powerPreference: "default",
  });

  if (!gl) {
    triggerFallback();
    return createNoopApi();
  }

  const skyGl =
    skyCanvas && skyCanvas !== canvas
      ? skyCanvas.getContext("webgl", {
          alpha: false,
          depth: false,
          stencil: false,
          antialias: false,
          preserveDrawingBuffer: false,
          powerPreference: "default",
        })
      : null;
  const bgGl = skyGl || gl;
  const hasUint32Index = Boolean(gl.getExtension("OES_element_index_uint"));
  let hasTexLod = Boolean(gl.getExtension("EXT_shader_texture_lod"));

  let seed = 4827193;
  const R = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };

  let sliceTick = performance.now();
  async function yieldSlice() {
    if (performance.now() - sliceTick < 14) return;
    if (self.scheduler && typeof self.scheduler.yield === "function") {
      await self.scheduler.yield();
    } else {
      await new Promise((r) => setTimeout(r, 0));
    }
    sliceTick = performance.now();
    if (disposed) throw new Error("Scene disposed");
  }

  const bgProg = compileProgram(bgGl, BG_VERT, BG_FRAG);
  const sakuraMeshProg = compileProgram(gl, SAKURA_VERT, getSakuraFrag());
  const stamenProg = compileProgram(gl, STAMEN_VERT, STAMEN_FRAG);
  const glowProg = compileProgram(gl, GLOW_VERT, GLOW_FRAG);
  let pvProg;
  try {
    pvProg = compileProgram(gl, PV_VERT, getPvFrag(hasTexLod));
  } catch (err) {
    if (!hasTexLod) throw err;
    hasTexLod = false;
    pvProg = compileProgram(gl, PV_VERT, getPvFrag(false));
  }

  function makeBufferOn(targetGl, data) {
    const b = targetGl.createBuffer();
    targetGl.bindBuffer(targetGl.ARRAY_BUFFER, b);
    targetGl.bufferData(targetGl.ARRAY_BUFFER, data, targetGl.STATIC_DRAW);
    return b;
  }

  function makeElementBuffer(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }

  const bgQuadBuf = makeBufferOn(bgGl, new Float32Array([-1, -1, 3, -1, -1, 3]));
  const glowQuadBuf = makeBufferOn(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));

  let atlasTex = null;
  let atlasTileSize = 256;
  let particleBuf = null;
  let meadowEbos = [null, null];
  let overlayEbos = [null, null];
  let eboSlot = 0;
  let overlayCount = 0;
  let coreEbo = null;
  let meadow = null;
  let sakuraMesh = null;
  let stamenMesh = null;

  const bucketCounts = new Int32Array(256);
  const hiBucketCounts = new Int32Array(256);
  const bucketOffsets = new Int32Array(256);
  const ovBucketCounts = new Int32Array(256);
  const ovBucketOffsets = new Int32Array(256);
  let hasSortedOnce = false;
  let wasAnimating = false;
  let wasAnimatingFrame = false;
  let lastSortNow = 0;
  let lastSortedYaw = 0;
  let lastSortedElev = 0;
  let lastSortedDist = 0;
  let diveTarget = opts.initialOpen ? 1 : 0;
  let diveMix = diveTarget;
  let tabYawTarget = 0;
  let tabYawMix = 0;

  function sortMeadowByCamera(camX, camY, camZ, viewMat, maxOverlayDep, lotusRadius, sortDist) {
    if (!meadowEbos[0] || !meadow || meadow.meadowCount === 0) return;
    const {
      meadowCount,
      meadowPosX,
      meadowPosY,
      meadowPosZ,
      meadowLayerBias,
      meadowOrigIdx,
      meadowFlags,
      ovFlags,
      tempOv,
      sortedMeadow,
      overlayIndices,
      depthKeys,
      tempKeys,
      tempIdx,
    } = meadow;
    const rx = viewMat[0];
    const rz = viewMat[6];
    const fx = viewMat[2];
    const fy = viewMat[5];
    const fz = viewMat[8];
    const depthScale16 = 65535 / 84.0;

    bucketCounts.fill(0);
    hiBucketCounts.fill(0);
    ovBucketCounts.fill(0);
    for (let k = 0; k < meadowCount; k++) {
      const dx = meadowPosX[k] - camX;
      const dy = meadowPosY[k] - camY;
      const dz = meadowPosZ[k] - camZ;
      const dep = dx * fx + dy * fy + dz * fz - meadowLayerBias[k];
      let k16 = 65535 - (((dep + 4.0) * depthScale16) | 0);
      if (k16 < 0) k16 = 0;
      else if (k16 > 65535) k16 = 65535;
      depthKeys[k] = k16;
      const hi = k16 >>> 8;
      bucketCounts[k16 & 255]++;
      hiBucketCounts[hi]++;

      const depRatio = dep / Math.max(4.0, sortDist);
      const coneScale = depRatio < 0.35 ? 0.35 : depRatio > 1.25 ? 1.25 : depRatio;
      const maxViewX = lotusRadius * coneScale + 2.6;
      const flags = meadowFlags[k];
      const inOv =
        !(flags & 1) &&
        ((flags & 2) !== 0 ||
          (dep >= -2.5 && dep <= maxOverlayDep && Math.abs(dx * rx + dz * rz) <= maxViewX));
      if (inOv) {
        ovFlags[k] = 1;
        ovBucketCounts[hi]++;
      } else {
        ovFlags[k] = 0;
      }
    }

    let acc = 0;
    for (let b = 0; b < 256; b++) {
      bucketOffsets[b] = acc;
      acc += bucketCounts[b];
    }
    for (let k = 0; k < meadowCount; k++) {
      const k16 = depthKeys[k];
      const dst = bucketOffsets[k16 & 255]++;
      tempIdx[dst] = meadowOrigIdx[k];
      tempKeys[dst] = k16;
      tempOv[dst] = ovFlags[k];
    }

    acc = 0;
    let ovAcc = 0;
    for (let b = 0; b < 256; b++) {
      bucketOffsets[b] = acc;
      acc += hiBucketCounts[b];
      ovBucketOffsets[b] = ovAcc;
      ovAcc += ovBucketCounts[b];
    }
    overlayCount = ovAcc;
    for (let k = 0; k < meadowCount; k++) {
      const hi = tempKeys[k] >>> 8;
      const dst = bucketOffsets[hi]++;
      const v = tempIdx[k] << 2;
      const o = dst * 6;
      sortedMeadow[o] = v;
      sortedMeadow[o + 1] = v + 1;
      sortedMeadow[o + 2] = v + 2;
      sortedMeadow[o + 3] = v + 2;
      sortedMeadow[o + 4] = v + 1;
      sortedMeadow[o + 5] = v + 3;
      if (tempOv[k]) {
        const oo = (ovBucketOffsets[hi]++) * 6;
        overlayIndices[oo] = v;
        overlayIndices[oo + 1] = v + 1;
        overlayIndices[oo + 2] = v + 2;
        overlayIndices[oo + 3] = v + 2;
        overlayIndices[oo + 4] = v + 1;
        overlayIndices[oo + 5] = v + 3;
      }
    }

    eboSlot ^= 1;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meadowEbos[eboSlot]);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, sortedMeadow);
    if (overlayCount > 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, overlayEbos[eboSlot]);
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, overlayIndices.subarray(0, overlayCount * 6));
    }
    hasSortedOnce = true;
  }

  let raf = 0;
  let lastNow = 0;
  let widthPx = 0;
  let heightPx = 0;
  let skyWidthPx = 0;
  let skyHeightPx = 0;
  let avgGap = 16;
  let hasFreshPerfSample = false;
  let budgetAt = 0;
  let budget = lowEnd ? 1450000 : 2000000;

  let tClock = 0;
  let mx = 0;
  let my = 0;
  let ax = 0;
  let ay = 0;
  let mouseTarget = 0;
  let mouseSmooth = 0;
  let lastPointerMoveMs = 0;
  let windowBlurred = false;
  let pendingFlyDown = false;
  let flyDownTimer = 0;
  let hasPaintedOnce = false;
  let frameTicks = 0;
  let smoothDt = 1 / 60;
  let startupWatchTimer = 0;

  async function buildScene() {
    const atlasData = await buildBotanicalAtlas(gl, R, yieldSlice, hasTexLod);
    atlasTex = atlasData.texture;
    atlasTileSize = atlasData.tileSize;

    const sakuraData = buildSakuraMeshData(R);
    sakuraMesh = {
      buffer: makeBufferOn(gl, sakuraData.meshData),
      indexBuffer: makeElementBuffer(sakuraData.indexData),
      indexCount: sakuraData.indexCount,
    };

    const stamenData = buildStamenMeshData(R);
    stamenMesh = {
      buffer: makeBufferOn(gl, stamenData.data),
      indexBuffer: makeElementBuffer(stamenData.indices),
      indexCount: stamenData.indexCount,
    };

    meadow = await buildMeadowData({ lowEnd, R, yieldSlice, useUint32: hasUint32Index });
    particleBuf = makeBufferOn(gl, meadow.packed);
    meadow.packed = null;

    const emptyMeadowBytes = meadow.sortedMeadow.byteLength;
    const emptyOverlayBytes = meadow.overlayIndices.byteLength;
    for (let s = 0; s < 2; s++) {
      meadowEbos[s] = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meadowEbos[s]);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, emptyMeadowBytes, gl.DYNAMIC_DRAW);
      overlayEbos[s] = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, overlayEbos[s]);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, emptyOverlayBytes, gl.DYNAMIC_DRAW);
    }
    coreEbo = makeElementBuffer(meadow.coreIndices);
    hasSortedOnce = false;

    if (!document.hidden) windowBlurred = false;
    document.body.classList.add("webgl-ready");
    wake();
    clearTimeout(startupWatchTimer);
    startupWatchTimer = setTimeout(() => {
      startupWatchTimer = 0;
      if (!disposed && !document.hidden && !paused && frameTicks < 5) {
        windowBlurred = false;
        resumeScene();
      }
    }, 600);
  }

  const bgPosLoc = bgGl.getAttribLocation(bgProg, "pos");
  const bgUniforms = {
    uTime: bgGl.getUniformLocation(bgProg, "uTime"),
    uAspect: bgGl.getUniformLocation(bgProg, "uAspect"),
    uFocal: bgGl.getUniformLocation(bgProg, "uFocal"),
    uViewMat: bgGl.getUniformLocation(bgProg, "uViewMat"),
    uAim: bgGl.getUniformLocation(bgProg, "uAim"),
    uSettle: bgGl.getUniformLocation(bgProg, "uSettle"),
    uSkyFade: bgGl.getUniformLocation(bgProg, "uSkyFade"),
  };

  const smAttrs = {
    aPetalUV: gl.getAttribLocation(sakuraMeshProg, "aPetalUV"),
    aPetalDim: gl.getAttribLocation(sakuraMeshProg, "aPetalDim"),
  };
  const smUniforms = {
    uCamPos: gl.getUniformLocation(sakuraMeshProg, "uCamPos"),
    uViewMat: gl.getUniformLocation(sakuraMeshProg, "uViewMat"),
    uLens: gl.getUniformLocation(sakuraMeshProg, "uLens"),
    uAction: gl.getUniformLocation(sakuraMeshProg, "uAction"),
    uState: gl.getUniformLocation(sakuraMeshProg, "uState"),
    uAim: gl.getUniformLocation(sakuraMeshProg, "uAim"),
    uSettle: gl.getUniformLocation(sakuraMeshProg, "uSettle"),
  };

  const stAttrs = {
    aPart: gl.getAttribLocation(stamenProg, "aPart"),
    aGeom: gl.getAttribLocation(stamenProg, "aGeom"),
  };
  const stUniforms = {
    uCamPos: gl.getUniformLocation(stamenProg, "uCamPos"),
    uViewMat: gl.getUniformLocation(stamenProg, "uViewMat"),
    uLens: gl.getUniformLocation(stamenProg, "uLens"),
    uAction: gl.getUniformLocation(stamenProg, "uAction"),
    uState: gl.getUniformLocation(stamenProg, "uState"),
    uAim: gl.getUniformLocation(stamenProg, "uAim"),
    uSettle: gl.getUniformLocation(stamenProg, "uSettle"),
  };

  const glowAttrs = {
    aQuad: gl.getAttribLocation(glowProg, "aQuad"),
  };
  const glowUniforms = {
    uCamPos: gl.getUniformLocation(glowProg, "uCamPos"),
    uViewMat: gl.getUniformLocation(glowProg, "uViewMat"),
    uLens: gl.getUniformLocation(glowProg, "uLens"),
    uAim: gl.getUniformLocation(glowProg, "uAim"),
    uSettle: gl.getUniformLocation(glowProg, "uSettle"),
    uGlowCenter: gl.getUniformLocation(glowProg, "uGlowCenter"),
    uGlowColorA: gl.getUniformLocation(glowProg, "uGlowColorA"),
    uGlowColorB: gl.getUniformLocation(glowProg, "uGlowColorB"),
  };

  const pvAttrs = {
    aBase: gl.getAttribLocation(pvProg, "aBase"),
    aStyle: gl.getAttribLocation(pvProg, "aStyle"),
    aExtra: gl.getAttribLocation(pvProg, "aExtra"),
    aCorner: gl.getAttribLocation(pvProg, "aCorner"),
  };
  const pvUniforms = {
    uCamPos: gl.getUniformLocation(pvProg, "uCamPos"),
    uViewMat: gl.getUniformLocation(pvProg, "uViewMat"),
    uLens: gl.getUniformLocation(pvProg, "uLens"),
    uAction: gl.getUniformLocation(pvProg, "uAction"),
    uState: gl.getUniformLocation(pvProg, "uState"),
    uAim: gl.getUniformLocation(pvProg, "uAim"),
    uOverlay: gl.getUniformLocation(pvProg, "uOverlay"),
    uTilePx: gl.getUniformLocation(pvProg, "uTilePx"),
    uImage: gl.getUniformLocation(pvProg, "uImage"),
  };

  function isBackgrounded() {
    return document.hidden || windowBlurred;
  }

  function wake() {
    if (!raf && !disposed && !isBackgrounded()) {
      if (!paused || !hasPaintedOnce) {
        raf = requestAnimationFrame(renderFrame);
      }
    }
  }

  function suspendScene() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    lastNow = 0;
    smoothDt = 1 / 60;
    if (flyDownTimer) {
      clearTimeout(flyDownTimer);
      flyDownTimer = 0;
      pendingFlyDown = true;
    }
  }

  function resumeScene() {
    if (disposed || paused || isBackgrounded()) return;
    if (pendingFlyDown && bloomTarget === 1) {
      pendingFlyDown = false;
      fallElapsed = 0;
      flyTarget = 0.22;
      settleTarget = 1;
    }
    lastNow = 0;
    smoothDt = 1 / 60;
    wake();
  }

  function renderFrame(now) {
    raf = 0;
    if (disposed || !canvas.isConnected || !particleBuf || !atlasTex || !sakuraMesh || !stamenMesh || !meadow) return;
    if (isBackgrounded() && hasPaintedOnce) return;

    const isReduced = reducedMotionMQ.matches;
    const animating =
      Boolean(flyDownTimer) ||
      Math.abs(bloomTarget - bloomMix) > 0.003 ||
      Math.abs(flyTarget - flyStage0) > 0.0025 ||
      Math.abs(flyTarget - flyStage1) > 0.0025 ||
      Math.abs(flyTarget - flyMix) > 0.0025 ||
      Math.abs(diveTarget - diveMix) > 0.003 ||
      Math.abs(settleTarget - settleMix) > 0.003 ||
      Math.abs(tabYawTarget - tabYawMix) > 0.003;

    const pointerActive = now - lastPointerMoveMs < 550;
    const settledOpen = settleMix > 0.96 && diveMix > 0.96 && bloomTarget === 1 && !animating;
    const minGap = animating ? 0 : settledOpen ? 24 : pointerActive ? 14 : 24;

    const gap = now - (lastNow || now - 16);
    if (hasPaintedOnce && !paused && !isReduced && minGap > 0 && gap < minGap) {
      wake();
      return;
    }

    const startingAnim = animating && !wasAnimatingFrame;
    wasAnimatingFrame = animating;
    const rawDt = startingAnim
      ? Math.min(1 / 60, Math.max(0.004, gap * 0.001))
      : Math.min(0.034, Math.max(0.004, gap * 0.001));
    smoothDt = startingAnim ? rawDt : animating ? smoothDt * 0.72 + rawDt * 0.28 : rawDt;
    const dt = Math.min(0.028, smoothDt);
    lastNow = now;
    hasPaintedOnce = true;
    if (frameTicks < 6) {
      frameTicks++;
      if (frameTicks === 5) document.body.dataset.animStarted = "1";
    }

    const bloomRate = bloomTarget > bloomMix ? 2.15 : 1.25;
    const bloomEase = isReduced ? 1 : 1 - Math.exp(-dt * bloomRate);
    const diveRate = diveTarget > diveMix ? 1.55 : 1.40;
    const diveEase = isReduced ? 1 : 1 - Math.exp(-dt * diveRate);
    const fastEase = isReduced ? 1 : 1 - Math.exp(-dt * 5.0);
    const tabEase = isReduced ? 1 : 1 - Math.exp(-dt * 3.4);
    if (!paused && !isReduced && bloomTarget === 1 && !flyDownTimer && flyTarget < 0.5) {
      fallElapsed += dt;
    }
    const fT = Math.max(0, Math.min(1, fallElapsed / 2.10));
    const fallRamp = fT * fT * (3 - 2 * fT);
    const nearGround = Math.max(0, Math.min(1, (flyMix - flyTarget) / 0.34));
    const groundCushion = 0.61 + 0.53 * nearGround;
    const fallRate = 0.28 + (groundCushion - 0.28) * fallRamp;
    const flyRate = flyTarget > flyStage0 ? 4.4 : flyTarget > 0.05 ? fallRate : 3.6;
    const flyEase = isReduced ? 1 : 1 - Math.exp(-dt * flyRate);
    const settleRate = settleTarget > settleMix ? 0.10 + 0.61 * fallRamp : 1.55;

    if (!paused) {
      if (!isReduced) tClock += dt;
      bloomMix += (bloomTarget - bloomMix) * bloomEase;
      if (!isReduced && bloomTarget < bloomMix) {
        bloomMix = Math.max(bloomTarget, bloomMix - dt * 0.22);
      }
      diveMix += (diveTarget - diveMix) * diveEase;
      settleMix += (settleTarget - settleMix) * (isReduced ? 1 : 1 - Math.exp(-dt * settleRate));
      tabYawMix += (tabYawTarget - tabYawMix) * tabEase;

      flyStage0 += (flyTarget - flyStage0) * flyEase;
      flyStage1 += (flyStage0 - flyStage1) * flyEase;
      flyMix += (flyStage1 - flyMix) * flyEase;

      ax += (mx - ax) * fastEase;
      ay += (my - ay) * fastEase;
      mouseSmooth += (mouseTarget - mouseSmooth) * fastEase;
    }

    if (!settledOpen && minGap <= 16) {
      avgGap = avgGap * 0.88 + Math.min(200, Math.max(4, gap)) * 0.12;
      hasFreshPerfSample = true;
    }

    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    const deviceDpr = window.devicePixelRatio || 1;
    const maxDpr = lowEnd ? 1.75 : 1.25;
    const targetDpr = Math.min(deviceDpr, maxDpr);
    const nativePixels = Math.round(cw * ch * targetDpr * targetDpr);
    const hi = Math.min(nativePixels, lowEnd ? 1450000 : 2000000);
    const minDprFloor = Math.min(targetDpr, lowEnd ? 1.25 : 1.0);
    const minBudget = Math.min(hi, Math.round(cw * ch * minDprFloor * minDprFloor));

    if (animating) {
      budgetAt = now;
    } else if (hasFreshPerfSample && now - budgetAt > 1500) {
      if (avgGap > 28 && budget > minBudget) {
        budget = Math.max(minBudget, Math.round(budget * 0.85));
        avgGap = 22;
      } else if (avgGap < 18 && budget < hi) {
        budget = Math.min(hi, Math.round(budget * 1.12));
        avgGap = 22;
      }
      hasFreshPerfSample = false;
      budgetAt = now;
    }

    const effectiveBudget = Math.min(budget, hi);
    const dpr = Math.min(targetDpr, Math.sqrt(effectiveBudget / (cw * ch)));
    const maxPointSize = Math.round((lowEnd ? 84 : 96) * dpr);
    const W = Math.max(2, Math.round(cw * dpr));
    const H = Math.max(2, Math.round(ch * dpr));
    const aspect = W / H;
    const focal = aspect < 0.85 ? 1.18 : 1.72;

    if (widthPx !== W || heightPx !== H) {
      canvas.width = widthPx = W;
      canvas.height = heightPx = H;
      gl.viewport(0, 0, widthPx, heightPx);
    }

    const dCurve = diveMix * diveMix * (3 - 2 * diveMix);
    const orbitYaw =
      dCurve * 1.62 +
      tabYawMix * dCurve +
      (isReduced ? 0 : S(tClock * 0.22) * (0.014 + 0.018 * dCurve)) +
      ax * (0.02 + 0.06 * dCurve);
    const introTargetY = 2.683;
    const introElev = Math.atan2(2.58 - introTargetY, 8.85);
    const openElev = 0.42 + ay * 0.045 * dCurve;
    const elev = introElev + (openElev - introElev) * Math.pow(dCurve, 0.92);
    const openDist = aspect < 0.85 ? 12.8 : 11.4;
    const dist = 8.85 + (openDist - 8.85) * dCurve + S(dCurve * Math.PI) * 1.15;

    const targetX = 0.0;
    const openTargetY = aspect < 0.85 ? 9.40 : 7.40;
    const targetY = introTargetY + (openTargetY - introTargetY) * dCurve;
    const targetZ = SAKURA_Z;

    const horiz = dist * C(elev);
    const camX = targetX + S(orbitYaw) * horiz + (1 - dCurve) * (ax * 0.18 + (isReduced ? 0 : 0.14 * S(tClock * 0.25)));
    const camZ = targetZ - C(orbitYaw) * horiz;
    const camY = targetY + dist * S(elev) + (1 - dCurve) * (isReduced ? 0 : 0.05 * S(tClock * 0.34));
    const viewMat = buildViewMatrix(camX, camY, camZ, targetX, targetY, targetZ);
    const skyFade = Math.max(0.0, 1.0 - dCurve * 1.0);

    // 1. Camera-Synced 360-Degree Spherical Starry Sky + Periodic Aurora
    if (skyGl && skyCanvas && skyCanvas.isConnected) {
      const skyDpr = Math.min(deviceDpr, lowEnd ? 1.0 : 0.85);
      const sW = Math.max(2, Math.round(cw * skyDpr));
      const sH = Math.max(2, Math.round(ch * skyDpr));
      const skyResized = skyWidthPx !== sW || skyHeightPx !== sH;
      if (skyResized) {
        skyCanvas.width = skyWidthPx = sW;
        skyCanvas.height = skyHeightPx = sH;
        skyGl.viewport(0, 0, skyWidthPx, skyHeightPx);
      }
      skyGl.disable(skyGl.DEPTH_TEST);
      skyGl.disable(skyGl.CULL_FACE);
      skyGl.disable(skyGl.BLEND);
      skyGl.useProgram(bgProg);
      skyGl.bindBuffer(skyGl.ARRAY_BUFFER, bgQuadBuf);
      skyGl.enableVertexAttribArray(bgPosLoc);
      skyGl.vertexAttribPointer(bgPosLoc, 2, skyGl.FLOAT, false, 0, 0);
      skyGl.uniform1f(bgUniforms.uTime, tClock);
      skyGl.uniform1f(bgUniforms.uAspect, skyWidthPx / skyHeightPx);
      skyGl.uniform1f(bgUniforms.uFocal, focal);
      skyGl.uniformMatrix3fv(bgUniforms.uViewMat, false, viewMat);
      skyGl.uniform2f(bgUniforms.uAim, ax, ay);
      skyGl.uniform1f(bgUniforms.uSettle, settleMix);
      skyGl.uniform1f(bgUniforms.uSkyFade, skyFade);
      skyGl.drawArrays(skyGl.TRIANGLES, 0, 3);
      skyGl.disableVertexAttribArray(bgPosLoc);

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.useProgram(bgProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, bgQuadBuf);
      gl.enableVertexAttribArray(bgPosLoc);
      gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(bgUniforms.uTime, tClock);
      gl.uniform1f(bgUniforms.uAspect, aspect);
      gl.uniform1f(bgUniforms.uFocal, focal);
      gl.uniformMatrix3fv(bgUniforms.uViewMat, false, viewMat);
      gl.uniform2f(bgUniforms.uAim, ax, ay);
      gl.uniform1f(bgUniforms.uSettle, settleMix);
      gl.uniform1f(bgUniforms.uSkyFade, skyFade);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(bgPosLoc);
    }

    const bloomS = bloomMix * bloomMix * (3 - 2 * bloomMix);
    const bloomLift = bloomS * 2.10;
    const anchorY = 0.42 + bloomLift;
    const sharedScale = 1.0 + Math.min(1, Math.max(0, bloomMix / 0.92)) * 0.40 + settleMix * 0.08;

    const sortYaw = animating ? orbitYaw : dCurve * 1.62 + tabYawMix * dCurve;
    const sortElev = animating ? elev : introElev + (0.42 - introElev) * Math.pow(dCurve, 0.92);
    const sortDist = animating ? dist : 8.85 + (openDist - 8.85) * dCurve + S(dCurve * Math.PI) * 1.15;
    const sortThreshold = animating ? 0.022 : 0.002;
    const distThreshold = animating ? 0.18 : 0.06;
    const camMoved =
      Math.abs(sortYaw - lastSortedYaw) > sortThreshold ||
      Math.abs(sortElev - lastSortedElev) > sortThreshold ||
      Math.abs(sortDist - lastSortedDist) > distThreshold;
    if (
      !hasSortedOnce ||
      wasAnimating !== animating ||
      (camMoved && (!animating || now - lastSortNow >= 45))
    ) {
      const lotusRadius = 2.1 + 4.5 * Math.max(bloomMix, bloomTarget);
      const maxOverlayDep = Math.min(19.2, sortDist + lotusRadius + 2.2);
      if (animating) {
        sortMeadowByCamera(camX, camY, camZ, viewMat, maxOverlayDep, lotusRadius, sortDist);
      } else {
        const baseHoriz = sortDist * C(sortElev);
        const baseCamX = targetX + S(sortYaw) * baseHoriz;
        const baseCamZ = targetZ - C(sortYaw) * baseHoriz;
        const baseCamY = targetY + sortDist * S(sortElev);
        const baseViewMat = buildViewMatrix(baseCamX, baseCamY, baseCamZ, targetX, targetY, targetZ);
        sortMeadowByCamera(baseCamX, baseCamY, baseCamZ, baseViewMat, maxOverlayDep, lotusRadius, sortDist);
      }
      lastSortNow = now;
      wasAnimating = animating;
      lastSortedYaw = sortYaw;
      lastSortedElev = sortElev;
      lastSortedDist = sortDist;
    }

    function drawGlowBillboard(cx, cy, cz, radius, rA, gA, bA, opA, rB, gB, bB, sharpB) {
      gl.useProgram(glowProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, glowQuadBuf);
      gl.enableVertexAttribArray(glowAttrs.aQuad);
      gl.vertexAttribPointer(glowAttrs.aQuad, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3f(glowUniforms.uCamPos, camX, camY, camZ);
      gl.uniformMatrix3fv(glowUniforms.uViewMat, false, viewMat);
      gl.uniform4f(glowUniforms.uLens, focal, aspect, heightPx, maxPointSize);
      gl.uniform2f(glowUniforms.uAim, ax, ay);
      gl.uniform1f(glowUniforms.uSettle, settleMix);
      gl.uniform4f(glowUniforms.uGlowCenter, cx, cy, cz, radius);
      gl.uniform4f(glowUniforms.uGlowColorA, rA, gA, bA, opA);
      gl.uniform4f(glowUniforms.uGlowColorB, rB, gB, bB, sharpB);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(glowAttrs.aQuad);
    }

    const stride = 56;
    const pvIndexType = hasUint32Index ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    function drawPvRange(ebo, count, offsetBytes, overlayAlpha = 1.0, overlayMode = 0.0) {
      if (!ebo || count <= 0) return;
      gl.useProgram(pvProg);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
      gl.enableVertexAttribArray(pvAttrs.aBase);
      gl.vertexAttribPointer(pvAttrs.aBase, 4, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(pvAttrs.aStyle);
      gl.vertexAttribPointer(pvAttrs.aStyle, 4, gl.FLOAT, false, stride, 16);
      gl.enableVertexAttribArray(pvAttrs.aExtra);
      gl.vertexAttribPointer(pvAttrs.aExtra, 4, gl.FLOAT, false, stride, 32);
      gl.enableVertexAttribArray(pvAttrs.aCorner);
      gl.vertexAttribPointer(pvAttrs.aCorner, 2, gl.FLOAT, false, stride, 48);

      gl.uniform3f(pvUniforms.uCamPos, camX, camY, camZ);
      gl.uniformMatrix3fv(pvUniforms.uViewMat, false, viewMat);
      gl.uniform4f(pvUniforms.uLens, focal, aspect, heightPx, maxPointSize);
      gl.uniform4f(pvUniforms.uAction, tClock, bloomMix, flyMix, isReduced ? 0 : mouseSmooth);
      gl.uniform3f(pvUniforms.uState, settleMix, aspect, dCurve);
      gl.uniform2f(pvUniforms.uAim, ax, ay);
      gl.uniform2f(pvUniforms.uOverlay, overlayAlpha, overlayMode);
      gl.uniform1f(pvUniforms.uTilePx, atlasTileSize);
      gl.uniform1i(pvUniforms.uImage, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.drawElements(gl.TRIANGLES, count * 6, pvIndexType, offsetBytes);

      gl.disableVertexAttribArray(pvAttrs.aBase);
      gl.disableVertexAttribArray(pvAttrs.aStyle);
      gl.disableVertexAttribArray(pvAttrs.aExtra);
      gl.disableVertexAttribArray(pvAttrs.aCorner);
    }

    const { meadowCount, coreCount } = meadow;
    const useFrontDepth = meadowCount > 0;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // 2. Full Meadow Layer
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    if (meadowCount > 0) {
      drawPvRange(meadowEbos[eboSlot], meadowCount, 0);
    }

    // 2.5 Screen-Blend Optical Pastel Sakura Pink Back Halo Behind Lotus Blossom
    const closedAmt = Math.max(0, 1 - bloomMix * 2.2);
    gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE);
    drawGlowBillboard(
      SAKURA_X,
      anchorY + (2.35 - 0.90 * bloomMix) * sharedScale,
      SAKURA_Z,
      (3.8 + 5.2 * bloomMix) * sharedScale,
      1.0,
      0.62,
      0.76,
      0.34 + 0.52 * bloomMix,
      1.0,
      0.48,
      0.66,
      5.2
    );
    if (closedAmt > 0.004) {
      drawGlowBillboard(
        SAKURA_X,
        anchorY + 1.95 * sharedScale,
        SAKURA_Z,
        3.25 * sharedScale,
        1.0,
        0.66,
        0.82,
        0.44 * closedAmt,
        1.0,
        0.50,
        0.74,
        3.8
      );
    }
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // 3. Central 3D Curved Luminous Lotus Blossom + Sculpted 3D Stamen Heart & Filaments
    gl.depthMask(true);
    gl.clearDepth(1.0);
    if (useFrontDepth) {
      gl.stencilMask(0xff);
      gl.clearStencil(0);
      gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    } else {
      gl.disable(gl.STENCIL_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(sakuraMeshProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, sakuraMesh.buffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sakuraMesh.indexBuffer);
    gl.enableVertexAttribArray(smAttrs.aPetalUV);
    gl.vertexAttribPointer(smAttrs.aPetalUV, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(smAttrs.aPetalDim);
    gl.vertexAttribPointer(smAttrs.aPetalDim, 4, gl.FLOAT, false, 32, 16);

    gl.uniform3f(smUniforms.uCamPos, camX, camY, camZ);
    gl.uniformMatrix3fv(smUniforms.uViewMat, false, viewMat);
    gl.uniform4f(smUniforms.uLens, focal, aspect, heightPx, maxPointSize);
    gl.uniform4f(smUniforms.uAction, tClock, bloomMix, dCurve, isReduced ? 0 : mouseSmooth);
    gl.uniform2f(smUniforms.uState, settleMix, aspect);
    gl.uniform2f(smUniforms.uAim, ax, ay);
    gl.uniform1f(smUniforms.uSettle, settleMix);

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.depthFunc(gl.LESS);
    gl.drawElements(gl.TRIANGLES, sakuraMesh.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.BLEND);

    gl.disableVertexAttribArray(smAttrs.aPetalUV);
    gl.disableVertexAttribArray(smAttrs.aPetalDim);

    if (bloomMix > 0.08) {
      gl.useProgram(stamenProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, stamenMesh.buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, stamenMesh.indexBuffer);
      gl.enableVertexAttribArray(stAttrs.aPart);
      gl.vertexAttribPointer(stAttrs.aPart, 4, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(stAttrs.aGeom);
      gl.vertexAttribPointer(stAttrs.aGeom, 4, gl.FLOAT, false, 32, 16);

      gl.uniform3f(stUniforms.uCamPos, camX, camY, camZ);
      gl.uniformMatrix3fv(stUniforms.uViewMat, false, viewMat);
      gl.uniform4f(stUniforms.uLens, focal, aspect, heightPx, maxPointSize);
      gl.uniform4f(stUniforms.uAction, tClock, bloomMix, dCurve, isReduced ? 0 : mouseSmooth);
      gl.uniform2f(stUniforms.uState, settleMix, aspect);
      gl.uniform2f(stUniforms.uAim, ax, ay);
      gl.uniform1f(stUniforms.uSettle, settleMix);

      gl.depthMask(true);
      gl.depthFunc(gl.LEQUAL);
      gl.drawElements(gl.TRIANGLES, stamenMesh.indexCount, gl.UNSIGNED_SHORT, 0);
      gl.depthFunc(gl.LESS);

      gl.disableVertexAttribArray(stAttrs.aPart);
      gl.disableVertexAttribArray(stAttrs.aGeom);
    }

    if (useFrontDepth) {
      gl.disable(gl.STENCIL_TEST);
    }

    // 3.8 Screen-Blend Pastel Sakura Pink Optical Petal Bloom + Radiant Golden Stamen Glow
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE);
    const closedSheenOp = closedAmt * 0.14;
    if (closedSheenOp > 0.004) {
      drawGlowBillboard(SAKURA_X, anchorY + 1.85 * sharedScale, SAKURA_Z, 2.50 * sharedScale, 1.0, 0.62, 0.80, closedSheenOp, 1.0, 0.52, 0.76, 5.8);
    }
    const pinkBloomOp = Math.min(1, Math.max(0, (bloomMix - 0.15) / 0.80)) * 0.11;
    if (pinkBloomOp > 0.004) {
      drawGlowBillboard(SAKURA_X, anchorY + 1.35 * sharedScale, SAKURA_Z, 3.2 * sharedScale, 1.0, 0.48, 0.66, pinkBloomOp, 1.0, 0.40, 0.60, 7.2);
    }
    const stamenGlowOp = Math.min(1, Math.max(0, (bloomMix - 0.20) / 0.70)) * 0.36;
    if (stamenGlowOp > 0.004) {
      drawGlowBillboard(SAKURA_X, anchorY + 1.35 * sharedScale, SAKURA_Z, 1.80 * sharedScale, 1.0, 0.84, 0.28, stamenGlowOp, 1.0, 0.64, 0.14, 9.0);
    }
    const mistOp = Math.min(1, Math.max(0, (bloomMix - 0.28) / 0.67)) * 0.11;
    if (mistOp > 0.004) {
      drawGlowBillboard(SAKURA_X, anchorY + 2.0 * sharedScale, SAKURA_Z, 2.4 * sharedScale, 1.0, 0.80, 0.36, mistOp, 1.0, 0.56, 0.70, 9.5);
    }
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // 4. Stamen Pollen Glints Only
    if (coreCount > 0 && bloomMix > 0.2) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.depthFunc(gl.LESS);
      drawPvRange(coreEbo, coreCount, 0);
    }

    // 4.5 True 3D Stencil-Masked Foreground Flowerbed + 100 Petal-Landing Wildflowers
    if (useFrontDepth && overlayCount > 0) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.depthFunc(gl.LESS);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.EQUAL, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.stencilMask(0x00);
      drawPvRange(overlayEbos[eboSlot], overlayCount, 0, 1.0, 1.0);
      gl.disable(gl.STENCIL_TEST);
    }

    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);

    if (!paused && !isBackgrounded() && (!isReduced || animating)) {
      wake();
    }
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    if (windowBlurred && !document.hidden) {
      windowBlurred = false;
      resumeScene();
    }
    const rect = canvas.getBoundingClientRect();
    mx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    my = 1 - ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2;
    mouseTarget = 1;
    lastPointerMoveMs = performance.now();
    wake();
  }

  function onPointerLeave() {
    mx = 0;
    my = 0;
    mouseTarget = 0;
  }

  function onVisibilityChange() {
    if (document.hidden) suspendScene();
    else {
      windowBlurred = false;
      resumeScene();
    }
  }

  function onWindowBlur() {
    if (isTouchDevice || performance.now() - sceneInitMs < 1500) return;
    windowBlurred = true;
    suspendScene();
  }

  function onInteractionWake() {
    if (windowBlurred && !document.hidden) {
      windowBlurred = false;
      resumeScene();
    }
  }

  function onWindowFocus() {
    windowBlurred = false;
    if (!document.hidden) resumeScene();
  }

  function onPageHide() {
    suspendScene();
  }

  function onPageShow() {
    windowBlurred = false;
    if (!document.hidden) resumeScene();
  }

  function onContextLost(e) {
    e.preventDefault();
    paused = true;
    triggerFallback();
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onInteractionWake, { passive: true });
  window.addEventListener("touchstart", onInteractionWake, { passive: true });
  window.addEventListener("scroll", onInteractionWake, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("prerenderingchange", onVisibilityChange);
  canvas.addEventListener("webglcontextlost", onContextLost);
  reducedMotionMQ.addEventListener("change", wake);

  const ro = new ResizeObserver(wake);
  ro.observe(canvas);

  buildScene().catch(() => {
    if (!disposed) triggerFallback();
  });

  return {
    setBloom(open) {
      smoothDt = Math.min(smoothDt, 1 / 60);
      clearTimeout(flyDownTimer);
      flyDownTimer = 0;
      pendingFlyDown = false;
      fallElapsed = 0;
      if (open) {
        bloomTarget = 1;
        diveTarget = 1;
        flyTarget = 0.76;
        flyDownTimer = setTimeout(() => {
          flyDownTimer = 0;
          if (!disposed && bloomTarget === 1) {
            fallElapsed = 0;
            flyTarget = 0.22;
            settleTarget = 1;
            wake();
          }
        }, 2300);
      } else {
        bloomTarget = 0;
        diveTarget = 0;
        settleTarget = 0;
        flyTarget = 0.0;
        flyStage0 = Math.min(flyStage0, flyMix);
        flyStage1 = Math.min(flyStage1, flyMix);
      }
      wake();
    },
    setTabIndex(idx) {
      smoothDt = Math.min(smoothDt, 1 / 60);
      tabYawTarget = (Number.isFinite(idx) ? idx : 0) * 0.22;
      wake();
    },
    setPaused(nextPaused) {
      paused = !!nextPaused;
      if (paused) suspendScene();
      else resumeScene();
    },
    destroy() {
      disposed = true;
      clearTimeout(flyDownTimer);
      clearTimeout(startupWatchTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onInteractionWake);
      window.removeEventListener("touchstart", onInteractionWake);
      window.removeEventListener("scroll", onInteractionWake);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("prerenderingchange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      reducedMotionMQ.removeEventListener("change", wake);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      skyGl?.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
