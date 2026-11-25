import {
  getDefaultAvatarSvg,
  getDefaultBannerSvg,
  getGearIllustrationSvg,
  getSakuraClusterSvg,
  getSmallIconSvg,
  getToolMonogramHtml,
  getWorkCoverSvg,
} from "./icons.js";
import { esc, formatClockSec, isExternalUrl, normalizeTab, safeUrl } from "./utils.js";

export function getToolsGroupItems(data, group) {
  const key = String(group || "").toLowerCase();
  if (data.tools && Array.isArray(data.tools[key])) {
    return data.tools[key];
  }
  return [];
}

export function getWorksList(data) {
  if (Array.isArray(data.works)) return data.works;
  if (Array.isArray(data.works?.items)) return data.works.items;
  return [];
}

function splitDisplayName(p) {
  const rawName = String(p.name || "Your Name").trim();
  const rawSub = String(p.subName || "").trim();
  if (rawSub) return { main: rawName, sub: rawSub };
  const m = rawName.match(/^(.*?)\s*(\([^)]+\))$/);
  if (m) return { main: m[1].trim(), sub: m[2].trim() };
  return { main: rawName, sub: "" };
}

export function renderAvatarMarkup(avatarSrc, altText) {
  const cleanSrc = avatarSrc ? safeUrl(avatarSrc) : "";
  return cleanSrc && cleanSrc !== "#"
    ? `<img src="${esc(cleanSrc)}" alt="${esc(altText)}" data-fallback="true" data-kind="avatar" data-live-avatar="true">`
    : getDefaultAvatarSvg();
}

function renderBannerHtml(p) {
  const rawBanner = p.banner || p.bannerImage || "";
  const rawWebp = p.bannerWebp || "";
  const bannerSrc = rawBanner ? safeUrl(rawBanner) : "";
  if (!bannerSrc || bannerSrc === "#") return getDefaultBannerSvg();

  const webpSrc = rawWebp ? safeUrl(rawWebp) : "";
  const imgTag = `<img src="${esc(bannerSrc)}" alt="Profile banner" fetchpriority="high" decoding="async" data-fallback="true" data-kind="banner">`;
  if (webpSrc && webpSrc !== "#") {
    return `<picture><source srcset="${esc(webpSrc)}" type="image/webp">${imgTag}</picture>`;
  }
  return imgTag;
}

function renderHeroCardHtml({ data, loc, avatarSrc }) {
  const p = data.profile || {};
  const bannerCredit = loc(p, "bannerCredit", "");
  const bannerHtml = renderBannerHtml(p);
  const avatarHtml = renderAvatarMarkup(avatarSrc, p.name || "Profile avatar");

  const { main: nameMain, sub: nameSub } = splitDisplayName(p);
  const tagValue = p.tag || p.handle;
  const descValue = loc(p, "description", p.bio || "");
  const contactLabel = loc(p, "contactButtonLabel", p.primaryAction?.label || "contact");
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

  const sakura = data.decorations?.sakuraAccents !== false;

  return `
    <div class="hero-wrap">
      ${sakura ? getSakuraClusterSvg("sakura-deco-tl") : ""}
      ${sakura ? getSakuraClusterSvg("sakura-deco-br") : ""}
      <section class="hero-card" aria-labelledby="view-heading">
        <div class="hero-banner">
          ${bannerHtml}
          ${bannerCredit ? `<span class="hero-banner-credit">${esc(bannerCredit)}</span>` : ""}
        </div>
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

function renderHomeWidgetsHtml({ musicCtrl, vitalsCtrl, loc, uiStr }) {
  const song = musicCtrl.getMusicConfig();
  const hr = vitalsCtrl.cfg;
  if (!song && !hr) return "";

  const songHref = safeUrl(song?.openUrl || "#");
  const ext = isExternalUrl(songHref);
  const coverSrc = song?.cover ? safeUrl(song.cover) : "";
  const thumbHtml =
    coverSrc && coverSrc !== "#"
      ? `<img src="${esc(coverSrc)}" alt="${esc(song.title || "Favourite song")}" data-fallback="true" data-kind="music">`
      : getSmallIconSvg("ytMusic");

  const isLive = vitalsCtrl.isLiveNow();
  const bpmVal = isLive ? String(vitalsCtrl.state.bpm) : "--";
  const hrSub = isLive ? loc(hr, "liveLabel", "live") : loc(hr, "offlineNote", "monitor not on right now");
  const beatStyle = isLive
    ? ` style="--beat-dur:${Math.max(0.38, Math.min(1.5, 60 / vitalsCtrl.state.bpm)).toFixed(2)}s"`
    : "";

  const ytState = musicCtrl.state;
  const volVal = ytState.muted ? 0 : ytState.volume;

  return `
    <section class="home-widgets-row" aria-label="Status widgets">
      ${
        song
          ? `<div class="widget-card yt-music-widget">
              <div class="widget-eyebrow-row">
                <span class="widget-eyebrow-label">${getSmallIconSvg("ytMusic")}<span>${esc(song.heading)}</span><span id="yt-widget-eq" class="eq-bars${ytState.playing ? " is-active" : ""}" aria-hidden="true"><i></i><i></i><i></i></span></span>
                <a class="widget-ext-link" href="${esc(songHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${esc(uiStr("openInYtMusic"))}">↗</a>
              </div>
              <div class="yt-music-row">
                <a class="yt-thumb-wrap" href="${esc(songHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} tabindex="-1" aria-hidden="true">${thumbHtml}</a>
                <div class="yt-meta">
                  <a class="yt-title" href="${esc(songHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""} title="${esc(song.title)}">${esc(song.title)}</a>
                  <span class="yt-artist">${esc(song.artist)}${song.album ? ` · ${esc(song.album)}` : ""}</span>
                </div>
                ${
                  song.videoId
                    ? `<button id="btn-yt-play" class="yt-play-btn${ytState.playing ? " is-playing" : ""}" type="button" aria-label="${esc(ytState.playing ? uiStr("pauseSong") : uiStr("playSong"))}">${ytState.playing ? getSmallIconSvg("pause") : getSmallIconSvg("play")}</button>`
                    : ""
                }
              </div>
              ${
                song.videoId
                  ? `<div class="yt-controls-bar">
                      <span id="yt-cur-time" class="yt-time">${esc(formatClockSec(ytState.currentTime))}</span>
                      <input id="yt-seek" class="yt-range yt-seek" type="range" min="0" max="1000" value="0" style="--pct:0%" aria-label="${esc(uiStr("seekTrack"))}">
                      <span id="yt-dur-time" class="yt-time">${ytState.duration > 0 ? esc(formatClockSec(ytState.duration)) : "--:--"}</span>
                      <div class="yt-vol-wrap">
                        <button id="btn-yt-mute" class="yt-mute-btn" type="button" aria-label="${esc(volVal === 0 ? uiStr("unmuteSong") : uiStr("muteSong"))}">${volVal === 0 ? getSmallIconSvg("volumeMuted") : getSmallIconSvg("volumeOn")}</button>
                        <input id="yt-volume" class="yt-range yt-volume" type="range" min="0" max="100" value="${volVal}" style="--pct:${volVal}%" aria-label="${esc(uiStr("volumeLabel"))}">
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
                <span class="widget-eyebrow-label"><span class="vitals-dot" aria-hidden="true"></span><span>${esc(loc(hr, "heading", "vitals"))}</span></span>
                <span class="vitals-tz-pill">${esc(hr.timezoneLabel || "UTC+7")}</span>
              </div>
              <div class="vitals-metrics">
                <div class="vitals-block">
                  <span class="vitals-heart-icon" aria-hidden="true">${getSmallIconSvg("heart")}</span>
                  <div class="vitals-text">
                    <div class="vitals-num-line"><span id="vitals-bpm" class="vitals-val">${esc(bpmVal)}</span><span class="vitals-unit">${esc(uiStr("bpmUnit") || "bpm")}</span></div>
                    <div id="vitals-hr-sub" class="vitals-sub">${esc(hrSub)}</div>
                  </div>
                </div>
                <div class="vitals-divider" aria-hidden="true"></div>
                <div class="vitals-block">
                  <span class="vitals-clock-icon" aria-hidden="true">${getSmallIconSvg("clock")}</span>
                  <div class="vitals-text">
                    <div class="vitals-num-line"><span id="vitals-time" class="vitals-val">${esc(vitalsCtrl.formatTime())}</span></div>
                    <div class="vitals-sub">${esc(loc(hr, "localTimeLabel", "local time"))}</div>
                  </div>
                </div>
              </div>
            </div>`
          : ""
      }
    </section>
  `;
}

export function renderHomeView(ctx) {
  return `
    <div class="portfolio-view-inner portfolio-view-home">
      ${renderHeroCardHtml(ctx)}
      ${renderHomeWidgetsHtml(ctx)}
    </div>
  `;
}

function renderUseCardHtml(item, loc, { interactive }) {
  const title = loc(item, "title", item.name || "");
  const subtitle = loc(item, "subtitle", item.category || "");
  const tag = loc(item, "tag", item.brand || "");
  const status = loc(item, "status", "in use");
  const imgSrc = item.image ? safeUrl(item.image) : "";
  const visualHtml =
    imgSrc && imgSrc !== "#"
      ? `<img src="${esc(imgSrc)}" alt="${esc(title)}" loading="lazy" data-fallback="true" data-kind="gear" data-icon-type="${esc(item.iconType || "palette")}">`
      : item.badge
        ? getToolMonogramHtml(item.badge, item.accent)
        : getGearIllustrationSvg(item.iconType);

  const inner = `
    <div class="use-card-top">
      <span>${esc(status)}</span>
    </div>
    <div class="use-card-visual">${visualHtml}</div>
    <div class="use-card-meta">
      ${subtitle ? `<span class="use-card-cat">${getSmallIconSvg(item.iconType || "sparkle")} ${esc(subtitle)}</span>` : ""}
      ${tag ? `<span class="use-card-brand">${esc(tag)}</span>` : ""}
      <span class="use-card-name">${esc(title)}</span>
    </div>
  `;

  if (!interactive) {
    return `<article class="use-card use-card-static">${inner}</article>`;
  }

  return `<button class="use-card" type="button" data-use-id="${esc(item.id)}">${inner}</button>`;
}

function renderPlaceholderToolCardHtml(groupLabel, emptyText) {
  const labelLower = String(groupLabel || "").toLowerCase();
  return `
    <div class="use-card placeholder-widget-card" aria-label="${esc(groupLabel)} ${esc(emptyText)}">
      <div class="use-card-top">
        <span>${esc(labelLower)}</span>
      </div>
      <div class="use-card-visual">
        <div class="placeholder-slot-icon" aria-hidden="true">${getSmallIconSvg("sparkle")}</div>
      </div>
      <div class="use-card-meta">
        <span class="use-card-cat">${esc(labelLower)}</span>
        <span class="use-card-name placeholder-title">${esc(emptyText)}</span>
      </div>
    </div>
  `;
}

export function renderToolsView({ data, currentLang, activeUseFilter, loc }) {
  const toolsCfg = data.tools || {};
  const groups = ["Software", "Peripherals"];
  const groupLabels = currentLang === "vi" && toolsCfg.vi?.groups ? toolsCfg.vi.groups : {};
  const activeFilter = groups.includes(activeUseFilter) ? activeUseFilter : "Software";
  const activeLabel = groupLabels[activeFilter] || activeFilter;
  const filtered = getToolsGroupItems(data, activeFilter);
  const emptyText = loc(toolsCfg, "emptyText", "to be updated");
  const heading = loc(toolsCfg, "heading", "Tools & Setup");
  const subtitle = loc(toolsCfg, "subtitle", "Creative apps, coding tools, and daily setup essentials.");
  const interactive = activeFilter === "Peripherals";

  return `
    <div class="portfolio-view-inner">
      <div class="section-head-centered">
        <h1 id="view-heading" class="section-title" tabindex="-1">${esc(heading)}</h1>
        ${subtitle ? `<p class="section-subtitle">${esc(subtitle)}</p>` : ""}
      </div>

      <div class="filter-pills" role="group" aria-label="Filter tools by category">
        ${groups
          .map(
            (grp) =>
              `<button class="filter-pill" type="button" data-use-filter="${esc(grp)}" aria-pressed="${grp === activeFilter ? "true" : "false"}">${esc(groupLabels[grp] || grp)}</button>`
          )
          .join("")}
      </div>

      <div class="uses-grid${filtered.length === 0 ? " uses-grid-empty" : ""}">
        ${
          filtered.length > 0
            ? filtered.map((item) => renderUseCardHtml(item, loc, { interactive })).join("")
            : renderPlaceholderToolCardHtml(activeLabel, emptyText)
        }
      </div>
    </div>
  `;
}

function renderWorkCardHtml(work, loc) {
  const title = loc(work, "title", "");
  const category = loc(work, "category", "work");
  const status = loc(work, "status", "");
  const summary = loc(work, "description", work.summary || "");
  const imgSrc = work.image ? safeUrl(work.image) : "";
  const coverHtml =
    imgSrc && imgSrc !== "#"
      ? `<img src="${esc(imgSrc)}" alt="${esc(title)}" loading="lazy" data-fallback="true" data-kind="work" data-seed="${esc(work.gradientSeed || 1)}">`
      : getWorkCoverSvg(work.gradientSeed || 1);

  return `
    <button class="work-card" type="button" data-work-id="${esc(work.id)}">
      <div class="work-cover">${coverHtml}</div>
      <div class="work-body">
        <div class="work-top">
          <span class="work-cat-pill">${esc(category)}</span>
          <span>${esc(work.year || "")}${status ? ` · ${esc(status)}` : ""}</span>
        </div>
        <h3 class="work-title">${esc(title)}</h3>
        <p class="work-summary">${esc(summary)}</p>
        <div class="work-tags">
          ${(work.tags || []).map((t) => `<span class="work-tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
    </button>
  `;
}

function renderPlaceholderWorkCardHtml(emptyText, pillLabel, soonLabel) {
  return `
    <div class="work-card placeholder-widget-card" aria-label="${esc(pillLabel)} ${esc(emptyText)}">
      <div class="work-cover placeholder-work-cover" aria-hidden="true">
        <div class="placeholder-slot-icon">${getSmallIconSvg("sparkle")}</div>
      </div>
      <div class="work-body">
        <div class="work-top">
          <span class="work-cat-pill">${esc(pillLabel)}</span>
          <span>${esc(soonLabel)}</span>
        </div>
        <h3 class="work-title placeholder-title">${esc(emptyText)}</h3>
      </div>
    </div>
  `;
}

export function renderWorksView({ data, activeWorkFilter, loc }) {
  const worksCfg = Array.isArray(data.works) ? {} : data.works || {};
  const heading = loc(worksCfg, "heading", "Works");
  const subtitle = loc(worksCfg, "subtitle", "");
  const emptyText = loc(worksCfg, "emptyText", "to be updated");
  const pillLabel = loc(worksCfg, "pillLabel", "works");
  const soonLabel = loc(worksCfg, "soonLabel", "soon");
  const allLabel = loc(worksCfg, "allFilter", "All");
  const works = getWorksList(data);

  if (works.length === 0) {
    return `
      <div class="portfolio-view-inner">
        <div class="section-head-centered">
          <h1 id="view-heading" class="section-title" tabindex="-1">${esc(heading)}</h1>
          ${subtitle ? `<p class="section-subtitle">${esc(subtitle)}</p>` : ""}
        </div>
        <div class="works-grid works-grid-empty">
          ${renderPlaceholderWorkCardHtml(emptyText, pillLabel, soonLabel)}
        </div>
      </div>
    `;
  }

  const rawCats = [...new Set(works.map((w) => w.category).filter(Boolean))];
  const cats = ["All", ...rawCats];
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
            (cat) =>
              `<button class="filter-pill" type="button" data-work-filter="${esc(cat)}" aria-pressed="${cat === activeWorkFilter ? "true" : "false"}">${esc(cat === "All" ? allLabel : cat)}</button>`
          )
          .join("")}
      </div>

      <div class="works-grid">
        ${filtered.map((w) => renderWorkCardHtml(w, loc)).join("")}
      </div>
    </div>
  `;
}

export function renderContactView({ data, avatarSrc, loc, uiStr }) {
  const p = data.profile || {};
  const lk = data.contact || {};
  const avatarHtml = renderAvatarMarkup(avatarSrc, p.name || "Avatar");
  const { main: nameMain, sub: nameSub } = splitDisplayName(p);
  const tagVal = p.tag || p.handle;
  const contactDesc = loc(lk, "description", "");
  const descVal = contactDesc || loc(p, "description", p.bio || "");
  const subParts = [tagVal, p.pronouns].filter(Boolean);

  return `
    <div class="portfolio-view-inner">
      <div class="section-head-centered">
        <h1 id="view-heading" class="section-title" tabindex="-1">${esc(loc(lk, "heading", "Contact"))}</h1>
        <p class="section-subtitle">${esc(nameMain)}${nameSub ? ` ${esc(nameSub)}` : ""}${tagVal ? ` · ${esc(tagVal)}` : ""}</p>
      </div>

      <div class="card-layout">
        <section class="glass-panel" aria-label="Contact card summary">
          <div class="hero-identity contact-identity">
            <div class="hero-avatar-frame contact-avatar-frame" data-avatar-slot="contact">${avatarHtml}</div>
            <div>
              <h2 class="hero-name contact-name"><span class="hero-name-main">${esc(nameMain)}${p.sparkle ? ` <span class="hero-sparkle" aria-hidden="true">${esc(p.sparkle)}</span>` : ""}</span>${nameSub ? `<span class="hero-name-sub">${esc(nameSub)}</span>` : ""}</h2>
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
            <button class="action-chip-btn" type="button" id="btn-copy-handle">${esc(uiStr("copyHandle"))}</button>
            <button class="action-chip-btn" type="button" id="btn-copy-url">${esc(uiStr("copyLink"))}</button>
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
                      <span class="link-row-title">${esc(loc(item, "label", ""))}</span>
                      <span class="link-row-sub">${esc(loc(item, "sublabel", ""))}</span>
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
