/**
 * Portfolio SPA Controller, View Transitions & Bloom Orchestrator
 */
(function () {
  "use strict";

  const DATA = window.PORTFOLIO_DATA || {};
  const VALID_TABS = new Set(["home", "uses", "works", "card"]);

  const htmlEl = document.documentElement;
  const bodyEl = document.body;

  const introStage = document.getElementById("intro-stage");
  const introTrigger = document.getElementById("intro-bloom-trigger");
  const introGreeting = document.getElementById("intro-greeting");
  const introCueText = document.getElementById("intro-cue-text");
  const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const portfolioShell = document.getElementById("portfolio-shell");
  const portfolioMain = document.getElementById("portfolio-view");
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
        else wrap.innerHTML = getGearIllustrationSvg(type);
      }, { once: true });
    });
  }

  // --------------------------------------------------------------------------
  // State & Controllers Initialization
  // --------------------------------------------------------------------------

  let motionPaused = false;

  const initialHashTab = window.location.hash.replace(/^#/, "").toLowerCase();
  let activeTab = VALID_TABS.has(initialHashTab) ? initialHashTab : "home";
  let activeUseFilter = "All";
  let activeWorkFilter = "All";
  let stage = "intro";
  let lastTriggerEl = null;

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

  if (introCueText && DATA.intro?.cue) {
    introCueText.textContent = DATA.intro.cue;
  }
  if (introTrigger && DATA.intro?.lotusAriaLabel) {
    const greetPrefix = DATA.intro?.greeting ? `${DATA.intro.greeting} — ` : "";
    introTrigger.setAttribute("aria-label", `${greetPrefix}${DATA.intro.lotusAriaLabel}`);
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
          curG: 0,
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
      let tgtCg = 0;

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
        Math.abs(tgtCg - item.curG) * 40
      );

      item.el.style.setProperty("--cx", `${item.curX.toFixed(2)}px`);
      item.el.style.setProperty("--cy", `${item.curY.toFixed(2)}px`);
      item.el.style.setProperty("--cs", item.curS.toFixed(3));
      item.el.style.setProperty("--cr", `${item.curR.toFixed(2)}deg`);
      item.el.style.setProperty("--cg", item.curG.toFixed(3));
    }

    if (maxDelta > 0.015) {
      greetingState.rafId = requestAnimationFrame(stepGreetingFrame);
    } else {
      greetingState.lastTs = 0;
    }
  }

  function wakeGreetingFrame() {
    if (!greetingState.rafId) {
      greetingState.rafId = requestAnimationFrame(stepGreetingFrame);
    }
  }

  function resetGreetingMotion() {
    greetingState.active = false;
    wakeGreetingFrame();
  }

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
        greetingState.px = e.clientX;
        greetingState.py = e.clientY;
        greetingState.active = true;
        wakeGreetingFrame();
      },
      { passive: true }
    );
    window.addEventListener("pointerleave", resetGreetingMotion, { passive: true });
    window.addEventListener("blur", resetGreetingMotion);
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

  function renderUseCardHtml(item) {
    const visualHtml = item.image
      ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" data-fallback="true" data-kind="gear" data-icon-type="${esc(item.iconType)}">`
      : getGearIllustrationSvg(item.iconType);

    return `
      <button class="use-card" type="button" data-use-id="${esc(item.id)}">
        <div class="use-card-top">
          <span>${esc(item.status || "in use")}</span>
          <span class="use-card-rating"><span class="star" aria-hidden="true">★</span> ${esc(item.rating || "5.0")}</span>
        </div>
        <div class="use-card-visual">${visualHtml}</div>
        <div class="use-card-meta">
          <span class="use-card-cat">${getSmallIconSvg(item.iconType)} ${esc(item.category)}</span>
          <span class="use-card-brand">${esc(item.brand)}</span>
          <span class="use-card-name">${esc(item.name)}</span>
        </div>
      </button>
    `;
  }

  function renderWorkCardHtml(work) {
    const coverHtml = work.image
      ? `<img src="${esc(work.image)}" alt="${esc(work.title)}" loading="lazy" data-fallback="true" data-kind="work" data-seed="${esc(work.gradientSeed)}">`
      : getWorkCoverSvg(work.gradientSeed);

    return `
      <button class="work-card" type="button" data-work-id="${esc(work.id)}">
        <div class="work-cover">${coverHtml}</div>
        <div class="work-body">
          <div class="work-top">
            <span class="work-cat-pill">${esc(work.category)}</span>
            <span>${esc(work.year)} · ${esc(work.status)}</span>
          </div>
          <h3 class="work-title">${esc(work.title)}</h3>
          <p class="work-summary">${esc(work.summary)}</p>
          <div class="work-tags">
            ${(work.tags || []).map((t) => `<span class="work-tag">${esc(t)}</span>`).join("")}
          </div>
        </div>
      </button>
    `;
  }

  function renderHeroCardHtml() {
    const p = DATA.profile || {};
    const bannerHtml = p.bannerImage
      ? `<img src="${esc(p.bannerImage)}" alt="Profile banner" data-fallback="true" data-kind="banner">`
      : getDefaultBannerSvg();
    const avatarHtml = p.avatarImage
      ? `<img src="${esc(p.avatarImage)}" alt="${esc(p.name || "Profile avatar")}" data-fallback="true" data-kind="avatar">`
      : getDefaultAvatarSvg();

    const metaParts = [p.handle, p.location, p.pronouns, p.joined].filter(Boolean);
    const socialsHtml = (p.socials || [])
      .map((s) => {
        const href = safeUrl(s.url);
        const ext = isExternalUrl(href);
        const tabAttr = href.startsWith("#") && VALID_TABS.has(href.slice(1)) ? ` data-nav-tab="${esc(href.slice(1))}"` : "";
        return `<a class="social-icon-btn" href="${esc(href)}" aria-label="${esc(s.label)}"${tabAttr}${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${getSmallIconSvg(s.icon)}</a>`;
      })
      .join("");

    const primaryActionHtml = p.primaryAction
      ? `<button class="hero-primary-btn" type="button" data-nav-tab="${esc(p.primaryAction.targetTab || "card")}">${esc(p.primaryAction.label || "+ card")}</button>`
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

    const badgesHtml =
      Array.isArray(p.badges) && p.badges.length > 0
        ? `<div class="hero-badges-strip">${p.badges
            .map((b) => `<span class="mini-badge">${getSmallIconSvg(b.icon)} ${esc(b.label)}</span>`)
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
                <div class="hero-avatar-frame">${avatarHtml}</div>
                <div class="hero-name-block">
                  <h1 id="view-heading" class="hero-name" tabindex="-1">
                    ${esc(p.name || "Your Name")}
                    ${p.sparkle ? `<span class="hero-sparkle" aria-hidden="true">${esc(p.sparkle)}</span>` : ""}
                  </h1>
                  <p class="hero-meta">${metaParts.map((m) => `<span>${esc(m)}</span>`).join('<span aria-hidden="true">·</span>')}</p>
                </div>
              </div>
              <div class="hero-actions">
                ${socialsHtml}
                ${primaryActionHtml}
              </div>
            </div>
            <div class="hero-bottom-row">
              <p class="hero-bio">${esc(p.bio || "")}</p>
              ${statsHtml}
            </div>
          </div>
        </section>
        ${badgesHtml}
      </div>
    `;
  }

  function renderHomeView() {
    return `
      <div class="portfolio-view-inner portfolio-view-home">
        ${renderHeroCardHtml()}
      </div>
    `;
  }

  function renderUsesView() {
    const items = DATA.activeUses || [];
    const groups = ["All", ...new Set(items.map((i) => i.filterGroup).filter(Boolean))];
    const filtered = activeUseFilter === "All" ? items : items.filter((i) => i.filterGroup === activeUseFilter);

    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">Peripherals &amp; Tools</h1>
          <p class="section-subtitle">Everything on my desk and in my daily creative workflow. Click any card for details.</p>
        </div>

        <div class="filter-pills" role="group" aria-label="Filter tools by category">
          ${groups
            .map(
              (grp) => `<button class="filter-pill" type="button" data-use-filter="${esc(grp)}" aria-pressed="${grp === activeUseFilter ? "true" : "false"}">${esc(grp)}</button>`
            )
            .join("")}
        </div>

        <div class="uses-grid">
          ${filtered.map(renderUseCardHtml).join("")}
        </div>
      </div>
    `;
  }

  function renderWorksView() {
    const works = DATA.works || [];
    const cats = ["All", ...new Set(works.map((w) => w.category).filter(Boolean))];
    const filtered = activeWorkFilter === "All" ? works : works.filter((w) => w.category === activeWorkFilter);

    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">${esc(DATA.worksSection?.heading || "Works & Assets")}</h1>
          <p class="section-subtitle">${esc(DATA.worksSection?.subtitle || "")}</p>
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

  function renderCardView() {
    const p = DATA.profile || {};
    const lk = DATA.links || {};
    const avatarHtml = p.avatarImage
      ? `<img src="${esc(p.avatarImage)}" alt="${esc(p.name || "Avatar")}" data-fallback="true" data-kind="avatar">`
      : getDefaultAvatarSvg();

    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">${esc(lk.heading || "Links & Card")}</h1>
          <p class="section-subtitle">${esc(p.name || "")} · ${esc(p.handle || "")}</p>
        </div>

        <div class="card-layout">
          <section class="glass-panel" aria-label="Profile card summary">
            <div class="hero-identity" style="align-items:center;">
              <div class="hero-avatar-frame" style="margin-top:0;width:68px;height:68px;">${avatarHtml}</div>
              <div>
                <h2 class="hero-name" style="font-size:22px;">${esc(p.name || "")} <span class="hero-sparkle" aria-hidden="true">${esc(p.sparkle || "")}</span></h2>
                <p class="hero-meta">${esc(p.handle || "")} · ${esc(p.pronouns || "")}</p>
              </div>
            </div>

            <p class="card-bio-text">${esc(lk.cardBio || p.bio || "")}</p>

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

          <section class="links-stack" aria-label="All links">
            ${(lk.items || [])
              .map((item) => {
                const href = safeUrl(item.url);
                const tabAttr = href.startsWith("#") && VALID_TABS.has(href.slice(1)) ? ` data-nav-tab="${esc(href.slice(1))}"` : "";
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
    if (activeTab === "uses") html = renderUsesView();
    else if (activeTab === "works") html = renderWorksView();
    else if (activeTab === "card") html = renderCardView();
    else html = renderHomeView();

    portfolioMain.innerHTML = html;
    attachImageFallbacks(portfolioMain);
    wireRenderedViewInteractions();
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

  function openItemDialog(triggerEl, eyebrow, visualHtml, title, meta, notes, url) {
    if (!itemDialog || !dialogBody || !dialogEyebrow) return;
    lastTriggerEl = triggerEl;
    dialogEyebrow.textContent = eyebrow;
    const href = safeUrl(url);
    const hasLink = href && href !== "#";
    const tabTarget = href.startsWith("#") && VALID_TABS.has(href.slice(1)) ? href.slice(1) : null;
    const ext = isExternalUrl(href);

    dialogBody.innerHTML = `
      <div class="dialog-visual">${visualHtml}</div>
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
        const target = el.dataset.navTab;
        if (VALID_TABS.has(target)) {
          e.preventDefault();
          navigateTo(target);
        }
      });
    });

    portfolioMain.querySelectorAll("[data-use-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeUseFilter = btn.dataset.useFilter || "All";
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
        const item = (DATA.activeUses || []).find((u) => u.id === card.dataset.useId);
        if (!item) return;
        const visualHtml = item.image
          ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" data-fallback="true" data-kind="gear" data-icon-type="${esc(item.iconType)}">`
          : getGearIllustrationSvg(item.iconType);
        openItemDialog(
          card,
          `${item.category} · ${item.status || "in use"}`,
          visualHtml,
          item.name,
          `${item.brand} · ★ ${item.rating || "5.0"}`,
          item.notes || "",
          item.url
        );
      });
    });

    portfolioMain.querySelectorAll("[data-work-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const work = (DATA.works || []).find((w) => w.id === card.dataset.workId);
        if (!work) return;
        const visualHtml = work.image
          ? `<img src="${esc(work.image)}" alt="${esc(work.title)}" data-fallback="true" data-kind="work" data-seed="${esc(work.gradientSeed)}">`
          : getWorkCoverSvg(work.gradientSeed);
        openItemDialog(
          card,
          `${work.category} · ${work.year}`,
          visualHtml,
          work.title,
          `${work.status} · ${(work.tags || []).join(" · ")}`,
          work.summary || "",
          work.url
        );
      });
    });

    document.getElementById("btn-copy-handle")?.addEventListener("click", () => {
      copyText(DATA.profile?.handle || "@yourhandle", `Copied ${DATA.profile?.handle || "handle"}`);
    });

    document.getElementById("btn-copy-url")?.addEventListener("click", () => {
      copyText(window.location.href, "Copied portfolio link");
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

  function navigateTo(nextTab, updateHash = true) {
    if (!VALID_TABS.has(nextTab)) return;
    if (nextTab === activeTab && portfolioMain.innerHTML.trim() !== "") return;

    activeTab = nextTab;
    if (updateHash && window.location.hash !== `#${nextTab}`) {
      history.pushState(null, "", `#${nextTab}`);
    }

    const applyUpdate = () => {
      renderActiveView();
      updateNavState();
      window.scrollTo({ top: 0, behavior: "instant" });
    };

    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyUpdate();
      focusViewHeading();
      return;
    }

    const transition = document.startViewTransition(applyUpdate);
    transition.finished.finally(() => {
      focusViewHeading();
    });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.tab);
    });
  });

  window.addEventListener("hashchange", () => {
    const tab = window.location.hash.replace(/^#/, "").toLowerCase();
    if (VALID_TABS.has(tab)) {
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
    lockTransition(2100);
    stage = "open";
    bodyEl.dataset.stage = "open";
    portfolioShell.hidden = false;
    portfolioShell.inert = false;
    portfolioShell.removeAttribute("aria-hidden");
    introStage.setAttribute("aria-hidden", "true");

    renderActiveView();
    updateNavState();
    resetGreetingMotion();
    lotusScene?.setBloom(true);

    setTimeout(() => {
      if (stage === "open") focusViewHeading();
    }, 620);
  }

  function closeToIntro() {
    if (stage === "intro" || transitionLocked) return;
    if (itemDialog?.open) itemDialog.close();
    lockTransition(2300);
    stage = "intro";
    bodyEl.dataset.stage = "intro";
    portfolioShell.inert = true;
    portfolioShell.setAttribute("aria-hidden", "true");
    introStage.removeAttribute("aria-hidden");
    window.scrollTo({ top: 0, behavior: "instant" });

    lotusScene?.setBloom(false);
    measureGreetingChars();

    setTimeout(() => {
      if (stage === "intro") introTrigger?.focus({ preventScroll: true });
    }, 280);
  }

  introTrigger?.addEventListener("click", openPortfolio);

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
      } else if (stage === "open" && window.scrollY <= 1 && e.deltaY < 0) {
        returnWheelAccum += Math.abs(e.deltaY);
        if (returnWheelAccum > 165) closeToIntro();
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0]?.clientY ?? null;
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

      if (stage === "intro" && dy > 36) {
        touchStartY = null;
        openPortfolio();
      } else if (stage === "open" && window.scrollY <= 1 && dy < -95) {
        touchStartY = null;
        closeToIntro();
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    () => {
      touchStartY = null;
    },
    { passive: true }
  );

  window.addEventListener("keydown", (e) => {
    if (stage === "intro" && !transitionLocked && (e.key === "ArrowDown" || e.key === "PageDown")) {
      e.preventDefault();
      openPortfolio();
    }
  });

  // --------------------------------------------------------------------------
  // Item Dialog Dismissal & Focus Return
  // --------------------------------------------------------------------------

  dialogClose?.addEventListener("click", () => itemDialog?.close());
  itemDialog?.addEventListener("click", (e) => {
    if (e.target === itemDialog) itemDialog.close();
  });
  itemDialog?.addEventListener("close", () => {
    lastTriggerEl?.focus?.();
    lastTriggerEl = null;
  });

  // Initial sync
  syncMotionUi();
  updateNavState();
})();
