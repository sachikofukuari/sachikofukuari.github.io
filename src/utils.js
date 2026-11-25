const VALID_TABS = new Set(["home", "tools", "works", "contact"]);
const TAB_ALIASES = { uses: "tools", card: "contact" };

const CSS_HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CSS_FN_RE = /^(?:rgb|hsl)a?\(\s*[\d.%+\-\s,/]+\)$/i;

export function normalizeTab(raw) {
  const key = String(raw || "").trim().toLowerCase();
  const mapped = TAB_ALIASES[key] || key;
  return VALID_TABS.has(mapped) ? mapped : null;
}

export function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Validates URLs against an explicit allowlist (http, https, mailto, or relative paths),
 * blocking control-character obfuscation and scriptable schemes (`javascript:`, `data:`, `vbscript:`).
 */
export function safeUrl(url) {
  const raw = String(url ?? "").replace(/[\u0000-\u001f\u007f]+/g, "").trim();
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

export function sanitizeCssColor(color) {
  const val = String(color ?? "").trim();
  if (CSS_HEX_RE.test(val) || CSS_FN_RE.test(val)) return val;
  return "";
}

export function isExternalUrl(url) {
  return /^https?:\/\//i.test(String(url ?? "").trim());
}

export function createLocaleHelpers(data, getLang) {
  function uiStr(key) {
    const lang = getLang();
    return data.ui?.[lang]?.[key] ?? data.ui?.en?.[key] ?? "";
  }

  function loc(obj, field, fallback = "") {
    const lang = getLang();
    if (lang === "vi" && obj?.vi && obj.vi[field] !== undefined && obj.vi[field] !== "") {
      return obj.vi[field];
    }
    return obj?.[field] !== undefined ? obj[field] : fallback;
  }

  return { uiStr, loc };
}

export function createTimeFormatter(timezone) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Asia/Ho_Chi_Minh",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}

export function formatLocalTimeStr(formatter) {
  try {
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  }
}

export function formatClockSec(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function extractYouTubeId(rawUrl) {
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

export function parseStartAtSeconds(rawVal) {
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

export function buildDiscordCdnUrl(id, avatarHash) {
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

