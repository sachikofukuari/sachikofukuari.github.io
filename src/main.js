import "../data.js";

import { createLotusScene } from "./lotus-scene.js";
import { createPetalCursor } from "./petal-cursor.js";
import { createGreetingController } from "./greeting.js";
import { createMusicController } from "./music.js";
import { createVitalsController } from "./vitals.js";
import { createDialogController } from "./dialog.js";
import {
  getToolsGroupItems,
  getWorksList,
  renderContactView,
  renderHomeView,
  renderToolsView,
  renderWorksView,
} from "./views.js";
import {
  FLAG_EN_SVG,
  FLAG_VN_SVG,
  attachImageFallbacks,
  getGearIllustrationSvg,
  getToolMonogramHtml,
} from "./icons.js";
import { buildDiscordCdnUrl, createLocaleHelpers, esc, normalizeTab, safeUrl } from "./utils.js";

const DATA = window.PORTFOLIO_DATA || {};

const htmlEl = document.documentElement;
const bodyEl = document.body;

const introStage = document.getElementById("intro-stage");
const introTrigger = document.getElementById("intro-bloom-trigger");
const introGreeting = document.getElementById("intro-greeting");
const introCueEl = document.getElementById("intro-cue");
const btnBackIntro = document.getElementById("btn-back-intro");
const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
const portfolioShell = document.getElementById("portfolio-shell");
const portfolioScroll = document.getElementById("portfolio-scroll");
const portfolioMain = document.getElementById("portfolio-view");
const bottomNav = document.getElementById("bottom-nav");
const navButtons = Array.from(document.querySelectorAll(".bottom-nav-btn[data-tab]"));

const btnLangToggle = document.getElementById("btn-lang-toggle");
const btnMotionToggle = document.getElementById("btn-motion-toggle");
const navLabelEls = Array.from(document.querySelectorAll("[data-nav-label]"));
const miniPlayerOpenHome = document.getElementById("mini-player-open-home");
const miniPlayerClose = document.getElementById("mini-player-close");

const itemDialog = document.getElementById("item-dialog");
const dialogEyebrow = document.getElementById("dialog-eyebrow");
const dialogBody = document.getElementById("dialog-body");
const dialogClose = document.getElementById("dialog-close");
const srLive = document.getElementById("sr-live");

let currentLang = (() => {
  try {
    return localStorage.getItem("portfolio-lang") === "vi" ? "vi" : "en";
  } catch {
    return "en";
  }
})();

let motionPaused = false;
const initialHashTab = normalizeTab(window.location.hash.replace(/^#/, ""));
let activeTab = initialHashTab || "home";
let activeUseFilter = "Software";
let activeWorkFilter = "All";
let stage = "intro";
let liveDiscordAvatarUrl = null;
let lastAvatarFetchMs = 0;

const { uiStr, loc } = createLocaleHelpers(DATA, () => currentLang);
const profileCfg = DATA.profile || {};
const WORKER_URL = String(DATA.backend?.workerUrl || "").trim().replace(/\/+$/, "");

function resolveWorkerHttp(path) {
  return WORKER_URL ? `${WORKER_URL}${path}` : null;
}

function resolveWorkerWs(path) {
  if (!WORKER_URL) return null;
  return `${WORKER_URL.replace(/^http/i, "ws")}${path}`;
}

function resolveAvatarSrc() {
  return liveDiscordAvatarUrl || profileCfg.avatarFallback || profileCfg.avatarImage || null;
}

function applyLiveAvatarToDom(url) {
  const validated = safeUrl(url);
  if (!validated || validated === "#" || validated === liveDiscordAvatarUrl) return;
  liveDiscordAvatarUrl = validated;
  document.querySelectorAll("[data-avatar-slot]").forEach((slot) => {
    const existingImg = slot.querySelector("img[data-live-avatar='true']");
    if (existingImg) {
      if (existingImg.getAttribute("src") !== validated) {
        existingImg.setAttribute("src", validated);
      }
    } else {
      const alt = DATA.profile?.name || "Profile avatar";
      slot.innerHTML = `<img src="${esc(validated)}" alt="${esc(alt)}" data-fallback="true" data-kind="avatar" data-live-avatar="true">`;
      attachImageFallbacks(slot);
    }
  });
}

async function syncDiscordAvatar(force = false) {
  const rawId = String(DATA.profile?.discordUserId || "").trim();
  if (!/^\d{17,20}$/.test(rawId)) return;
  const now = Date.now();
  if (!force && now - lastAvatarFetchMs < 60000) return;
  lastAvatarFetchMs = now;

  const workerAvatarEndpoint = resolveWorkerHttp(`/discord-avatar/${rawId}`);
  if (workerAvatarEndpoint) {
    try {
      const res = await fetch(workerAvatarEndpoint, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const avatarHash = json?.avatar ?? json?.data?.avatar;
        const directUrl = json?.avatarUrl || (avatarHash !== undefined ? buildDiscordCdnUrl(rawId, avatarHash) : null);
        if (directUrl) {
          applyLiveAvatarToDom(directUrl);
          return;
        }
      }
    } catch {
      // Fall back to static proxy endpoints below
    }
  }

  for (const [url, pick] of [
    [`https://japi.rest/discord/v1/user/${rawId}`, (j) => j?.data?.avatar],
    [`https://api.lanyard.rest/v1/users/${rawId}`, (j) => j?.data?.discord_user?.avatar],
  ]) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const avatarHash = pick(await res.json());
        if (avatarHash !== undefined) {
          applyLiveAvatarToDom(buildDiscordCdnUrl(rawId, avatarHash));
          return;
        }
      }
    } catch {
      // Keep fallback avatar silently when offline or unreachable
    }
  }
}

const lotusScene = createLotusScene(document.getElementById("lotus-canvas"), {
  skyCanvas: document.getElementById("sky-canvas"),
  initialOpen: false,
  paused: motionPaused,
});

const petalCursor = createPetalCursor(document.getElementById("petal-cursor-canvas"), {
  paused: motionPaused,
});

const greetingCtrl = createGreetingController({
  introGreeting,
  reducedMotionMQ,
  isPaused: () => motionPaused,
  isIntroStage: () => stage === "intro",
  isPageInactive: () => bodyEl.dataset.pageInactive === "true",
});

const musicCtrl = createMusicController({
  data: DATA,
  loc,
  uiStr,
  isOpenStage: () => stage === "open",
  isOpenHome: () => stage === "open" && activeTab === "home",
  isPageInactive: () => bodyEl.dataset.pageInactive === "true",
});

const vitalsCtrl = createVitalsController({
  data: DATA,
  loc,
  isOpenHome: () => stage === "open" && activeTab === "home",
  isPageInactive: () => bodyEl.dataset.pageInactive === "true",
  resolveWorkerWs,
});

const dialogCtrl = createDialogController({
  itemDialog,
  dialogEyebrow,
  dialogBody,
  dialogClose,
  uiStr,
  onNavigate: (tab) => navigateTo(tab),
});

syncDiscordAvatar(true);

// Pre-decode preferred banner asset on idle so opening the portfolio card never stutters on decode
const bannerPreloadUrl = profileCfg.bannerWebp || profileCfg.banner || profileCfg.bannerImage;
if (bannerPreloadUrl) {
  const warmBanner = () => {
    const img = new Image();
    img.src = bannerPreloadUrl;
    img.decode?.().catch(() => {});
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(warmBanner, { timeout: 1200 });
  } else {
    setTimeout(warmBanner, 750);
  }
}

function setPageInactive(inactive) {
  if (inactive) {
    bodyEl.dataset.pageInactive = "true";
    greetingCtrl.resetImmediate();
  } else if (!document.hidden) {
    delete bodyEl.dataset.pageInactive;
  }
  vitalsCtrl.syncLifecycle();
  musicCtrl.syncPolling();
}

document.addEventListener("visibilitychange", () => {
  setPageInactive(document.hidden);
  if (!document.hidden) syncDiscordAvatar(false);
});
window.addEventListener("blur", () => setPageInactive(true));
window.addEventListener("focus", () => setPageInactive(false));
window.addEventListener("pagehide", () => setPageInactive(true));
window.addEventListener("pageshow", () => setPageInactive(false));

greetingCtrl.initInitialMaskAndEvents(DATA.intro, loc, () => {
  if (bodyEl.dataset.pageInactive === "true" && !document.hidden) {
    delete bodyEl.dataset.pageInactive;
  }
});

function syncMotionUi() {
  htmlEl.dataset.motion = motionPaused ? "paused" : "running";
  if (btnMotionToggle) {
    const label = motionPaused ? uiStr("playMotion") : uiStr("pauseMotion");
    btnMotionToggle.setAttribute("aria-label", label);
    btnMotionToggle.setAttribute("title", label);
  }
  lotusScene?.setPaused(motionPaused);
  petalCursor?.setPaused(motionPaused);
  if (motionPaused) greetingCtrl.resetMotion();
}

function applyLanguageUi(rerenderOpen = false) {
  htmlEl.lang = currentLang;
  htmlEl.dataset.lang = currentLang;
  try {
    localStorage.setItem("portfolio-lang", currentLang);
  } catch {
    // Ignore storage failures
  }

  if (btnLangToggle) {
    btnLangToggle.innerHTML = currentLang === "en" ? FLAG_VN_SVG : FLAG_EN_SVG;
    const tip = uiStr("switchLangLabel");
    btnLangToggle.setAttribute("aria-label", tip);
    btnLangToggle.setAttribute("title", tip);
  }

  if (btnBackIntro) {
    const backLabel = uiStr("backToIntro");
    btnBackIntro.setAttribute("aria-label", backLabel);
    btnBackIntro.setAttribute("title", backLabel);
  }

  const navKeys = { home: "navHome", tools: "navTools", works: "navWorks", contact: "navContact" };
  navLabelEls.forEach((el) => {
    const key = navKeys[el.dataset.navLabel];
    if (key) el.textContent = uiStr(key);
  });

  if (dialogClose) dialogClose.setAttribute("aria-label", uiStr("closeDetails"));
  if (miniPlayerOpenHome) miniPlayerOpenHome.setAttribute("title", uiStr("jumpToHomePlayer"));
  if (miniPlayerClose) miniPlayerClose.setAttribute("aria-label", uiStr("stopMiniPlayer"));

  const greet = loc(DATA.intro, "greeting", "Hello, im Ari");
  if (introGreeting) {
    greetingCtrl.buildChars(greetingCtrl.getLines(DATA.intro, loc));
    if (rerenderOpen) {
      if (stage === "intro") {
        greetingCtrl.playWriteAnimation();
      } else {
        greetingCtrl.clearWriteMasks();
        requestAnimationFrame(greetingCtrl.measureChars);
      }
    }
  }
  if (introCueEl) introCueEl.textContent = loc(DATA.intro, "cue", "scroll or click");
  if (introTrigger) {
    const ariaAction = loc(DATA.intro, "lotusAriaLabel", "Bloom lotus to enter portfolio");
    introTrigger.setAttribute("aria-label", greet ? `${greet} — ${ariaAction}` : ariaAction);
  }

  syncMotionUi();
  musicCtrl.syncMiniPlayerDom();
  if (rerenderOpen && stage === "open") {
    renderActiveView();
  } else {
    vitalsCtrl.updateDom();
  }
}

btnLangToggle?.addEventListener("click", () => {
  currentLang = currentLang === "en" ? "vi" : "en";
  applyLanguageUi(true);
});

btnMotionToggle?.addEventListener("click", () => {
  motionPaused = !motionPaused;
  syncMotionUi();
});

async function copyText(text, message) {
  const fb = document.getElementById("copy-feedback");
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const tmp = document.createElement("textarea");
      tmp.value = text;
      tmp.setAttribute("readonly", "");
      tmp.style.position = "fixed";
      tmp.style.opacity = "0";
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      tmp.remove();
    }
    if (fb) fb.textContent = message;
    if (srLive) srLive.textContent = message;
  } catch {
    if (fb) fb.textContent = `${uiStr("copiedFallback") || "Copied value:"} ${text}`;
  }
}

function wireRenderedViewInteractions() {
  portfolioMain.querySelectorAll("[data-nav-tab]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const target = normalizeTab(el.dataset.navTab);
      if (target) {
        e.preventDefault();
        navigateTo(target);
      }
    });
  });

  portfolioMain.querySelectorAll("[data-use-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeUseFilter = btn.dataset.useFilter || "Software";
      renderActiveView();
    });
  });

  portfolioMain.querySelectorAll("[data-work-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeWorkFilter = btn.dataset.workFilter || "All";
      renderActiveView();
    });
  });

  // Only Peripherals cards carry data-use-id and open a detail modal; Software cards stay static.
  portfolioMain.querySelectorAll("[data-use-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const peripherals = getToolsGroupItems(DATA, "Peripherals");
      const item = peripherals.find((u) => u.id === card.dataset.useId);
      if (!item) return;
      const title = loc(item, "title", item.name || "");
      const subtitle = loc(item, "subtitle", item.category || "");
      const tag = loc(item, "tag", item.brand || "");
      const status = loc(item, "status", "in use");
      const desc = loc(item, "description", item.notes || "");
      const imgSrc = item.image ? safeUrl(item.image) : "";
      const visualHtml =
        imgSrc && imgSrc !== "#"
          ? `<img src="${esc(imgSrc)}" alt="${esc(title)}" data-fallback="true" data-kind="gear" data-icon-type="${esc(item.iconType || "palette")}">`
          : item.badge
            ? getToolMonogramHtml(item.badge, item.accent)
            : getGearIllustrationSvg(item.iconType);
      dialogCtrl.open(
        card,
        `${subtitle || "tool"}${status ? ` · ${status}` : ""}`,
        visualHtml,
        title,
        tag,
        desc,
        item.url
      );
    });
  });

  portfolioMain.querySelectorAll("[data-work-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const work = getWorksList(DATA).find((w) => w.id === card.dataset.workId);
      if (!work) return;
      const title = loc(work, "title", "");
      const category = loc(work, "category", "work");
      const status = loc(work, "status", "");
      const desc = loc(work, "description", work.summary || "");
      const media = dialogCtrl.renderWorkMedia(work);
      dialogCtrl.open(
        card,
        `${category}${work.year ? ` · ${work.year}` : ""}`,
        media.visualHtml,
        title,
        `${status}${work.tags?.length ? ` · ${work.tags.join(" · ")}` : ""}`,
        desc,
        work.url,
        media
      );
    });
  });

  document.getElementById("btn-copy-handle")?.addEventListener("click", () => {
    const tag = DATA.profile?.tag || DATA.profile?.handle || "@sachikofukuari";
    copyText(tag, `${uiStr("copiedPrefix")} ${tag}`);
  });

  document.getElementById("btn-copy-url")?.addEventListener("click", () => {
    copyText(window.location.href, uiStr("copiedLink"));
  });

  musicCtrl.wireHomeWidgetControls();
}

function renderActiveView() {
  if (!portfolioMain) return;
  const ctx = {
    data: DATA,
    currentLang,
    activeUseFilter,
    activeWorkFilter,
    avatarSrc: resolveAvatarSrc(),
    musicCtrl,
    vitalsCtrl,
    loc,
    uiStr,
  };

  let html = "";
  if (activeTab === "tools") html = renderToolsView(ctx);
  else if (activeTab === "works") html = renderWorksView(ctx);
  else if (activeTab === "contact") html = renderContactView(ctx);
  else html = renderHomeView(ctx);

  portfolioMain.innerHTML = html;
  attachImageFallbacks(portfolioMain);
  wireRenderedViewInteractions();
  vitalsCtrl.syncLifecycle();
  musicCtrl.syncControlsDom();
  musicCtrl.syncPolling();
}

function updateNavState() {
  navButtons.forEach((btn) => {
    if (btn.dataset.tab === activeTab) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });
}

function focusViewHeading() {
  const heading = document.getElementById("view-heading");
  if (heading) {
    heading.focus({ preventScroll: true });
  } else {
    portfolioMain?.focus({ preventScroll: true });
  }
}

function getPortfolioScrollTop() {
  return portfolioScroll ? portfolioScroll.scrollTop : window.scrollY;
}

function resetPortfolioScroll() {
  if (portfolioScroll) portfolioScroll.scrollTop = 0;
}

function navigateTo(nextTab, updateHash = true) {
  const targetTab = normalizeTab(nextTab);
  if (!targetTab) return;
  if (targetTab === activeTab && portfolioMain.innerHTML.trim() !== "") return;

  if (targetTab === "tools" && activeTab !== "tools") {
    activeUseFilter = "Software";
  }
  activeTab = targetTab;
  if (updateHash && window.location.hash !== `#${targetTab}`) {
    history.pushState(null, "", `#${targetTab}`);
  }

  renderActiveView();
  updateNavState();
  resetPortfolioScroll();
  focusViewHeading();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navigateTo(btn.dataset.tab);
  });
});

window.addEventListener("hashchange", () => {
  const tab = normalizeTab(window.location.hash.replace(/^#/, ""));
  if (tab) {
    if (stage === "intro") {
      activeTab = tab;
      openPortfolio();
    } else {
      navigateTo(tab, false);
    }
  }
});

let introWheelAccum = 0;
let returnWheelAccum = 0;
let wheelResetTimer = 0;
let touchStartY = null;
let touchStartScrollY = 0;
let transitionLocked = false;
let transitionUnlockTimer = 0;

function lockTransition(durationMs) {
  transitionLocked = true;
  bodyEl.dataset.transitioning = "true";
  introWheelAccum = 0;
  returnWheelAccum = 0;
  clearTimeout(transitionUnlockTimer);
  transitionUnlockTimer = setTimeout(() => {
    transitionLocked = false;
    delete bodyEl.dataset.transitioning;
    introWheelAccum = 0;
    returnWheelAccum = 0;
  }, durationMs);
}

function openPortfolio() {
  if (stage === "open" || transitionLocked) return;
  lotusScene?.setBloom(true);
  greetingCtrl.clearWriteMasks();
  lockTransition(2100);
  stage = "open";
  bodyEl.dataset.stage = "open";
  portfolioShell.hidden = false;
  portfolioShell.inert = false;
  portfolioShell.removeAttribute("aria-hidden");
  bottomNav?.removeAttribute("aria-hidden");
  if (bottomNav) bottomNav.inert = false;
  introStage.setAttribute("aria-hidden", "true");
  btnBackIntro?.removeAttribute("aria-hidden");
  btnBackIntro?.removeAttribute("tabindex");

  resetPortfolioScroll();
  renderActiveView();
  updateNavState();
  greetingCtrl.resetMotion();

  setTimeout(() => {
    if (stage === "open") musicCtrl.ensureLoaded();
  }, 1650);

  setTimeout(() => {
    if (stage === "open") focusViewHeading();
  }, 620);
}

function closeToIntro() {
  if (stage === "intro" || transitionLocked) return;
  dialogCtrl.close();
  lockTransition(2300);
  stage = "intro";
  vitalsCtrl.syncLifecycle();
  musicCtrl.syncPolling();
  musicCtrl.syncMiniPlayerDom();
  bodyEl.dataset.stage = "intro";
  portfolioShell.inert = true;
  portfolioShell.setAttribute("aria-hidden", "true");
  if (bottomNav) bottomNav.inert = true;
  bottomNav?.setAttribute("aria-hidden", "true");
  introStage.removeAttribute("aria-hidden");
  btnBackIntro?.setAttribute("aria-hidden", "true");
  btnBackIntro?.setAttribute("tabindex", "-1");
  resetPortfolioScroll();

  lotusScene?.setBloom(false);
  greetingCtrl.playWriteAnimation();

  setTimeout(() => {
    if (stage === "intro") introTrigger?.focus({ preventScroll: true });
  }, 280);
}

introTrigger?.addEventListener("click", openPortfolio);
btnBackIntro?.addEventListener("click", closeToIntro);

window.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey || dialogCtrl.isOpen() || transitionLocked) return;
    clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(() => {
      introWheelAccum = 0;
      returnWheelAccum = 0;
    }, 360);

    if (stage === "intro") {
      if (e.deltaY > 0) {
        introWheelAccum += e.deltaY;
        if (introWheelAccum > 26) openPortfolio();
      }
    } else if (stage === "open" && getPortfolioScrollTop() <= 1 && e.deltaY < 0) {
      returnWheelAccum += Math.abs(e.deltaY);
      if (returnWheelAccum > 165) closeToIntro();
    }
  },
  { passive: true }
);

window.addEventListener(
  "touchstart",
  (e) => {
    if (e.target?.closest?.(".bottom-nav, .utility-dock, .back-intro-btn")) {
      touchStartY = null;
      return;
    }
    touchStartY = e.touches[0]?.clientY ?? null;
    touchStartScrollY = getPortfolioScrollTop();
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (e) => {
    if (touchStartY == null || dialogCtrl.isOpen() || transitionLocked) return;
    const currentY = e.touches[0]?.clientY;
    if (currentY == null) return;
    const dy = touchStartY - currentY;

    if (stage === "intro") {
      e.preventDefault();
      if (dy > 32) {
        touchStartY = null;
        openPortfolio();
      }
    } else if (stage === "open" && touchStartScrollY <= 1 && getPortfolioScrollTop() <= 1 && dy < -6) {
      e.preventDefault();
      if (dy < -62) {
        touchStartY = null;
        closeToIntro();
      }
    }
  },
  { passive: false }
);

window.addEventListener("touchend", () => { touchStartY = null; }, { passive: true });
window.addEventListener("touchcancel", () => { touchStartY = null; }, { passive: true });

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tagName = document.activeElement?.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || document.activeElement?.isContentEditable) {
    return;
  }

  if (stage === "intro" && !transitionLocked && (e.key === "ArrowDown" || e.key === "PageDown")) {
    e.preventDefault();
    openPortfolio();
    return;
  }

  if (stage === "open") {
    if (e.key === "Escape" && !dialogCtrl.isOpen()) {
      closeToIntro();
      return;
    }
    if (!dialogCtrl.isOpen()) {
      const keyMap = { 1: "home", 2: "tools", 3: "works", 4: "contact" };
      if (keyMap[e.key]) {
        e.preventDefault();
        navigateTo(keyMap[e.key]);
        return;
      }
      if (e.code === "Space" && !document.activeElement?.closest?.("button, a, [role='button']")) {
        e.preventDefault();
        musicCtrl.togglePlayback();
      }
    }
  }
});

document.getElementById("mini-player-toggle")?.addEventListener("click", musicCtrl.togglePlayback);
document.getElementById("mini-player-open-home")?.addEventListener("click", () => {
  if (stage === "open") navigateTo("home");
});
document.getElementById("mini-player-close")?.addEventListener("click", musicCtrl.dismissMiniPlayer);

applyLanguageUi(false);
updateNavState();
musicCtrl.syncMiniPlayerDom();
