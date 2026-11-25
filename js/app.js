/**
 * Portfolio SPA Controller, View Transitions & Bloom Orchestrator
 */
(function () {
  "use strict";

  const DATA = window.PORTFOLIO_DATA || {};
  const VALID_TABS = new Set(["home", "tools", "works", "contact"]);
  const TAB_ALIASES = { uses: "tools", card: "contact" };

  function normalizeTab(raw) {
    const key = String(raw || "").trim().toLowerCase();
    const mapped = TAB_ALIASES[key] || key;
    return VALID_TABS.has(mapped) ? mapped : null;
  }

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

  const btnMotionToggle = document.getElementById("btn-motion-toggle");
  const motionLabel = btnMotionToggle?.querySelector(".motion-label");

  const itemDialog = document.getElementById("item-dialog");
  const dialogEyebrow = document.getElementById("dialog-eyebrow");
  const dialogBody = document.getElementById("dialog-body");
  const dialogClose = document.getElementById("dialog-close");
  const srLive = document.getElementById("sr-live");

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeUrl(url) {
    const raw = String(url ?? "").trim();
    if (!raw) return "#";
    if (raw.startsWith("#") || raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) {
      return raw;
    }
    try {
      const parsed = new URL(raw, window.location.href);
      if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
        return raw;
      }
    } catch {
      return "#";
    }
    return "#";
  }

  function isExternalUrl(url) {
    return /^https?:\/\//i.test(String(url ?? "").trim());
  }

  // --------------------------------------------------------------------------
  // Vector Artwork & Icons
  // --------------------------------------------------------------------------

  function getSakuraClusterSvg(cls) {
    return `
      <svg class="sakura-deco ${cls}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="sakG1-${cls}" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#fff4f9"/>
            <stop offset="55%" stop-color="#ffc3dc"/>
            <stop offset="100%" stop-color="#e879a5"/>
          </radialGradient>
        </defs>
        <g transform="translate(46,48)">
          <g transform="rotate(0)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(72)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(144)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(216)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(288)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <circle cx="0" cy="0" r="5" fill="#d96b96"/>
          <circle cx="-3" cy="-4" r="1.4" fill="#ffe89e"/>
          <circle cx="4" cy="-3" r="1.4" fill="#ffe89e"/>
          <circle cx="0" cy="4" r="1.4" fill="#ffe89e"/>
        </g>
        <g transform="translate(88,36) scale(0.58) rotate(22)">
          <g transform="rotate(0)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(72)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(144)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(216)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <g transform="rotate(288)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${cls})"/></g>
          <circle cx="0" cy="0" r="5" fill="#d96b96"/>
        </g>
        <path d="M88,88 C82,82 81,74 87,71 C91,73 94,81 88,88Z" fill="#ffd2e6" opacity="0.9"/>
      </svg>
    `;
  }

  function getDefaultBannerSvg() {
    return `
      <svg viewBox="0 0 960 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="banBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--banner-1)"/>
            <stop offset="48%" stop-color="var(--banner-2)"/>
            <stop offset="100%" stop-color="var(--banner-3)"/>
          </linearGradient>
          <radialGradient id="banGlow" cx="72%" cy="46%" r="52%">
            <stop offset="0%" stop-color="#fff2f8" stop-opacity="0.52"/>
            <stop offset="60%" stop-color="#f79bc1" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#f79bc1" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="banSakura" x1="0%" y1="100%" x2="10%" y2="0%">
            <stop offset="0%" stop-color="var(--banner-lotus-1)" stop-opacity="0.82"/>
            <stop offset="60%" stop-color="#ffc8df" stop-opacity="0.92"/>
            <stop offset="100%" stop-color="var(--banner-lotus-2)" stop-opacity="0.98"/>
          </linearGradient>
        </defs>
        <rect width="960" height="240" fill="url(#banBg)"/>
        <rect width="960" height="240" fill="url(#banGlow)"/>
        <g opacity="0.22" stroke="var(--banner-stroke)" stroke-width="1.4" fill="none">
          <path d="M-20,190 Q210,70 480,150 T980,95"/>
          <path d="M-20,215 Q260,115 520,185 T980,145"/>
        </g>
        <g transform="translate(745,126)">
          <g transform="rotate(0)"><path d="M0,0 C-26,-28 -36,-70 -12,-84 C-4,-88 -2,-74 0,-68 C2,-74 4,-88 12,-84 C36,-70 26,-28 0,0Z" fill="url(#banSakura)"/></g>
          <g transform="rotate(72)"><path d="M0,0 C-26,-28 -36,-70 -12,-84 C-4,-88 -2,-74 0,-68 C2,-74 4,-88 12,-84 C36,-70 26,-28 0,0Z" fill="url(#banSakura)"/></g>
          <g transform="rotate(144)"><path d="M0,0 C-26,-28 -36,-70 -12,-84 C-4,-88 -2,-74 0,-68 C2,-74 4,-88 12,-84 C36,-70 26,-28 0,0Z" fill="url(#banSakura)"/></g>
          <g transform="rotate(216)"><path d="M0,0 C-26,-28 -36,-70 -12,-84 C-4,-88 -2,-74 0,-68 C2,-74 4,-88 12,-84 C36,-70 26,-28 0,0Z" fill="url(#banSakura)"/></g>
          <g transform="rotate(288)"><path d="M0,0 C-26,-28 -36,-70 -12,-84 C-4,-88 -2,-74 0,-68 C2,-74 4,-88 12,-84 C36,-70 26,-28 0,0Z" fill="url(#banSakura)"/></g>
          <circle cx="0" cy="0" r="9" fill="#9c3362" opacity="0.72"/>
        </g>
        <circle cx="155" cy="68" r="2.5" fill="var(--banner-stroke)" opacity="0.7"/>
        <circle cx="290" cy="48" r="1.8" fill="var(--banner-stroke)" opacity="0.55"/>
        <circle cx="520" cy="76" r="2.2" fill="var(--banner-stroke)" opacity="0.55"/>
        <circle cx="882" cy="54" r="3" fill="var(--banner-stroke)" opacity="0.8"/>
      </svg>
    `;
  }

  function getDefaultAvatarSvg() {
    return `
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="avBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--banner-1)"/>
            <stop offset="100%" stop-color="var(--banner-3)"/>
          </linearGradient>
          <linearGradient id="avPet" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="var(--banner-lotus-1)"/>
            <stop offset="100%" stop-color="var(--banner-lotus-2)"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="60" fill="url(#avBg)"/>
        <g transform="translate(60,62)">
          <g transform="rotate(0)"><path d="M0,0 C-11,-12 -15,-30 -5,-36 C-1.5,-38 -1,-31 0,-29 C1,-31 1.5,-38 5,-36 C15,-30 11,-12 0,0Z" fill="url(#avPet)"/></g>
          <g transform="rotate(72)"><path d="M0,0 C-11,-12 -15,-30 -5,-36 C-1.5,-38 -1,-31 0,-29 C1,-31 1.5,-38 5,-36 C15,-30 11,-12 0,0Z" fill="url(#avPet)"/></g>
          <g transform="rotate(144)"><path d="M0,0 C-11,-12 -15,-30 -5,-36 C-1.5,-38 -1,-31 0,-29 C1,-31 1.5,-38 5,-36 C15,-30 11,-12 0,0Z" fill="url(#avPet)"/></g>
          <g transform="rotate(216)"><path d="M0,0 C-11,-12 -15,-30 -5,-36 C-1.5,-38 -1,-31 0,-29 C1,-31 1.5,-38 5,-36 C15,-30 11,-12 0,0Z" fill="url(#avPet)"/></g>
          <g transform="rotate(288)"><path d="M0,0 C-11,-12 -15,-30 -5,-36 C-1.5,-38 -1,-31 0,-29 C1,-31 1.5,-38 5,-36 C15,-30 11,-12 0,0Z" fill="url(#avPet)"/></g>
          <circle cx="0" cy="0" r="4.5" fill="#9c3362" opacity="0.82"/>
        </g>
      </svg>
    `;
  }

  function getSmallIconSvg(name) {
    const icons = {
      github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>',
      discord: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5S9.8 9.5 9 9.5Zm6 0c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5Z"/><path d="M18.5 6.5A14 14 0 0 0 15 5.2l-.5 1a11 11 0 0 0-5 0l-.5-1a14 14 0 0 0-3.5 1.3C3.3 9.9 2.7 13.2 3 16.5a14.4 14.4 0 0 0 4.3 2.2l.9-1.4a9.6 9.6 0 0 1-1.5-.7l.4-.3a10.6 10.6 0 0 0 9.8 0l.4.3a9.6 9.6 0 0 1-1.5.7l.9 1.4a14.4 14.4 0 0 0 4.3-2.2c.4-3.8-.6-7-2.5-10Z"/></svg>',
      card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.8-1.4 2-2 3-2s2.2.6 3 2"/><line x1="14" y1="10" x2="18.5" y2="10"/><line x1="14" y1="13.5" x2="17.5" y2="13.5"/></svg>',
      arrowRight: '<svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3 7 9 6 9-6"/></svg>',
      lotus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 12c-1.8-2.2-2.6-5.2-.9-6.8.7-.6.9.8.9 1.2 0-.4.2-1.8.9-1.2 1.7 1.6.9 4.6-.9 6.8Z"/><path d="M12 12c1.4-2.4 4-4.2 6.1-3.1.8.4-.4 1-.8 1.2.4-.1 1.7-.4 1.4.5-.7 2.2-3.8 2.4-6.7 1.4Z"/><path d="M12 12c2.7.5 5.2 2.4 4.8 4.7-.1.9-1.1.1-1.4-.2.3.3 1 1.4 0 1.4-2.3.1-3.5-2.8-3.4-5.9Z"/><path d="M12 12c.1 3.1-1.1 6-3.4 5.9-1 0-.3-1.1 0-1.4-.3.3-1.3 1.1-1.4.2-.4-2.3 2.1-4.2 4.8-4.7Z"/><path d="M12 12c-2.9 1-6 .8-6.7-1.4-.3-.9 1-.6 1.4-.5-.4-.2-1.6-.8-.8-1.2 2.1-1.1 4.7.7 6.1 3.1Z"/></svg>',
      sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9L12 3Z"/></svg>',
      mouse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="6"/><line x1="12" y1="7" x2="12" y2="10"/></svg>',
      mousepad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/></svg>',
      keyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>',
      headset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/></svg>',
      tablet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m14 9-4 4 2 2 4-4-2-2Z"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
      palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-7.7-9-7.7Z"/></svg>',
      code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      crosshair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="m5 6 7 9 7-9"/><path d="M5 16h14"/></svg>',
      triangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 4 19h16L12 4Z"/><path d="M12 10 8.5 17h7L12 10Z"/></svg>',
      music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      ytMusic: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.2" opacity="0.65"/><polygon points="10.4,9.2 15.6,12 10.4,14.8" fill="currentColor"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.6s-7.4-4.7-9.6-9.1C.8 8.3 2.4 4.6 5.9 3.9c2.1-.4 4.1.5 5.3 2.1.3.4.9.4 1.2 0 1.2-1.6 3.2-2.5 5.3-2.1 3.5.7 5.1 4.4 3.5 7.6-2.2 4.4-9.2 9.1-9.2 9.1Z"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.2 14"/></svg>',
      play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 6.3v11.4l9.6-5.7-9.6-5.7Z"/></svg>',
      pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="6" width="3.5" height="12" rx="1"/><rect x="13.5" y="6" width="3.5" height="12" rx="1"/></svg>',
      volumeOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
      volumeMuted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    };
    return icons[name] || icons.sparkle;
  }

  function getGearIllustrationSvg(type) {
    const map = {
      mouse: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="mG" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stop-color="#ffdce9"/>
              <stop offset="100%" stop-color="#b85b83"/>
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="102" rx="22" ry="6" fill="rgba(0,0,0,0.2)"/>
          <rect x="37" y="18" width="46" height="80" rx="23" fill="url(#mG)" stroke="#fff0f6" stroke-width="2"/>
          <path d="M37 48h46" stroke="rgba(90,30,55,0.35)" stroke-width="1.5"/>
          <path d="M60 18v30" stroke="rgba(90,30,55,0.35)" stroke-width="1.5"/>
          <rect x="57" y="28" width="6" height="14" rx="3" fill="#fff5f9"/>
          <circle cx="60" cy="76" r="3.5" fill="#fff5f9" opacity="0.65"/>
        </svg>`,
      mousepad: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f7b7d2"/>
              <stop offset="55%" stop-color="#d46b9a"/>
              <stop offset="100%" stop-color="#7c3353"/>
            </linearGradient>
          </defs>
          <rect x="16" y="26" width="88" height="68" rx="10" fill="url(#pG)" stroke="#ffe5f1" stroke-width="2"/>
          <circle cx="46" cy="54" r="14" fill="#fff2f8" opacity="0.32"/>
          <path d="M34 74 Q60 54 88 68" stroke="#fff4f9" stroke-width="2" opacity="0.7" stroke-linecap="round"/>
          <circle cx="80" cy="44" r="3" fill="#fff7fb"/>
        </svg>`,
      keyboard: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <g transform="rotate(-6 60 60)">
            <rect x="12" y="34" width="43" height="50" rx="8" fill="#f7c8dc" stroke="#fff2f7" stroke-width="1.8"/>
            <rect x="65" y="34" width="43" height="50" rx="8" fill="#e99fc0" stroke="#fff2f7" stroke-width="1.8"/>
            <g fill="#6d2d4a" opacity="0.75">
              <rect x="19" y="42" width="8" height="7" rx="2"/><rect x="30" y="42" width="8" height="7" rx="2"/><rect x="41" y="42" width="8" height="7" rx="2"/>
              <rect x="19" y="53" width="8" height="7" rx="2"/><rect x="30" y="53" width="8" height="7" rx="2"/><rect x="41" y="53" width="8" height="7" rx="2"/>
              <rect x="26" y="65" width="21" height="7" rx="2"/>
              <rect x="72" y="42" width="8" height="7" rx="2"/><rect x="83" y="42" width="8" height="7" rx="2"/><rect x="94" y="42" width="8" height="7" rx="2"/>
              <rect x="72" y="53" width="8" height="7" rx="2"/><rect x="83" y="53" width="8" height="7" rx="2"/><rect x="94" y="53" width="8" height="7" rx="2"/>
              <rect x="72" y="65" width="21" height="7" rx="2"/>
            </g>
          </g>
        </svg>`,
      headset: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <path d="M26 64V56a34 34 0 0 1 68 0v8" stroke="#ffd8e9" stroke-width="6" stroke-linecap="round"/>
          <rect x="18" y="58" width="16" height="32" rx="8" fill="#df7ea9" stroke="#fff0f7" stroke-width="2"/>
          <rect x="86" y="58" width="16" height="32" rx="8" fill="#df7ea9" stroke="#fff0f7" stroke-width="2"/>
          <circle cx="26" cy="74" r="3" fill="#fff4f9"/>
          <circle cx="94" cy="74" r="3" fill="#fff4f9"/>
        </svg>`,
      tablet: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <rect x="16" y="28" width="88" height="62" rx="9" fill="#9c486e" stroke="#ffe1ef" stroke-width="2"/>
          <rect x="25" y="36" width="70" height="46" rx="4" fill="#ffd9ea" opacity="0.9"/>
          <path d="M36 68 Q56 44 82 54" stroke="#b34678" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M84 22 L96 34 L68 62 L58 64 L60 54 Z" fill="#fff4f9" stroke="#9c486e" stroke-width="1.5"/>
        </svg>`,
      mic: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <rect x="44" y="20" width="32" height="50" rx="16" fill="#f7b2d0" stroke="#fff2f8" stroke-width="2"/>
          <path d="M32 54a28 28 0 0 0 56 0" stroke="#ffdbe9" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="60" y1="82" x2="60" y2="98" stroke="#ffdbe9" stroke-width="4" stroke-linecap="round"/>
          <line x1="42" y1="98" x2="78" y2="98" stroke="#ffdbe9" stroke-width="4" stroke-linecap="round"/>
        </svg>`,
      palette: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <path d="M60 20a40 40 0 1 0 0 80c5 0 8-4 8-8 0-2-1-4-2-6s-2-4-2-6c0-4 3-7 7-7h11a18 18 0 0 0 18-18c0-20-18-35-40-35Z" fill="#f8bfd8" stroke="#fff4f9" stroke-width="2"/>
          <circle cx="44" cy="48" r="6" fill="#c94b85"/>
          <circle cx="66" cy="40" r="6" fill="#ffd591"/>
          <circle cx="82" cy="54" r="6" fill="#b485d9"/>
          <circle cx="42" cy="70" r="6" fill="#fff6fb"/>
        </svg>`,
      code: `
        <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <rect x="18" y="24" width="84" height="72" rx="12" fill="#70304d" stroke="#ffd6e8" stroke-width="2"/>
          <path d="M44 48 L30 60 L44 72" stroke="#ffd5e8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M76 48 L90 60 L76 72" stroke="#ffd5e8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="65" y1="42" x2="55" y2="78" stroke="#f7a6c8" stroke-width="3.5" stroke-linecap="round"/>
        </svg>`,
    };
    return map[type] || map.palette;
  }

  function getWorkCoverSvg(seed) {
    const palettes = [
      ["#4f2136", "#a84e75", "#ffd1e5"],
      ["#5e2845", "#c96c99", "#ffe7f2"],
      ["#462441", "#9b649c", "#f9d6f0"],
      ["#692c43", "#df7a99", "#ffe3ea"],
      ["#54273e", "#b5608a", "#ffdce9"],
    ];
    const p = palettes[Math.abs((seed || 1) - 1) % palettes.length];
    return `
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="wkG-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${p[0]}"/>
            <stop offset="56%" stop-color="${p[1]}"/>
            <stop offset="100%" stop-color="${p[2]}"/>
          </linearGradient>
        </defs>
        <rect width="400" height="180" fill="url(#wkG-${seed})"/>
        <circle cx="315" cy="54" r="54" fill="#fff5fa" opacity="0.18"/>
        <circle cx="90" cy="135" r="70" fill="#fff5fa" opacity="0.1"/>
        <path d="M20,145 Q130,65 250,120 T390,78" fill="none" stroke="#fff7fb" stroke-width="1.6" opacity="0.4"/>
      </svg>
    `;
  }

  function renderVisualMedia(imagePath, fallbackSvgHtml, altText) {
    if (imagePath) {
      return `<img src="${esc(imagePath)}" alt="${esc(altText)}" loading="lazy" data-fallback="true">`;
    }
    return fallbackSvgHtml;
  }

  function attachImageFallbacks(container) {
    container.querySelectorAll("img[data-fallback='true']").forEach((img) => {
      img.addEventListener("error", () => {
        const type = img.dataset.iconType || "palette";
        const kind = img.dataset.kind || "gear";
        const wrap = img.parentElement;
        if (!wrap) return;
        if (kind === "avatar") wrap.innerHTML = getDefaultAvatarSvg();
        else if (kind === "banner") wrap.innerHTML = getDefaultBannerSvg();
        else if (kind === "work") wrap.innerHTML = getWorkCoverSvg(Number(img.dataset.seed) || 1);
        else if (kind === "music") wrap.innerHTML = getSmallIconSvg("ytMusic");
        else wrap.innerHTML = getGearIllustrationSvg(type);
      }, { once: true });
    });
  }

  // --------------------------------------------------------------------------
  // State & Controllers Initialization
  // --------------------------------------------------------------------------

  let motionPaused = false;

  const initialHashTab = normalizeTab(window.location.hash.replace(/^#/, ""));
  let activeTab = initialHashTab || "home";
  let activeUseFilter = "Software";
  let activeWorkFilter = "All";
  let stage = "intro";
  let lastTriggerEl = null;
  let liveDiscordAvatarUrl = null;
  let lastAvatarFetchMs = 0;

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

  function renderAvatarMarkup(altText) {
    const src = resolveAvatarSrc();
    return src
      ? `<img src="${esc(src)}" alt="${esc(altText)}" data-fallback="true" data-kind="avatar" data-live-avatar="true">`
      : getDefaultAvatarSvg();
  }

  function applyLiveAvatarToDom(url) {
    if (!url || url === liveDiscordAvatarUrl) return;
    liveDiscordAvatarUrl = url;
    document.querySelectorAll("[data-avatar-slot]").forEach((slot) => {
      const existingImg = slot.querySelector("img[data-live-avatar='true']");
      if (existingImg) {
        if (existingImg.getAttribute("src") !== url) {
          existingImg.setAttribute("src", url);
        }
      } else {
        const alt = DATA.profile?.name || "Profile avatar";
        slot.innerHTML = `<img src="${esc(url)}" alt="${esc(alt)}" data-fallback="true" data-kind="avatar" data-live-avatar="true">`;
        attachImageFallbacks(slot);
      }
    });
  }

  function buildDiscordCdnUrl(id, avatarHash) {
    if (avatarHash) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "webp";
      return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.${ext}?size=256`;
    }
    try {
      const index = Number((BigInt(id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
      return "https://cdn.discordapp.com/embed/avatars/0.png";
    }
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

    try {
      const res = await fetch(`https://japi.rest/discord/v1/user/${rawId}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const user = json?.data;
        if (user) {
          applyLiveAvatarToDom(buildDiscordCdnUrl(rawId, user.avatar));
          return;
        }
      }
    } catch {
      // Fall back to Lanyard below
    }

    try {
      const res = await fetch(`https://api.lanyard.rest/v1/users/${rawId}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const user = json?.data?.discord_user;
        if (user) {
          applyLiveAvatarToDom(buildDiscordCdnUrl(rawId, user.avatar));
        }
      }
    } catch {
      // Keep fallback avatar silently when offline or unreachable
    }
  }

  const lotusScene = window.createLotusScene
    ? window.createLotusScene(document.getElementById("lotus-canvas"), {
        initialOpen: false,
        paused: motionPaused,
      })
    : null;

  const petalCursor = window.createPetalCursor
    ? window.createPetalCursor(document.getElementById("petal-cursor-canvas"), {
        paused: motionPaused,
      })
    : null;

  if (introCueEl && DATA.intro?.cue) {
    introCueEl.textContent = DATA.intro.cue;
  }
  if (introTrigger && DATA.intro?.lotusAriaLabel) {
    const greetPrefix = DATA.intro?.greeting ? `${DATA.intro.greeting} — ` : "";
    introTrigger.setAttribute("aria-label", `${greetPrefix}${DATA.intro.lotusAriaLabel}`);
  }
  syncDiscordAvatar(true);

  // Pre-decode banner on idle so opening the portfolio card never stutters on JPEG decode
  const bannerPreloadUrl = profileCfg.banner || profileCfg.bannerImage;
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

  // --------------------------------------------------------------------------
  // Interactive Cursor-Driven "Hello, im Ari" Greeting Motion
  // --------------------------------------------------------------------------

  const greetingChars = [];
  const greetingState = {
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

  function buildGreetingChars(text) {
    if (!introGreeting) return;
    const str = String(text ?? "Hello, im Ari");
    introGreeting.setAttribute("aria-label", str);
    introGreeting.textContent = "";
    greetingChars.length = 0;

    for (const ch of str) {
      if (/\s/.test(ch)) {
        const sp = document.createElement("span");
        sp.className = "greeting-space";
        sp.setAttribute("aria-hidden", "true");
        sp.innerHTML = "&nbsp;";
        introGreeting.appendChild(sp);
      } else {
        const span = document.createElement("span");
        span.className = "greeting-char";
        span.setAttribute("aria-hidden", "true");
        span.textContent = ch;
        introGreeting.appendChild(span);
        greetingChars.push({
          el: span,
          cx: 0,
          cy: 0,
          curX: 0,
          curY: 0,
          curS: 1,
          curR: 0,
        });
      }
    }
  }

  function measureGreetingChars() {
    greetingState.viewW = Math.max(1, window.innerWidth);
    greetingState.viewH = Math.max(1, window.innerHeight);
    if (!introGreeting) return;
    for (let i = 0; i < greetingChars.length; i++) {
      const item = greetingChars[i];
      const rect = item.el.getBoundingClientRect();
      item.cx = rect.left + rect.width * 0.5 - greetingState.curGx;
      item.cy = rect.top + rect.height * 0.5 - greetingState.curGy;
    }
  }

  function stepGreetingFrame(now) {
    greetingState.rafId = 0;
    if (!introGreeting) return;

    const dt = greetingState.lastTs ? Math.min(0.05, Math.max(0.001, (now - greetingState.lastTs) * 0.001)) : 0.016;
    greetingState.lastTs = now;
    const ease = 1 - Math.exp(-dt * 12);

    const interactive =
      greetingState.active && stage === "intro" && !motionPaused && !reducedMotionMQ.matches;

    let tgtGx = 0;
    let tgtGy = 0;
    let tgtRx = 0;
    let tgtRy = 0;

    if (interactive) {
      const normX = Math.max(-1, Math.min(1, (greetingState.px - greetingState.viewW * 0.5) / Math.max(1, greetingState.viewW * 0.5)));
      const normY = Math.max(-1, Math.min(1, (greetingState.py - greetingState.viewH * 0.5) / Math.max(1, greetingState.viewH * 0.5)));
      tgtGx = normX * 14;
      tgtGy = normY * 8;
      tgtRx = -normY * 7;
      tgtRy = normX * 9;
    }

    greetingState.curGx += (tgtGx - greetingState.curGx) * ease;
    greetingState.curGy += (tgtGy - greetingState.curGy) * ease;
    greetingState.curRx += (tgtRx - greetingState.curRx) * ease;
    greetingState.curRy += (tgtRy - greetingState.curRy) * ease;

    let maxDelta = Math.max(
      Math.abs(tgtGx - greetingState.curGx),
      Math.abs(tgtGy - greetingState.curGy),
      Math.abs(tgtRx - greetingState.curRx),
      Math.abs(tgtRy - greetingState.curRy)
    );

    introGreeting.style.setProperty("--gx", `${greetingState.curGx.toFixed(2)}px`);
    introGreeting.style.setProperty("--gy", `${greetingState.curGy.toFixed(2)}px`);
    introGreeting.style.setProperty("--rx", `${greetingState.curRx.toFixed(2)}deg`);
    introGreeting.style.setProperty("--ry", `${greetingState.curRy.toFixed(2)}deg`);

    const radius = 175;
    for (let i = 0; i < greetingChars.length; i++) {
      const item = greetingChars[i];
      let tgtCx = 0;
      let tgtCy = 0;
      let tgtCs = 1;
      let tgtCr = 0;

      if (interactive) {
        const dx = item.cx + greetingState.curGx - greetingState.px;
        const dy = item.cy + greetingState.curGy - greetingState.py;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
          const prox = Math.pow(1 - dist / radius, 1.55);
          tgtCx = dist > 1 ? (dx / dist) * prox * 6 : 0;
          tgtCy = -prox * 11;
          tgtCs = 1 + prox * 0.22;
          tgtCr = Math.max(-7, Math.min(7, (dx / radius) * -10 * prox));
        }
      }

      item.curX += (tgtCx - item.curX) * ease;
      item.curY += (tgtCy - item.curY) * ease;
      item.curS += (tgtCs - item.curS) * ease;
      item.curR += (tgtCr - item.curR) * ease;

      maxDelta = Math.max(
        maxDelta,
        Math.abs(tgtCx - item.curX),
        Math.abs(tgtCy - item.curY),
        Math.abs(tgtCs - item.curS) * 40,
        Math.abs(tgtCr - item.curR)
      );

      item.el.style.setProperty("--cx", `${item.curX.toFixed(2)}px`);
      item.el.style.setProperty("--cy", `${item.curY.toFixed(2)}px`);
      item.el.style.setProperty("--cs", item.curS.toFixed(3));
      item.el.style.setProperty("--cr", `${item.curR.toFixed(2)}deg`);
    }

    if (maxDelta > 0.015) {
      introGreeting.classList.add("is-interacting");
      greetingState.rafId = requestAnimationFrame(stepGreetingFrame);
    } else {
      introGreeting.classList.remove("is-interacting");
      greetingState.lastTs = 0;
    }
  }

  function wakeGreetingFrame() {
    if (!greetingState.rafId && !document.hidden && bodyEl.dataset.pageInactive !== "true") {
      greetingState.rafId = requestAnimationFrame(stepGreetingFrame);
    }
  }

  function resetGreetingCharsImmediate() {
    if (greetingState.rafId) {
      cancelAnimationFrame(greetingState.rafId);
      greetingState.rafId = 0;
    }
    greetingState.lastTs = 0;
    greetingState.active = false;
    greetingState.curGx = 0;
    greetingState.curGy = 0;
    greetingState.curRx = 0;
    greetingState.curRy = 0;
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
      item.el.style.setProperty("--cx", "0px");
      item.el.style.setProperty("--cy", "0px");
      item.el.style.setProperty("--cs", "1");
      item.el.style.setProperty("--cr", "0deg");
    }
  }

  function resetGreetingMotion() {
    greetingState.active = false;
    if (document.hidden || bodyEl.dataset.pageInactive === "true") {
      resetGreetingCharsImmediate();
    } else {
      wakeGreetingFrame();
    }
  }

  function setPageInactive(inactive) {
    if (inactive) {
      bodyEl.dataset.pageInactive = "true";
      resetGreetingCharsImmediate();
    } else if (!document.hidden) {
      delete bodyEl.dataset.pageInactive;
    }
    syncVitalsLifecycle();
    syncYtPolling();
  }

  document.addEventListener("visibilitychange", () => {
    setPageInactive(document.hidden);
    if (!document.hidden) syncDiscordAvatar(false);
  });
  window.addEventListener("blur", () => setPageInactive(true));
  window.addEventListener("focus", () => setPageInactive(false));
  window.addEventListener("pagehide", () => setPageInactive(true));
  window.addEventListener("pageshow", () => setPageInactive(false));

  if (introGreeting) {
    buildGreetingChars(DATA.intro?.greeting ?? "Hello, im Ari");
    measureGreetingChars();
    document.fonts?.ready?.then(() => {
      measureGreetingChars();
    });
    window.addEventListener("resize", measureGreetingChars, { passive: true });
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch" || stage !== "intro" || motionPaused || reducedMotionMQ.matches) return;
        if (bodyEl.dataset.pageInactive === "true" && !document.hidden) {
          delete bodyEl.dataset.pageInactive;
        }
        if (document.hidden) return;
        greetingState.px = e.clientX;
        greetingState.py = e.clientY;
        greetingState.active = true;
        wakeGreetingFrame();
      },
      { passive: true }
    );
    window.addEventListener("pointerleave", resetGreetingMotion, { passive: true });
    reducedMotionMQ.addEventListener("change", resetGreetingMotion);
  }

  // --------------------------------------------------------------------------
  // Motion Toggle
  // --------------------------------------------------------------------------

  function syncMotionUi() {
    htmlEl.dataset.motion = motionPaused ? "paused" : "running";
    if (btnMotionToggle && motionLabel) {
      const label = motionPaused ? "Play motion" : "Pause motion";
      motionLabel.textContent = label;
      btnMotionToggle.setAttribute("aria-label", label);
    }
    lotusScene?.setPaused(motionPaused);
    petalCursor?.setPaused(motionPaused);
    if (motionPaused) resetGreetingMotion();
  }

  btnMotionToggle?.addEventListener("click", () => {
    motionPaused = !motionPaused;
    syncMotionUi();
  });

  // --------------------------------------------------------------------------
  // View Rendering
  // --------------------------------------------------------------------------

  function getToolMonogramHtml(badge, accent) {
    const styleAttr = accent ? ` style="--badge-accent:${esc(accent)}"` : "";
    return `<div class="tool-monogram-badge"${styleAttr} aria-hidden="true"><span>${esc(badge)}</span></div>`;
  }

  function renderUseCardHtml(item) {
    const title = item.title || item.name || "";
    const subtitle = item.subtitle || item.category || "";
    const tag = item.tag || item.brand || "";
    const visualHtml = item.image
      ? `<img src="${esc(item.image)}" alt="${esc(title)}" loading="lazy" data-fallback="true" data-kind="gear" data-icon-type="${esc(item.iconType || "palette")}">`
      : item.badge
        ? getToolMonogramHtml(item.badge, item.accent)
        : getGearIllustrationSvg(item.iconType);

    return `
      <button class="use-card" type="button" data-use-id="${esc(item.id)}">
        <div class="use-card-top">
          <span>${esc(item.status || "in use")}</span>
        </div>
        <div class="use-card-visual">${visualHtml}</div>
        <div class="use-card-meta">
          ${subtitle ? `<span class="use-card-cat">${getSmallIconSvg(item.iconType || "sparkle")} ${esc(subtitle)}</span>` : ""}
          ${tag ? `<span class="use-card-brand">${esc(tag)}</span>` : ""}
          <span class="use-card-name">${esc(title)}</span>
        </div>
      </button>
    `;
  }

  function renderPlaceholderToolCardHtml(groupLabel, emptyText) {
    return `
      <div class="use-card placeholder-widget-card" aria-label="${esc(groupLabel)} ${esc(emptyText)}">
        <div class="use-card-top">
          <span>${esc(groupLabel.toLowerCase())}</span>
        </div>
        <div class="use-card-visual">
          <div class="placeholder-slot-icon" aria-hidden="true">${getSmallIconSvg("sparkle")}</div>
        </div>
        <div class="use-card-meta">
          <span class="use-card-cat">${esc(groupLabel.toLowerCase())}</span>
          <span class="use-card-name placeholder-title">${esc(emptyText)}</span>
        </div>
      </div>
    `;
  }

  function renderWorkCardHtml(work) {
    const summary = work.description || work.summary || "";
    const coverHtml = work.image
      ? `<img src="${esc(work.image)}" alt="${esc(work.title)}" loading="lazy" data-fallback="true" data-kind="work" data-seed="${esc(work.gradientSeed || 1)}">`
      : getWorkCoverSvg(work.gradientSeed || 1);

    return `
      <button class="work-card" type="button" data-work-id="${esc(work.id)}">
        <div class="work-cover">${coverHtml}</div>
        <div class="work-body">
          <div class="work-top">
            <span class="work-cat-pill">${esc(work.category || "work")}</span>
            <span>${esc(work.year || "")}${work.status ? ` · ${esc(work.status)}` : ""}</span>
          </div>
          <h3 class="work-title">${esc(work.title)}</h3>
          <p class="work-summary">${esc(summary)}</p>
          <div class="work-tags">
            ${(work.tags || []).map((t) => `<span class="work-tag">${esc(t)}</span>`).join("")}
          </div>
        </div>
      </button>
    `;
  }

  function renderPlaceholderWorkCardHtml(emptyText) {
    return `
      <div class="work-card placeholder-widget-card" aria-label="Works ${esc(emptyText)}">
        <div class="work-cover placeholder-work-cover" aria-hidden="true">
          <div class="placeholder-slot-icon">${getSmallIconSvg("sparkle")}</div>
        </div>
        <div class="work-body">
          <div class="work-top">
            <span class="work-cat-pill">works</span>
            <span>soon</span>
          </div>
          <h3 class="work-title placeholder-title">${esc(emptyText)}</h3>
        </div>
      </div>
    `;
  }

  function splitDisplayName(p) {
    const rawName = String(p.name || "Your Name").trim();
    const rawSub = String(p.subName || "").trim();
    if (rawSub) return { main: rawName, sub: rawSub };
    const m = rawName.match(/^(.*?)\s*(\([^)]+\))$/);
    if (m) return { main: m[1].trim(), sub: m[2].trim() };
    return { main: rawName, sub: "" };
  }

  function renderHeroCardHtml() {
    const p = DATA.profile || {};
    const bannerSrc = p.banner || p.bannerImage;
    const bannerHtml = bannerSrc
      ? `<img src="${esc(bannerSrc)}" alt="Profile banner" data-fallback="true" data-kind="banner">`
      : getDefaultBannerSvg();
    const avatarHtml = renderAvatarMarkup(p.name || "Profile avatar");

    const { main: nameMain, sub: nameSub } = splitDisplayName(p);
    const tagValue = p.tag || p.handle;
    const descValue = p.description ?? p.bio ?? "";
    const contactLabel = p.contactButtonLabel || p.primaryAction?.label || "contact";
    const targetTab = normalizeTab(p.primaryAction?.targetTab || "contact") || "contact";

    const metaParts = [tagValue, p.location, p.pronouns, p.joined].filter(Boolean);
    const socialsHtml = (p.socials || [])
      .map((s) => {
        const href = safeUrl(s.url);
        const ext = isExternalUrl(href);
        const tab = href.startsWith("#") ? normalizeTab(href.slice(1)) : null;
        const tabAttr = tab ? ` data-nav-tab="${esc(tab)}"` : "";
        return `<a class="social-icon-btn" href="${esc(href)}" aria-label="${esc(s.label)}"${tabAttr}${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${getSmallIconSvg(s.icon)}</a>`;
      })
      .join("");

    const primaryActionHtml = contactLabel
      ? `<button class="hero-primary-btn" type="button" data-nav-tab="${esc(targetTab)}">${getSmallIconSvg("card")}<span>${esc(contactLabel)}</span>${getSmallIconSvg("arrowRight")}</button>`
      : "";

    const statsHtml =
      Array.isArray(p.stats) && p.stats.length > 0
        ? `<div class="hero-stats">${p.stats
            .map(
              (st) => `
              <div class="hero-stat">
                <span class="hero-stat-val">${esc(st.value)}</span>
                <span class="hero-stat-lbl">${esc(st.label)}</span>
              </div>`
            )
            .join("")}</div>`
        : "";

    const sakura = DATA.decorations?.sakuraAccents !== false;

    return `
      <div class="hero-wrap">
        ${sakura ? getSakuraClusterSvg("sakura-deco-tl") : ""}
        ${sakura ? getSakuraClusterSvg("sakura-deco-br") : ""}
        <section class="hero-card" aria-labelledby="view-heading">
          <div class="hero-banner">${bannerHtml}</div>
          <div class="hero-body">
            <div class="hero-top-row">
              <div class="hero-identity">
                <div class="hero-avatar-frame" data-avatar-slot="hero">${avatarHtml}</div>
                <div class="hero-name-block">
                  <h1 id="view-heading" class="hero-name" tabindex="-1">
                    <span class="hero-name-main">${esc(nameMain)}${p.sparkle ? ` <span class="hero-sparkle" aria-hidden="true">${esc(p.sparkle)}</span>` : ""}</span>
                    ${nameSub ? `<span class="hero-name-sub">${esc(nameSub)}</span>` : ""}
                  </h1>
                  ${metaParts.length ? `<p class="hero-meta">${metaParts.map((m) => `<span>${esc(m)}</span>`).join('<span aria-hidden="true">·</span>')}</p>` : ""}
                </div>
              </div>
              ${
                socialsHtml || primaryActionHtml
                  ? `<div class="hero-actions">
                      ${socialsHtml}
                      ${primaryActionHtml}
                    </div>`
                  : ""
              }
            </div>
            <div class="hero-bottom-row">
              <p class="hero-bio">${esc(descValue)}</p>
              ${statsHtml}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Home Side-by-Side Widgets (YouTube Music Player + Live Pulsoid Vitals)
  // --------------------------------------------------------------------------

  const vitalsCfg = DATA.vitals || DATA.homeWidgets?.heartRate || {};
  const vitalsTz = vitalsCfg.timezone || "Asia/Ho_Chi_Minh";
  const vitalsOfflineMs = Number(vitalsCfg.offlineTimeoutMs) || 15000;
  const vitalsOfflineNote = vitalsCfg.offlineNote || "monitor not on right now";
  let timeFormatter = null;
  try {
    timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: vitalsTz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    timeFormatter = new Intl.DateTimeFormat("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatLocalTimeStr() {
    try {
      return timeFormatter.format(new Date());
    } catch {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    }
  }

  function formatClockSec(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function extractYouTubeId(rawUrl) {
    const val = String(rawUrl || "").trim();
    if (!val) return "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
    try {
      const u = new URL(val);
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.replace(/^\//, "").slice(0, 11);
      }
      const vParam = u.searchParams.get("v");
      if (vParam) return vParam.slice(0, 11);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].slice(0, 11);
    } catch {
      return "";
    }
    return "";
  }

  function parseStartAtSeconds(rawVal) {
    if (typeof rawVal === "number" && Number.isFinite(rawVal)) {
      return Math.max(0, Math.floor(rawVal));
    }
    const str = String(rawVal || "").trim();
    if (!str) return 0;
    if (/^\d+$/.test(str)) return Math.max(0, parseInt(str, 10));
    const parts = str.split(":").map((n) => parseInt(n, 10));
    if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function getMusicConfig() {
    const raw = DATA.music || DATA.homeWidgets?.favoriteSong;
    if (!raw) return null;
    const url = raw.youtubeUrl || raw.url || "";
    const videoId = raw.videoId || extractYouTubeId(url);
    const cover =
      raw.coverImage ||
      raw.thumbnail ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
    const openUrl =
      raw.musicUrl ||
      (videoId ? `https://music.youtube.com/watch?v=${videoId}` : url);
    const startAtSec = parseStartAtSeconds(raw.startAt);
    const defaultVolRaw = raw.defaultVolume ?? 50;
    const defaultVolume = Math.max(0, Math.min(100, Number.isFinite(Number(defaultVolRaw)) ? Math.round(Number(defaultVolRaw)) : 50));
    return {
      heading: raw.heading || "favourite song right now",
      videoId,
      startAtSec,
      defaultVolume,
      title: raw.title || "",
      artist: raw.artist || "",
      album: raw.album || "",
      cover,
      openUrl,
    };
  }

  const initialMusicCfg = getMusicConfig();
  const ytCtrl = {
    apiRequested: false,
    player: null,
    videoId: initialMusicCfg?.videoId || "",
    startAtSec: initialMusicCfg?.startAtSec || 0,
    appliedInitialStart: false,
    hasStarted: false,
    miniDismissed: false,
    ready: false,
    playing: false,
    pendingPlay: false,
    seeking: false,
    duration: 0,
    currentTime: initialMusicCfg?.startAtSec || 0,
    volume: initialMusicCfg?.defaultVolume ?? 50,
    muted: false,
    pollTimer: 0,
  };

  function setRangeFill(inputEl, pct) {
    if (!inputEl) return;
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    inputEl.style.setProperty("--pct", `${clamped.toFixed(2)}%`);
  }

  function syncMiniPlayerDom() {
    const miniEl = document.getElementById("mini-player");
    const miniBtn = document.getElementById("mini-player-toggle");
    const miniTitle = document.getElementById("mini-player-open-home");
    const eqBars = miniEl?.querySelector(".eq-bars");
    if (!miniEl) return;

    const showMini =
      stage === "open" &&
      activeTab !== "home" &&
      ytCtrl.hasStarted &&
      !ytCtrl.miniDismissed;

    miniEl.hidden = !showMini;
    if (!showMini) return;

    const music = getMusicConfig();
    if (miniBtn) {
      miniBtn.innerHTML = ytCtrl.playing ? getSmallIconSvg("pause") : getSmallIconSvg("play");
      miniBtn.setAttribute("aria-label", ytCtrl.playing ? "Pause song" : "Play song");
    }
    if (eqBars) {
      eqBars.classList.toggle("is-active", ytCtrl.playing);
    }
    if (miniTitle && music) {
      miniTitle.textContent = music.title || "Favourite song";
    }
  }

  function syncYtControlsDom() {
    const btnPlay = document.getElementById("btn-yt-play");
    const seekEl = document.getElementById("yt-seek");
    const curEl = document.getElementById("yt-cur-time");
    const durEl = document.getElementById("yt-dur-time");
    const btnMute = document.getElementById("btn-yt-mute");
    const volEl = document.getElementById("yt-volume");
    const widgetEq = document.getElementById("yt-widget-eq");

    if (btnPlay) {
      btnPlay.innerHTML = ytCtrl.playing ? getSmallIconSvg("pause") : getSmallIconSvg("play");
      btnPlay.setAttribute("aria-label", ytCtrl.playing ? "Pause song" : "Play song");
      btnPlay.classList.toggle("is-playing", ytCtrl.playing);
    }
    if (widgetEq) {
      widgetEq.classList.toggle("is-active", ytCtrl.playing);
    }

    if (curEl && !ytCtrl.seeking) {
      curEl.textContent = formatClockSec(ytCtrl.currentTime);
    }
    if (durEl) {
      durEl.textContent = ytCtrl.duration > 0 ? formatClockSec(ytCtrl.duration) : "--:--";
    }
    if (seekEl && !ytCtrl.seeking) {
      const ratio = ytCtrl.duration > 0 ? Math.min(1, ytCtrl.currentTime / ytCtrl.duration) : 0;
      seekEl.value = String(Math.round(ratio * 1000));
      setRangeFill(seekEl, ratio * 100);
    }
    if (btnMute) {
      const effectivelyMuted = ytCtrl.muted || ytCtrl.volume === 0;
      btnMute.innerHTML = effectivelyMuted ? getSmallIconSvg("volumeMuted") : getSmallIconSvg("volumeOn");
      btnMute.setAttribute("aria-label", effectivelyMuted ? "Unmute" : "Mute");
    }
    if (volEl) {
      const displayVol = ytCtrl.muted ? 0 : ytCtrl.volume;
      volEl.value = String(displayVol);
      setRangeFill(volEl, displayVol);
    }
    syncMiniPlayerDom();
  }

  function toggleYtPlayback() {
    ensureYtPlayerLoaded();
    if (!ytCtrl.ready || !ytCtrl.player) {
      ytCtrl.pendingPlay = !ytCtrl.pendingPlay;
      return;
    }
    try {
      if (ytCtrl.playing) ytCtrl.player.pauseVideo();
      else {
        if (!ytCtrl.appliedInitialStart && ytCtrl.startAtSec > 0) {
          ytCtrl.appliedInitialStart = true;
          ytCtrl.player.seekTo(ytCtrl.startAtSec, true);
        }
        ytCtrl.player.playVideo();
      }
    } catch {
      // Ignore transient YT state errors
    }
  }

  function syncYtPolling() {
    const shouldPoll =
      ytCtrl.playing &&
      stage === "open" &&
      activeTab === "home" &&
      !document.hidden &&
      bodyEl.dataset.pageInactive !== "true";

    if (!shouldPoll) {
      clearInterval(ytCtrl.pollTimer);
      ytCtrl.pollTimer = 0;
      return;
    }

    if (!ytCtrl.pollTimer) {
      ytCtrl.pollTimer = setInterval(() => {
        if (!ytCtrl.ready || !ytCtrl.player || ytCtrl.seeking) return;
        try {
          const cur = Number(ytCtrl.player.getCurrentTime?.() || 0);
          const dur = Number(ytCtrl.player.getDuration?.() || 0);
          if (dur > 0) ytCtrl.duration = dur;
          ytCtrl.currentTime = cur;
          syncYtControlsDom();
        } catch {
          // Ignore transient YT API read issues
        }
      }, 450);
    }
  }

  function createYtPlayerInstance() {
    const music = getMusicConfig();
    if (!music?.videoId || ytCtrl.player || !window.YT?.Player) return;
    if (!document.getElementById("yt-audio-player")) return;

    ytCtrl.videoId = music.videoId;
    const playerVars = {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
    };
    if (ytCtrl.startAtSec > 0) {
      playerVars.start = ytCtrl.startAtSec;
    }
    if (window.location.protocol.startsWith("http")) {
      playerVars.origin = window.location.origin;
    }

    try {
      ytCtrl.player = new window.YT.Player("yt-audio-player", {
        width: 200,
        height: 113,
        videoId: music.videoId,
        playerVars,
        events: {
          onReady: (e) => {
            ytCtrl.ready = true;
            try {
              e.target.setVolume(ytCtrl.volume);
              if (ytCtrl.muted) e.target.mute();
              const dur = Number(e.target.getDuration?.() || 0);
              if (dur > 0) ytCtrl.duration = dur;
              if (ytCtrl.pendingPlay) {
                ytCtrl.pendingPlay = false;
                if (ytCtrl.startAtSec > 0 && !ytCtrl.appliedInitialStart) {
                  ytCtrl.appliedInitialStart = true;
                  e.target.seekTo(ytCtrl.startAtSec, true);
                }
                e.target.playVideo();
              }
            } catch {
              // Ignore
            }
            syncYtControlsDom();
            syncYtPolling();
          },
          onStateChange: (e) => {
            const st = window.YT?.PlayerState;
            if (!st) return;
            if (e.data === st.PLAYING) {
              ytCtrl.playing = true;
              ytCtrl.hasStarted = true;
              ytCtrl.miniDismissed = false;
              const dur = Number(ytCtrl.player?.getDuration?.() || 0);
              if (dur > 0) ytCtrl.duration = dur;
              if (!ytCtrl.appliedInitialStart && ytCtrl.startAtSec > 0) {
                ytCtrl.appliedInitialStart = true;
                const cur = Number(ytCtrl.player?.getCurrentTime?.() || 0);
                if (cur < ytCtrl.startAtSec - 2) {
                  try {
                    ytCtrl.player.seekTo(ytCtrl.startAtSec, true);
                    ytCtrl.currentTime = ytCtrl.startAtSec;
                  } catch {
                    // Ignore
                  }
                }
              }
            } else if (e.data === st.PAUSED) {
              ytCtrl.playing = false;
            } else if (e.data === st.ENDED) {
              ytCtrl.appliedInitialStart = true;
              ytCtrl.currentTime = 0;
              try {
                ytCtrl.player?.seekTo?.(0, true);
                ytCtrl.player?.playVideo?.();
              } catch {
                ytCtrl.playing = false;
              }
            }
            syncYtControlsDom();
            syncYtPolling();
          },
          onError: () => {
            ytCtrl.playing = false;
            ytCtrl.pendingPlay = false;
            syncYtControlsDom();
            syncYtPolling();
          },
        },
      });
    } catch {
      ytCtrl.player = null;
    }
  }

  function ensureYtPlayerLoaded() {
    if (ytCtrl.player) return;
    if (window.YT?.Player) {
      createYtPlayerInstance();
      return;
    }
    if (ytCtrl.apiRequested) return;
    ytCtrl.apiRequested = true;

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") {
        try {
          prevReady();
        } catch {
          // Ignore
        }
      }
      createYtPlayerInstance();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  }

  const vitalsState = {
    ws: null,
    tickTimer: 0,
    reconnectTimer: 0,
    connectTimeoutTimer: 0,
    isConnecting: false,
    bpm: null,
    lastHeartbeatMs: 0,
    lastSessionDataMs: 0,
    statusText: vitalsOfflineNote,
  };

  function isVitalsNeeded() {
    return (
      stage === "open" &&
      activeTab === "home" &&
      !document.hidden &&
      bodyEl.dataset.pageInactive !== "true"
    );
  }

  function updateVitalsDom() {
    const widgetEl = document.getElementById("vitals-widget");
    const bpmEl = document.getElementById("vitals-bpm");
    const subEl = document.getElementById("vitals-hr-sub");
    const timeEl = document.getElementById("vitals-time");
    if (timeEl) {
      timeEl.textContent = formatLocalTimeStr();
    }
    if (!widgetEl || !bpmEl || !subEl) return;

    const now = Date.now();
    const isStale = vitalsState.lastHeartbeatMs === 0 || now - vitalsState.lastHeartbeatMs > vitalsOfflineMs;
    const isLive = !isStale && typeof vitalsState.bpm === "number" && vitalsState.bpm > 0;

    widgetEl.classList.toggle("is-live", isLive);
    if (isLive) {
      bpmEl.textContent = String(vitalsState.bpm);
      const beatSec = Math.max(0.38, Math.min(1.5, 60 / vitalsState.bpm)).toFixed(2);
      widgetEl.style.setProperty("--beat-dur", `${beatSec}s`);
      subEl.textContent = "live";
    } else {
      bpmEl.textContent = "--";
      widgetEl.style.removeProperty("--beat-dur");
      subEl.textContent = vitalsOfflineNote;
    }
  }

  function closePulsoidSocket() {
    clearTimeout(vitalsState.reconnectTimer);
    vitalsState.reconnectTimer = 0;
    clearTimeout(vitalsState.connectTimeoutTimer);
    vitalsState.connectTimeoutTimer = 0;
    vitalsState.isConnecting = false;
    if (vitalsState.ws) {
      const sock = vitalsState.ws;
      vitalsState.ws = null;
      sock.onopen = null;
      sock.onmessage = null;
      sock.onclose = null;
      sock.onerror = null;
      try {
        sock.close();
      } catch {
        // Ignore close errors
      }
    }
  }

  function schedulePulsoidReconnect(delayMs = 4000) {
    if (vitalsState.reconnectTimer || !isVitalsNeeded()) return;
    vitalsState.reconnectTimer = setTimeout(() => {
      vitalsState.reconnectTimer = 0;
      connectPulsoidSocket();
    }, delayMs);
  }

  function connectPulsoidSocket() {
    const wsUrl = resolveWorkerWs("/pulsoid") || vitalsCfg.pulsoidWsUrl;
    if (!wsUrl || !isVitalsNeeded() || vitalsState.isConnecting) return;
    if (vitalsState.ws && (vitalsState.ws.readyState === WebSocket.OPEN || vitalsState.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    closePulsoidSocket();
    vitalsState.isConnecting = true;
    vitalsState.lastSessionDataMs = Date.now();

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      vitalsState.ws = ws;
    } catch {
      vitalsState.isConnecting = false;
      vitalsState.statusText = vitalsOfflineNote;
      updateVitalsDom();
      schedulePulsoidReconnect(4500);
      return;
    }

    vitalsState.connectTimeoutTimer = setTimeout(() => {
      if (vitalsState.ws === ws && ws.readyState !== WebSocket.OPEN) {
        closePulsoidSocket();
        vitalsState.statusText = vitalsOfflineNote;
        updateVitalsDom();
        schedulePulsoidReconnect(3500);
      }
    }, 10000);

    ws.onopen = () => {
      if (vitalsState.ws !== ws) return;
      clearTimeout(vitalsState.connectTimeoutTimer);
      vitalsState.connectTimeoutTimer = 0;
      vitalsState.isConnecting = false;
      vitalsState.lastSessionDataMs = Date.now();
    };

    ws.onmessage = (event) => {
      if (vitalsState.ws !== ws) return;
      try {
        const parsed = JSON.parse(String(event.data || ""));
        const rawHr =
          parsed?.data?.heartRate ??
          parsed?.data?.heart_rate ??
          parsed?.heartRate ??
          parsed?.heart_rate ??
          parsed?.bpm;
        if (rawHr !== undefined) {
          const bpm = parseInt(rawHr, 10);
          const now = Date.now();
          vitalsState.lastSessionDataMs = now;
          if (!Number.isNaN(bpm) && bpm > 0) {
            vitalsState.bpm = bpm;
            vitalsState.lastHeartbeatMs = now;
            vitalsState.statusText = "live";
          } else if (bpm === 0) {
            vitalsState.bpm = null;
            vitalsState.lastHeartbeatMs = 0;
            vitalsState.statusText = vitalsOfflineNote;
          }
          updateVitalsDom();
        }
      } catch {
        // Ignore malformed WebSocket payloads
      }
    };

    ws.onclose = () => {
      if (vitalsState.ws !== ws) return;
      vitalsState.ws = null;
      vitalsState.isConnecting = false;
      clearTimeout(vitalsState.connectTimeoutTimer);
      vitalsState.connectTimeoutTimer = 0;
      if (vitalsState.lastHeartbeatMs === 0 || Date.now() - vitalsState.lastHeartbeatMs > vitalsOfflineMs) {
        vitalsState.statusText = vitalsOfflineNote;
        updateVitalsDom();
      }
      schedulePulsoidReconnect(4000);
    };

    ws.onerror = () => {
      if (vitalsState.ws !== ws) return;
      try {
        ws.close();
      } catch {
        // Ignore
      }
    };
  }

  function syncVitalsLifecycle() {
    if (!isVitalsNeeded()) {
      clearInterval(vitalsState.tickTimer);
      vitalsState.tickTimer = 0;
      closePulsoidSocket();
      return;
    }

    updateVitalsDom();
    if (!vitalsState.tickTimer) {
      vitalsState.tickTimer = setInterval(() => {
        if (!isVitalsNeeded()) {
          syncVitalsLifecycle();
          return;
        }
        const now = Date.now();
        if (vitalsState.lastHeartbeatMs > 0 && now - vitalsState.lastHeartbeatMs > vitalsOfflineMs) {
          vitalsState.bpm = null;
          vitalsState.statusText = vitalsOfflineNote;
        }
        if (
          vitalsState.ws &&
          vitalsState.ws.readyState === WebSocket.OPEN &&
          !vitalsState.isConnecting &&
          !vitalsState.reconnectTimer &&
          now - vitalsState.lastSessionDataMs > 30000
        ) {
          vitalsState.lastSessionDataMs = now;
          connectPulsoidSocket();
        }
        updateVitalsDom();
      }, 1000);
    }
    connectPulsoidSocket();
  }

  function renderHomeWidgetsHtml() {
    const song = getMusicConfig();
    const hr = DATA.vitals || DATA.homeWidgets?.heartRate;
    if (!song && !hr) return "";

    const songHref = safeUrl(song?.openUrl || "#");
    const ext = isExternalUrl(songHref);
    const thumbHtml = song?.cover
      ? `<img src="${esc(song.cover)}" alt="${esc(song.title || "Favourite song")}" data-fallback="true" data-kind="music">`
      : getSmallIconSvg("ytMusic");

    const now = Date.now();
    const isLive =
      vitalsState.lastHeartbeatMs > 0 &&
      now - vitalsState.lastHeartbeatMs <= vitalsOfflineMs &&
      typeof vitalsState.bpm === "number" &&
      vitalsState.bpm > 0;
    const bpmVal = isLive ? String(vitalsState.bpm) : "--";
    const hrSub = isLive ? "live" : vitalsOfflineNote;
    const beatStyle = isLive
      ? ` style="--beat-dur:${Math.max(0.38, Math.min(1.5, 60 / vitalsState.bpm)).toFixed(2)}s"`
      : "";

    const volVal = ytCtrl.muted ? 0 : ytCtrl.volume;

    return `
      <section class="home-widgets-row" aria-label="Status widgets">
        ${
          song
            ? `<div class="widget-card yt-music-widget">
                <div class="widget-eyebrow-row">
                  <span class="widget-eyebrow-label">${getSmallIconSvg("ytMusic")}<span>${esc(song.heading)}</span><span id="yt-widget-eq" class="eq-bars${ytCtrl.playing ? " is-active" : ""}" aria-hidden="true"><i></i><i></i><i></i></span></span>
                  <a class="widget-ext-link" href="${esc(songHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="Open in YouTube Music">↗</a>
                </div>
                <div class="yt-music-row">
                  <a class="yt-thumb-wrap" href="${esc(songHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} tabindex="-1" aria-hidden="true">${thumbHtml}</a>
                  <div class="yt-meta">
                    <a class="yt-title" href="${esc(songHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} title="${esc(song.title)}">${esc(song.title)}</a>
                    <span class="yt-artist">${esc(song.artist)}${song.album ? ` · ${esc(song.album)}` : ""}</span>
                  </div>
                  ${
                    song.videoId
                      ? `<button id="btn-yt-play" class="yt-play-btn${ytCtrl.playing ? " is-playing" : ""}" type="button" aria-label="${ytCtrl.playing ? "Pause song" : "Play song"}">${ytCtrl.playing ? getSmallIconSvg("pause") : getSmallIconSvg("play")}</button>`
                      : ""
                  }
                </div>
                ${
                  song.videoId
                    ? `<div class="yt-controls-bar">
                        <span id="yt-cur-time" class="yt-time">${esc(formatClockSec(ytCtrl.currentTime))}</span>
                        <input id="yt-seek" class="yt-range yt-seek" type="range" min="0" max="1000" value="0" style="--pct:0%" aria-label="Seek track">
                        <span id="yt-dur-time" class="yt-time">${esc(ytCtrl.duration > 0 ? formatClockSec(ytCtrl.duration) : "--:--")}</span>
                        <div class="yt-vol-wrap">
                          <button id="btn-yt-mute" class="yt-mute-btn" type="button" aria-label="${volVal === 0 ? "Unmute" : "Mute"}">${volVal === 0 ? getSmallIconSvg("volumeMuted") : getSmallIconSvg("volumeOn")}</button>
                          <input id="yt-volume" class="yt-range yt-volume" type="range" min="0" max="100" value="${volVal}" style="--pct:${volVal}%" aria-label="Volume">
                        </div>
                      </div>`
                    : ""
                }
              </div>`
            : ""
        }
        ${
          hr
            ? `<div id="vitals-widget" class="widget-card vitals-widget${isLive ? " is-live" : ""}"${beatStyle}>
                <div class="widget-eyebrow-row">
                  <span class="widget-eyebrow-label"><span class="vitals-dot" aria-hidden="true"></span><span>${esc(hr.heading || "live vitals")}</span></span>
                  <span class="vitals-tz-pill">${esc(hr.timezoneLabel || "UTC+7")}</span>
                </div>
                <div class="vitals-metrics">
                  <div class="vitals-block">
                    <span class="vitals-heart-icon" aria-hidden="true">${getSmallIconSvg("heart")}</span>
                    <div class="vitals-text">
                      <div class="vitals-num-line"><span id="vitals-bpm" class="vitals-val">${esc(bpmVal)}</span><span class="vitals-unit">bpm</span></div>
                      <div id="vitals-hr-sub" class="vitals-sub">${esc(hrSub)}</div>
                    </div>
                  </div>
                  <div class="vitals-divider" aria-hidden="true"></div>
                  <div class="vitals-block">
                    <span class="vitals-clock-icon" aria-hidden="true">${getSmallIconSvg("clock")}</span>
                    <div class="vitals-text">
                      <div class="vitals-num-line"><span id="vitals-time" class="vitals-val">${esc(formatLocalTimeStr())}</span></div>
                      <div class="vitals-sub">local time</div>
                    </div>
                  </div>
                </div>
              </div>`
            : ""
        }
      </section>
    `;
  }

  function renderHomeView() {
    return `
      <div class="portfolio-view-inner portfolio-view-home">
        ${renderHeroCardHtml()}
        ${renderHomeWidgetsHtml()}
      </div>
    `;
  }

  function getToolsGroupItems(group) {
    if (DATA.tools && Array.isArray(DATA.tools[group.toLowerCase()])) {
      return DATA.tools[group.toLowerCase()];
    }
    return (DATA.activeUses || []).filter((i) => i.filterGroup === group);
  }

  function renderToolsView() {
    const groups = ["Software", "Peripherals"];
    const activeFilter = groups.includes(activeUseFilter) ? activeUseFilter : "Software";
    const filtered = getToolsGroupItems(activeFilter);
    const emptyText = DATA.tools?.emptyText || "to be updated";
    const heading = DATA.tools?.heading || DATA.activeUsesSection?.heading || "Tools & Setup";
    const subtitle =
      DATA.tools?.subtitle || "Creative apps, coding tools, and setup essentials. Click any card for details.";

    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">${esc(heading)}</h1>
          <p class="section-subtitle">${esc(subtitle)}</p>
        </div>

        <div class="filter-pills" role="group" aria-label="Filter tools by category">
          ${groups
            .map(
              (grp) => `<button class="filter-pill" type="button" data-use-filter="${esc(grp)}" aria-pressed="${grp === activeFilter ? "true" : "false"}">${esc(grp)}</button>`
            )
            .join("")}
        </div>

        <div class="uses-grid${filtered.length === 0 ? " uses-grid-empty" : ""}">
          ${
            filtered.length > 0
              ? filtered.map(renderUseCardHtml).join("")
              : renderPlaceholderToolCardHtml(activeFilter, emptyText)
          }
        </div>
      </div>
    `;
  }

  function getWorksList() {
    if (Array.isArray(DATA.works)) return DATA.works;
    if (Array.isArray(DATA.works?.items)) return DATA.works.items;
    return [];
  }

  function renderWorksView() {
    const worksCfg = Array.isArray(DATA.works) ? {} : (DATA.works || {});
    const heading = worksCfg.heading || DATA.worksSection?.heading || "Works";
    const subtitle = worksCfg.subtitle ?? DATA.worksSection?.subtitle ?? "";
    const emptyText = worksCfg.emptyText || "to be updated";
    const works = getWorksList();

    if (works.length === 0) {
      return `
        <div class="portfolio-view-inner">
          <div class="section-head-centered">
            <h1 id="view-heading" class="section-title" tabindex="-1">${esc(heading)}</h1>
            ${subtitle ? `<p class="section-subtitle">${esc(subtitle)}</p>` : ""}
          </div>
          <div class="works-grid works-grid-empty">
            ${renderPlaceholderWorkCardHtml(emptyText)}
          </div>
        </div>
      `;
    }

    const cats = ["All", ...new Set(works.map((w) => w.category).filter(Boolean))];
    const filtered = activeWorkFilter === "All" ? works : works.filter((w) => w.category === activeWorkFilter);

    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">${esc(heading)}</h1>
          ${subtitle ? `<p class="section-subtitle">${esc(subtitle)}</p>` : ""}
        </div>

        <div class="filter-pills" role="group" aria-label="Filter works by discipline">
          ${cats
            .map(
              (cat) => `<button class="filter-pill" type="button" data-work-filter="${esc(cat)}" aria-pressed="${cat === activeWorkFilter ? "true" : "false"}">${esc(cat)}</button>`
            )
            .join("")}
        </div>

        <div class="works-grid">
          ${filtered.map(renderWorkCardHtml).join("")}
        </div>
      </div>
    `;
  }

  function renderContactView() {
    const p = DATA.profile || {};
    const lk = DATA.contact || DATA.links || {};
    const avatarHtml = renderAvatarMarkup(p.name || "Avatar");
    const { main: nameMain, sub: nameSub } = splitDisplayName(p);
    const tagVal = p.tag || p.handle;
    const descVal = lk.description || lk.cardBio || p.description || p.bio || "";
    const subParts = [tagVal, p.pronouns].filter(Boolean);

    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">${esc(lk.heading || "Contact")}</h1>
          <p class="section-subtitle">${esc(nameMain)}${nameSub ? ` ${esc(nameSub)}` : ""}${tagVal ? ` · ${esc(tagVal)}` : ""}</p>
        </div>

        <div class="card-layout">
          <section class="glass-panel" aria-label="Contact card summary">
            <div class="hero-identity" style="align-items:center;">
              <div class="hero-avatar-frame" data-avatar-slot="contact" style="margin-top:0;width:68px;height:68px;">${avatarHtml}</div>
              <div>
                <h2 class="hero-name" style="font-size:20px;"><span class="hero-name-main">${esc(nameMain)}${p.sparkle ? ` <span class="hero-sparkle" aria-hidden="true">${esc(p.sparkle)}</span>` : ""}</span>${nameSub ? `<span class="hero-name-sub">${esc(nameSub)}</span>` : ""}</h2>
                ${subParts.length ? `<p class="hero-meta">${esc(subParts.join(" · "))}</p>` : ""}
              </div>
            </div>

            <p class="card-bio-text">${esc(descVal)}</p>

            ${
              Array.isArray(lk.currently) && lk.currently.length
                ? `<div class="currently-list">${lk.currently
                    .map(
                      (row) => `
                    <div class="currently-row">
                      <span class="currently-key">${esc(row.label)}</span>
                      <span class="currently-val">${esc(row.value)}</span>
                    </div>`
                    )
                    .join("")}</div>`
                : ""
            }

            <div class="copy-actions">
              <button class="action-chip-btn" type="button" id="btn-copy-handle">Copy handle</button>
              <button class="action-chip-btn" type="button" id="btn-copy-url">Copy page link</button>
            </div>
            <p id="copy-feedback" class="copy-feedback" role="status"></p>
          </section>

          <section class="links-stack" aria-label="Contact links">
            ${(lk.items || [])
              .map((item) => {
                const href = safeUrl(item.url);
                const navTarget = href.startsWith("#") ? normalizeTab(href.slice(1)) : null;
                const tabAttr = navTarget ? ` data-nav-tab="${esc(navTarget)}"` : "";
                const ext = isExternalUrl(href);
                return `
                  <a class="link-row-card" href="${esc(href)}"${tabAttr}${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>
                    <span class="link-row-left">
                      <span class="link-row-icon">${getSmallIconSvg(item.icon)}</span>
                      <span>
                        <span class="link-row-title">${esc(item.label)}</span>
                        <span class="link-row-sub">${esc(item.sublabel || "")}</span>
                      </span>
                    </span>
                    <span class="link-row-arrow" aria-hidden="true">↗</span>
                  </a>`;
              })
              .join("")}
          </section>
        </div>
      </div>
    `;
  }

  function renderActiveView() {
    if (!portfolioMain) return;
    let html = "";
    if (activeTab === "tools") html = renderToolsView();
    else if (activeTab === "works") html = renderWorksView();
    else if (activeTab === "contact") html = renderContactView();
    else html = renderHomeView();

    portfolioMain.innerHTML = html;
    attachImageFallbacks(portfolioMain);
    wireRenderedViewInteractions();
    syncVitalsLifecycle();
    syncYtControlsDom();
    syncYtPolling();
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
      if (fb) fb.textContent = `Copied value: ${text}`;
    }
  }

  function renderWorkDialogMedia(work) {
    if (work.videoUrl) {
      const ytId = extractYouTubeId(work.videoUrl);
      if (ytId) {
        return {
          isVideo: true,
          galleryHtml: "",
          visualHtml: `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?rel=0" title="${esc(work.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`,
        };
      }
      const safeVid = safeUrl(work.videoUrl);
      return {
        isVideo: true,
        galleryHtml: "",
        visualHtml: `<video src="${esc(safeVid)}" controls playsinline preload="metadata"></video>`,
      };
    }

    const gallery = Array.isArray(work.gallery) ? work.gallery.filter(Boolean) : [];
    const primaryImg = work.image || gallery[0] || "";
    const visualHtml = primaryImg
      ? `<img id="dialog-main-img" src="${esc(primaryImg)}" alt="${esc(work.title)}" data-fallback="true" data-kind="work" data-seed="${esc(work.gradientSeed || 1)}">`
      : getWorkCoverSvg(work.gradientSeed || 1);

    const thumbsList = work.image && gallery.length && !gallery.includes(work.image)
      ? [work.image, ...gallery]
      : gallery;
    const galleryHtml = thumbsList.length > 1
      ? `<div class="dialog-gallery-thumbs" role="group" aria-label="Project gallery">${thumbsList
          .map(
            (src, idx) => `<button class="dialog-thumb-btn${idx === 0 ? " is-active" : ""}" type="button" data-gallery-src="${esc(src)}" aria-label="View image ${idx + 1}"><img src="${esc(src)}" alt=""></button>`
          )
          .join("")}</div>`
      : "";

    return { isVideo: false, visualHtml, galleryHtml };
  }

  function openItemDialog(triggerEl, eyebrow, visualHtml, title, meta, notes, url, mediaOpts = {}) {
    if (!itemDialog || !dialogBody || !dialogEyebrow) return;
    lastTriggerEl = triggerEl;
    dialogEyebrow.textContent = eyebrow;
    const href = safeUrl(url);
    const hasLink = href && href !== "#";
    const tabTarget = href.startsWith("#") ? normalizeTab(href.slice(1)) : null;
    const ext = isExternalUrl(href);

    dialogBody.innerHTML = `
      <div class="dialog-visual${mediaOpts.isVideo ? " dialog-visual-video" : ""}">${visualHtml}</div>
      ${mediaOpts.galleryHtml || ""}
      <h2 id="dialog-title" class="dialog-title">${esc(title)}</h2>
      <p class="dialog-meta">${esc(meta)}</p>
      <p class="dialog-notes">${esc(notes)}</p>
      ${
        hasLink
          ? `<div class="dialog-actions">
              <a class="action-chip-btn" href="${esc(href)}"${tabTarget ? ` data-dialog-tab="${esc(tabTarget)}"` : ""}${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>
                ${tabTarget ? `Go to ${esc(tabTarget)} →` : "Visit link ↗"}
              </a>
            </div>`
          : ""
      }
    `;
    attachImageFallbacks(dialogBody);
    dialogBody.querySelectorAll("[data-gallery-src]").forEach((thumbBtn) => {
      thumbBtn.addEventListener("click", () => {
        const mainImg = document.getElementById("dialog-main-img");
        if (mainImg) mainImg.setAttribute("src", thumbBtn.dataset.gallerySrc || "");
        dialogBody.querySelectorAll("[data-gallery-src]").forEach((b) => b.classList.remove("is-active"));
        thumbBtn.classList.add("is-active");
      });
    });
    dialogBody.querySelector("[data-dialog-tab]")?.addEventListener("click", (e) => {
      e.preventDefault();
      const t = e.currentTarget.dataset.dialogTab;
      itemDialog.close();
      if (t) navigateTo(t);
    });
    itemDialog.showModal();
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

    portfolioMain.querySelectorAll("[data-use-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const allTools = [...getToolsGroupItems("Software"), ...getToolsGroupItems("Peripherals")];
        const item = allTools.find((u) => u.id === card.dataset.useId);
        if (!item) return;
        const title = item.title || item.name || "";
        const subtitle = item.subtitle || item.category || "";
        const tag = item.tag || item.brand || "";
        const desc = item.description || item.notes || "";
        const visualHtml = item.image
          ? `<img src="${esc(item.image)}" alt="${esc(title)}" data-fallback="true" data-kind="gear" data-icon-type="${esc(item.iconType || "palette")}">`
          : item.badge
            ? getToolMonogramHtml(item.badge, item.accent)
            : getGearIllustrationSvg(item.iconType);
        openItemDialog(
          card,
          `${subtitle || "tool"}${item.status ? ` · ${item.status}` : ""}`,
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
        const work = getWorksList().find((w) => w.id === card.dataset.workId);
        if (!work) return;
        const media = renderWorkDialogMedia(work);
        openItemDialog(
          card,
          `${work.category || "work"}${work.year ? ` · ${work.year}` : ""}`,
          media.visualHtml,
          work.title,
          `${work.status || ""}${work.tags?.length ? ` · ${work.tags.join(" · ")}` : ""}`,
          work.description || work.summary || "",
          work.url,
          media
        );
      });
    });

    document.getElementById("btn-copy-handle")?.addEventListener("click", () => {
      const tag = DATA.profile?.tag || DATA.profile?.handle || "@sachikofukuari";
      copyText(tag, `Copied ${tag}`);
    });

    document.getElementById("btn-copy-url")?.addEventListener("click", () => {
      copyText(window.location.href, "Copied portfolio link");
    });

    const btnPlay = document.getElementById("btn-yt-play");
    const seekEl = document.getElementById("yt-seek");
    const curEl = document.getElementById("yt-cur-time");
    const btnMute = document.getElementById("btn-yt-mute");
    const volEl = document.getElementById("yt-volume");

    btnPlay?.addEventListener("click", toggleYtPlayback);

    seekEl?.addEventListener("input", () => {
      ytCtrl.seeking = true;
      const pct = Number(seekEl.value) / 10;
      setRangeFill(seekEl, pct);
      if (ytCtrl.duration > 0 && curEl) {
        curEl.textContent = formatClockSec((Number(seekEl.value) / 1000) * ytCtrl.duration);
      }
    });

    seekEl?.addEventListener("change", () => {
      const ratio = Math.max(0, Math.min(1, Number(seekEl.value) / 1000));
      setRangeFill(seekEl, ratio * 100);
      if (ytCtrl.ready && ytCtrl.player) {
        const dur = ytCtrl.duration > 0 ? ytCtrl.duration : Number(ytCtrl.player.getDuration?.() || 0);
        if (dur > 0) {
          ytCtrl.duration = dur;
          const targetSec = ratio * dur;
          ytCtrl.currentTime = targetSec;
          try {
            ytCtrl.player.seekTo(targetSec, true);
          } catch {
            // Ignore
          }
        }
      }
      ytCtrl.seeking = false;
      syncYtControlsDom();
    });

    volEl?.addEventListener("input", () => {
      ensureYtPlayerLoaded();
      const val = Math.max(0, Math.min(100, parseInt(volEl.value, 10) || 0));
      ytCtrl.volume = val;
      if (val > 0 && ytCtrl.muted) {
        ytCtrl.muted = false;
        try {
          ytCtrl.player?.unMute?.();
        } catch {
          // Ignore
        }
      }
      try {
        ytCtrl.player?.setVolume?.(val);
      } catch {
        // Ignore
      }
      syncYtControlsDom();
    });

    btnMute?.addEventListener("click", () => {
      ensureYtPlayerLoaded();
      ytCtrl.muted = !ytCtrl.muted;
      try {
        if (ytCtrl.muted) ytCtrl.player?.mute?.();
        else {
          ytCtrl.player?.unMute?.();
          if (ytCtrl.volume === 0) {
            ytCtrl.volume = 60;
            ytCtrl.player?.setVolume?.(60);
          }
        }
      } catch {
        // Ignore
      }
      syncYtControlsDom();
    });
  }

  // --------------------------------------------------------------------------
  // Navigation with Same-Document View Transitions + Focus Routing
  // --------------------------------------------------------------------------

  function focusViewHeading() {
    const heading = document.getElementById("view-heading");
    if (heading) {
      heading.focus({ preventScroll: true });
    } else {
      portfolioMain?.focus({ preventScroll: true });
    }
  }

  let activeViewTransition = null;
  const coarsePointerMQ = window.matchMedia("(pointer: coarse)");

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

  // --------------------------------------------------------------------------
  // Bloom Transition State Machine (Intro <-> Portfolio)
  // --------------------------------------------------------------------------

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
    resetGreetingMotion();

    // Defer YouTube API injection until after the lotus bloom animation settles smoothly
    setTimeout(() => {
      if (stage === "open") ensureYtPlayerLoaded();
    }, 1650);

    setTimeout(() => {
      if (stage === "open") focusViewHeading();
    }, 620);
  }

  function closeToIntro() {
    if (stage === "intro" || transitionLocked) return;
    if (itemDialog?.open) itemDialog.close();
    lockTransition(2300);
    stage = "intro";
    syncVitalsLifecycle();
    syncYtPolling();
    syncMiniPlayerDom();
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
    requestAnimationFrame(() => measureGreetingChars());

    setTimeout(() => {
      if (stage === "intro") introTrigger?.focus({ preventScroll: true });
    }, 280);
  }

  introTrigger?.addEventListener("click", openPortfolio);
  btnBackIntro?.addEventListener("click", closeToIntro);

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || itemDialog?.open || transitionLocked) return;
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
      if (touchStartY == null || itemDialog?.open || transitionLocked) return;
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

  window.addEventListener(
    "touchend",
    () => {
      touchStartY = null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchcancel",
    () => {
      touchStartY = null;
    },
    { passive: true }
  );

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
      if (e.key === "Escape" && !itemDialog?.open) {
        closeToIntro();
        return;
      }
      if (!itemDialog?.open) {
        const keyMap = { 1: "home", 2: "tools", 3: "works", 4: "contact" };
        if (keyMap[e.key]) {
          e.preventDefault();
          navigateTo(keyMap[e.key]);
          return;
        }
        if (e.code === "Space" && !document.activeElement?.closest?.("button, a, [role='button']")) {
          e.preventDefault();
          toggleYtPlayback();
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // Mini-Player Controls & Item Dialog Dismissal
  // --------------------------------------------------------------------------

  document.getElementById("mini-player-toggle")?.addEventListener("click", toggleYtPlayback);
  document.getElementById("mini-player-open-home")?.addEventListener("click", () => {
    if (stage === "open") navigateTo("home");
  });
  document.getElementById("mini-player-close")?.addEventListener("click", () => {
    ytCtrl.miniDismissed = true;
    ytCtrl.hasStarted = false;
    try {
      ytCtrl.player?.pauseVideo?.();
    } catch {
      // Ignore
    }
    syncMiniPlayerDom();
  });

  dialogClose?.addEventListener("click", () => itemDialog?.close());
  itemDialog?.addEventListener("click", (e) => {
    if (e.target === itemDialog) itemDialog.close();
  });
  itemDialog?.addEventListener("close", () => {
    if (dialogBody) dialogBody.innerHTML = "";
    lastTriggerEl?.focus?.();
    lastTriggerEl = null;
  });

  // Initial sync
  syncMotionUi();
  updateNavState();
  syncMiniPlayerDom();
})();
