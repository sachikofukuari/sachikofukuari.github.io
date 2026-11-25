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
(function () {
  "use strict";

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

  window.createLotusScene = function createLotusScene(canvas, options) {
    const opts = options || {};
    const onFallback = typeof opts.onFallback === "function" ? opts.onFallback : function () {};

    let disposed = false;
    let paused = !!opts.paused;
    let bloomTarget = opts.initialOpen ? 1 : 0;
    let bloomMix = bloomTarget;
    let settleTarget = opts.initialOpen ? 1 : 0;
    let settleMix = settleTarget;
    let flyTarget = opts.initialOpen ? 0.26 : 0;
    let flyStage1 = flyTarget;
    let flyMix = flyTarget;

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

    const gl = canvas.getContext("webgl", {
      alpha: false,
      depth: true,
      antialias: true,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      triggerFallback();
      return createNoopApi();
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

    function createNoopApi() {
      return {
        setBloom() {},
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
      if (performance.now() - sliceTick < 7) return;
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
    function compileProgram(vSrc, fSrc) {
      const prog = gl.createProgram();
      for (const [src, type] of [
        [vSrc, gl.VERTEX_SHADER],
        [fSrc, gl.FRAGMENT_SHADER],
      ]) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          throw new Error(gl.getShaderInfoLog(sh) || "Shader compile error");
        }
        gl.attachShader(prog, sh);
      }
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) || "Program link error");
      }
      return prog;
    }

    // 1. Pink Twilight Starry Sky + Wandering Slight-White Glow + Mountain Sill
    const bgProg = compileProgram(
      `attribute vec2 pos;
       varying vec2 uv;
       void main() {
         gl_Position = vec4(pos, 0.0, 1.0);
         uv = pos;
       }`,
      `precision mediump float;
       varying vec2 uv;
       uniform float uTime;
       uniform float uAspect;

       float hash21(vec2 p) {
         p = fract(p * vec2(123.34, 456.21));
         p += dot(p, p + 45.32);
         return fract(p.x * p.y);
       }

       float starLayer(vec2 suv, float scale, float threshold, float coreK, float sparkleWeight, float phaseShift) {
         vec2 gv = fract(suv * scale) - 0.5;
         vec2 id = floor(suv * scale);
         float rnd = hash21(id + phaseShift);
         if (rnd < threshold) return 0.0;
         vec2 rVec = vec2(hash21(id + vec2(13.7, 29.1) + phaseShift), hash21(id + vec2(71.3, 19.7) + phaseShift));
         vec2 offs = (rVec - 0.5) * 0.34;
         vec2 fp = gv - offs;
         float dist = length(fp);
         float cellWin = smoothstep(0.32, 0.08, dist);
         if (cellWin <= 0.001) return 0.0;
         float d2 = dist * dist;
         float twinkle = 0.54 + 0.46 * sin(uTime * (1.15 + rVec.y * 2.1) + rVec.x * 28.0);
         float core = exp(-d2 * coreK);
         float halo = exp(-d2 * 30.0) * 0.24;
         float crossRays = exp(-abs(fp.x) * 85.0 - abs(fp.y) * 22.0) + exp(-abs(fp.y) * 85.0 - abs(fp.x) * 22.0);
         float starVal = (core + halo + crossRays * sparkleWeight * 0.48) * cellWin;
         return starVal * twinkle * (0.65 + 0.50 * rVec.x);
       }

       void main() {
         vec3 col = vec3(0.0);

         // V-valley canyon silhouette tucked behind steep 3D wildflower valley walls
         float sillScale = clamp((uAspect - 0.45) / 1.15, 0.28, 1.0);
         float ax = abs(uv.x);
         float asym = uv.x < 0.0 ? 1.06 : 0.94;
         float vWall = (0.04 + (ax * 0.44 + ax * ax * 0.44) * asym) * sillScale;
         float sillEdge = vWall - 0.06 + 0.015 * sin(uv.x * 6.0);
         float sillMask = 1.0 - smoothstep(sillEdge - 0.14, sillEdge + 0.04, uv.y);
         vec3 sillCol = vec3(0.010, 0.012, 0.010);
         col = mix(col, sillCol, sillMask * 0.85);

         // Crisp 3-layer twinkling stars above the V-valley skyline against pure AMOLED black
         float skyMask = smoothstep(sillEdge - 0.01, sillEdge + 0.14, uv.y) * smoothstep(-0.08, 0.30, uv.y);
         if (skyMask > 0.004) {
           vec2 starUv = vec2(uv.x * uAspect, uv.y);
           float s1 = starLayer(starUv, 26.0, 0.88, 165.0, 0.0, 0.0) * 0.56;
           float s2 = starLayer(starUv, 13.0, 0.87, 110.0, 0.0, 19.3) * 0.74;
           float s3 = starLayer(starUv, 6.5,  0.88, 110.0, 1.0, 47.9) * 0.84;
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

       uniform vec4 uCamera;
       uniform vec4 uLens;
       uniform vec4 uAction;      // x: time, y: bloom, z: flyMix, w: mouseActive
       uniform vec2 uState;       // x: settle, y: aspect
       uniform vec2 uAim;

       varying vec2 vUv;
       varying float vDist;
       varying float vSide;
       varying float vRing;
       varying float vBloom;
       varying vec3 vNormal;
       varying vec3 vWorldPos;

       float lotusWidth(float u) {
         float t = clamp(u, 0.0, 1.0);
         if (t <= 0.0001 || t >= 0.9999) return 0.0;
         return sin(pow(t, 0.72) * 3.14159265) * (1.0 - 0.10 * t * t);
       }

       vec3 evalSakuraPoint(float u, float v, float ringNorm, float petalAz, float len, float maxW, float rb, float t, float settle) {
         float uSafe = max(0.0001, u);
         float wEnv = lotusWidth(u);
         float breath = sin(t * 0.85 + petalAz * 2.0 + u) * mix(0.008, 0.020, rb);

         // 1. Fully closed, sealed teardrop lotus bud (rb = 0): all tips converge cleanly to r = 0 at u = 1
         float budH = 3.52 + 0.14 * ringNorm;
         float yClosed = pow(uSafe, 0.90) * budH;
         float shellR = mix(1.42, 1.02, ringNorm);
         float baseC = mix(0.24, 0.08, ringNorm) * (1.0 - u) * (1.0 - u);
         float rClosed = baseC + shellR * wEnv * (1.0 - 0.10 * u) + 0.008 * (1.0 - ringNorm) * (1.0 - u);

         // 2. Fully open cupped upward-curving lotus blossom (rb = 1): pointed tips always curve up into view
         float openTilt = mix(1.10, 0.46, ringNorm) + breath;
         float along = u * len * (1.0 - 0.12 * rb);
         float baseO = mix(0.46, 0.12, ringNorm);
         float bellyArc = sin(u * 3.14159265) * mix(0.24, 0.12, ringNorm);
         float tipLift = pow(uSafe, 2.2) * mix(0.34, 0.20, ringNorm);
         float spoon = mix(0.11, 0.07, ringNorm) * wEnv * (1.0 - v * v);
         float nRadO = cos(openTilt);
         float nYO = -sin(openTilt);
         float rOpen = baseO + sin(openTilt) * along + nRadO * (bellyArc + spoon);
         float yOpen = 0.44 + cos(openTilt) * along + nYO * (bellyArc + spoon) + tipLift;

         // Smooth closed-bud -> open-lotus peel
         float peel = sin(rb * 3.14159265) * (0.14 * (1.0 - ringNorm)) * sin(u * 3.14159265);
         float radial = mix(rClosed, rOpen, rb) + peel + breath * u * 0.42;
         float height = mix(yClosed, yOpen, rb);

         // Subtle per-petal pillow + normal-aligned shingle (both proportional to wEnv -> 0 at tip)
         float effTilt = mix(0.12 + 0.14 * (1.0 - ringNorm), openTilt, rb);
         float nRad = cos(effTilt);
         float nY = -sin(effTilt);
         float petalPillow = mix(0.036, 0.024, ringNorm) * wEnv * (1.0 - v * v) * (1.0 - rb * 0.65);
         float shingle = v * wEnv * (0.044 + 0.048 * rb);

         float rEff = radial + nRad * (petalPillow + shingle);
         float yEff = height + nY * (petalPillow + shingle);

         // Exact width-preserving arc wrap (closed) -> tangential fan (open): STRICTLY 0 width at u = 1.0 for ALL rb
         float halfW = wEnv * (maxW * 0.5) * (1.28 - 0.24 * rb + settle * 0.16);
         float wrapR = max(rEff, 0.035);
         float arcAng = clamp((v * halfW) / wrapR, -1.02, 1.02) * (1.0 - rb);
         float tangOpen = v * halfW * rb;

         float ang = petalAz + arcAng;
         float ca = cos(ang);
         float sa = sin(ang);
         float rx = rEff * ca - tangOpen * sa;
         float rz = rEff * sa + tangOpen * ca;

         float scaleL = 1.0 + rb * 0.02 + settle * 0.10;
         vec3 anchor = vec3(0.0, 0.42, 8.5);
         return anchor + vec3(rx, yEff + settle * 0.12 * u, rz) * scaleL;
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
         float vN = clamp(v, -0.88, 0.88);
         vec3 pU0 = evalSakuraPoint(uN - 0.02, vN, ringNorm, petalAz, len, maxW, rb, t, settle);
         vec3 pU1 = evalSakuraPoint(uN + 0.02, vN, ringNorm, petalAz, len, maxW, rb, t, settle);
         vec3 pV0 = evalSakuraPoint(uN, vN - 0.025, ringNorm, petalAz, len, maxW, rb, t, settle);
         vec3 pV1 = evalSakuraPoint(uN, vN + 0.025, ringNorm, petalAz, len, maxW, rb, t, settle);
         vec3 rawN = cross(pU1 - pU0, pV1 - pV0);
         vec3 nrm = rawN / max(length(rawN), 0.0001);

         float cx = wPos.x - uCamera.x;
         float cy = wPos.y - uCamera.y;
         float dep = wPos.z - uCamera.z;

         vec2 p = vec2((cx * uLens.x) / uLens.y, cy * uLens.x + dep * uCamera.w);
         p.x += uAim.x * dep * 0.032;
         p.y += uAim.y * dep * 0.020;

         float zn = (dep - 0.6) / 24.0 * 2.0 - 1.0;
         gl_Position = vec4(p, zn * dep, dep);

         vUv = vec2(u, v);
         vDist = clamp(u, 0.0, 1.0);
         vSide = v * lotusWidth(u);
         vRing = ringNorm;
         vBloom = rb;
         vNormal = nrm;
         vWorldPos = wPos;
       }`,
      `precision highp float;
       uniform float uSettle;
       uniform vec4 uCamera;

       varying vec2 vUv;
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

         // Soft pastel lotus pink bloom palette
         vec3 throat = vec3(0.96, 0.46, 0.68);
         vec3 mid = vec3(1.0, 0.70, 0.84);
         vec3 edge = vec3(1.0, 0.88, 0.94);

         vec3 col = mix(throat, mid, smoothstep(0.05, 0.45, d));
         col = mix(col, edge, smoothstep(0.66, 1.0, d) * 0.78);
         col = mix(col, mix(col * 1.06, edge, 0.20), vRing * 0.35);

         // Delicate lengthwise lotus petal striations (softened when settled in background)
         float veinWave = 0.5 + 0.5 * cos(v * 22.0);
         float veinMask = smoothstep(0.14, 0.38, d) * (1.0 - smoothstep(0.76, 0.98, d)) * (1.0 - uSettle);
         col *= 1.0 - veinWave * veinMask * 0.045;

         // Warm rose-tinted inter-petal overlap AO (clean separation without greyness)
         float ao = 0.84 + 0.16 * smoothstep(-0.32, 0.14, vSide);
         col = mix(col * vec3(0.78, 0.52, 0.68), col, ao);

         // Hue-shifted luminous pastel pink key light + rose bounce from flowerbed below
         vec3 n = normalize(vNormal);
         if (!gl_FrontFacing) n = -n;
         vec3 viewDir = normalize(uCamera.xyz - vWorldPos);
         vec3 lightDir = normalize(vec3(-0.32, 0.72, -0.62));
         float diff = max(dot(n, lightDir), 0.0);
         float wrap = 0.5 + 0.5 * dot(n, lightDir);
         float shadeT = clamp(wrap * 0.72 + diff * 0.38, 0.0, 1.0);
         float bounce = max(dot(n, normalize(vec3(0.25, -0.55, -0.45))), 0.0);
         vec3 lightTint = mix(vec3(0.76, 0.48, 0.63), vec3(1.16, 1.02, 1.09), shadeT);
         lightTint += vec3(0.22, 0.12, 0.18) * bounce;
         lightTint = mix(lightTint, vec3(0.98, 0.80, 0.91), uSettle * 0.50);
         col *= lightTint;

         // Inner lantern pastel pink bloom + backlit translucency + pastel specular sheen
         vec3 halfVec = normalize(lightDir + viewDir);
         float sss = pow(clamp(dot(-viewDir, lightDir) * 0.5 + 0.5, 0.0001, 1.0), 1.5) * (0.35 + 0.65 * d);
         float rim = pow(clamp(1.0 - max(dot(n, viewDir), 0.0), 0.0001, 1.0), 2.2);
         float spec = pow(max(dot(n, halfVec), 0.0001), 16.0) * (1.0 - uSettle * 0.8);
         col += vec3(1.0, 0.56, 0.78) * exp(-d * 1.9) * (0.28 + 0.22 * vBloom);
         col += vec3(1.0, 0.66, 0.83) * sss * (0.24 + 0.14 * vBloom);
         col += vec3(1.0, 0.86, 0.94) * spec * 0.26;

         // Soft pastel blush Fresnel rim glow outlines each petal (feathered out when settled)
         float rimEdge = max(smoothstep(0.76, 0.98, abs(v)), smoothstep(0.82, 0.99, u)) * (1.0 - uSettle);
         col = mix(col, vec3(1.0, 0.86, 0.93), clamp(rimEdge * 0.28 + rim * 0.38 * (1.0 - uSettle * 0.55), 0.0, 0.55));

         // Pastel-preserving bloom rolloff (keeps glow airy pastel pink without clipping to white)
         col = (col / (vec3(1.0) + col * 0.22)) * 1.14;
         col.g = min(col.g, col.r * 0.84);
         col = clamp(col, 0.0, 1.0);

         float edgeFeather = smoothstep(1.0, 0.16, abs(v)) * smoothstep(1.0, 0.22, u) * smoothstep(0.0, 0.16, u);
         float softMask = mix(1.0, edgeFeather, uSettle);
         float alpha = mix(1.0, 0.36, uSettle) * softMask;
         gl_FragColor = vec4(col, alpha);
       }`
    );

    // 3. Full-Depth Meadow Point-Sprite Shader
    const pvProg = compileProgram(
      `precision highp float;
       attribute vec4 aBase;
       attribute vec4 aStyle;
       attribute vec4 aExtra;

       uniform vec4 uCamera;
       uniform vec4 uLens;
       uniform vec4 uAction;   // x: time, y: bloom, z: flyMix, w: mouseActive
       uniform vec2 uState;    // x: settle, y: aspect
       uniform vec2 uAim;

       varying vec4 vBot;
       varying vec4 vColor;
       varying vec2 vRotCS;
       varying vec2 vDepthFx;

       void main() {
         float t = uAction.x;
         float bloom = uAction.y;
         float fly = uAction.z;
         float settle = uState.x;

         float tile = aStyle.x;
         float seed = aStyle.y;
         float lit = aStyle.z;
         float role = aStyle.w; // 0: meadow/dust/bug, 1: sakura stamen, 2: calyx pads, 3: lotus aura

         float x = aBase.x;
         float y = aBase.y;
         float z = aBase.z;
         float ptSize = aBase.w;

         float blossom = step(15.9, tile);
         float dust = step(31.9, tile);
         float bug = step(32.9, tile);
         float isAura = step(2.5, role);
         float isHeart = step(0.5, role) * (1.0 - step(1.5, role));
         float isPad = step(1.5, role) * (1.0 - isAura);

         float ang = seed * 53.0;
         float defocus = 0.0;
         float opacity = 1.0;
         float spriteRot = ang * 0.35;
         float scatterGlow = 0.0;

         if (isHeart > 0.5) {
           vec3 anchor = vec3(0.0, 0.42, 8.5);
           float hReveal = smoothstep(0.24, 0.88, bloom);
           float lx = aBase.x * (0.45 + 0.65 * hReveal) + 0.025 * sin(t * 1.4 + ang);
           float ly = 0.28 + 0.52 * bloom + aBase.y * (0.55 + 0.45 * hReveal) + 0.02 * cos(t * 1.1 + ang);
           float lz = aExtra.w * (0.45 + 0.65 * hReveal);
           x = anchor.x + lx;
           y = anchor.y + ly;
           z = anchor.z + lz;
           opacity = hReveal * 0.92 * (1.0 - settle * 0.78);
           spriteRot = ang * 0.4 + t * 0.1;
           scatterGlow = hReveal * 0.48 * (1.0 - settle * 0.75);
           defocus = mix(0.0, 0.92, settle);
         } else if (isAura > 0.5) {
           vec3 anchor = vec3(0.0, 0.42, 8.5);
           x = anchor.x + aBase.x * (0.95 + 0.55 * bloom);
           y = anchor.y + aBase.y * (1.0 - 0.12 * bloom);
           z = anchor.z + aExtra.w;
           opacity = (0.11 + 0.08 * bloom) * (1.0 - settle * 0.48);
           spriteRot = 0.0;
           defocus = 0.0;
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
             float frontMask = 1.0 - smoothstep(4.5, 8.2, aBase.z);
             float centerCorridor = exp(-aBase.x * aBase.x * 0.35) * frontMask;
             float partDir = (aBase.x + (seed - 0.5) * 0.18) >= 0.0 ? 1.0 : -1.0;
             float hoverBob = settle * (0.14 * sin(t * 0.85 + radialAngle * 2.0) + 0.08 * cos(t * 0.55 + seed * 12.0));
             float rise = (fly * (0.28 + blossom * 2.55) + hoverBob * (0.35 + blossom * 0.65)) * liftWeight;
             x += cos(radialAngle + t * 0.14) * rise * (0.78 + seed * 1.25) + partDir * fly * blossom * centerCorridor * (1.35 + seed * 0.85);
             y += rise * (0.94 + seed * 1.32) * (1.0 - centerCorridor * 0.64);
             z += sin(radialAngle + t * 0.12) * rise * 0.42 * (1.0 - frontMask * 0.78);
             scatterGlow = fly * blossom * 0.68 * (1.0 - settle * 0.65);
           } else {
             y -= settle * 0.28;
             opacity = 1.0 - settle * 0.72;
           }

           spriteRot = ang * 0.28 + gust * mix(0.048, 0.12, blossom) + sin(t * 1.1 + ang) * 0.02 + fly * 0.52;
         }

         float cx = x - uCamera.x;
         float cy = y - uCamera.y;
         float dep = z - uCamera.z;

         if (isHeart < 0.5 && isAura < 0.5) {
           float nearBlur = (1.0 - smoothstep(1.0, 2.8, dep)) * 0.62;
           float farBlur = smoothstep(32.0, 62.0, dep) * 0.72;
           defocus = max(max(nearBlur, farBlur), settle * (1.0 - blossom * 0.28) * 0.66);
            if (isPad < 0.5) {
              float nearAlpha = smoothstep(0.7, 1.85, dep);
              float farHorizon = 1.0 - smoothstep(54.0, 66.0, dep);
              opacity *= nearAlpha * farHorizon * (1.0 - settle * mix(0.68, 0.52, blossom));
            }
          }

          vec2 p = vec2((cx * uLens.x) / uLens.y, cy * uLens.x + dep * uCamera.w);
          p.x += uAim.x * dep * 0.032;
          p.y += uAim.y * dep * 0.020;

          vec2 diff = p / max(0.1, dep) - uAim;
          diff.x *= uLens.y;
          float clos = exp(-dot(diff, diff) * 14.0) * uAction.w;
          vec2 push = diff * clos * 0.12 * dep;
          push.x /= uLens.y;
          p += push;

          gl_Position = vec4(p, dep * 1.0017 - 0.18, dep);
          if (dep < 0.55 || dep > 68.0) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          }

          float sizePx = (ptSize * uLens.z * uLens.x * 0.5) / max(0.65, dep);
          float flyShrink = 1.0 - fly * blossom * (1.0 - isHeart) * (1.0 - isAura) * 0.22;
          gl_PointSize = clamp(sizePx * flyShrink, 1.0, uLens.w);

          float farFade = 1.0 - smoothstep(14.0, 56.0, dep) * mix(0.58, 0.28, max(blossom, isHeart));
          float backLift = smoothstep(10.0, 32.0, dep) * mix(0.06, 0.12, blossom);
          float hillTex = 0.88 + 0.24 * (0.5 + 0.5 * sin(x * 0.45 + z * 0.30) * cos(x * 0.28 - z * 0.38));
          float bright = (0.30 + 0.70 * farFade + backLift) * lit * mix(0.76, 1.02, max(blossom, isHeart));
          bright *= mix(1.0, hillTex, smoothstep(10.0, 20.0, dep));
          bright *= 1.0 + clos * 0.30 * max(blossom, isHeart);
          bright *= mix(1.0, 0.44, settle);

          if (bug > 0.5) {
            float beat = 0.5 + 0.5 * sin(t * (1.6 + seed * 0.85) + ang);
            opacity = (0.18 + 0.82 * smoothstep(0.24, 0.94, beat)) * (1.0 - smoothstep(16.0, 36.0, dep));
          }

          vBot = vec4(tile, clamp(defocus, 0.0, 1.0), seed, max(blossom * (1.0 - dust), isHeart));
          vColor = vec4(bright, scatterGlow, dust, clamp(opacity, 0.0, 1.0));
          vRotCS = vec2(cos(spriteRot), sin(spriteRot));
          vDepthFx = vec2(
            smoothstep(42.0, 74.0, dep) * 0.18,
            smoothstep(11.0, 44.0, dep)
          ) * (1.0 - dust) * (1.0 - bug) * (1.0 - isHeart) * (1.0 - isAura);
        }`,
      `precision mediump float;
       uniform sampler2D uImage;
       varying vec4 vBot;
       varying vec4 vColor;
       varying vec2 vRotCS;
       varying vec2 vDepthFx;

       void main() {
         vec2 q = gl_PointCoord - 0.5;
         if (vBot.x > 33.9) {
           float r = dot(q, q);
           float glow = exp(-r * 16.0) * vColor.w;
           if (glow < 0.004) discard;
           vec3 auraCol = mix(vec3(0.98, 0.56, 0.77), vec3(1.0, 0.80, 0.91), exp(-r * 36.0));
           gl_FragColor = vec4(auraCol * glow, glow * 0.38);
           return;
         }

         if (vBot.x > 32.9) {
           float r = dot(q, q);
           float core = exp(-r * 310.0);
           float aura = exp(-r * 24.0);
           float a = clamp((core + 0.46 * aura) * vColor.w, 0.0, 1.0);
           if (a < 0.008) discard;
           vec3 fireCol = mix(vec3(1.0, 0.74, 0.85), vec3(1.0, 0.97, 0.88), core);
           gl_FragColor = vec4(fireCol * a, a);
           return;
         }

         if (vColor.z > 0.5) {
           float a = exp(-dot(q, q) * 26.0) * (0.12 + vBot.z * 0.32) * vColor.w;
           gl_FragColor = vec4(vec3(0.98, 0.84, 0.91) * a, a);
           return;
         }

         vec2 uv = mat2(vRotCS.x, -vRotCS.y, vRotCS.y, vRotCS.x) * q + 0.5;
         if (any(lessThan(uv, vec2(0.003))) || any(greaterThan(uv, vec2(0.997)))) discard;

         vec2 loc = (vec2(mod(vBot.x, 8.0), floor(vBot.x / 8.0)) + uv) / 8.0;

         vec4 texel;
         if (vBot.y < 0.04) {
           texel = texture2D(uImage, loc);
         } else if (vBot.y > 0.96) {
           texel = texture2D(uImage, loc + vec2(0.0, 0.5));
         } else {
           texel = mix(texture2D(uImage, loc), texture2D(uImage, loc + vec2(0.0, 0.5)), vBot.y);
         }

         if (texel.a < 0.015) discard;

         float isBlue = step(15.9, vBot.x) * (1.0 - vColor.z) * step(5.5, mod(vBot.x, 8.0));
         vec3 pinkTint = mix(vec3(1.04, 0.94, 1.00), vec3(1.14, 0.78, 0.98), vDepthFx.y * mix(0.45, 1.0, vBot.w));
         vec3 blueTint = mix(vec3(0.94, 1.00, 1.08), vec3(0.76, 0.93, 1.16), vDepthFx.y);
         vec3 backTint = mix(pinkTint, blueTint, isBlue);
         vec3 rgb = texel.rgb * vColor.x * backTint;
         float bloomGlow = vBot.w * (0.30 + vColor.y * 0.34 + vDepthFx.y * 0.32);
         vec3 glowCol = mix(vec3(0.34, 0.14, 0.24), vec3(0.14, 0.26, 0.40), isBlue);
         rgb += glowCol * texel.a * bloomGlow * min(vColor.x, 1.15);
         rgb += vec3(0.11, 0.01, 0.06) * texel.a * vDepthFx.y * (1.0 - vBot.w);
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

    function makeBuffer(data) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    }

    function makeElementBuffer(data) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    }

    const quadBuf = makeBuffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

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

    function insideMeadowFrustum(x, z, allowRoot) {
      if (z < 1.1 || z > 64.0) return false;
      const maxX = Math.min(23.5, (z + 1.8) * 1.18);
      if (Math.abs(x - valleyCourse(z)) > maxX) return false;
      const dx = x - SAKURA_X;
      const dz = z - SAKURA_Z;
      const minR = allowRoot ? 0.45 : 2.05;
      if (Math.hypot(dx, dz) < minR && z > 6.2 && z < 10.5) return false;
      return true;
    }

    function buildSakuraMeshBuffer() {
      const tiers = [
        { count: 8, ringNorm: 0.0, len: 3.50, maxW: 1.64, azOffset: 0.18, ringIdx: 0 },
        { count: 7, ringNorm: 0.5, len: 3.32, maxW: 1.46, azOffset: 0.18 + Math.PI / 7, ringIdx: 1 },
        { count: 6, ringNorm: 1.0, len: 3.04, maxW: 1.24, azOffset: 0.18 + Math.PI / 3.5, ringIdx: 2 },
      ];
      const U_SEGS = 24;
      const V_SEGS = 24;
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
          const az = tier.azOffset + (TAU * p) / tier.count + (R() - 0.5) * 0.015;
          const pSeed = R();
          const len = tier.len * (0.98 + R() * 0.04);
          const maxW = tier.maxW * (0.98 + R() * 0.04);

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
    let particleZs = null;
    let particleCount = 0;
    let sakuraSplitIndex = 0;
    let sakuraMesh = null;

    function findSplitIndex(splitZ) {
      if (!particleZs) return sakuraSplitIndex;
      let lo = 0;
      let hi = particleCount;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (particleZs[mid] >= splitZ) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }

    let raf = 0;
    let lastNow = 0;
    let widthPx = 0;
    let heightPx = 0;
    let avgGap = 32;
    let budgetAt = 0;
    let budget = lowEnd ? 1800000 : 6400000;

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
    let hasPaintedOnce = false;

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

      // 1. Lush Dark-Green Siltora V-Valley Foliage Carpet + Foreground Mossy Mound
      const foliageCount = lowEnd ? 16500 : 26000;
      for (let i = 0; i < foliageCount; i++) {
        if (!(i & 511)) await yieldSlice();
        const z = 1.1 + Math.pow(R(), 1.15) * 60.9;
        const side = R() < 0.5 ? -1 : 1;
        const maxOff = Math.min(23.5, (z + 1.8) * 1.18);
        const off = side * Math.pow(R(), 1.12) * maxOff;
        const x = off + valleyCourse(z);
        if (!insideMeadowFrustum(x, z, true)) continue;

        const y = meadowFloor(x, z) - 0.04 + R() * 0.16;
        const pSeed = R();
        const patch = 0.5 + 0.5 * S(off * 1.18 + S(z * 0.28) * 1.8) * C(z * 0.34 + off * 0.38);
        const lit = 0.28 + 0.92 * Math.pow(patch, 1.65) + 0.22 * R();
        const depthMul = z < 2.4 ? 0.84 : z > 14 ? 1.0 + (z - 14) * 0.030 : 1.0;
        const size = (0.48 + R() * 0.92) * depthMul;
        const tile = R() < 0.54 ? 8 + Math.floor(R() * 4) : Math.floor(R() * 8);
        const ang = Math.atan2(z - SAKURA_Z, x - SAKURA_X);
        const r = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
        const liftWeight = 0.52 + R() * 0.72;
        pushParticle(x, y, z, size, tile, pSeed, lit, 0.0, ang, r, liftWeight, 0.0);
      }

      // Dedicated lush foreground central mossy mound framing the lotus root
      const moundCount = lowEnd ? 850 : 1300;
      for (let i = 0; i < moundCount; i++) {
        if (!(i & 511)) await yieldSlice();
        const z = 2.6 + R() * 5.0;
        const off = (R() * 2 - 1) * 3.6;
        const x = off + valleyCourse(z);
        if (!insideMeadowFrustum(x, z, true)) continue;
        const y = meadowFloor(x, z) + 0.02 + R() * 0.18;
        const patch = 0.5 + 0.5 * S(off * 1.4) * C(z * 0.65);
        const lit = 0.32 + 0.85 * Math.pow(patch, 1.45) + 0.20 * R();
        const size = 0.50 + R() * 0.78;
        const tile = R() < 0.56 ? 8 + Math.floor(R() * 4) : Math.floor(R() * 8);
        const ang = Math.atan2(z - SAKURA_Z, x - SAKURA_X);
        const r = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
        pushParticle(x, y, z, size, tile, R(), lit, 0.0, ang, r, 0.48 + R() * 0.55, 0.0);
      }

      // 2. Siltora-Style Cascading Diagonal Wildflower Streams (Abundant Pastel Pink + Scattered Pastel Blue)
      const beds = [];
      const streamDensity = lowEnd ? 0.68 : 1.0;

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
          beds.push([bx, z, k, wBase * distScale * (0.85 + R() * 0.35), dBase * distScale * (0.85 + R() * 0.35), litBoost]);
        }
      }

      const leftPalette = [0, 1, 2, 3, 5, 6, 7];
      const rightPalette = [0, 2, 4, 5, 1, 6, 7];

      // Left canyon wall sweeping cascades (4 serpentine streams across upper, mid, and lower slopes)
      addValleyRibbon(3.6, 48.0, 32, (u) => 2.5 + Math.pow(u, 0.92) * 17.5 + S(u * 5.2) * 1.2, -1, leftPalette, 0.94, 1.26, 0.95);
      addValleyRibbon(8.5, 52.0, 26, (u) => 5.0 + Math.pow(u, 0.85) * 18.0 + C(u * 4.4) * 1.4, -1, [2, 3, 6, 0, 5], 0.98, 1.32, 0.96);
      addValleyRibbon(2.0, 24.0, 18, (u) => 1.7 + u * 7.2 + S(u * 4.0) * 0.7, -1, [0, 1, 4, 6, 7], 0.86, 1.08, 0.94);
      addValleyRibbon(14.0, 44.0, 16, (u) => 8.2 + u * 12.2 - S(u * 3.8 + 0.5) * 1.1, -1, [1, 5, 6, 2, 7], 0.92, 1.22, 0.96);

      // Right canyon wall iconic S-curved cascades (4 sweeping streams winding into lower-right bank)
      addValleyRibbon(3.6, 48.0, 34, (u) => 2.4 + Math.pow(u, 0.95) * 18.0 - S(u * 6.2 + 0.4) * 1.5, 1, rightPalette, 0.96, 1.30, 0.95);
      addValleyRibbon(9.0, 52.0, 26, (u) => 5.2 + Math.pow(u, 0.86) * 18.2 + S(u * 4.8) * 1.3, 1, [4, 2, 7, 1, 5], 0.98, 1.34, 0.96);
      addValleyRibbon(2.0, 25.0, 18, (u) => 1.9 + u * 7.4 - C(u * 3.8) * 0.7, 1, [1, 3, 6, 0, 7], 0.88, 1.10, 0.94);
      addValleyRibbon(14.0, 44.0, 16, (u) => 8.5 + u * 12.0 + C(u * 3.6 + 0.3) * 1.2, 1, [0, 4, 7, 3, 6], 0.92, 1.22, 0.96);

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
        [4.8, 4.2, 5, 1.02, 0.95, 0.95]
      );

      // Midground valley pockets on slopes + sparse faint center canyon floor wisps
      const pocketCount = lowEnd ? 105 : 175;
      for (let b = 0; b < pocketCount; b++) {
        const z = 4.4 + Math.pow(R(), 0.94) * 48.6;
        const side = R() < 0.5 ? -1 : 1;
        const maxOff = Math.min(23.0, (z + 1.8) * 1.16);
        const minOff = z > 10.5 ? 2.0 : 1.15;
        const off = side * (minOff + Math.pow(R(), 0.84) * Math.max(1.0, maxOff - minOff));
        const bx = off + valleyCourse(z);
        if (!insideMeadowFrustum(bx, z, false)) continue;
        const distScale = z > 12 ? 1.0 + (z - 12) * 0.036 : 1.0;
        beds.push([bx, z, Math.floor(R() * 8), (0.74 + R() * 0.82) * distScale, (0.80 + R() * 1.12) * distScale, 0.95]);
      }

      for (let b = 0; b < beds.length; b++) {
        await yieldSlice();
        const [bx, bz, k, w, d, litBoost] = beds[b];
        const families = Math.min(38, Math.round(w * d * 7.5 + 6));
        for (let f = 0; f < families; f++) {
          const a = R() * TAU;
          const rr = Math.sqrt(R());
          const fx = bx + C(a) * rr * w * 1.18;
          const fz = bz + S(a) * rr * d * 1.18;
          const fOff = fx - valleyCourse(fz);
          if (fz > 11.5 && Math.abs(fOff) < 1.25 && R() < 0.80) continue;
          if (!insideMeadowFrustum(fx, fz, false)) continue;
          const baseFl = (0.24 + R() * 0.21) * (fz > 14 ? 1.0 + (fz - 14) * 0.044 : 1.0);
          const lf = (0.90 + R() * 0.12) * litBoost;
          const clusterCount = 3 + Math.floor(R() * 5);
          const clusterSpread = 0.48 + (fz > 16 ? (fz - 16) * 0.022 : 0);
          for (let i = 0; i < clusterCount; i++) {
            const xx = fx + (R() - 0.5) * clusterSpread;
            const zz = fz + (R() - 0.5) * clusterSpread;
            const yy = meadowFloor(xx, zz) + 0.24 + R() * 0.22;
            const kk = R() < 0.74 ? k : (R() < 0.65 ? 6 + Math.floor(R() * 2) : (k + 2) % 6);
            const tileId = 16 + kk + (R() < 0.5 ? 8 : 0);
            const ang = Math.atan2(zz - SAKURA_Z, xx - SAKURA_X);
            const r = Math.hypot(xx - SAKURA_X, zz - SAKURA_Z);
            pushParticle(
              xx,
              yy,
              zz,
              baseFl * (0.58 + R() * 0.76),
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
      for (let i = 0; i < (lowEnd ? 440 : 680); i++) {
        const a = R() * TAU;
        const rr = 0.2 + Math.pow(R(), 0.75) * 2.1;
        const px = SAKURA_X + C(a) * rr;
        const pz = SAKURA_Z + S(a) * rr * 0.88;
        const py = 0.56 + Math.max(0, 1.3 - rr) * 0.16 + (R() - 0.5) * 0.08;
        pushParticle(px, py, pz, 0.34 + R() * 0.4, Math.floor(R() * 12), R(), 0.68 + R() * 0.42, 2.0, a, rr, 0.3, 0.0);
      }

      // 4. Delicate Sakura Stamens Inside Blossom Throat (role = 1, tile = 15)
      for (let s = 0; s < 180; s++) {
        const a = R() * TAU;
        const r = Math.pow(R(), 0.65) * 0.62;
        const lx = C(a) * r;
        const ly = 0.22 + (1.0 - r * 0.55) * 0.7 + (R() - 0.5) * 0.16;
        const lz = S(a) * r;
        pushParticle(lx, ly, 0.25, 0.24 + R() * 0.16, 15, R(), 1.15, 1.0, 1.0, a, 0.5, lz);
      }

      // 4.5 Soft Pink Bloom Halo Aura Behind Lotus Blossom (role = 3, tile = 34)
      for (let i = 0; i < 18; i++) {
        const a = (TAU * i) / 18 + R() * 0.2;
        const ring = i % 3;
        const tier = Math.floor(i / 6);
        const rr = 0.18 + ring * 0.34;
        const lx = C(a) * rr;
        const ly = 1.05 + tier * 0.68 + (R() - 0.5) * 0.18;
        pushParticle(lx, ly, SAKURA_Z + 0.25, 3.2 + R() * 0.9, 34, R(), 1.0, 3.0, 0.0, 0.0, 0.0, 0.25);
      }

      // 5. Floating Pastel Pollen Motes (tile = 32)
      for (let i = 0; i < (lowEnd ? 150 : 240); i++) {
        const pz = 2.0 + R() * 26.0;
        const px = (R() * 2 - 1) * (pz + 2.0) * 0.9;
        const py = 0.8 + R() * 6.5;
        pushParticle(px, py, pz, 0.045 + R() * 0.085, 32, R(), 1.0, 0.0, Math.atan2(pz - SAKURA_Z, px), pz, 0.4 + R() * 0.7, 0.0);
      }

      // 6. Pulsing Rose-Gold Fireflies (tile = 33)
      for (let i = 0; i < (lowEnd ? 36 : 58); i++) {
        const fz = 2.6 + R() * 22.0;
        const fx = (R() * 2 - 1) * (fz + 1.5) * 0.85;
        const fy = 1.0 + R() * 4.4;
        pushParticle(fx, fy, fz, 0.32 + R() * 0.18, 33, R(), 1.0, 0.0, Math.atan2(fz - SAKURA_Z, fx), fz, 0.5 + R() * 0.6, 0.0);
      }

      // 7. Sort Far-to-Near along Z and split around central lotus depth
      await yieldSlice();
      particles.sort((a, b) => b[2] - a[2]);
      particleCount = particles.length;
      sakuraSplitIndex = particles.findIndex((p) => p[2] < SAKURA_Z - 0.55);
      if (sakuraSplitIndex === -1) sakuraSplitIndex = particleCount;

      particleZs = new Float32Array(particleCount);
      const packed = new Float32Array(particleCount * 12);
      for (let i = 0; i < particleCount; i++) {
        particleZs[i] = particles[i][2];
        packed.set(particles[i], i * 12);
      }
      particles.length = 0;
      particleBuf = makeBuffer(packed);

      document.body.classList.add("webgl-ready");
      wake();
    }

    const bgPosLoc = gl.getAttribLocation(bgProg, "pos");
    const bgUniforms = {
      uTime: gl.getUniformLocation(bgProg, "uTime"),
      uAspect: gl.getUniformLocation(bgProg, "uAspect"),
    };

    const smAttrs = {
      aPetalUV: gl.getAttribLocation(sakuraMeshProg, "aPetalUV"),
      aPetalDim: gl.getAttribLocation(sakuraMeshProg, "aPetalDim"),
    };
    const smUniforms = {
      uCamera: gl.getUniformLocation(sakuraMeshProg, "uCamera"),
      uLens: gl.getUniformLocation(sakuraMeshProg, "uLens"),
      uAction: gl.getUniformLocation(sakuraMeshProg, "uAction"),
      uState: gl.getUniformLocation(sakuraMeshProg, "uState"),
      uAim: gl.getUniformLocation(sakuraMeshProg, "uAim"),
      uSettle: gl.getUniformLocation(sakuraMeshProg, "uSettle"),
    };

    const pvAttrs = {
      aBase: gl.getAttribLocation(pvProg, "aBase"),
      aStyle: gl.getAttribLocation(pvProg, "aStyle"),
      aExtra: gl.getAttribLocation(pvProg, "aExtra"),
    };
    const pvUniforms = {
      uCamera: gl.getUniformLocation(pvProg, "uCamera"),
      uLens: gl.getUniformLocation(pvProg, "uLens"),
      uAction: gl.getUniformLocation(pvProg, "uAction"),
      uState: gl.getUniformLocation(pvProg, "uState"),
      uAim: gl.getUniformLocation(pvProg, "uAim"),
      uImage: gl.getUniformLocation(pvProg, "uImage"),
    };

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
        flyTarget = 0.24;
        settleTarget = 1;
      }
      lastNow = 0;
      wake();
    }

    function drawPointSlice(start, count) {
      if (count <= 0) return;
      gl.drawArrays(gl.POINTS, start, count);
    }

    function renderFrame(now) {
      raf = 0;
      if (disposed || !canvas.isConnected || !particleBuf || !atlasTex || !sakuraMesh) return;
      if (isBackgrounded() && hasPaintedOnce) return;

      const isReduced = reducedMotionMQ.matches;
      const animating =
        Math.abs(bloomTarget - bloomMix) > 0.004 ||
        Math.abs(flyTarget - flyMix) > 0.004 ||
        Math.abs(settleTarget - settleMix) > 0.004;

      const pointerActive = now - lastPointerMoveMs < 550;
      const settledOpen = !animating && settleMix > 0.985 && bloomTarget === 1;
      const minGap = animating ? 0 : settledOpen ? 60 : pointerActive ? 14 : 33;

      const gap = now - (lastNow || now - 16);
      if (hasPaintedOnce && !paused && !isReduced && minGap > 0 && gap < minGap) {
        wake();
        return;
      }

      const dt = Math.min(0.08, Math.max(0.001, gap * 0.001));
      lastNow = now;
      hasPaintedOnce = true;

      const bloomRate = bloomTarget > bloomMix ? 2.1 : 0.78;
      const bloomEase = isReduced ? 1 : 1 - Math.exp(-dt * bloomRate);
      const fastEase = isReduced ? 1 : 1 - Math.exp(-dt * 5.0);
      const flyRate = flyTarget > flyStage1 ? 2.35 : (bloomTarget === 1 ? 0.82 : 1.10);
      const flyEase = isReduced ? 1 : 1 - Math.exp(-dt * flyRate);
      const settleRate = settleTarget > settleMix ? 0.92 : 1.65;

      if (!paused) {
        if (!isReduced) {
          tClock += dt;
        }
        bloomMix += (bloomTarget - bloomMix) * bloomEase;
        if (!isReduced && bloomTarget < bloomMix) {
          bloomMix = Math.max(bloomTarget, bloomMix - dt * 0.16);
        }
        settleMix += (settleTarget - settleMix) * (isReduced ? 1 : 1 - Math.exp(-dt * settleRate));

        flyStage1 += (flyTarget - flyStage1) * flyEase;
        flyMix += (flyStage1 - flyMix) * flyEase;

        ax += (mx - ax) * fastEase;
        ay += (my - ay) * fastEase;
        mouseSmooth += (mouseTarget - mouseSmooth) * fastEase;
      }

      if (minGap <= 33) {
        avgGap = avgGap * 0.9 + Math.min(200, Math.max(8, gap)) * 0.1;
      }

      const cw = Math.max(1, canvas.clientWidth);
      const ch = Math.max(1, canvas.clientHeight);
      const maxDpr = lowEnd ? 1.75 : 2.0;
      const targetDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const nativePixels = Math.round(cw * ch * targetDpr * targetDpr);
      const hi = Math.max(lowEnd ? 1800000 : 4800000, Math.min(nativePixels, lowEnd ? 2600000 : 7500000));
      const minBudget = Math.max(cw * ch, lowEnd ? 500000 : 1600000);

      if (now - budgetAt > 1100) {
        const downThreshold = Math.max(68, minGap + 36);
        const upThreshold = Math.max(42, minGap + 12);
        if (avgGap > downThreshold && budget > minBudget) {
          budget = Math.max(minBudget, Math.round(budget * 0.82));
        } else if (avgGap < upThreshold && budget < hi) {
          budget = Math.min(hi, Math.round(budget * 1.15));
        }
        budgetAt = now;
      }

      const dpr = Math.min(targetDpr, Math.sqrt(budget / (cw * ch)));
      const maxPointSize = Math.min(hwMaxPointSize, Math.round((lowEnd ? 105 : 138) * dpr));
      const W = Math.max(2, Math.round(cw * dpr));
      const H = Math.max(2, Math.round(ch * dpr));

      if (widthPx !== W || heightPx !== H) {
        canvas.width = widthPx = W;
        canvas.height = heightPx = H;
        gl.viewport(0, 0, widthPx, heightPx);
      }

      const aspect = widthPx / heightPx;
      const focal = aspect < 0.85 ? 1.18 : 1.72;
      const camX = ax * 0.18 + (isReduced ? 0 : 0.14 * S(tClock * 0.25));
      const camY = 2.58 + (isReduced ? 0 : 0.05 * S(tClock * 0.34));
      const camZ = -0.35;
      const camPitch = -0.02;

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);

      // 1. Starry AMOLED dark sky + V-valley silhouette
      gl.useProgram(bgProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(bgPosLoc);
      gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(bgUniforms.uTime, tClock);
      gl.uniform1f(bgUniforms.uAspect, aspect);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(bgPosLoc);

      // 2. Deep & midground meadow behind the lotus (premultiplied alpha eliminates dark fringes)
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pvProg);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);

      const stride = 48;
      gl.enableVertexAttribArray(pvAttrs.aBase);
      gl.vertexAttribPointer(pvAttrs.aBase, 4, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(pvAttrs.aStyle);
      gl.vertexAttribPointer(pvAttrs.aStyle, 4, gl.FLOAT, false, stride, 16);
      gl.enableVertexAttribArray(pvAttrs.aExtra);
      gl.vertexAttribPointer(pvAttrs.aExtra, 4, gl.FLOAT, false, stride, 32);

      gl.uniform4f(pvUniforms.uCamera, camX, camY, camZ, camPitch);
      gl.uniform4f(pvUniforms.uLens, focal, aspect, heightPx, maxPointSize);
      gl.uniform4f(pvUniforms.uAction, tClock, bloomMix, flyMix, isReduced ? 0 : mouseSmooth);
      gl.uniform2f(pvUniforms.uState, settleMix, aspect);
      gl.uniform2f(pvUniforms.uAim, ax, ay);
      gl.uniform1i(pvUniforms.uImage, 0);

      const bSmooth = bloomMix * bloomMix * (3 - 2 * bloomMix);
      const splitZ = SAKURA_Z - 0.55 - bSmooth * 1.35;
      const splitIdx = findSplitIndex(splitZ);

      drawPointSlice(0, splitIdx);

      gl.disableVertexAttribArray(pvAttrs.aBase);
      gl.disableVertexAttribArray(pvAttrs.aStyle);
      gl.disableVertexAttribArray(pvAttrs.aExtra);

      // 3. Central 3D Curved Luminous Lotus Blossom
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(settleMix < 0.35);
      gl.useProgram(sakuraMeshProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, sakuraMesh.buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sakuraMesh.indexBuffer);
      gl.enableVertexAttribArray(smAttrs.aPetalUV);
      gl.vertexAttribPointer(smAttrs.aPetalUV, 4, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(smAttrs.aPetalDim);
      gl.vertexAttribPointer(smAttrs.aPetalDim, 4, gl.FLOAT, false, 32, 16);

      gl.uniform4f(smUniforms.uCamera, camX, camY, camZ, camPitch);
      gl.uniform4f(smUniforms.uLens, focal, aspect, heightPx, maxPointSize);
      gl.uniform4f(smUniforms.uAction, tClock, bloomMix, flyMix, isReduced ? 0 : mouseSmooth);
      gl.uniform2f(smUniforms.uState, settleMix, aspect);
      gl.uniform2f(smUniforms.uAim, ax, ay);
      gl.uniform1f(smUniforms.uSettle, settleMix);

      gl.drawElements(gl.TRIANGLES, sakuraMesh.indexCount, gl.UNSIGNED_SHORT, 0);

      gl.disableVertexAttribArray(smAttrs.aPetalUV);
      gl.disableVertexAttribArray(smAttrs.aPetalDim);
      gl.depthMask(true);
      gl.disable(gl.DEPTH_TEST);

      // 4. Foreground blurred bokeh wildflowers, calyx cushion, stamens, pollen, fireflies
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pvProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
      gl.enableVertexAttribArray(pvAttrs.aBase);
      gl.vertexAttribPointer(pvAttrs.aBase, 4, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(pvAttrs.aStyle);
      gl.vertexAttribPointer(pvAttrs.aStyle, 4, gl.FLOAT, false, stride, 16);
      gl.enableVertexAttribArray(pvAttrs.aExtra);
      gl.vertexAttribPointer(pvAttrs.aExtra, 4, gl.FLOAT, false, stride, 32);

      drawPointSlice(splitIdx, particleCount - splitIdx);

      gl.disableVertexAttribArray(pvAttrs.aBase);
      gl.disableVertexAttribArray(pvAttrs.aStyle);
      gl.disableVertexAttribArray(pvAttrs.aExtra);

      const settling =
        Math.abs(bloomTarget - bloomMix) > 0.002 ||
        Math.abs(flyTarget - flyMix) > 0.002 ||
        Math.abs(settleTarget - settleMix) > 0.002;

      if (!paused && !isBackgrounded() && (!isReduced || settling)) {
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
      windowBlurred = true;
      suspendScene();
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
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("webglcontextlost", onContextLost);
    reducedMotionMQ.addEventListener("change", wake);

    const ro = new ResizeObserver(wake);
    ro.observe(canvas);

    let flyDownTimer = 0;

    buildScene().catch(() => {
      if (!disposed) triggerFallback();
    });

    return {
      setBloom(open) {
        clearTimeout(flyDownTimer);
        flyDownTimer = 0;
        pendingFlyDown = false;
        if (open) {
          bloomTarget = 1;
          flyTarget = 1.05;
          flyDownTimer = setTimeout(() => {
            flyDownTimer = 0;
            if (!disposed && bloomTarget === 1) {
              flyTarget = 0.24;
              settleTarget = 1;
              wake();
            }
          }, 900);
        } else {
          // Return directly without flying upward: smoothly settle back into normal flowerbed
          bloomTarget = 0;
          settleTarget = 0;
          flyTarget = 0.0;
          flyStage1 = Math.min(flyStage1, flyMix);
        }
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
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("blur", onWindowBlur);
        window.removeEventListener("focus", onWindowFocus);
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        reducedMotionMQ.removeEventListener("change", wake);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      },
    };
  };
})();
