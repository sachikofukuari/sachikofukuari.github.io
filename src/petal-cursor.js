/**
 * Smooth Falling-Petal Cursor Trail
 * Runs continuously over the intro scene and every portfolio view.
 *
 * - Keeps native OS cursor while spawning distance-interpolated falling petals.
 * - Pre-renders multi-tone pink petal sprites to offscreen canvases for 60/120fps draw calls.
 * - Automatically pauses on touch input, hidden tab, manual motion pause, or reduced motion.
 */
export function createPetalCursor(canvas, options) {
    let disposed = false;
    let paused = !!(options && options.paused);

    if (!canvas) {
      return {
        setTheme() {},
        setPaused() {},
        destroy() {},
      };
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        setTheme() {},
        setPaused() {},
        destroy() {},
      };
    }

    const reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Pre-rendered glowing sakura petal sprites for Darker Rose theme
    const darkPalette = [
      ["#ff9ac6", "#ffd5e7", "#fff5fa"],
      ["#f27eb0", "#ffc1dd", "#fff0f7"],
      ["#e888c2", "#f9caea", "#fff5fb"],
      ["#ffadc9", "#ffe0ec", "#ffffff"],
      ["#de6e9e", "#f7accb", "#ffeaf3"],
    ];

    const SPRITE_SIZE = 40;
    let sprites = [];

    function buildPetalSprite(colors) {
      const off = document.createElement("canvas");
      off.width = SPRITE_SIZE;
      off.height = SPRITE_SIZE;
      const g = off.getContext("2d");
      g.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);

      const grad = g.createLinearGradient(0, 14, 0, -14);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.55, colors[1]);
      grad.addColorStop(1, colors[2]);

      g.shadowColor = colors[1];
      g.shadowBlur = 4;
      g.fillStyle = grad;

      // Delicate notched sakura / lotus petal silhouette
      g.beginPath();
      g.moveTo(0, 13);
      g.bezierCurveTo(-9, 8, -12, -4, -6.5, -12);
      g.quadraticCurveTo(-2.5, -14.5, 0, -10.5);
      g.quadraticCurveTo(2.5, -14.5, 6.5, -12);
      g.bezierCurveTo(12, -4, 9, 8, 0, 13);
      g.closePath();
      g.fill();

      // Fine central petal vein
      g.shadowBlur = 0;
      g.strokeStyle = "rgba(255, 255, 255, 0.42)";
      g.lineWidth = 0.85;
      g.beginPath();
      g.moveTo(0, 11);
      g.quadraticCurveTo(0.8, 0, 0, -8);
      g.stroke();

      return off;
    }

    sprites = darkPalette.map(buildPetalSprite);

    const isSmall =
      window.innerWidth <= 820 ||
      (window.matchMedia("(pointer: coarse)").matches &&
        Math.min(window.innerWidth, window.innerHeight) <= 900);
    const maxDpr = isSmall ? 1.5 : 2.0;

    let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      viewW = Math.max(1, window.innerWidth);
      viewH = Math.max(1, window.innerHeight);
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
    }
    resize();

    const MAX_PETALS = isSmall ? 60 : 95;
    const petals = [];
    let raf = 0;
    let lastTime = 0;
    let windowBlurred = false;
    let prevDirty = null;

    let hasPointer = false;
    let lastSpawnX = 0;
    let lastSpawnY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let lastMoveTime = 0;

    function isBackgrounded() {
      return document.hidden || windowBlurred;
    }

    function spawnPetal(x, y, vx, vy, burst) {
      if (petals.length >= MAX_PETALS) {
        petals.shift();
      }
      petals.push({
        x,
        y,
        vx,
        vy,
        size: (burst ? 0.56 : 0.48) + Math.random() * 0.44,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3.1,
        swayPhase: Math.random() * Math.PI * 2,
        swayFreq: 2.2 + Math.random() * 2.1,
        swayAmp: 22 + Math.random() * 28,
        tumblePhase: Math.random() * Math.PI * 2,
        tumbleSpeed: 2.6 + Math.random() * 3.0,
        terminalVy: 46 + Math.random() * 44,
        age: 0,
        life: (burst ? 1.55 : 1.35) + Math.random() * 0.85,
        spriteIdx: Math.floor(Math.random() * 5),
      });
    }

    function wake() {
      if (!raf && !disposed && !paused && !reducedMQ.matches && !isBackgrounded() && petals.length > 0) {
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    }

    function clearCanvas() {
      prevDirty = null;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function tick(now) {
      raf = 0;
      if (disposed || paused || reducedMQ.matches || isBackgrounded()) {
        if (reducedMQ.matches || paused) {
          petals.length = 0;
          clearCanvas();
        }
        return;
      }

      const dt = lastTime ? Math.min(0.05, Math.max(0.001, (now - lastTime) * 0.001)) : 0.016;
      lastTime = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (prevDirty) {
        ctx.clearRect(prevDirty.x, prevDirty.y, prevDirty.w, prevDirty.h);
      } else {
        ctx.clearRect(0, 0, viewW, viewH);
      }

      const dampVx = Math.exp(-dt * 2.4);
      const dampVy = 1 - Math.exp(-dt * 2.2);
      let minX = viewW;
      let minY = viewH;
      let maxX = 0;
      let maxY = 0;
      let drewAny = false;

      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];
        p.age += dt;
        if (p.age >= p.life || p.y > viewH + 48) {
          petals.splice(i, 1);
          continue;
        }

        const progress = p.age / p.life;
        // Ease velocity smoothly toward terminal gravity drift + gentle sinusoidal breeze
        p.vx *= dampVx;
        p.vy += (p.terminalVy - p.vy) * dampVy;
        const breeze = Math.cos(p.age * p.swayFreq + p.swayPhase) * p.swayAmp;

        p.x += (p.vx + breeze) * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        p.tumblePhase += p.tumbleSpeed * dt;

        // Smooth fade-in (0..0.12) & cubic fade-out (0.62..1.0)
        const fadeIn = Math.min(1, progress / 0.12);
        const fadeOut = progress > 0.62 ? Math.pow(1 - (progress - 0.62) / 0.38, 1.5) : 1;
        const alpha = fadeIn * fadeOut * 0.9;
        if (alpha <= 0.005) continue;

        const flipScale = 0.28 + 0.72 * Math.abs(Math.cos(p.tumblePhase));
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        const spr = sprites[p.spriteIdx];
        const drawSize = SPRITE_SIZE * p.size;
        const halfExtent = drawSize * 0.75 + 2;

        if (p.x - halfExtent < minX) minX = p.x - halfExtent;
        if (p.y - halfExtent < minY) minY = p.y - halfExtent;
        if (p.x + halfExtent > maxX) maxX = p.x + halfExtent;
        if (p.y + halfExtent > maxY) maxY = p.y + halfExtent;
        drewAny = true;

        ctx.globalAlpha = alpha;
        ctx.setTransform(
          cosA * dpr,
          sinA * dpr,
          -sinA * flipScale * dpr,
          cosA * flipScale * dpr,
          p.x * dpr,
          p.y * dpr
        );
        ctx.drawImage(spr, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (drewAny) {
        const cx = Math.max(0, Math.floor(minX));
        const cy = Math.max(0, Math.floor(minY));
        const cw = Math.min(viewW - cx, Math.ceil(maxX) - cx);
        const ch = Math.min(viewH - cy, Math.ceil(maxY) - cy);
        prevDirty = cw > 0 && ch > 0 ? { x: cx, y: cy, w: cw, h: ch } : null;
      } else {
        prevDirty = null;
      }

      if (petals.length > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        clearCanvas();
      }
    }

    function onPointerMove(e) {
      if (e.pointerType === "touch" || paused || reducedMQ.matches) return;
      if (windowBlurred && !document.hidden) {
        windowBlurred = false;
        wake();
      }
      if (document.hidden) return;
      const now = performance.now();
      const x = e.clientX;
      const y = e.clientY;

      if (!hasPointer || now - lastMoveTime > 220) {
        hasPointer = true;
        smoothX = x;
        smoothY = y;
        lastSpawnX = x;
        lastSpawnY = y;
        lastMoveTime = now;
        spawnPetal(x, y, (Math.random() - 0.5) * 18, 12 + Math.random() * 14, false);
        wake();
        return;
      }

      const dtMove = Math.max(0.004, (now - lastMoveTime) * 0.001);
      // Low-pass filter for buttery-smooth interpolated anchor
      smoothX += (x - smoothX) * 0.65;
      smoothY += (y - smoothY) * 0.65;

      const dx = smoothX - lastSpawnX;
      const dy = smoothY - lastSpawnY;
      const dist = Math.hypot(dx, dy);
      const spacing = 16;

      if (dist >= spacing) {
        const steps = Math.min(7, Math.floor(dist / spacing));
        const velX = Math.max(-110, Math.min(110, (dx / dtMove) * 0.14));
        const velY = Math.max(-70, Math.min(90, (dy / dtMove) * 0.12));

        for (let s = 1; s <= steps; s++) {
          const frac = s / (steps + 0.15);
          const px = lastSpawnX + dx * frac + (Math.random() - 0.5) * 8;
          const py = lastSpawnY + dy * frac + (Math.random() - 0.5) * 8;
          spawnPetal(
            px,
            py,
            velX + (Math.random() - 0.5) * 26,
            velY + 8 + Math.random() * 16,
            false
          );
        }
        lastSpawnX = smoothX;
        lastSpawnY = smoothY;
        wake();
      }
      lastMoveTime = now;
    }

    function onPointerDown(e) {
      if (e.pointerType === "touch" || paused || reducedMQ.matches) return;
      const count = 7;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const spd = 34 + Math.random() * 52;
        spawnPetal(
          e.clientX + (Math.random() - 0.5) * 8,
          e.clientY + (Math.random() - 0.5) * 8,
          Math.cos(a) * spd,
          Math.sin(a) * spd * 0.65 - 24,
          true
        );
      }
      wake();
    }

    function suspendCursor() {
      cancelAnimationFrame(raf);
      raf = 0;
      lastTime = 0;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        suspendCursor();
      } else {
        windowBlurred = false;
        wake();
      }
    }

    function onWindowBlur() {
      windowBlurred = true;
      suspendCursor();
    }

    function onWindowFocus() {
      windowBlurred = false;
      if (!document.hidden) wake();
    }

    function onPageHide() {
      suspendCursor();
    }

    function onPageShow() {
      windowBlurred = false;
      if (!document.hidden) wake();
    }

    function onResize() {
      prevDirty = null;
      resize();
    }

    function onMotionChange() {
      if (reducedMQ.matches) {
        petals.length = 0;
        clearCanvas();
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMQ.addEventListener("change", onMotionChange);

    return {
      setTheme() {},
      setPaused(nextPaused) {
        paused = !!nextPaused;
        if (paused) {
          suspendCursor();
          petals.length = 0;
          clearCanvas();
        } else {
          wake();
        }
      },
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("blur", onWindowBlur);
        window.removeEventListener("focus", onWindowFocus);
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        reducedMQ.removeEventListener("change", onMotionChange);
      },
    };
  }
