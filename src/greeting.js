/**
 * Interactive "Hello, im Ari" center-outward write-on sweep, localized cursor glow (`--cg`),
 * and spring-damped per-character float physics.
 */
export function createGreetingController({
  introGreeting,
  introCue,
  reducedMotionMQ,
  isPaused,
  isIntroStage,
  isPageInactive,
}) {
  const greetingChars = [];
  const greetingLineEls = [];
  const activeWriteAnims = [];
  let cueTimer = 0;
  let writeDoneTimer = 0;
  let charsMeasured = false;
  const writeState = {
    startedOnce: false,
  };
  const hoverState = {
    active: false,
    px: 0,
    py: 0,
    curGx: 0,
    curGy: 0,
    curRx: 0,
    curRy: 0,
    viewW: window.innerWidth,
    viewH: window.innerHeight,
    rafId: 0,
    lastTs: 0,
  };

  function getLines(introObj, loc) {
    const rawLines = loc(introObj, "greetingLines", null);
    if (Array.isArray(rawLines) && rawLines.length > 0) {
      return rawLines.map((l) => String(l));
    }
    const text = String(loc(introObj, "greeting", "Hello, im Ari"));
    const commaIdx = text.indexOf(",");
    if (commaIdx !== -1 && commaIdx < text.length - 2) {
      return [text.slice(0, commaIdx + 1).trim(), text.slice(commaIdx + 1).trim()];
    }
    return [text];
  }

  function buildChars(lines) {
    if (!introGreeting) return;
    introGreeting.setAttribute("aria-label", lines.join(" "));
    introGreeting.textContent = "";
    greetingChars.length = 0;
    greetingLineEls.length = 0;
    charsMeasured = false;

    for (const lineStr of lines) {
      const lineEl = document.createElement("span");
      lineEl.className = "greeting-line";
      lineEl.setAttribute("aria-hidden", "true");

      for (const ch of lineStr) {
        if (/\s/.test(ch)) {
          const sp = document.createElement("span");
          sp.className = "greeting-space";
          sp.setAttribute("aria-hidden", "true");
          sp.textContent = "\u00A0";
          lineEl.appendChild(sp);
        } else {
          const span = document.createElement("span");
          span.className = "greeting-char";
          span.setAttribute("aria-hidden", "true");
          span.textContent = ch;
          lineEl.appendChild(span);
          greetingChars.push({
            el: span,
            cx: 0,
            cy: 0,
            curX: 0,
            curY: 0,
            curS: 1,
            curR: 0,
            curG: 0,
          });
        }
      }
      introGreeting.appendChild(lineEl);
      greetingLineEls.push(lineEl);
    }
  }

  function revealCue() {
    introCue?.classList.add("is-cue-ready");
  }

  function hideCue() {
    introCue?.classList.remove("is-cue-ready");
  }

  function clearWriteMasks(shouldRevealCue = true) {
    clearTimeout(cueTimer);
    cueTimer = 0;
    clearTimeout(writeDoneTimer);
    writeDoneTimer = 0;
    for (let i = 0; i < activeWriteAnims.length; i++) {
      try {
        activeWriteAnims[i].cancel();
      } catch {
        // Ignore cancelled WAAPI animations
      }
    }
    activeWriteAnims.length = 0;
    if (shouldRevealCue && writeState.startedOnce) {
      revealCue();
    }
    if (!introGreeting) return;
    introGreeting.classList.remove("is-writing");
    introGreeting.style.removeProperty("--wx");
  }

  function measureChars() {
    hoverState.viewW = Math.max(1, window.innerWidth);
    hoverState.viewH = Math.max(1, window.innerHeight);
    if (!introGreeting) return;
    for (let i = 0; i < greetingChars.length; i++) {
      const item = greetingChars[i];
      const rect = item.el.getBoundingClientRect();
      item.cx = rect.left + rect.width * 0.5 - hoverState.curGx;
      item.cy = rect.top + rect.height * 0.5 - hoverState.curGy;
    }
    charsMeasured = true;
  }

  function playWriteAnimation(delayMs = 0) {
    if (!introGreeting) return;
    clearWriteMasks(false);
    hideCue();
    charsMeasured = false;

    if (isPaused() || reducedMotionMQ.matches || document.hidden || isPageInactive() || !isIntroStage()) {
      introGreeting.classList.add("is-ready");
      revealCue();
      return;
    }

    const baseDelay = Math.max(0, Number(delayMs) || 0);
    const count = greetingChars.length;
    introGreeting.classList.add("is-writing", "is-ready");

    for (let i = 0; i < count; i++) {
      const el = greetingChars[i].el;
      if (typeof el.animate !== "function") continue;
      const charDelay = Math.round(baseDelay + (i / Math.max(1, count - 1)) * 520);
      const anim = el.animate(
        [
          { opacity: 0, transform: "translate3d(-8px, 6px, 0) scale(0.92)" },
          { opacity: 1, transform: "translate3d(0px, 0px, 0) scale(1)" },
        ],
        {
          duration: 360,
          delay: charDelay,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        }
      );
      activeWriteAnims.push(anim);
    }

    cueTimer = setTimeout(() => {
      cueTimer = 0;
      if (isIntroStage()) revealCue();
    }, baseDelay + 640);

    writeDoneTimer = setTimeout(() => {
      writeDoneTimer = 0;
      clearWriteMasks(true);
    }, baseDelay + 920);
  }

  function stepHoverFrame(now) {
    hoverState.rafId = 0;
    if (!introGreeting) return;

    const dt = hoverState.lastTs ? Math.min(0.05, Math.max(0.001, (now - hoverState.lastTs) * 0.001)) : 0.016;
    hoverState.lastTs = now;
    const ease = 1 - Math.exp(-dt * 12);
    const interactive = hoverState.active && isIntroStage() && !isPaused() && !reducedMotionMQ.matches;

    let tgtGx = 0;
    let tgtGy = 0;
    let tgtRx = 0;
    let tgtRy = 0;

    if (interactive) {
      const normX = Math.max(-1, Math.min(1, (hoverState.px - hoverState.viewW * 0.5) / Math.max(1, hoverState.viewW * 0.5)));
      const normY = Math.max(-1, Math.min(1, (hoverState.py - hoverState.viewH * 0.5) / Math.max(1, hoverState.viewH * 0.5)));
      tgtGx = normX * 14;
      tgtGy = normY * 8;
      tgtRx = -normY * 7;
      tgtRy = normX * 9;
    }

    hoverState.curGx += (tgtGx - hoverState.curGx) * ease;
    hoverState.curGy += (tgtGy - hoverState.curGy) * ease;
    hoverState.curRx += (tgtRx - hoverState.curRx) * ease;
    hoverState.curRy += (tgtRy - hoverState.curRy) * ease;

    let maxDelta = Math.max(
      Math.abs(tgtGx - hoverState.curGx),
      Math.abs(tgtGy - hoverState.curGy),
      Math.abs(tgtRx - hoverState.curRx),
      Math.abs(tgtRy - hoverState.curRy)
    );

    introGreeting.style.setProperty("--gx", `${hoverState.curGx.toFixed(2)}px`);
    introGreeting.style.setProperty("--gy", `${hoverState.curGy.toFixed(2)}px`);
    introGreeting.style.setProperty("--rx", `${hoverState.curRx.toFixed(2)}deg`);
    introGreeting.style.setProperty("--ry", `${hoverState.curRy.toFixed(2)}deg`);

    const radius = 175;
    for (let i = 0; i < greetingChars.length; i++) {
      const item = greetingChars[i];
      let tgtCx = 0;
      let tgtCy = 0;
      let tgtCs = 1;
      let tgtCr = 0;
      let tgtCg = 0;

      if (interactive) {
        const dx = item.cx + hoverState.curGx - hoverState.px;
        const dy = item.cy + hoverState.curGy - hoverState.py;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
          const prox = Math.pow(1 - dist / radius, 1.55);
          tgtCx = dist > 1 ? (dx / dist) * prox * 6 : 0;
          tgtCy = -prox * 11;
          tgtCs = 1 + prox * 0.22;
          tgtCr = Math.max(-7, Math.min(7, (dx / radius) * -10 * prox));
          tgtCg = prox;
        }
      }

      item.curX += (tgtCx - item.curX) * ease;
      item.curY += (tgtCy - item.curY) * ease;
      item.curS += (tgtCs - item.curS) * ease;
      item.curR += (tgtCr - item.curR) * ease;
      item.curG += (tgtCg - item.curG) * ease;

      maxDelta = Math.max(
        maxDelta,
        Math.abs(tgtCx - item.curX),
        Math.abs(tgtCy - item.curY),
        Math.abs(tgtCs - item.curS) * 40,
        Math.abs(tgtCr - item.curR),
        Math.abs(tgtCg - item.curG) * 30
      );

      item.el.style.setProperty("--cx", `${item.curX.toFixed(2)}px`);
      item.el.style.setProperty("--cy", `${item.curY.toFixed(2)}px`);
      item.el.style.setProperty("--cs", item.curS.toFixed(3));
      item.el.style.setProperty("--cr", `${item.curR.toFixed(2)}deg`);
      item.el.style.setProperty("--cg", item.curG.toFixed(3));
      item.el.classList.toggle("is-lit", item.curG > 0.008);
    }

    if (maxDelta > 0.015) {
      introGreeting.classList.add("is-interacting");
      hoverState.rafId = requestAnimationFrame(stepHoverFrame);
    } else {
      introGreeting.classList.remove("is-interacting");
      hoverState.lastTs = 0;
    }
  }

  function wakeHoverFrame() {
    if (!hoverState.rafId && !document.hidden && !isPageInactive()) {
      hoverState.rafId = requestAnimationFrame(stepHoverFrame);
    }
  }

  function resetImmediate() {
    if (hoverState.rafId) {
      cancelAnimationFrame(hoverState.rafId);
      hoverState.rafId = 0;
    }
    hoverState.lastTs = 0;
    hoverState.active = false;
    hoverState.curGx = 0;
    hoverState.curGy = 0;
    hoverState.curRx = 0;
    hoverState.curRy = 0;
    if (!introGreeting) return;
    introGreeting.classList.remove("is-interacting");
    introGreeting.style.setProperty("--gx", "0px");
    introGreeting.style.setProperty("--gy", "0px");
    introGreeting.style.setProperty("--rx", "0deg");
    introGreeting.style.setProperty("--ry", "0deg");
    for (let i = 0; i < greetingChars.length; i++) {
      const item = greetingChars[i];
      item.curX = 0;
      item.curY = 0;
      item.curS = 1;
      item.curR = 0;
      item.curG = 0;
      item.el.style.setProperty("--cx", "0px");
      item.el.style.setProperty("--cy", "0px");
      item.el.style.setProperty("--cs", "1");
      item.el.style.setProperty("--cr", "0deg");
      item.el.style.setProperty("--cg", "0");
      item.el.classList.remove("is-lit");
    }
  }

  function resetMotion() {
    hoverState.active = false;
    if (document.hidden || isPageInactive()) {
      resetImmediate();
    } else {
      wakeHoverFrame();
    }
  }

  function initInitialMaskAndEvents(introCfg, loc, onPointerResume) {
    if (!introGreeting) return;
    const lines = getLines(introCfg, loc);
    buildChars(lines);
    const sampleText = lines.join(" ");

    const runInitialWrite = () => {
      if (writeState.startedOnce) return;
      writeState.startedOnce = true;
      playWriteAnimation();
    };

    if (document.fonts && typeof document.fonts.load === "function") {
      const fontReady = Promise.all([
        document.fonts.load('700 48px "1FTV VIP Alpha Brights"', sampleText),
        document.fonts.ready,
      ]).catch(() => {});
      const fallbackTimer = new Promise((resolve) => setTimeout(resolve, 2500));
      Promise.race([fontReady, fallbackTimer]).then(runInitialWrite);
    } else if (document.fonts?.ready) {
      const fallbackTimer = new Promise((resolve) => setTimeout(resolve, 2500));
      Promise.race([document.fonts.ready, fallbackTimer]).then(runInitialWrite);
    } else {
      runInitialWrite();
    }

    window.addEventListener(
      "resize",
      () => {
        clearWriteMasks();
        charsMeasured = false;
      },
      { passive: true }
    );
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch" || !isIntroStage() || isPaused() || reducedMotionMQ.matches) return;
        onPointerResume();
        if (document.hidden) return;
        if (!charsMeasured) measureChars();
        hoverState.px = e.clientX;
        hoverState.py = e.clientY;
        hoverState.active = true;
        wakeHoverFrame();
      },
      { passive: true }
    );
    window.addEventListener("pointerleave", resetMotion, { passive: true });
    reducedMotionMQ.addEventListener("change", resetMotion);
  }

  return {
    getLines,
    buildChars,
    clearWriteMasks,
    playWriteAnimation,
    measureChars,
    resetImmediate,
    resetMotion,
    initInitialMaskAndEvents,
  };
}

