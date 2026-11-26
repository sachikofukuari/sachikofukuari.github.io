/**
 * Procedural Canvas2D botanical sprite atlas (sharp + bokeh mip-atlas) and SVG fallback markup.
 */

const TAU = Math.PI * 2;
const S = Math.sin;
const C = Math.cos;

export function makeSvgFallbackMarkup() {
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

const FLOWER_PALETTES = [
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

function drawSakuraStamenTile(tileSize, tileScale) {
  const tile = document.createElement("canvas");
  tile.width = tileSize;
  tile.height = tileSize;
  const g = tile.getContext("2d");
  g.translate(tileSize / 2, tileSize / 2);
  g.scale(tileScale, tileScale);
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

function makeAtlasTile(i, tileSize, tileScale, R) {
  if (i >= 12 && i <= 15) {
    return drawSakuraStamenTile(tileSize, tileScale);
  }

  const tile = document.createElement("canvas");
  tile.width = tileSize;
  tile.height = tileSize;
  const c = tile.getContext("2d");
  c.translate(tileSize / 2, tileSize / 2);
  c.scale(tileScale, tileScale);

  if (i < 12) {
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
  const bloomHalo = c.createRadialGradient(0, 0, 8, 0, 0, 60);
  if (isBluePal) {
    bloomHalo.addColorStop(0, "rgba(216, 240, 255, 0.54)");
    bloomHalo.addColorStop(0.48, "rgba(148, 208, 255, 0.24)");
    bloomHalo.addColorStop(1, "rgba(130, 190, 255, 0)");
  } else {
    bloomHalo.addColorStop(0, "rgba(255, 218, 238, 0.52)");
    bloomHalo.addColorStop(0.48, "rgba(255, 166, 214, 0.23)");
    bloomHalo.addColorStop(1, "rgba(255, 140, 204, 0)");
  }
  c.fillStyle = bloomHalo;
  c.beginPath();
  c.arc(0, 0, 60, 0, TAU);
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
  const pal = FLOWER_PALETTES[k];
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

export async function buildBotanicalAtlas(gl, R, yieldSlice, useMipmaps = true) {
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  const atlasSize = maxTexSize >= 2048 ? 2048 : 1024;
  const tileSize = atlasSize / 8;
  const tileScale = tileSize / 128;

  const atlas = document.createElement("canvas");
  atlas.width = atlasSize;
  atlas.height = atlasSize;
  const ac = atlas.getContext("2d");

  const bokehBlurPx = Math.max(6, Math.round(tileSize * 0.055));
  for (let i = 0; i < 32; i++) {
    const tileImg = makeAtlasTile(i, tileSize, tileScale, R);
    const tx = (i % 8) * tileSize;
    const ty = Math.floor(i / 8) * tileSize;
    ac.drawImage(tileImg, tx, ty);
    ac.save();
    ac.beginPath();
    ac.rect(tx, ty + atlasSize / 2, tileSize, tileSize);
    ac.clip();
    ac.filter = `blur(${bokehBlurPx}px)`;
    ac.drawImage(tileImg, tx, ty + atlasSize / 2);
    ac.restore();
    await yieldSlice();
  }

  const atlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (useMipmaps) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  return { texture: atlasTex, tileSize };
}
