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
    const lowEnd =
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      window.innerWidth <= 820;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      depth: true,
      antialias: !lowEnd,
      powerPreference: "low-power",
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
    // Procedural Botanical Sprite Atlas (1024x1024: sharp top + blur(9px) bokeh bottom)
    // ------------------------------------------------------------------------
    const atlas = document.createElement("canvas");
    atlas.width = 1024;
    atlas.height = 1024;
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
      const hue = 136 + (hueOffset || 0);
      const g = ctx.createLinearGradient(-width, -len, width, 0);
      g.addColorStop(0, `hsl(${hue - 12} 24% ${Math.min(72, lit * 1.62)}%)`);
      g.addColorStop(0.48, `hsl(${hue} 17% ${Math.min(64, lit * 1.1)}%)`);
      g.addColorStop(0.75, `hsl(${hue + 14} 15% ${lit * 0.74}%)`);
      g.addColorStop(1, `hsl(334 20% ${lit * 0.56}%)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-width, -len * 0.34, -width * 0.65, -len * 0.77, 0, -len);
      ctx.bezierCurveTo(width * 0.56, -len * 0.68, width * 0.72, -len * 0.25, 0, 0);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "hsla(335, 36%, 80%, 0.34)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.06);
      ctx.lineTo(0, -len * 0.94);
      ctx.stroke();
      ctx.restore();
    }

    function drawSakuraStamenTile() {
      const tile = document.createElement("canvas");
      tile.width = 128;
      tile.height = 128;
      const g = tile.getContext("2d");
      g.translate(64, 64);
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
      tile.width = 128;
      tile.height = 128;
      const c = tile.getContext("2d");
      c.translate(64, 64);

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
      const isBluePal = k >= 6;
      const bloomHalo = c.createRadialGradient(0, 0, 8, 0, 0, 58);
      if (isBluePal) {
        bloomHalo.addColorStop(0, "rgba(214, 238, 255, 0.62)");
        bloomHalo.addColorStop(0.45, "rgba(154, 206, 255, 0.28)");
        bloomHalo.addColorStop(1, "rgba(130, 190, 255, 0)");
      } else {
        bloomHalo.addColorStop(0, "rgba(255, 214, 236, 0.60)");
        bloomHalo.addColorStop(0.45, "rgba(255, 162, 212, 0.26)");
        bloomHalo.addColorStop(1, "rgba(255, 140, 204, 0)");
      }
      c.fillStyle = bloomHalo;
      c.beginPath();
      c.arc(0, 0, 58, 0, TAU);
      c.fill();

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
       uniform vec2 uWhite0;
       uniform vec2 uWhite1;
       uniform vec2 uWhite2;

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

         // Subtle dark rose mountain sill tucked behind distant 3D flowerbeds
         float sillScale = clamp((uAspect - 0.45) / 1.15, 0.42, 1.0);
         float mLeft = (0.42 * sillScale) * exp(-pow(uv.x + 0.72, 2.0) * 3.8);
         float mRight = (0.45 * sillScale) * exp(-pow(uv.x - 0.70, 2.0) * 3.7);
         float mCenter = (0.09 * sillScale) * exp(-pow(uv.x - 0.02, 2.0) * 5.0);
         float sillEdge = 0.02 + mLeft + mRight + mCenter + 0.012 * sin(uv.x * 5.0);
         float sillMask = 1.0 - smoothstep(sillEdge - 0.14, sillEdge + 0.04, uv.y);
         vec3 sillCol = vec3(0.012, 0.008, 0.014);
         col = mix(col, sillCol, sillMask * 0.85);

         // Crisp 3-layer twinkling stars above the mountain skyline against pure AMOLED black
         float skyMask = smoothstep(sillEdge - 0.01, sillEdge + 0.14, uv.y) * smoothstep(-0.08, 0.48, uv.y);
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
       varying float vRot;
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
           float nearBlur = (1.0 - smoothstep(1.4, 4.2, dep)) * 0.85;
           float farBlur = smoothstep(26.0, 56.0, dep) * 0.88;
           defocus = max(max(nearBlur, farBlur), settle * (1.0 - blossom * 0.28) * 0.66);
            if (isPad < 0.5) {
              float nearAlpha = smoothstep(0.7, 1.85, dep);
              float farHorizon = 1.0 - smoothstep(62.0, 74.5, dep);
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
          if (dep < 0.55 || dep > 76.0) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          }

          float sizePx = (ptSize * uLens.z * uLens.x * 0.5) / max(0.65, dep);
          float flyShrink = 1.0 - fly * blossom * (1.0 - isHeart) * (1.0 - isAura) * 0.22;
          gl_PointSize = clamp(sizePx * flyShrink, 1.0, uLens.w);

          float farFade = 1.0 - smoothstep(26.0, 74.0, dep) * 0.22;
          float backLift = smoothstep(11.0, 36.0, dep) * mix(0.20, 0.10, blossom);
          float hillTex = 0.90 + 0.20 * (0.5 + 0.5 * sin(x * 0.45 + z * 0.30) * cos(x * 0.28 - z * 0.38));
          float bright = (0.28 + 0.68 * farFade + backLift) * lit * mix(0.84, 0.96, max(blossom, isHeart));
          bright *= mix(1.0, hillTex, smoothstep(11.0, 22.0, dep));
          bright *= 1.0 + clos * 0.30 * max(blossom, isHeart);
          bright *= mix(1.0, 0.44, settle);

          if (bug > 0.5) {
            float beat = 0.5 + 0.5 * sin(t * (1.6 + seed * 0.85) + ang);
            opacity = (0.18 + 0.82 * smoothstep(0.24, 0.94, beat)) * (1.0 - smoothstep(16.0, 36.0, dep));
          }

          vBot = vec4(tile, clamp(defocus, 0.0, 1.0), seed, max(blossom * (1.0 - dust), isHeart));
          vColor = vec4(bright, scatterGlow, dust, clamp(opacity, 0.0, 1.0));
          vRot = spriteRot;
          vDepthFx = vec2(
            smoothstep(42.0, 74.0, dep) * 0.18,
            smoothstep(11.0, 44.0, dep)
          ) * (1.0 - dust) * (1.0 - bug) * (1.0 - isHeart) * (1.0 - isAura);
        }`,
      `precision mediump float;
       uniform sampler2D uImage;
       varying vec4 vBot;
       varying vec4 vColor;
       varying float vRot;
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

         float c = cos(vRot);
         float s = sin(vRot);
         vec2 uv = mat2(c, -s, s, c) * q + 0.5;
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

    const quadBuf = makeBuffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

    // ------------------------------------------------------------------------
    // Full-Depth Dense Meadow + Non-Intersecting 3D Sakura Builder
    // ------------------------------------------------------------------------
    const SAKURA_X = 0.0;
    const SAKURA_Z = 8.5;

    function meadowFloor(x, z) {
      const dx = x - SAKURA_X;
      const dz = z - SAKURA_Z;
      const r = Math.hypot(dx, dz);
      const centerDip = -0.34 * Math.exp(-(r * r) / 7.5);
      const deepHill = 0.064 * Math.max(0, z - 10.0) + 0.050 * Math.abs(dx);
      const undulation = 0.36 * S(x * 0.42 + z * 0.24) + 0.22 * C(x * 0.85 - z * 0.36);
      const nearDrop = z < 4.5 ? -0.18 * (4.5 - z) : 0;

      const backT = Math.max(0, Math.min(1, (z - 13.0) / 15.0));
      const backMask = backT * backT * (3 - 2 * backT);
      const leftMidHill = 2.4 * Math.exp(-(((x + 10.5) * (x + 10.5)) / 48.0 + ((z - 21.5) * (z - 21.5)) / 40.0));
      const rightMidHill = 2.5 * Math.exp(-(((x - 11.0) * (x - 11.0)) / 52.0 + ((z - 22.5) * (z - 22.5)) / 42.0));
      const leftPeak = 5.6 * Math.exp(-(((x + 17.5) * (x + 17.5)) / 115.0 + ((z - 32.0) * (z - 32.0)) / 92.0));
      const rightPeak = 6.2 * Math.exp(-(((x - 18.5) * (x - 18.5)) / 125.0 + ((z - 34.0) * (z - 34.0)) / 98.0));
      const farLeft = 8.4 * Math.exp(-(((x + 32.0) * (x + 32.0)) / 230.0 + ((z - 47.0) * (z - 47.0)) / 115.0));
      const farCenterLeft = 4.6 * Math.exp(-(((x + 14.5) * (x + 14.5)) / 105.0 + ((z - 46.5) * (z - 46.5)) / 98.0));
      const farCenterRight = 5.0 * Math.exp(-(((x - 15.5) * (x - 15.5)) / 110.0 + ((z - 48.0) * (z - 48.0)) / 102.0));
      const farRight = 8.8 * Math.exp(-(((x - 34.0) * (x - 34.0)) / 240.0 + ((z - 48.5) * (z - 48.5)) / 120.0));
      const farValleyRidge = 2.6 * Math.exp(-(((x - 1.0) * (x - 1.0)) / 90.0 + ((z - 48.0) * (z - 48.0)) / 85.0));

      // Towering high mountain range in deep background (z = 56..70)
      const highLeft = 12.6 * Math.exp(-(((x + 41.0) * (x + 41.0)) / 360.0 + ((z - 61.5) * (z - 61.5)) / 175.0));
      const highMidLeft = 7.4 * Math.exp(-(((x + 19.5) * (x + 19.5)) / 195.0 + ((z - 61.5) * (z - 61.5)) / 160.0));
      const highCenterPass = 3.8 * Math.exp(-(((x - 0.5) * (x - 0.5)) / 170.0 + ((z - 63.0) * (z - 63.0)) / 145.0));
      const highMidRight = 7.8 * Math.exp(-(((x - 20.5) * (x - 20.5)) / 205.0 + ((z - 61.5) * (z - 61.5)) / 165.0));
      const highRight = 13.4 * Math.exp(-(((x - 43.0) * (x - 43.0)) / 380.0 + ((z - 62.5) * (z - 62.5)) / 180.0));
      const mountains =
        backMask *
        (leftMidHill +
          rightMidHill +
          leftPeak +
          rightPeak +
          farLeft +
          farCenterLeft +
          farCenterRight +
          farRight +
          farValleyRidge +
          highLeft +
          highMidLeft +
          highCenterPass +
          highMidRight +
          highRight);
      return 0.46 + centerDip + deepHill + undulation + nearDrop + mountains;
    }

    function insideMeadowFrustum(x, z, allowRoot) {
      if (z < 1.1 || z > 74.0) return false;
      const maxX = (z + 2.2) * 1.22;
      if (Math.abs(x) > maxX) return false;
      const dx = x - SAKURA_X;
      const dz = z - SAKURA_Z;
      const minR = allowRoot ? 0.45 : 2.1;
      if (Math.hypot(dx, dz) < minR && z > 6.2 && z < 10.5) return false;
      return true;
    }

    function buildSakuraMeshBuffer() {
      const tiers = [
        { count: 8, ringNorm: 0.0, len: 3.50, maxW: 1.64, azOffset: 0.18, ringIdx: 0 },
        { count: 7, ringNorm: 0.5, len: 3.32, maxW: 1.46, azOffset: 0.18 + Math.PI / 7, ringIdx: 1 },
        { count: 6, ringNorm: 1.0, len: 3.04, maxW: 1.24, azOffset: 0.18 + Math.PI / 3.5, ringIdx: 2 },
      ];
      const U_SEGS = 18;
      const V_SEGS = 20;
      const totalPetals = tiers.reduce((sum, t) => sum + t.count, 0);
      const vertsPerPetal = U_SEGS * V_SEGS * 6;
      const meshData = new Float32Array(totalPetals * vertsPerPetal * 8);
      let cursor = 0;

      function pushVert(u, v, ringNorm, az, len, maxW, pSeed, ringIdx) {
        meshData[cursor++] = u;
        meshData[cursor++] = v;
        meshData[cursor++] = ringNorm;
        meshData[cursor++] = az;
        meshData[cursor++] = len;
        meshData[cursor++] = maxW;
        meshData[cursor++] = pSeed;
        meshData[cursor++] = ringIdx;
      }

      for (const tier of tiers) {
        for (let p = 0; p < tier.count; p++) {
          const az = tier.azOffset + (TAU * p) / tier.count + (R() - 0.5) * 0.015;
          const pSeed = R();
          const len = tier.len * (0.98 + R() * 0.04);
          const maxW = tier.maxW * (0.98 + R() * 0.04);

          for (let iu = 0; iu < U_SEGS; iu++) {
            const u0 = iu / U_SEGS;
            const u1 = (iu + 1) / U_SEGS;
            for (let iv = 0; iv < V_SEGS; iv++) {
              const v0 = (iv / V_SEGS) * 2 - 1;
              const v1 = ((iv + 1) / V_SEGS) * 2 - 1;

              pushVert(u0, v0, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);
              pushVert(u1, v0, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);
              pushVert(u1, v1, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);

              pushVert(u0, v0, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);
              pushVert(u1, v1, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);
              pushVert(u0, v1, tier.ringNorm, az, len, maxW, pSeed, tier.ringIdx);
            }
          }
        }
      }

      return {
        buffer: makeBuffer(meshData),
        vertexCount: totalPetals * vertsPerPetal,
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
    let budget = lowEnd ? 240000 : 480000;

    let tClock = 0;
    let mx = 0;
    let my = 0;
    let ax = 0;
    let ay = 0;
    let mouseTarget = 0;
    let mouseSmooth = 0;

    const whiteWalk = [
      { x: -0.35, y: 0.25, tx: 0.4, ty: -0.1, speed: 0.075 },
      { x: 0.45, y: -0.2, tx: -0.25, ty: 0.35, speed: 0.06 },
      { x: 0.0, y: 0.4, tx: 0.2, ty: 0.15, speed: 0.05 },
    ];

    function stepWhiteClouds(dt) {
      for (const w of whiteWalk) {
        const dx = w.tx - w.x;
        const dy = w.ty - w.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          w.tx = (Math.random() - 0.5) * 1.45;
          w.ty = (Math.random() - 0.5) * 1.15;
        } else {
          w.x += (dx / dist) * w.speed * dt;
          w.y += (dy / dist) * w.speed * dt;
        }
      }
    }

    async function buildScene() {
      for (let i = 0; i < 32; i++) {
        const tileImg = makeAtlasTile(i);
        const tx = (i % 8) * 128;
        const ty = Math.floor(i / 8) * 128;
        ac.drawImage(tileImg, tx, ty);
        ac.save();
        ac.beginPath();
        ac.rect(tx, ty + 512, 128, 128);
        ac.clip();
        ac.filter = "blur(9px)";
        ac.drawImage(tileImg, tx, ty + 512);
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

      // 1. Dense frustum-packed grass carpet from close foreground (z=1.1) to distant high mountains (z=70.1)
      const foliageCount = lowEnd ? 14000 : 22000;
      for (let i = 0; i < foliageCount; i++) {
        if (!(i & 511)) await yieldSlice();
        const z = 1.1 + Math.pow(R(), 1.12) * 69.0;
        const maxX = (z + 2.2) * 1.20;
        const x = (R() * 2 - 1) * maxX;
        if (!insideMeadowFrustum(x, z, true)) continue;

        const y = meadowFloor(x, z) - 0.06 + R() * 0.14;
        const pSeed = R();
        const patch = 0.5 + 0.5 * S(x * 0.8 + S(z * 0.45)) * C(z * 0.55 - x * 0.35);
        const lit = 0.42 + 0.85 * Math.pow(patch, 1.45) + 0.22 * R();
        const size = (0.40 + R() * 0.74) * (z > 16 ? 1.0 + (z - 16) * 0.025 : 1.0);
        // Balance dense bushy grass mats (8..11) with textured foliage (0..7) below flower heads
        const tile = R() < 0.45 ? 8 + Math.floor(R() * 4) : Math.floor(R() * 8);
        const ang = Math.atan2(z - SAKURA_Z, x - SAKURA_X);
        const r = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
        const liftWeight = 0.55 + R() * 0.75;
        pushParticle(x, y, z, size, tile, pSeed, lit, 0.0, ang, r, liftWeight, 0.0);
      }

      // Dedicated background mountain grass carpet across all hillside and high peak ranges
      const mountainGrassCount = lowEnd ? 9000 : 15500;
      for (let i = 0; i < mountainGrassCount; i++) {
        if (!(i & 511)) await yieldSlice();
        const z = 13.5 + R() * 57.5;
        const maxX = (z + 2.2) * 1.20;
        const x = (R() * 2 - 1) * maxX;
        if (!insideMeadowFrustum(x, z, true)) continue;

        const y = meadowFloor(x, z) - 0.05 + R() * 0.16;
        const pSeed = R();
        const patch = 0.5 + 0.5 * S(x * 0.65 + S(z * 0.38)) * C(z * 0.48 - x * 0.32);
        const lit = 0.56 + 0.62 * Math.pow(patch, 1.25) + 0.18 * R();
        const size = (0.68 + R() * 1.05) * (1.0 + (z - 13.5) * 0.044);
        const tile = R() < 0.55 ? 8 + Math.floor(R() * 4) : Math.floor(R() * 8);
        const ang = Math.atan2(z - SAKURA_Z, x - SAKURA_X);
        const r = Math.hypot(x - SAKURA_X, z - SAKURA_Z);
        const liftWeight = 0.52 + R() * 0.72;
        pushParticle(x, y, z, size, tile, pSeed, lit, 0.0, ang, r, liftWeight, 0.0);
      }

      // 2. Wildflower Beds across Foreground Bokeh, Midground, and High Mountain Ranges
      const beds = [];
      const fgCount = lowEnd ? 28 : 44;
      for (let b = 0; b < fgCount; b++) {
        const z = 1.35 + R() * 4.35;
        const maxX = (z + 2.0) * 1.05;
        const bx = (R() * 2 - 1) * maxX;
        if (!insideMeadowFrustum(bx, z, false)) continue;
        beds.push([bx, z, Math.floor(R() * 8), 0.55 + R() * 0.65, 0.5 + R() * 0.9, 0.94]);
      }

      const midCount = lowEnd ? 52 : 84;
      for (let b = 0; b < midCount; b++) {
        const z = 5.6 + R() * 10.2;
        const maxX = (z + 2.0) * 1.05;
        const bx = (R() * 2 - 1) * maxX;
        if (!insideMeadowFrustum(bx, z, false)) continue;
        beds.push([bx, z, Math.floor(R() * 8), 0.65 + R() * 0.85, 0.6 + R() * 1.2, 0.92]);
      }

      const bgCount = lowEnd ? 185 : 340;
      for (let b = 0; b < bgCount; b++) {
        const z = 13.5 + Math.pow(R(), 0.88) * 57.0;
        const maxX = (z + 2.2) * 1.18;
        const bx = (R() * 2 - 1) * maxX;
        if (!insideMeadowFrustum(bx, z, false)) continue;
        const distScale = 1.0 + (z - 13.5) * 0.042;
        beds.push([bx, z, Math.floor(R() * 8), (0.85 + R() * 1.0) * distScale, (0.85 + R() * 1.25) * distScale, 0.96]);
      }

      beds.push(
        [-2.8, 2.9, 2, 0.95, 0.85, 0.94],
        [2.9, 3.0, 4, 0.95, 0.85, 0.94],
        [-1.3, 2.3, 5, 0.8, 0.7, 0.94],
        [1.4, 2.4, 1, 0.8, 0.7, 0.94],
        [-3.8, 7.0, 2, 1.0, 1.1, 0.92],
        [3.9, 7.1, 4, 1.0, 1.1, 0.92],
        [-2.8, 12.2, 6, 1.1, 1.2, 0.95],
        [2.8, 12.2, 7, 1.1, 1.2, 0.95],
        [0.0, 14.5, 1, 1.3, 1.2, 0.96],
        [-18.0, 24.0, 0, 2.1, 1.7, 0.96],
        [-9.0, 25.0, 3, 2.0, 1.6, 0.96],
        [9.0, 25.5, 5, 2.0, 1.6, 0.96],
        [18.0, 25.0, 2, 2.1, 1.7, 0.96],
        [-16.5, 31.0, 1, 2.2, 1.8, 0.98],
        [-13.0, 27.0, 5, 1.9, 1.6, 0.96],
        [-21.0, 33.0, 3, 2.2, 1.8, 0.98],
        [17.5, 33.5, 2, 2.3, 1.9, 0.98],
        [13.5, 28.5, 6, 1.9, 1.6, 0.96],
        [22.0, 35.0, 0, 2.3, 1.8, 0.98],
        [-10.5, 21.5, 4, 1.7, 1.5, 0.96],
        [-7.5, 19.5, 7, 1.5, 1.4, 0.96],
        [11.0, 22.5, 1, 1.7, 1.5, 0.96],
        [8.0, 20.0, 5, 1.5, 1.4, 0.96],
        [1.5, 39.0, 3, 2.2, 1.8, 0.98],
        [-3.0, 35.0, 0, 2.0, 1.7, 0.98],
        [-25.0, 38.0, 4, 2.6, 2.1, 0.98],
        [25.0, 39.0, 7, 2.6, 2.1, 0.98],
        [-32.0, 47.0, 1, 3.0, 2.6, 0.99],
        [-23.0, 44.0, 5, 2.8, 2.4, 0.99],
        [-14.5, 46.5, 3, 2.9, 2.4, 0.99],
        [-6.0, 44.0, 7, 2.7, 2.2, 0.99],
        [1.0, 48.0, 2, 2.8, 2.3, 0.99],
        [8.0, 45.0, 4, 2.7, 2.2, 0.99],
        [15.5, 48.0, 6, 2.9, 2.4, 0.99],
        [25.0, 46.0, 0, 3.0, 2.5, 0.99],
        [34.0, 48.5, 1, 3.2, 2.6, 0.99],
        [-52.0, 58.0, 5, 4.0, 3.5, 1.00],
        [-41.0, 61.5, 2, 4.2, 3.6, 1.00],
        [-30.0, 59.5, 7, 3.8, 3.3, 1.00],
        [-19.5, 61.5, 4, 3.8, 3.4, 1.00],
        [-9.0, 60.5, 1, 3.5, 3.2, 1.00],
        [0.5, 63.0, 3, 3.6, 3.2, 1.00],
        [10.0, 61.0, 6, 3.5, 3.2, 1.00],
        [20.5, 61.5, 0, 3.8, 3.4, 1.00],
        [32.0, 60.0, 4, 3.9, 3.3, 1.00],
        [43.0, 62.5, 2, 4.2, 3.6, 1.00],
        [53.0, 66.0, 5, 4.1, 3.5, 1.00]
      );

      for (let b = 0; b < beds.length; b++) {
        await yieldSlice();
        const [bx, bz, k, w, d, litBoost] = beds[b];
        const families = Math.min(34, Math.round(w * d * 7 + 5));
        for (let f = 0; f < families; f++) {
          const a = R() * TAU;
          const rr = Math.sqrt(R());
          const fx = bx + C(a) * rr * w * 1.25;
          const fz = bz + S(a) * rr * d * 1.25;
          if (!insideMeadowFrustum(fx, fz, false)) continue;
          const baseFl = (0.25 + R() * 0.22) * (fz > 14 ? 1.0 + (fz - 14) * 0.050 : 1.0);
          const lf = (0.88 + R() * 0.10) * litBoost;
          const clusterCount = 3 + Math.floor(R() * 5);
          const clusterSpread = 0.52 + (fz > 16 ? (fz - 16) * 0.025 : 0);
          for (let i = 0; i < clusterCount; i++) {
            const xx = fx + (R() - 0.5) * clusterSpread;
            const zz = fz + (R() - 0.5) * clusterSpread;
            const yy = meadowFloor(xx, zz) + 0.25 + R() * 0.24;
            const kk = R() < 0.78 ? k : (R() < 0.75 ? 6 + Math.floor(R() * 2) : (k + 2) % 6);
            const tileId = 16 + kk + (R() < 0.5 ? 8 : 0);
            const ang = Math.atan2(zz - SAKURA_Z, xx - SAKURA_X);
            const r = Math.hypot(xx - SAKURA_X, zz - SAKURA_Z);
            pushParticle(
              xx,
              yy,
              zz,
              baseFl * (0.58 + R() * 0.78),
              tileId,
              R(),
              lf * (0.94 + R() * 0.10),
              0.0,
              ang,
              r,
              0.75 + R() * 0.85,
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
      uWhite0: gl.getUniformLocation(bgProg, "uWhite0"),
      uWhite1: gl.getUniformLocation(bgProg, "uWhite1"),
      uWhite2: gl.getUniformLocation(bgProg, "uWhite2"),
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

    const maxPointSize = Math.min(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1], lowEnd ? 92 : 128);

    function wake() {
      if (!raf && !disposed && !document.hidden) {
        raf = requestAnimationFrame(renderFrame);
      }
    }

    function drawPointSlice(start, count) {
      if (count <= 0) return;
      gl.drawArrays(gl.POINTS, start, count);
    }

    function renderFrame(now) {
      raf = 0;
      if (disposed || !canvas.isConnected || !particleBuf || !atlasTex || !sakuraMesh) return;

      const isReduced = reducedMotionMQ.matches;
      const animating =
        Math.abs(bloomTarget - bloomMix) > 0.005 ||
        Math.abs(flyTarget - flyMix) > 0.005 ||
        Math.abs(settleTarget - settleMix) > 0.005;

      const gap = now - (lastNow || now - 33);
      const minGap = animating ? 16 : 31;
      if (!paused && !isReduced && gap < minGap) {
        wake();
        return;
      }

      const dt = Math.min(0.08, Math.max(0.001, gap * 0.001));
      lastNow = now;
      avgGap = avgGap * 0.9 + Math.min(200, Math.max(8, gap)) * 0.1;

      if (now - budgetAt > 1100) {
        const hi = lowEnd ? 320000 : 620000;
        if (avgGap > 44 && budget > 140000) budget = Math.max(140000, Math.round(budget * 0.78));
        else if (avgGap < 34 && budget < hi) budget = Math.min(hi, Math.round(budget * 1.1));
        budgetAt = now;
      }

      const bloomRate = bloomTarget > bloomMix ? 2.1 : 0.78;
      const bloomEase = isReduced ? 1 : 1 - Math.exp(-dt * bloomRate);
      const fastEase = isReduced ? 1 : 1 - Math.exp(-dt * 5.0);
      const flyRate = flyTarget > flyStage1 ? 2.35 : (bloomTarget === 1 ? 0.82 : 1.10);
      const flyEase = isReduced ? 1 : 1 - Math.exp(-dt * flyRate);
      const settleRate = settleTarget > settleMix ? 0.92 : 1.65;

      if (!paused) {
        if (!isReduced) {
          tClock += dt;
          stepWhiteClouds(dt);
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

      const cw = Math.max(1, canvas.clientWidth);
      const ch = Math.max(1, canvas.clientHeight);
      const maxDpr = lowEnd ? 1.0 : 1.15;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr, Math.sqrt(budget / (cw * ch)));
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
      const camY = 2.42 + (isReduced ? 0 : 0.05 * S(tClock * 0.34));
      const camZ = -0.35;
      const camPitch = -0.04;

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);

      // 1. Pink starry sky gradient + wandering slight-white glow + mountain sill
      gl.useProgram(bgProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(bgPosLoc);
      gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(bgUniforms.uTime, tClock);
      gl.uniform1f(bgUniforms.uAspect, aspect);
      gl.uniform2f(bgUniforms.uWhite0, whiteWalk[0].x, whiteWalk[0].y);
      gl.uniform2f(bgUniforms.uWhite1, whiteWalk[1].x, whiteWalk[1].y);
      gl.uniform2f(bgUniforms.uWhite2, whiteWalk[2].x, whiteWalk[2].y);
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

      gl.drawArrays(gl.TRIANGLES, 0, sakuraMesh.vertexCount);

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

      if (!paused && !document.hidden && (!isReduced || settling)) {
        wake();
      }
    }

    function onPointerMove(e) {
      if (e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      mx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      my = 1 - ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2;
      mouseTarget = 1;
      wake();
    }

    function onPointerLeave() {
      mx = 0;
      my = 0;
      mouseTarget = 0;
    }

    function onVisibilityChange() {
      if (!document.hidden && !paused) wake();
    }

    function onContextLost(e) {
      e.preventDefault();
      paused = true;
      triggerFallback();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
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
        if (open) {
          bloomTarget = 1;
          flyTarget = 1.05;
          flyDownTimer = setTimeout(() => {
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
        if (!paused) wake();
      },
      pulseScatter() {},
      destroy() {
        disposed = true;
        clearTimeout(flyDownTimer);
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        reducedMotionMQ.removeEventListener("change", wake);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      },
    };
  };
})();
