import { esc, sanitizeCssColor } from "./utils.js";

export const FLAG_VN_SVG =
  '<svg class="lang-flag-svg" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#da251d"/><polygon fill="#ffff00" points="15,4 16.55,8.76 21.55,8.76 17.5,11.7 19.05,16.46 15,13.52 10.95,16.46 12.5,11.7 8.45,8.76 13.45,8.76"/></svg>';

export const FLAG_EN_SVG =
  '<svg class="lang-flag-svg" viewBox="0 0 30 20" aria-hidden="true"><clipPath id="uk-clip"><rect width="30" height="20"/></clipPath><g clip-path="url(#uk-clip)"><rect width="30" height="20" fill="#012169"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#ffffff" stroke-width="4"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#c8102e" stroke-width="2"/><path d="M15,0 V20 M0,10 H30" stroke="#ffffff" stroke-width="6"/><path d="M15,0 V20 M0,10 H30" stroke="#c8102e" stroke-width="3.6"/></g></svg>';

export function getSakuraClusterSvg(cls) {
  return `
    <svg class="sakura-deco ${esc(cls)}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="sakG1-${esc(cls)}" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#fff4f9"/>
          <stop offset="55%" stop-color="#ffc3dc"/>
          <stop offset="100%" stop-color="#e879a5"/>
        </radialGradient>
      </defs>
      <g transform="translate(46,48)">
        <g transform="rotate(0)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(72)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(144)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(216)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(288)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <circle cx="0" cy="0" r="5" fill="#d96b96"/>
        <circle cx="-3" cy="-4" r="1.4" fill="#ffe89e"/>
        <circle cx="4" cy="-3" r="1.4" fill="#ffe89e"/>
        <circle cx="0" cy="4" r="1.4" fill="#ffe89e"/>
      </g>
      <g transform="translate(88,36) scale(0.58) rotate(22)">
        <g transform="rotate(0)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(72)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(144)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(216)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <g transform="rotate(288)"><path d="M0,0 C-10,-12 -14,-28 -4,-34 C0,-36 0,-30 0,-28 C0,-30 0,-36 4,-34 C14,-28 10,-12 0,0Z" fill="url(#sakG1-${esc(cls)})"/></g>
        <circle cx="0" cy="0" r="5" fill="#d96b96"/>
      </g>
      <path d="M88,88 C82,82 81,74 87,71 C91,73 94,81 88,88Z" fill="#ffd2e6" opacity="0.9"/>
    </svg>
  `;
}

export function getDefaultBannerSvg() {
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

export function getDefaultAvatarSvg() {
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

export function getSmallIconSvg(name) {
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
    ytMusic: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.2" opacity="0.65"/><polygon points="10.4,9.2 15.6,12 10.4,14.8" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.6s-7.4-4.7-9.6-9.1C.8 8.3 2.4 4.6 5.9 3.9c2.1-.4 4.1.5 5.3 2.1.3.4.9.4 1.2 0 1.2-1.6 3.2-2.5 5.3-2.1 3.5.7 5.1 4.4 3.5 7.6-2.2 4.4-9.2 9.1-9.2 9.1Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.2 14"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 6.3v11.4l9.6-5.7-9.6-5.7Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="6" width="3.5" height="12" rx="1"/><rect x="13.5" y="6" width="3.5" height="12" rx="1"/></svg>',
    volumeOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    volumeMuted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
  };
  return icons[name] || icons.sparkle;
}

export function getGearIllustrationSvg(type) {
  const map = {
    mouse: `
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <defs><linearGradient id="mG" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#ffdce9"/><stop offset="100%" stop-color="#b85b83"/></linearGradient></defs>
        <ellipse cx="60" cy="102" rx="22" ry="6" fill="rgba(0,0,0,0.2)"/>
        <rect x="37" y="18" width="46" height="80" rx="23" fill="url(#mG)" stroke="#fff0f6" stroke-width="2"/>
        <path d="M37 48h46" stroke="rgba(90,30,55,0.35)" stroke-width="1.5"/>
        <path d="M60 18v30" stroke="rgba(90,30,55,0.35)" stroke-width="1.5"/>
        <rect x="57" y="28" width="6" height="14" rx="3" fill="#fff5f9"/>
        <circle cx="60" cy="76" r="3.5" fill="#fff5f9" opacity="0.65"/>
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
    palette: `
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path d="M60 20a40 40 0 1 0 0 80c5 0 8-4 8-8 0-2-1-4-2-6s-2-4-2-6c0-4 3-7 7-7h11a18 18 0 0 0 18-18c0-20-18-35-40-35Z" fill="#f8bfd8" stroke="#fff4f9" stroke-width="2"/>
        <circle cx="44" cy="48" r="6" fill="#c94b85"/>
        <circle cx="66" cy="40" r="6" fill="#ffd591"/>
        <circle cx="82" cy="54" r="6" fill="#b485d9"/>
        <circle cx="42" cy="70" r="6" fill="#fff6fb"/>
      </svg>`,
  };
  return map[type] || map.palette;
}

export function getWorkCoverSvg(seed) {
  const palettes = [
    ["#4f2136", "#a84e75", "#ffd1e5"],
    ["#5e2845", "#c96c99", "#ffe7f2"],
    ["#462441", "#9b649c", "#f9d6f0"],
    ["#692c43", "#df7a99", "#ffe3ea"],
    ["#54273e", "#b5608a", "#ffdce9"],
  ];
  const safeSeed = Math.max(1, Math.min(999, Math.abs(Math.floor(Number(seed) || 1))));
  const p = palettes[(safeSeed - 1) % palettes.length];
  return `
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="wkG-${safeSeed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${p[0]}"/>
          <stop offset="56%" stop-color="${p[1]}"/>
          <stop offset="100%" stop-color="${p[2]}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#wkG-${safeSeed})"/>
      <circle cx="315" cy="54" r="54" fill="#fff5fa" opacity="0.18"/>
      <circle cx="90" cy="135" r="70" fill="#fff5fa" opacity="0.1"/>
      <path d="M20,145 Q130,65 250,120 T390,78" fill="none" stroke="#fff7fb" stroke-width="1.6" opacity="0.4"/>
    </svg>
  `;
}

export function getToolMonogramHtml(badge, accent) {
  const safeColor = sanitizeCssColor(accent);
  const styleAttr = safeColor ? ` style="--badge-accent:${esc(safeColor)}"` : "";
  return `<div class="tool-monogram-badge"${styleAttr} aria-hidden="true"><span>${esc(badge)}</span></div>`;
}

export function attachImageFallbacks(container) {
  if (!container) return;
  container.querySelectorAll("img[data-fallback='true']").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const type = img.dataset.iconType || "palette";
        const kind = img.dataset.kind || "gear";
        const target = img.parentElement?.tagName === "PICTURE" ? img.parentElement.parentElement : img.parentElement;
        if (!target) return;
        if (kind === "avatar") target.innerHTML = getDefaultAvatarSvg();
        else if (kind === "banner") target.innerHTML = getDefaultBannerSvg();
        else if (kind === "work") target.innerHTML = getWorkCoverSvg(Number(img.dataset.seed) || 1);
        else if (kind === "music") target.innerHTML = getSmallIconSvg("ytMusic");
        else target.innerHTML = getGearIllustrationSvg(type);
      },
      { once: true }
    );
  });
}
