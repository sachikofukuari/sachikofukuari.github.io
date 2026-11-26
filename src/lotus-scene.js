/**
 * WebGL Botanical Sakura Blossom & Full-Depth Bokeh Meadow Engine (Dark Rose Mode)
 * Adapted from Siltora's procedural Canvas2D atlas + WebGL pipeline.
 *
 * Features:
 * - Direct-to-backbuffer rendering & hardware-tier scaling for smooth low-end GPU perf.
 * - Dense grass carpet with rolling hillside sill + blurred foreground bokeh + dark horizon fade.
 * - Luminous 10-petal curved 3D sakura blossom with lowered root tucked in the meadow,
 *   non-intersecting staggered petal shells, and velvety subsurface pink glow.
 * - Unhurried C1-smooth two-stage flight curve (fly up -> float down -> gentle air hover).
 */
const TAU = Math.PI * 2;

function makeSvgFallbackMarkup() {
    return `
      <svg viewBox="0 0 420 360" width="min(78vw, 440px)" height="auto" aria-hidden="true">
        <defs>
          <radialGradient id="lotusFallbackGlow" cx="50%" cy="56%" r="54%">
            <stop offset="0%" stop-color="#ffd5e8" stop-opacity="0.52"/>
            <stop offset="100%" stop-color="#ffd5e8" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="lotusFallbackOuter" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#cc3b73"/>
            <stop offset="55%" stop-color="#ff99c2"/>
            <stop offset="100%" stop-color="#fff2f8"/>
          </linearGradient>
          <linearGradient id="lotusFallbackInner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#e3568b"/>
            <stop offset="58%" stop-color="#ffb4d3"/>
            <stop offset="100%" stop-color="#fff7fb"/>
          </linearGradient>
        </defs>
        <ellipse cx="210" cy="236" rx="170" ry="58" fill="url(#lotusFallbackGlow)"/>
        <g transform="translate(210,206)">
          <g transform="rotate(-60)"><path d="M0,0 C-30,-42 -26,-116 0,-142 C26,-116 30,-42 0,0Z" fill="url(#lotusFallbackOuter)" opacity="0.86"/></g>
          <g transform="rotate(60)"><path d="M0,0 C-30,-42 -26,-116 0,-142 C26,-116 30,-42 0,0Z" fill="url(#lotusFallbackOuter)" opacity="0.86"/></g>
          <g transform="rotate(-34)"><path d="M0,0 C-32,-48 -28,-126 0,-154 C28,-126 32,-48 0,0Z" fill="url(#lotusFallbackOuter)" opacity="0.94"/></g>
          <g transform="rotate(34)"><path d="M0,0 C-32,-48 -28,-126 0,-154 C28,-126 32,-48 0,0Z" fill="url(#lotusFallbackOuter)" opacity="0.94"/></g>
          <g transform="rotate(-14)"><path d="M0,0 C-28,-50 -24,-132 0,-160 C24,-132 28,-50 0,0Z" fill="url(#lotusFallbackInner)" opacity="0.97"/></g>
          <g transform="rotate(14)"><path d="M0,0 C-28,-50 -24,-132 0,-160 C24,-132 28,-50 0,0Z" fill="url(#lotusFallbackInner)" opacity="0.97"/></g>
          <path d="M0,6 C-30,-52 -24,-136 0,-168 C24,-136 30,-52 0,6Z" fill="url(#lotusFallbackInner)"/>
        </g>
      </svg>
    `;
  }

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

    if (!canvas) {
      triggerFallback();
      return createNoopApi();
    }

    // ------------------------------------------------------------------------
    // Hardware-Tier Detection & WebGL Context Setup
    // ------------------------------------------------------------------------
    const isSmallScreen =
      window.innerWidth <= 820 ||
      (window.matchMedia("(pointer: coarse)").matches &&
        Math.min(window.innerWidth, window.innerHeight) <= 900);
    const lowEnd = isSmallScreen;
    const isTouchDevice =
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth <= 900 ||
      (navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) <= 1024);
    const sceneInitMs = performance.now();

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      depth: true,
      stencil: true,
      antialias: false,
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
            powerPreference: "low-power",
          })
        : null;
    const bgGl = skyGl || gl;

    const hasDerivatives = Boolean(gl.getExtension("OES_standard_derivatives"));

    function triggerFallback() {
      document.body.classList.add("webgl-fallback");
      const fb = document.getElementById("lotus-svg-fallback");
      if (fb) {
        fb.innerHTML = makeSvgFallbackMarkup();
        fb.hidden = false;
      }
      onFallback();
    }

    function createNoopApi() {
      return {
        setBloom() {},
        setTabIndex() {},
        setTheme() {},
        setPaused() {},
        pulseScatter() {},
        destroy() {},
      };
    }

    let seed = 4827193;
    const R = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
    const S = Math.sin;
    const C = Math.cos;

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

    // ------------------------------------------------------------------------
    // Procedural Botanical Sprite Atlas (2048x2048 sharp/bokeh halves on Retina)
    // ------------------------------------------------------------------------
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
    const ATLAS_SIZE = maxTexSize >= 2048 ? 2048 : 1024;
    const TILE_SIZE = ATLAS_SIZE / 8;
    const TILE_SCALE = TILE_SIZE / 128;

    const atlas = document.createElement("canvas");
    atlas.width = ATLAS_SIZE;
    atlas.height = ATLAS_SIZE;
    const ac = atlas.getContext("2d");

    const flowerPalettes = [
      ["#e66fa0", "#fba2ca", "#ffd8eb"],
      ["#ee7aa7", "#ffb2d4", "#ffe1ef"],
      ["#d974b0", "#f4a4d8", "#fcdaf2"],
      ["#ee809f", "#ffb5c9", "#ffe0ea"],
      ["#e06e9d", "#f79ec5", "#ffd4e8"],
      ["#ea7db3", "#fcb2da", "#ffe0f3"],
      ["#6faae6", "#a8d2fc", "#e0f2ff"],
      ["#7da0ea", "#b4cbfc", "#e6efff"],
    ];

    function drawFoliageLeaf(ctx, x, y, angle, len, width, lit, hueOffset) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const hue = 114 + (hueOffset || 0);
      const g = ctx.createLinearGradient(-width, -len, width, 0);
      g.addColorStop(0, `hsl(${hue - 10} 34% ${Math.min(58, lit * 1.38)}%)`);
      g.addColorStop(0.48, `hsl(${hue} 28% ${Math.min(48, lit * 0.96)}%)`);
      g.addColorStop(0.76, `hsl(${hue + 10} 26% ${lit * 0.64}%)`);
      g.addColorStop(1, `hsl(${hue + 16} 22% ${lit * 0.44}%)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-width, -len * 0.34, -width * 0.65, -len * 0.77, 0, -len);
      ctx.bezierCurveTo(width * 0.56, -len * 0.68, width * 0.72, -len * 0.25, 0, 0);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "hsla(112, 32%, 58%, 0.26)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.06);
      ctx.lineTo(0, -len * 0.94);
      ctx.stroke();
      ctx.restore();
    }

    function drawSakuraStamenTile() {
      const tile = document.createElement("canvas");
      tile.width = TILE_SIZE;
      tile.height = TILE_SIZE;
      const g = tile.getContext("2d");
      g.translate(TILE_SIZE / 2, TILE_SIZE / 2);
      g.scale(TILE_SCALE, TILE_SCALE);
      for (let i = 0; i < 24; i++) {
        const a = i * 2.39996;
        const r = 4 + Math.sqrt(i) * 5.6;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * 0.78;
        g.strokeStyle = "rgba(255, 198, 218, 0.72)";
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(0, 14);
        g.quadraticCurveTo(x * 0.45, y - 6, x, y - 10);
        g.stroke();

        const tipGrad = g.createRadialGradient(x, y - 10, 0.5, x, y - 10, 5.2);
        tipGrad.addColorStop(0, "#fff9df");
        tipGrad.addColorStop(0.55, "#ffd490");
        tipGrad.addColorStop(1, "rgba(248, 162, 178, 0)");
        g.fillStyle = tipGrad;
        g.beginPath();
        g.arc(x, y - 10, 4.0, 0, TAU);
        g.fill();
      }
      return tile;
    }

    function makeAtlasTile(i) {
      if (i >= 12 && i <= 15) {
        return drawSakuraStamenTile();
      }

      const tile = document.createElement("canvas");
      tile.width = TILE_SIZE;
      tile.height = TILE_SIZE;
      const c = tile.getContext("2d");
      c.translate(TILE_SIZE / 2, TILE_SIZE / 2);
      c.scale(TILE_SCALE, TILE_SCALE);

      if (i < 12) {
        // Tiles 8..11: lower mossy base + dense leafy grass blades (fills gaps without burying wildflowers)
        if (i >= 8) {
          const baseGrad = c.createRadialGradient(0, 14, 4, 0, 14, 34);
          baseGrad.addColorStop(0, "rgba(40, 52, 39, 0.68)");
          baseGrad.addColorStop(0.65, "rgba(31, 42, 32, 0.44)");
          baseGrad.addColorStop(1, "rgba(24, 31, 25, 0)");
          c.fillStyle = baseGrad;
          c.beginPath();
          c.arc(0, 14, 34, 0, TAU);
          c.fill();

          for (let j = 0; j < 18; j++) {
            const bx = (R() - 0.5) * 38;
            const by = 22 + (R() - 0.5) * 18;
            const ang = (R() - 0.5) * 1.45;
            const len = 26 + R() * 24;
            const wid = 5 + R() * 4.5;
            drawFoliageLeaf(c, bx, by, ang, len, wid, 20 + R() * 16, -8 + R() * 14);
          }
          return tile;
        }

        c.rotate((R() - 0.5) * 1.5);
        const kind = i % 4;
        if (kind === 0) {
          for (let b = 0; b < 4; b++) {
            c.save();
            c.rotate(b * 1.05 - 1.65);
            const l = 38 + R() * 14;
            for (let j = 0; j < 11; j++) {
              const d = j / 11;
              const w = (1 - d * 0.85) * 15;
              const x = S(d * 1.55) * 7;
              for (const k of [-1, 1]) {
                drawFoliageLeaf(c, x, -d * l, k * (0.96 - d * 0.2), w * (1 + R() * 0.3), 3.1, 25 + R() * 12, 8);
              }
            }
            c.restore();
          }
        } else if (kind === 1) {
          for (let a = 0; a < 14; a++) {
            c.save();
            c.rotate(a * 0.45 + R() * 0.2);
            drawFoliageLeaf(c, 0, 8, 0, 22 + R() * 30, 3.8 + R() * 4.2, 22 + R() * 18, 4);
            c.restore();
          }
        } else if (kind === 2) {
          for (let b = 0; b < 3; b++) {
            c.save();
            c.rotate(b * 1.8 + R());
            c.strokeStyle = "#5c5358";
            c.lineWidth = 1.4;
            c.beginPath();
            c.moveTo(0, 12);
            c.quadraticCurveTo(7, -13, 2, -46);
            c.stroke();
            for (let j = 0; j < 8; j++) {
              const d = j / 8;
              drawFoliageLeaf(c, 3, -d * 38, (j % 2 ? 1 : -1) * (0.65 + R() * 0.4), 19 - d * 5, 5.2 - d * 1.6, 25 + R() * 11, -6);
            }
            c.restore();
          }
        } else {
          for (let j = 0; j < 10; j++) {
            drawFoliageLeaf(c, (R() - 0.5) * 18, (R() - 0.5) * 12, R() * TAU, 24 + R() * 26, 8 + R() * 6.5, 22 + R() * 16, -12);
          }
        }
        return tile;
      }

      const k = (i - 16) % 8;
      const isBluePal = k >= 6;
      const bloomHalo = c.createRadialGradient(0, 0, 8, 0, 0, 58);
      if (isBluePal) {
        bloomHalo.addColorStop(0, "rgba(214, 238, 255, 0.48)");
        bloomHalo.addColorStop(0.45, "rgba(154, 206, 255, 0.20)");
        bloomHalo.addColorStop(1, "rgba(130, 190, 255, 0)");
      } else {
        bloomHalo.addColorStop(0, "rgba(255, 214, 236, 0.46)");
        bloomHalo.addColorStop(0.45, "rgba(255, 162, 212, 0.19)");
        bloomHalo.addColorStop(1, "rgba(255, 140, 204, 0)");
      }
      c.fillStyle = bloomHalo;
      c.beginPath();
      c.arc(0, 0, 58, 0, TAU);
      c.fill();

      if (k === 2) {
        c.rotate(i >= 24 ? 0.17 : -0.19);
        c.scale(1, i >= 24 ? 0.88 : 0.72);
        for (let j = 0; j < 4; j++) {
          c.save();
          c.rotate((j * Math.PI) / 2 + 0.08);
          const v = c.createRadialGradient(0, 5, 4, 0, -9, 54);
          v.addColorStop(0, "#d64782");
          v.addColorStop(0.45, "#f582b3");
          v.addColorStop(0.8, "#ffc0dc");
          v.addColorStop(1, "#ffd9ea");
          c.fillStyle = v;
          c.beginPath();
          c.moveTo(-3, 8);
          c.bezierCurveTo(-19, 0, -38, -29, -26, -43);
          c.bezierCurveTo(-19, -54, -8, -46, -1, -51);
          c.bezierCurveTo(11, -55, 28, -50, 29, -36);
          c.bezierCurveTo(29, -20, 12, 3, -3, 8);
          c.fill();
          c.strokeStyle = "rgba(255, 200, 226, 0.36)";
          c.lineWidth = 1.1;
          for (let m = -2; m <= 2; m++) {
            c.beginPath();
            c.moveTo(0, 2);
            c.quadraticCurveTo(m * 5, -18, m * 9, -41 + Math.abs(m) * 2);
            c.stroke();
          }
          c.restore();
        }
        for (let s = 0; s < 18; s++) {
          const a = s * 2.4;
          const rr = Math.sqrt(s) * 2;
          c.fillStyle = s % 3 ? "#f6be70" : "#fff4cf";
          c.beginPath();
          c.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, 1.8, 2.9, a, 0, TAU);
          c.fill();
        }
        return tile;
      }

      if (k === 4) {
        c.rotate(i >= 24 ? 0.14 : -0.22);
        c.strokeStyle = "rgba(235, 138, 178, 0.55)";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-15, 55);
        c.bezierCurveTo(-8, 27, 4, -38, 21, -49);
        c.stroke();
        const bells = [
          [18, -44, 0.57, 1],
          [11, -34, 0.68, -1],
          [7, -20, 0.83, 1],
          [2, -5, 0.94, -1],
          [-5, 12, 0.99, 1],
        ];
        for (const [bx, by, bs, bd] of bells) {
          c.save();
          c.translate(bx, by);
          c.scale(bd * bs, bs);
          c.strokeStyle = "rgba(235, 138, 178, 0.55)";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(0, 0);
          c.quadraticCurveTo(18, -12, 19, 2);
          c.stroke();
          c.translate(18, 4);
          c.rotate(-0.17);
          const v = c.createLinearGradient(-14, 0, 15, 1);
          v.addColorStop(0, "#d44a88");
          v.addColorStop(0.45, "#f282b8");
          v.addColorStop(0.68, "#ffc7e3");
          v.addColorStop(1, "#e86da7");
          c.fillStyle = v;
          c.beginPath();
          c.moveTo(-5, -2);
          c.bezierCurveTo(-13, 10, -14, 24, -18, 30);
          c.quadraticCurveTo(-7, 26, -1, 32);
          c.quadraticCurveTo(7, 25, 17, 30);
          c.bezierCurveTo(13, 21, 12, 9, 5, -2);
          c.closePath();
          c.fill();
          c.restore();
        }
        return tile;
      }

      c.rotate((R() - 0.5) * 1.4);
      const pal = flowerPalettes[k];
      const nPetals = [5, 6, 7, 5, 9, 6, 10, 5][k];

      c.scale(1, 0.58 + R() * 0.4);
      for (let a = 0; a < nPetals; a++) {
        c.save();
        c.rotate((TAU * a) / nPetals + R() * 0.14);
        const len = 34 + R() * 12;
        const w = (0.38 + R() * 0.1) * len * Math.pow(6 / nPetals, 0.64);
        const grad = c.createLinearGradient(0, 4, 0, -len);
        grad.addColorStop(0, pal[0]);
        grad.addColorStop(0.42, pal[1]);
        grad.addColorStop(0.85, pal[2]);
        grad.addColorStop(1, pal[2]);
        c.fillStyle = grad;
        c.beginPath();
        c.moveTo(0, 3);
        c.bezierCurveTo(-w * 0.44, -len * 0.35, -w * 1.38, -len * 0.75, -w * 0.56, -len * 0.95);
        c.bezierCurveTo(-w * 0.12, -len * 1.08, w * 0.13, -len * 0.92, w * 0.34, -len * 0.98);
        c.bezierCurveTo(w * 1.34, -len * 0.91, w * 0.8, -len * 0.47, 0, 3);
        c.fill();
        c.lineWidth = 0.9;
        c.strokeStyle = isBluePal ? "rgba(232, 245, 255, 0.50)" : "rgba(255, 236, 245, 0.50)";
        for (let h = -1; h <= 1; h++) {
          c.beginPath();
          c.moveTo(0, -4);
          c.quadraticCurveTo(h * w * 0.28, -len * 0.6, h * w * 0.5, -len * 0.87);
          c.stroke();
        }
        c.restore();
      }
      if (k % 2 === 1 || i >= 24) {
        for (let a = 0; a < nPetals; a++) {
          c.save();
          c.rotate((TAU * (a + 0.5)) / nPetals);
          const len2 = 20 + R() * 6;
          const w2 = 0.44 * len2 * Math.pow(6 / nPetals, 0.58);
          const grad2 = c.createLinearGradient(0, 2, 0, -len2);
          grad2.addColorStop(0, pal[0]);
          grad2.addColorStop(0.5, pal[1]);
          grad2.addColorStop(1, pal[2]);
          c.fillStyle = grad2;
          c.beginPath();
          c.moveTo(0, 2);
          c.bezierCurveTo(-w2 * 0.5, -len2 * 0.38, -w2 * 1.1, -len2 * 0.78, 0, -len2);
          c.bezierCurveTo(w2 * 1.1, -len2 * 0.78, w2 * 0.5, -len2 * 0.38, 0, 2);
          c.fill();
          c.restore();
        }
      }
      c.fillStyle = k >= 6 ? "#6fa8e8" : "#e96e94";
      c.beginPath();
      c.arc(0, 0, 4.8, 0, TAU);
      c.fill();
      for (let j = 0; j < 22; j++) {
        const a = R() * TAU;
        const d = R() * 5.8;
        c.fillStyle = j % 3 ? "#ffe09a" : "#fff6dc";
        c.beginPath();
        c.arc(C(a) * d, S(a) * d - 1, 0.9 + R() * 0.8, 0, TAU);
        c.fill();
      }
      return tile;
    }

    // ------------------------------------------------------------------------
    // Shader Programs (Dark Rose Theme Only)
    // ------------------------------------------------------------------------
    function compileProgramFor(targetGl, vSrc, fSrc) {
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

    function compileProgram(vSrc, fSrc) {
      return compileProgramFor(gl, vSrc, fSrc);
    }

    // 1. Seamless 360-Degree Camera-Synced Spherical Starry Sky + Periodic Aurora + V-Valley Sill
    const bgProg = compileProgramFor(
      bgGl,
      `attribute vec2 pos;
       varying vec2 uv;
       void main() {
         gl_Position = vec4(pos, 0.0, 1.0);
         uv = pos;
       }`,
      `precision highp float;
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
       }`
    );

    // 2. Radiant Non-Intersecting 3D Layered Lotus Blossom Mesh Shader
    const sakuraMeshProg = compileProgram(
      `precision highp float;
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

         // 2. Fully open lush overlapping lotus bowl (rb = 1): petals overlap tightly to hide calyx base completely from inner POV
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

         // Smooth closed-bud -> open-lotus peel
         float peel = sin(rb * 3.14159265) * (0.16 * (1.0 - ringNorm)) * sin(u * 3.14159265);
         float radial = mix(rClosed, rOpen, rb) + peel + breath * u * 0.42;
         float height = mix(yClosed, yOpen, rb);

         // Subtle per-petal pillow + dominant shingle (strictly non-intersecting between adjacent same-ring petals)
         float effTilt = mix(0.12 + 0.14 * (1.0 - ringNorm), openTilt, rb);
         float nRad = cos(effTilt);
         float nY = -sin(effTilt);
         float petalPillow = mix(0.022, 0.016, ringNorm) * wEnv * (1.0 - v * v) * (1.0 - rb * 0.65);
         float shingle = v * wEnv * (0.078 + 0.018 * rb);

         float rEff = radial + nRad * (petalPillow + shingle);
         float yEff = height + nY * (petalPillow + shingle);

         // Exact width-preserving arc wrap (closed) -> generous overlapping bloom petals
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

         // 3-tap analytical forward-difference normal (avoids 2 redundant surface evaluations per vertex)
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
       }`,
      `${hasDerivatives ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n" : "#define HAS_DERIV 0\n"}precision highp float;
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

         // Rich pastel sakura pink lotus palette (unmistakable baby-pink, never white or purple)
         vec3 throat = vec3(0.96, 0.44, 0.58);
         vec3 mid = vec3(0.99, 0.64, 0.75);
         vec3 edge = vec3(1.00, 0.80, 0.86);

         vec3 col = mix(throat, mid, smoothstep(0.05, 0.48, d));
         col = mix(col, edge, smoothstep(0.68, 1.0, d) * 0.72);
         col = mix(col, mix(col * 1.05, edge, 0.16), vRing * 0.30);

         // Delicate lengthwise lotus petal striations (keep subtle structure overhead)
         float veinWave = 0.5 + 0.5 * cos(v * 22.0);
         float veinMask = smoothstep(0.14, 0.38, d) * (1.0 - smoothstep(0.76, 0.98, d)) * (1.0 - uSettle * 0.25);
         col *= 1.0 - veinWave * veinMask * 0.05;

         // Warm rose-tinted inter-petal overlap AO (crisp petal-to-petal depth without grey or purple)
         float ao = 0.65 + 0.35 * smoothstep(-0.35, 0.18, vSide);
         col = mix(col * vec3(0.80, 0.46, 0.58), col, ao);

         // Warm luminous pastel pink key light + rose bounce from flowerbed below
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

         // Soft pastel sakura inner lantern + backlit translucency + gentle specular sheen
         vec3 halfVec = normalize(lightDir + viewDir);
         float sss = pow(clamp(dot(-viewDir, lightDir) * 0.5 + 0.5, 0.0001, 1.0), 1.5) * (0.35 + 0.65 * d);
         float rim = pow(clamp(1.0 - max(dot(n, viewDir), 0.0), 0.0001, 1.0), 2.2);
         float spec = pow(max(dot(n, halfVec), 0.0001), 16.0) * (1.0 - uSettle * 0.8);
         col += vec3(1.00, 0.46, 0.64) * exp(-d * 1.85) * (0.22 + 0.18 * vBloom);
         col += vec3(1.00, 0.56, 0.72) * sss * (0.18 + 0.15 * vBloom);
         col += vec3(1.00, 0.86, 0.90) * spec * 0.18;

         // Crisp glowing pastel sakura pink bloom rim around every petal (glows brightly while preserving petal separation)
         float rimEdge = max(smoothstep(0.76, 0.99, abs(v)), smoothstep(0.80, 0.995, u)) * (1.0 - uSettle * 0.06);
         col = mix(col, vec3(1.00, 0.77, 0.86), clamp(rimEdge * 0.42 + rim * 0.34 * (1.0 - uSettle * 0.12), 0.0, 0.54));
         col += vec3(1.00, 0.56, 0.72) * (pow(rim, 2.0) * (0.24 + 0.16 * vBloom) + rimEdge * (0.16 + 0.12 * vBloom));

         // Localized glowing blooming highlight directly under hovering cursor (softened silky sheen)
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

         // Subtle velvet calm when settled (strictly opaque core mesh for clean Z-buffer ordering)
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
       }`
    );

    // 2.5 Sculpted 3D Lotus Receptacle Dome + Filaments + Calyx Base Cup, Stem & Sepals
    const stamenProg = compileProgram(
      `precision highp float;
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
           // Sculpted lotus receptacle chalice dome (nested strictly inside baseO = 0.36)
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
           // Camera-billboarded cylindrical arched filament + glowing honey-gold anther tip
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
           // Botanical Calyx Cup + Tapered Emerald Lotus Stem (hidden underneath petal cup)
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
           // 8 Cupped Outer Sepals Tucked Strictly Underneath Outer Petals (openTilt = 1.48)
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
       }`,
      `precision highp float;
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
           // Lotus receptacle crown: shaded honey-gold top grading to blush apricot-rose walls
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
           // Cylindrical shaded rose-gold stalk transitioning into glowing honey-gold anther tip
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
           // Botanical Calyx Cup + Jade-Emerald Lotus Stem
           vec3 cupRim = vec3(0.74, 0.44, 0.56);
           vec3 jadeMid = vec3(0.24, 0.48, 0.32);
           vec3 stemDeep = vec3(0.14, 0.32, 0.20);
           col = mix(cupRim, jadeMid, smoothstep(0.0, 0.24, u));
           col = mix(col, stemDeep, smoothstep(0.45, 0.98, u));
           col *= mix(0.62, 1.08, clamp(wrap * 0.68 + diff * 0.32, 0.0, 1.0));
           col += vec3(0.32, 0.16, 0.24) * bounce;
           col += vec3(0.55, 0.84, 0.68) * rim * 0.22;
         } else {
           // Cupped Outer Sepals (jade-green base -> blush-rose tip)
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
       }`
    );

    // 2.8 Dedicated Smooth Radial Glow Billboard Shader (eliminates gl_PointSize clamping pops)
    const glowProg = compileProgram(
      `precision highp float;
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
       }`,
      `precision mediump float;
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
       }`
    );

    // 3. Full-Depth Meadow Point-Sprite Shader
    const pvProg = compileProgram(
      `precision highp float;
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
               float rawCode = aExtra.w - 10.0;
               float lRingNorm = step(50.0, rawCode) * 0.5;
               float uCode = rawCode - lRingNorm * 200.0;
               float uLand = floor(uCode) / 50.0;
               float vLand = clamp((fract(uCode) - 0.5) * 2.0, -0.4, 0.4);
               float lPetalAz = aExtra.y;

               float rbL = smoothstep(lRingNorm * 0.18, lRingNorm * 0.18 + 0.78, bloom);
               float lLen = mix(3.65, 3.40, lRingNorm * 2.0);
               float lMaxW = mix(1.92, 1.76, lRingNorm * 2.0);
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

               float landX = (lROpen * lCa - lTang * lSa) * lScale - cos(lTilt) * lCa * 0.18;
               float landY = lAnchorY + (lYOpen + settle * 0.04 * uLand) * lScale + sin(lTilt) * 0.18;
               float landZ = 8.5 + (lROpen * lSa + lTang * lCa) * lScale - cos(lTilt) * lSa * 0.18;

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
          float finalPtSize = sizePx * flyShrink * mix(1.0, 0.72, landedAmt);
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
        }`,
      `precision mediump float;
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
       }`
    );

    function makeBufferOn(targetGl, data) {
      const b = targetGl.createBuffer();
      targetGl.bindBuffer(targetGl.ARRAY_BUFFER, b);
      targetGl.bufferData(targetGl.ARRAY_BUFFER, data, targetGl.STATIC_DRAW);
      return b;
    }

    function makeBuffer(data) {
      return makeBufferOn(gl, data);
    }

    function makeElementBuffer(data) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    }

    const bgQuadBuf = makeBufferOn(bgGl, new Float32Array([-1, -1, 3, -1, -1, 3]));

    // ------------------------------------------------------------------------
    // Siltora V-Shaped Valley + Non-Intersecting 3D Lotus Builder
    // ------------------------------------------------------------------------
    const SAKURA_X = 0.0;
    const SAKURA_Z = 8.5;

    function valleyCourse(z) {
      const t = Math.max(0, (z - 8.5) / 56.0);
      return 1.55 * S(t * 2.8 + 0.30) * Math.min(1, t * 2.2) - 0.50 * S(t * 6.0) * Math.min(1, t * 1.8);
    }

    function meadowFloor(x, z) {
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

    function surroundFloor(x, z) {
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

    function inIntroCorridor(x, z) {
      if (z < 1.15 || z > 58.0) return false;
      const maxX = Math.min(20.0, (z + 0.45) * 1.04);
      return Math.abs(x - valleyCourse(z)) <= maxX;
    }

    function insideMeadowFrustum(x, z, allowRoot) {
      const dx = x - SAKURA_X;
      const dz = z - SAKURA_Z;
      const rOrbit = Math.hypot(dx, dz);
      const minR = allowRoot ? 0.45 : 1.25;
      if (rOrbit < minR && z > 6.2 && z < 10.5) return false;
      if (rOrbit <= 36.0) return true;
      if (z < 0.90 || z > 60.0) return false;
      const maxX = Math.min(22.0, (z + 0.55) * 1.15);
      if (Math.abs(x - valleyCourse(z)) > maxX) return false;
      return true;
    }

    function insideStaticView(x, y, z, size) {
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

    function buildStamenMeshBuffer() {
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

      // 1. Sculpted golden-rose receptacle chalice dome (nested strictly inside baseO = 0.36)
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

      // 2. Three concentric rings of arched 3D stamen filaments + glowing honey-gold anthers
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

      // 3. Sculpted botanical calyx cup & tapered jade-emerald stem (tucked underneath outer petals)
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

      // 4. Eight cupped outer botanical sepals under outer petal gaps (kind = 3.0)
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

      return {
        buffer: makeBuffer(data),
        indexBuffer: makeElementBuffer(indices),
        indexCount: totalIndices,
      };
    }

    function buildSakuraMeshBuffer() {
      const tiers = [
        { count: 8, ringNorm: 0.0, len: 3.65, maxW: 1.92, azOffset: 0.18, ringIdx: 0 },
        { count: 8, ringNorm: 0.5, len: 3.40, maxW: 1.76, azOffset: 0.18 + Math.PI / 8, ringIdx: 1 },
        { count: 8, ringNorm: 1.0, len: 3.12, maxW: 1.56, azOffset: 0.18 + Math.PI / 4, ringIdx: 2 },
      ];
      const U_SEGS = 18;
      const V_SEGS = 12;
      const uCols = U_SEGS + 1;
      const vRows = V_SEGS + 1;
      const totalPetals = tiers.reduce((sum, t) => sum + t.count, 0);
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

      for (const tier of tiers) {
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

      return {
        buffer: makeBuffer(meshData),
        indexBuffer: makeElementBuffer(indexData),
        indexCount: totalPetals * indicesPerPetal,
      };
    }

    const particles = [];
    function pushParticle(x, y, z, size, tile, pSeed, light, role, e0, e1, e2, e3) {
      particles.push([x, y, z, size, tile, pSeed, light, role, e0, e1, e2, e3]);
    }

    let atlasTex = null;
    let particleBuf = null;
    let glowQuadBuf = null;
    let meadowEbo = null;
    let coreEbo = null;
    let meadowCount = 0;
    let meadowFlowerStart = 0;
    let coreCount = 0;
    let meadowPosX = null;
    let meadowPosY = null;
    let meadowPosZ = null;
    let meadowLayerBias = null;
    let meadowBandOffset = null;
    let meadowOrigIdx = null;
    let sortedMeadow = null;
    let depthKeys = null;
    let tempKeys = null;
    let tempIdx = null;
    const bucketCounts = new Int32Array(256);
    const bucketOffsets = new Int32Array(256);
    let hasSortedOnce = false;
    let lastSortedYaw = 0;
    let lastSortedElev = 0;
    let lastSortedDist = 0;
    let flowerBounds = null;
    let foliageTotal = 0;
    let flowerTotal = 0;
    let particleCount = 0;
    let sakuraMesh = null;
    let stamenMesh = null;
    let diveTarget = opts.initialOpen ? 1 : 0;
    let diveMix = diveTarget;
    let tabYawTarget = 0;
    let tabYawMix = 0;

    function sortMeadowByCamera(camX, camY, camZ, viewMat) {
      if (!meadowEbo || meadowCount === 0) return;
      const fx = viewMat[2];
      const fy = viewMat[5];
      const fz = viewMat[8];
      const depthScale15 = 32767 / 84.0;

      bucketCounts.fill(0);
      for (let k = 0; k < meadowCount; k++) {
        const dep = (meadowPosX[k] - camX) * fx + (meadowPosY[k] - camY) * fy + (meadowPosZ[k] - camZ) * fz - meadowLayerBias[k];
        let d15 = 32767 - (((dep + 4.0) * depthScale15) | 0);
        if (d15 < 0) d15 = 0;
        else if (d15 > 32767) d15 = 32767;
        const k16 = meadowBandOffset[k] | d15;
        depthKeys[k] = k16;
        bucketCounts[k16 & 255]++;
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
      }

      bucketCounts.fill(0);
      for (let k = 0; k < meadowCount; k++) {
        bucketCounts[tempKeys[k] >>> 8]++;
      }
      acc = 0;
      for (let b = 0; b < 256; b++) {
        bucketOffsets[b] = acc;
        acc += bucketCounts[b];
      }
      for (let k = 0; k < meadowCount; k++) {
        const dst = bucketOffsets[tempKeys[k] >>> 8]++;
        sortedMeadow[dst] = tempIdx[k];
      }

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meadowEbo);
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, sortedMeadow);
      hasSortedOnce = true;
    }

    function updateSceneStats(focal, aspect) {
      if (!flowerBounds) return;
      let vis = 0;
      for (let i = 0; i < flowerBounds.length; i += 4) {
        const fx = flowerBounds[i];
        const fy = flowerBounds[i + 1];
        const fz = flowerBounds[i + 2];
        const fsz = flowerBounds[i + 3];
        const dep = fz + 0.35;
        if (dep < 0.55 || dep > 68.0) continue;
        const nx = (fx * focal) / (aspect * dep);
        const ny = ((fy - 2.58) * focal) / dep - 0.02;
        const rad = (fsz * focal * 0.5) / Math.max(0.65, dep);
        if (Math.abs(nx) <= 1.0 + rad / aspect && Math.abs(ny) <= 1.0 + rad) {
          vis++;
        }
      }
      canvas.dataset.flowersTotal = String(flowerTotal);
      canvas.dataset.flowersVisible = String(vis);
      canvas.dataset.foliageTotal = String(foliageTotal);
      canvas.dataset.spritesTotal = String(particleCount);
    }

    let raf = 0;
    let lastNow = 0;
    let lastSkyNow = 0;
    let widthPx = 0;
    let heightPx = 0;
    let skyWidthPx = 0;
    let skyHeightPx = 0;
    let avgGap = 16;
    let budgetAt = 0;
    let budget = lowEnd ? 1400000 : 3400000;

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
    let lastStatsW = 0;
    let lastStatsH = 0;

    async function buildScene() {
      const bokehBlurPx = Math.max(6, Math.round(TILE_SIZE * 0.055));
      for (let i = 0; i < 32; i++) {
        const tileImg = makeAtlasTile(i);
        const tx = (i % 8) * TILE_SIZE;
        const ty = Math.floor(i / 8) * TILE_SIZE;
        ac.drawImage(tileImg, tx, ty);
        ac.save();
        ac.beginPath();
        ac.rect(tx, ty + ATLAS_SIZE / 2, TILE_SIZE, TILE_SIZE);
        ac.clip();
        ac.filter = `blur(${bokehBlurPx}px)`;
        ac.drawImage(tileImg, tx, ty + ATLAS_SIZE / 2);
        ac.restore();
        await yieldSlice();
      }

      atlasTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);

      sakuraMesh = buildSakuraMeshBuffer();
      stamenMesh = buildStamenMeshBuffer();

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

      // 2. Siltora-Style Cascading Diagonal Wildflower Streams (Abundant Pastel Pink + Scattered Pastel Blue)
      const beds = [];
      const streamDensity = lowEnd ? 0.52 : 0.72;

      // Helper to lay organic serpentine flower ribbons winding down each steep canyon slope
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

      // Left canyon wall sweeping cascades (4 serpentine streams across upper, mid, and lower slopes)
      addValleyRibbon(3.6, 48.0, 32, (u) => 2.5 + Math.pow(u, 0.92) * 17.5 + S(u * 5.2) * 1.2, -1, leftPalette, 0.94, 1.26, 0.95);
      addValleyRibbon(8.5, 52.0, 26, (u) => 5.0 + Math.pow(u, 0.85) * 18.0 + C(u * 4.4) * 1.4, -1, [2, 3, 6, 0, 5], 0.98, 1.32, 0.96);
      addValleyRibbon(2.0, 24.0, 18, (u) => 1.7 + u * 7.2 + S(u * 4.0) * 0.7, -1, [0, 1, 4, 6, 7], 0.86, 1.08, 0.94);
      addValleyRibbon(14.0, 44.0, 16, (u) => 8.2 + u * 12.2 - S(u * 3.8 + 0.5) * 1.1, -1, [1, 5, 6, 2, 7], 0.92, 1.22, 0.96);

      // Right canyon wall iconic S-curved cascades (4 sweeping streams winding into lower-right bank + upper-right outer crest)
      addValleyRibbon(3.6, 48.0, 34, (u) => 2.4 + Math.pow(u, 0.95) * 18.0 - S(u * 6.2 + 0.4) * 1.5, 1, rightPalette, 0.96, 1.30, 0.95);
      addValleyRibbon(9.0, 52.0, 26, (u) => 5.2 + Math.pow(u, 0.86) * 18.2 + S(u * 4.8) * 1.3, 1, [4, 2, 7, 1, 5], 0.98, 1.34, 0.96);
      addValleyRibbon(2.0, 25.0, 18, (u) => 1.9 + u * 7.4 - C(u * 3.8) * 0.7, 1, [1, 3, 6, 0, 7], 0.88, 1.10, 0.94);
      addValleyRibbon(14.0, 44.0, 16, (u) => 8.5 + u * 12.0 + C(u * 3.6 + 0.3) * 1.2, 1, [0, 4, 7, 3, 6], 0.92, 1.22, 0.96);
      addValleyRibbon(12.0, 44.0, 20, (u) => 11.5 + u * 10.5 + S(u * 3.0) * 0.9, 1, [0, 6, 2, 7, 1], 1.10, 1.35, 0.96);

      // Foreground low curtain right in front of lotus (tucks bloom cleanly behind foreground beds) + rich flanking front beds
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
        // 1. Bottom-left corner fill
        [-2.35, 2.25, 2, 0.92, 0.75, 0.95, -0.04],
        [-1.85, 2.10, 6, 0.88, 0.72, 0.95, -0.06],
        [-2.85, 2.55, 0, 0.96, 0.78, 0.95, -0.05],
        // 2. Bottom-right corner fill
        [0.88, 1.45, 6, 0.74, 0.56, 0.95, -0.18],
        [1.20, 1.32, 1, 0.76, 0.54, 0.95, -0.22],
        [1.62, 1.48, 7, 0.82, 0.58, 0.95, -0.28],
        [2.05, 1.75, 3, 0.88, 0.66, 0.95, -0.32],
        [2.48, 2.12, 5, 0.92, 0.72, 0.95, -0.28],
        // 3. Mid-left edge fill
        [-3.95, 3.65, 3, 0.96, 0.86, 0.95, 0.04],
        [-4.75, 4.55, 6, 1.04, 0.94, 0.96, 0.06],
        [-5.55, 5.45, 1, 1.08, 0.98, 0.96, 0.04],
        [-6.45, 6.40, 7, 1.12, 1.02, 0.96, 0.02],
        // 4. Around the big lotus flower (flanking collar & lower front apron)
        [-1.55, 6.85, 0, 0.86, 0.78, 0.95, 0.16],
        [1.55, 6.85, 4, 0.86, 0.78, 0.95, 0.24],
        [-2.35, 8.15, 6, 0.94, 0.90, 0.95, 0.22],
        [2.35, 8.15, 2, 0.94, 0.90, 0.95, 0.34],
        [-1.50, 8.55, 1, 0.76, 0.74, 0.95, 0.24],
        [1.50, 8.55, 7, 0.76, 0.74, 0.95, 0.36],
        [0.0, 6.45, 2, 0.92, 0.68, 0.94, 0.14],
        // 5. Behind the big lotus flower (kept in lower/mid silhouette below sky text)
        [-1.85, 10.6, 5, 1.05, 0.95, 0.95, 0.30],
        [0.0, 10.8, 0, 1.15, 0.95, 0.94, 0.42],
        [1.85, 10.6, 6, 1.05, 0.95, 0.95, 0.40],
        [-2.55, 13.2, 2, 1.18, 1.10, 0.95, 0.28],
        [0.0, 13.5, 7, 1.25, 1.15, 0.94, 0.46],
        [2.55, 13.2, 1, 1.18, 1.10, 0.95, 0.38],
        [-1.90, 16.8, 3, 1.28, 1.25, 0.95, 0.30],
        [0.0, 17.2, 4, 1.30, 1.25, 0.94, 0.44],
        [1.90, 16.8, 6, 1.28, 1.25, 0.95, 0.36],
        // 1b. Front bottom middle-left & middle-right fill
        [-1.45, 2.05, 5, 0.86, 0.68, 0.95, 0.25],
        [-1.10, 1.88, 1, 0.84, 0.64, 0.95, 0.35],
        [-0.65, 1.95, 6, 0.84, 0.66, 0.95, 0.35],
        [-0.25, 2.00, 2, 0.84, 0.66, 0.95, 0.30],
        [0.30, 1.85, 7, 0.82, 0.64, 0.95, 0.15],
        [0.75, 1.75, 0, 0.80, 0.62, 0.95, 0.00],
        // 5b. Behind big lotus shoulders & inner-valley floral backdrop
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
        // 1c. Dense lower-half foreground fill sealing every bottom patch without triple-stacking
        [-3.40, 1.45, 2, 0.94, 0.70, 0.96, -0.14],
        [-2.45, 1.32, 6, 0.92, 0.68, 0.96, -0.17],
        [-1.55, 1.28, 7, 0.90, 0.66, 0.96, -0.18],
        [-0.75, 1.21, 3, 0.88, 0.64, 0.96, -0.20],
        [0.05,  1.21, 5, 0.86, 0.64, 0.96, -0.20],
        [0.95,  1.25, 6, 0.88, 0.66, 0.96, -0.20],
        [1.90,  1.35, 2, 0.92, 0.68, 0.96, -0.17],
        [2.95,  1.52, 7, 0.96, 0.72, 0.96, -0.12],
        [3.55,  1.68, 0, 1.00, 0.76, 0.96, -0.06],
        [-1.80, 2.50, 1, 0.94, 0.74, 0.96, 0.08],
        [-0.50, 2.45, 6, 0.90, 0.72, 0.96, 0.10],
        [0.65,  2.48, 2, 0.90, 0.72, 0.96, 0.08],
        [1.85,  2.60, 7, 0.94, 0.76, 0.96, 0.06]
      );

      // Five dense serpentine wildflower ribbons directly behind first POV (fills entire #contact left hillside)
      const rearRibbons = [
        { steps: 14, x0: 16.0, x1: -16.0, z0: 0.6, z1: -6.5,  yBoost: 0.26, pal: [0, 2, 6, 4, 7] },
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

      // Dedicated gap-fill bands behind first POV (left side & transition belt seen on #works/#contact)
      const rearLeftGapBands = [
        { steps: 12, x0: -16.5, x1: 4.5,  z0: 3.6,  z1: -1.8, yBoost: 0.24, pal: [0, 6, 2, 7, 4], is360: 1 },
        { steps: 14, x0: -18.0, x1: 6.0,  z0: 0.6,  z1: -4.2, yBoost: 0.30, pal: [2, 7, 1, 6, 5], is360: 1 },
        { steps: 14, x0: -18.5, x1: 5.0,  z0: -2.6, z1: -6.8, yBoost: 0.36, pal: [0, 3, 6, 4, 7], is360: 1 },
        { steps: 11, x0: -15.5, x1: -4.2, z0: 14.5, z1: 4.2,  yBoost: 0.38, pal: [1, 6, 0, 7, 2], is360: 0 },
        { steps: 9,  x0: -21.5, x1: -14.5, z0: 19.5, z1: 8.5, yBoost: 0.42, pal: [0, 6, 2, 7, 1], is360: 0 },
      ];
      for (const band of rearLeftGapBands) {
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

      // Uniform 360-degree concentric wildflower rings outside intro valley (complete horizon on every tab angle)
      const ringSpecs = [
        { r: 7.0,  count: lowEnd ? 10 : 14, scale: 1.02, yBoost: 0.18 },
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
            const kk = R() < 0.74 ? k : (R() < 0.65 ? 6 + Math.floor(R() * 2) : (k + 2) % 6);
            const tileId = 16 + kk + (R() < 0.5 ? 8 : 0);
            const ang = Math.atan2(zz - SAKURA_Z, xx - SAKURA_X);
            const r = Math.hypot(xx - SAKURA_X, zz - SAKURA_Z);
            pushParticle(
              xx,
              yy,
              zz,
              flSize,
              tileId,
              R(),
              lf * (0.94 + R() * 0.10),
              0.0,
              ang,
              r,
              0.72 + R() * 0.80,
              1.0
            );
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

      // 7. Pack VBO & Build O(N) 256-Bucket Camera-Depth Radix Sort Buffers
      await yieldSlice();
      particleCount = Math.min(65000, particles.length);

      // Select 24 real wildflowers that catch and rest naturally on the open lotus petals after fly-up
      const landSlots = [];
      for (let p = 0; p < 8; p++) {
        const azOuter = 0.18 + (TAU * p) / 8;
        landSlots.push(
          { ringNorm: 0.0, az: azOuter, u: 0.56 + (p % 2) * 0.12, v: p % 2 ? 0.24 : -0.26, wantBlue: p % 3 === 1 },
          { ringNorm: 0.0, az: azOuter, u: 0.72 - (p % 2) * 0.10, v: p % 2 ? -0.22 : 0.26, wantBlue: p % 3 === 2 }
        );
        const azMid = 0.18 + Math.PI / 8 + (TAU * p) / 8;
        landSlots.push(
          { ringNorm: 0.5, az: azMid, u: 0.54 + (p % 3) * 0.08, v: p % 2 ? -0.18 : 0.20, wantBlue: p % 2 === 0 }
        );
      }
      const assignedLanders = new Set();
      for (const slot of landSlots) {
        const approxR = slot.ringNorm < 0.25 ? 3.8 : 3.2;
        const tx = SAKURA_X + C(slot.az) * approxR;
        const tz = SAKURA_Z + S(slot.az) * approxR;
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
          pt[9] = slot.az;
          pt[11] = 10.0 + (slot.ringNorm > 0.25 ? 100.0 : 0.0) + Math.round(slot.u * 50) + (slot.v * 0.5 + 0.5);
        }
      }

      const meadowIdxList = [];
      const coreIndices = [];
      const packed = new Float32Array(particleCount * 12);
      const flTemp = [];
      let fCount = 0;
      let gCount = 0;
      for (let i = 0; i < particleCount; i++) {
        const pt = particles[i];
        packed.set(pt, i * 12);
        const tileId = pt[4];
        const roleVal = pt[7];
        if (tileId >= 16 && tileId < 32) {
          flTemp.push(pt[0], pt[1], pt[2], pt[3]);
          fCount++;
        } else if (tileId < 12) {
          gCount++;
        }
        if (roleVal > 0.5 && roleVal < 1.5) {
          coreIndices.push(i);
        } else {
          meadowIdxList.push(i);
        }
      }

      meadowCount = meadowIdxList.length;
      meadowPosX = new Float32Array(meadowCount);
      meadowPosY = new Float32Array(meadowCount);
      meadowPosZ = new Float32Array(meadowCount);
      meadowLayerBias = new Float32Array(meadowCount);
      meadowBandOffset = new Uint16Array(meadowCount);
      meadowOrigIdx = new Uint16Array(meadowCount);
      sortedMeadow = new Uint16Array(meadowCount);
      depthKeys = new Uint16Array(meadowCount);
      tempKeys = new Uint16Array(meadowCount);
      tempIdx = new Uint16Array(meadowCount);
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
      meadowFlowerStart = band0Count;

      flowerTotal = fCount;
      foliageTotal = gCount;
      flowerBounds = new Float32Array(flTemp);
      particles.length = 0;
      particleBuf = makeBuffer(packed);
      glowQuadBuf = makeBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      meadowEbo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meadowEbo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sortedMeadow, gl.DYNAMIC_DRAW);
      coreCount = coreIndices.length;
      coreEbo = makeElementBuffer(new Uint16Array(coreIndices));
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
      uAaPass: gl.getUniformLocation(sakuraMeshProg, "uAaPass"),
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
      uAaPass: gl.getUniformLocation(stamenProg, "uAaPass"),
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
    };
    const pvUniforms = {
      uCamPos: gl.getUniformLocation(pvProg, "uCamPos"),
      uViewMat: gl.getUniformLocation(pvProg, "uViewMat"),
      uLens: gl.getUniformLocation(pvProg, "uLens"),
      uAction: gl.getUniformLocation(pvProg, "uAction"),
      uState: gl.getUniformLocation(pvProg, "uState"),
      uAim: gl.getUniformLocation(pvProg, "uAim"),
      uOverlay: gl.getUniformLocation(pvProg, "uOverlay"),
      uImage: gl.getUniformLocation(pvProg, "uImage"),
    };

    function buildViewMatrix(cx, cy, cz, tx, ty, tz) {
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

    const hwMaxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 256;

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
      if (disposed || !canvas.isConnected || !particleBuf || !atlasTex || !sakuraMesh || !stamenMesh) return;
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

      const rawDt = Math.min(0.034, Math.max(0.004, gap * 0.001));
      smoothDt = animating ? smoothDt * 0.72 + rawDt * 0.28 : rawDt;
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
      const flyRate =
        flyTarget > flyStage0
          ? 4.4
          : flyTarget > 0.05
            ? fallRate
            : 2.1;
      const flyEase = isReduced ? 1 : 1 - Math.exp(-dt * flyRate);
      const settleRate = settleTarget > settleMix ? 0.10 + 0.61 * fallRamp : 1.55;

      if (!paused) {
        if (!isReduced) {
          tClock += dt;
        }
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
      }

      const cw = Math.max(1, canvas.clientWidth);
      const ch = Math.max(1, canvas.clientHeight);
      const maxDpr = lowEnd ? 0.95 : 1.0;
      const targetDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const nativePixels = Math.round(cw * ch * targetDpr * targetDpr);
      const hi = Math.max(lowEnd ? 750000 : 1200000, Math.min(nativePixels, lowEnd ? 1150000 : 1850000));
      const minBudget = Math.max(Math.round(cw * ch * 0.72), lowEnd ? 400000 : 650000);

      if (!animating && !settledOpen && now - budgetAt > 1500) {
        if (avgGap > 36 && budget > minBudget) {
          budget = Math.max(minBudget, Math.round(budget * 0.82));
        } else if (avgGap < 20 && budget < hi) {
          budget = Math.min(hi, Math.round(budget * 1.12));
        }
        budgetAt = now;
      }

      const dpr = Math.min(targetDpr, Math.sqrt(budget / (cw * ch)));
      const maxPointSize = Math.min(
        hwMaxPointSize,
        Math.round((lowEnd ? 84 : 96) * dpr)
      );
      const W = Math.max(2, Math.round(cw * dpr));
      const H = Math.max(2, Math.round(ch * dpr));
      const aspect = W / H;
      const focal = aspect < 0.85 ? 1.18 : 1.72;

      if (widthPx !== W || heightPx !== H) {
        canvas.width = widthPx = W;
        canvas.height = heightPx = H;
        gl.viewport(0, 0, widthPx, heightPx);
      }
      if (cw !== lastStatsW || ch !== lastStatsH) {
        lastStatsW = cw;
        lastStatsH = ch;
        updateSceneStats(focal, aspect);
      }

      // Side-View Balanced Stage Orbit (~93 deg -> ~131 deg across tabs, synchronized 360-deg spherical sky)
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
        const skyDpr = 0.65;
        const sW = Math.max(2, Math.round(cw * skyDpr));
        const sH = Math.max(2, Math.round(ch * skyDpr));
        const skyResized = skyWidthPx !== sW || skyHeightPx !== sH;
        if (skyResized) {
          skyCanvas.width = skyWidthPx = sW;
          skyCanvas.height = skyHeightPx = sH;
          skyGl.viewport(0, 0, skyWidthPx, skyHeightPx);
        }
        if (skyResized || lastSkyNow === 0 || animating || pointerActive || now - lastSkyNow >= 50) {
          lastSkyNow = now;
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
        }

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

      // Exact 16-bit Radix Sort driven strictly by canonical (baseYaw, baseElev, baseDist) -> zero idle/mouse flicker
      const bloomS = bloomMix * bloomMix * (3 - 2 * bloomMix);
      const bloomLift = bloomS * 2.10;
      const anchorY = 0.42 + bloomLift;
      const sharedScale = 1.0 + Math.min(1, Math.max(0, bloomMix / 0.92)) * 0.40 + settleMix * 0.08;

      const baseYaw = dCurve * 1.62 + tabYawMix * dCurve;
      const baseElev = introElev + (0.42 - introElev) * Math.pow(dCurve, 0.92);
      const baseDist = 8.85 + (openDist - 8.85) * dCurve + S(dCurve * Math.PI) * 1.15;
      const sortThreshold = animating ? 0.024 : 0.001;
      if (
        !hasSortedOnce ||
        Math.abs(baseYaw - lastSortedYaw) > sortThreshold ||
        Math.abs(baseElev - lastSortedElev) > sortThreshold ||
        Math.abs(baseDist - lastSortedDist) > (animating ? 0.30 : 0.04)
      ) {
        const baseHoriz = baseDist * C(baseElev);
        const baseCamX = targetX + S(baseYaw) * baseHoriz;
        const baseCamZ = targetZ - C(baseYaw) * baseHoriz;
        const baseCamY = targetY + baseDist * S(baseElev);
        const baseViewMat = buildViewMatrix(baseCamX, baseCamY, baseCamZ, targetX, targetY, targetZ);
        sortMeadowByCamera(baseCamX, baseCamY, baseCamZ, baseViewMat);
        lastSortedYaw = baseYaw;
        lastSortedElev = baseElev;
        lastSortedDist = baseDist;
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

        gl.uniform3f(pvUniforms.uCamPos, camX, camY, camZ);
        gl.uniformMatrix3fv(pvUniforms.uViewMat, false, viewMat);
        gl.uniform4f(pvUniforms.uLens, focal, aspect, heightPx, maxPointSize);
        gl.uniform4f(pvUniforms.uAction, tClock, bloomMix, flyMix, isReduced ? 0 : mouseSmooth);
        gl.uniform3f(pvUniforms.uState, settleMix, aspect, dCurve);
        gl.uniform2f(pvUniforms.uAim, ax, ay);
        gl.uniform2f(pvUniforms.uOverlay, overlayAlpha, overlayMode);
        gl.uniform1i(pvUniforms.uImage, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
        gl.drawElements(gl.POINTS, count, gl.UNSIGNED_SHORT, offsetBytes);

        gl.disableVertexAttribArray(pvAttrs.aBase);
        gl.disableVertexAttribArray(pvAttrs.aStyle);
        gl.disableVertexAttribArray(pvAttrs.aExtra);
      }

      const useFrontDepth = meadowCount > 0;

      const stride = 48;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // 2. Full Meadow Layer (all foliage strictly behind flowers, true 3D pass)
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      if (meadowCount > 0) {
        drawPvRange(meadowEbo, meadowCount, 0);
      }

      // 2.5 Screen-Blend Optical Pastel Sakura Pink Back Halo Behind Lotus Blossom
      gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE);
      drawGlowBillboard(
        SAKURA_X,
        anchorY + (2.35 - 0.90 * bloomMix) * sharedScale,
        SAKURA_Z,
        (3.8 + 5.2 * bloomMix) * sharedScale,
        1.0, 0.62, 0.76, 0.34 + 0.52 * bloomMix,
        1.0, 0.48, 0.66, 5.2
      );
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // 3. Central 3D Curved Luminous Lotus Blossom + Sculpted 3D Stamen Heart & Filaments (shared Z-buffer + stencil)
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

      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.uniform1f(smUniforms.uAaPass, 0.0);
      gl.drawElements(gl.TRIANGLES, sakuraMesh.indexCount, gl.UNSIGNED_SHORT, 0);

      gl.depthMask(false);
      gl.depthFunc(gl.LEQUAL);
      gl.uniform1f(smUniforms.uAaPass, 1.0);
      gl.drawElements(gl.TRIANGLES, sakuraMesh.indexCount, gl.UNSIGNED_SHORT, 0);
      if (useFrontDepth) {
        gl.colorMask(false, false, false, false);
        gl.depthMask(true);
        gl.depthFunc(gl.LESS);
        gl.uniform1f(smUniforms.uAaPass, 1.0);
        gl.drawElements(gl.TRIANGLES, sakuraMesh.indexCount, gl.UNSIGNED_SHORT, 0);
        gl.colorMask(true, true, true, true);
      }
      gl.depthFunc(gl.LESS);

      gl.disableVertexAttribArray(smAttrs.aPetalUV);
      gl.disableVertexAttribArray(smAttrs.aPetalDim);

      // 3.5 Sculpted 3D Lotus Receptacle Dome + 3-Ring Camera-Billboarded Stamen + Calyx Base, Stem & Sepals
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
        gl.uniform1f(stUniforms.uAaPass, 0.0);
        gl.drawElements(gl.TRIANGLES, stamenMesh.indexCount, gl.UNSIGNED_SHORT, 0);

        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        gl.uniform1f(stUniforms.uAaPass, 1.0);
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
      const pinkBloomOp = Math.min(1, Math.max(0, (bloomMix - 0.15) / 0.80)) * 0.11;
      if (pinkBloomOp > 0.004) {
        drawGlowBillboard(
          SAKURA_X,
          anchorY + 1.35 * sharedScale,
          SAKURA_Z,
          3.2 * sharedScale,
          1.0, 0.48, 0.66, pinkBloomOp,
          1.0, 0.40, 0.60, 7.2
        );
      }
      const stamenGlowOp = Math.min(1, Math.max(0, (bloomMix - 0.20) / 0.70)) * 0.36;
      if (stamenGlowOp > 0.004) {
        drawGlowBillboard(
          SAKURA_X,
          anchorY + 1.35 * sharedScale,
          SAKURA_Z,
          1.80 * sharedScale,
          1.0, 0.84, 0.28, stamenGlowOp,
          1.0, 0.64, 0.14, 9.0
        );
      }
      const mistOp = Math.min(1, Math.max(0, (bloomMix - 0.28) / 0.67)) * 0.11;
      if (mistOp > 0.004) {
        drawGlowBillboard(
          SAKURA_X,
          anchorY + 2.0 * sharedScale,
          SAKURA_Z,
          2.4 * sharedScale,
          1.0, 0.80, 0.36, mistOp,
          1.0, 0.56, 0.70, 9.5
        );
      }
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // 4. Stamen Pollen Glints Only (strictly above lotus crown, zero flowerbed overlap)
      if (coreCount > 0 && bloomMix > 0.2) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LESS);
        drawPvRange(coreEbo, coreCount, 0);
      }

      // 4.5 True 3D Stencil-Masked Foreground Flowerbed (genuine camera depth everywhere, parted cleanly around open petals)
      if (useFrontDepth) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.EQUAL, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        gl.stencilMask(0x00);
        if (bloomMix > 0.36 && meadowFlowerStart < meadowCount) {
          drawPvRange(meadowEbo, meadowCount - meadowFlowerStart, meadowFlowerStart * 2, 1.0, 1.0);
        } else {
          drawPvRange(meadowEbo, meadowCount, 0, 1.0, 1.0);
        }
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
      if (document.hidden) {
        suspendScene();
      } else {
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

    let startupWatchTimer = 0;

    buildScene().catch(() => {
      if (!disposed) triggerFallback();
    });

    return {
      setBloom(open) {
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
          // Reverse swoop cleanly back out to the intro valley
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
        tabYawTarget = (Number.isFinite(idx) ? idx : 0) * 0.22;
        wake();
      },
      setTheme() {},
      setPaused(nextPaused) {
        paused = !!nextPaused;
        if (paused) {
          suspendScene();
        } else {
          resumeScene();
        }
      },
      pulseScatter() {},
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

