import { createTimeFormatter, formatLocalTimeStr } from "./utils.js";

/**
 * Live Pulsoid heart-rate WebSocket monitor + timezone clock controller.
 */
export function createVitalsController({
  data,
  loc,
  isOpenHome,
  isPageInactive,
  resolveWorkerWs,
}) {
  const cfg = data.vitals || {};
  const offlineMs = Number(cfg.offlineTimeoutMs) || 15000;
  const offlineNote = cfg.offlineNote || "monitor not on right now";
  const timeFormatter = createTimeFormatter(cfg.timezone || "Asia/Ho_Chi_Minh");

  const state = {
    ws: null,
    tickTimer: 0,
    reconnectTimer: 0,
    connectTimeoutTimer: 0,
    isConnecting: false,
    bpm: null,
    lastHeartbeatMs: 0,
    lastSessionDataMs: 0,
    statusText: offlineNote,
  };

  function isNeeded() {
    return isOpenHome() && !document.hidden && !isPageInactive();
  }

  function formatTime() {
    return formatLocalTimeStr(timeFormatter);
  }

  function isLiveNow(now = Date.now()) {
    return (
      state.lastHeartbeatMs > 0 &&
      now - state.lastHeartbeatMs <= offlineMs &&
      typeof state.bpm === "number" &&
      state.bpm > 0
    );
  }

  function updateDom() {
    const widgetEl = document.getElementById("vitals-widget");
    const bpmEl = document.getElementById("vitals-bpm");
    const subEl = document.getElementById("vitals-hr-sub");
    const timeEl = document.getElementById("vitals-time");
    if (timeEl) timeEl.textContent = formatTime();
    if (!widgetEl || !bpmEl || !subEl) return;

    const live = isLiveNow();
    widgetEl.classList.toggle("is-live", live);
    if (live) {
      bpmEl.textContent = String(state.bpm);
      const beatSec = Math.max(0.38, Math.min(1.5, 60 / state.bpm)).toFixed(2);
      widgetEl.style.setProperty("--beat-dur", `${beatSec}s`);
      subEl.textContent = loc(cfg, "liveLabel", "live");
    } else {
      bpmEl.textContent = "--";
      widgetEl.style.removeProperty("--beat-dur");
      subEl.textContent = loc(cfg, "offlineNote", "monitor not on right now");
    }
  }

  function closeSocket() {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = 0;
    clearTimeout(state.connectTimeoutTimer);
    state.connectTimeoutTimer = 0;
    state.isConnecting = false;
    if (state.ws) {
      const sock = state.ws;
      state.ws = null;
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

  function scheduleReconnect(delayMs = 4000) {
    if (state.reconnectTimer || !isNeeded()) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = 0;
      connectSocket();
    }, delayMs);
  }

  function connectSocket() {
    const wsUrl = resolveWorkerWs("/pulsoid") || cfg.pulsoidWsUrl;
    if (!wsUrl || !isNeeded() || state.isConnecting) return;
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    closeSocket();
    state.isConnecting = true;
    state.lastSessionDataMs = Date.now();

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      state.ws = ws;
    } catch {
      state.isConnecting = false;
      state.statusText = offlineNote;
      updateDom();
      scheduleReconnect(4500);
      return;
    }

    state.connectTimeoutTimer = setTimeout(() => {
      if (state.ws === ws && ws.readyState !== WebSocket.OPEN) {
        closeSocket();
        state.statusText = offlineNote;
        updateDom();
        scheduleReconnect(3500);
      }
    }, 10000);

    ws.onopen = () => {
      if (state.ws !== ws) return;
      clearTimeout(state.connectTimeoutTimer);
      state.connectTimeoutTimer = 0;
      state.isConnecting = false;
      state.lastSessionDataMs = Date.now();
    };

    ws.onmessage = (event) => {
      if (state.ws !== ws) return;
      try {
        const parsed = JSON.parse(String(event.data || ""));
        const rawHr =
          parsed?.data?.heartRate ??
          parsed?.data?.heart_rate ??
          parsed?.heartRate ??
          parsed?.heart_rate;
        if (typeof rawHr === "number" && Number.isFinite(rawHr)) {
          const now = Date.now();
          state.lastSessionDataMs = now;
          const bpm = Math.round(rawHr);
          if (bpm > 0 && bpm < 260) {
            state.bpm = bpm;
            state.lastHeartbeatMs = now;
            state.statusText = "live";
          } else if (bpm === 0) {
            state.bpm = null;
            state.lastHeartbeatMs = 0;
            state.statusText = offlineNote;
          }
          updateDom();
        }
      } catch {
        // Ignore malformed WebSocket payloads
      }
    };

    ws.onclose = () => {
      if (state.ws !== ws) return;
      state.ws = null;
      state.isConnecting = false;
      clearTimeout(state.connectTimeoutTimer);
      state.connectTimeoutTimer = 0;
      if (!isLiveNow()) {
        state.statusText = offlineNote;
        updateDom();
      }
      scheduleReconnect(4000);
    };

    ws.onerror = () => {
      if (state.ws !== ws) return;
      try {
        ws.close();
      } catch {
        // Ignore
      }
    };
  }

  function syncLifecycle() {
    if (!isNeeded()) {
      clearInterval(state.tickTimer);
      state.tickTimer = 0;
      closeSocket();
      return;
    }

    updateDom();
    if (!state.tickTimer) {
      state.tickTimer = setInterval(() => {
        if (!isNeeded()) {
          syncLifecycle();
          return;
        }
        const now = Date.now();
        if (state.lastHeartbeatMs > 0 && now - state.lastHeartbeatMs > offlineMs) {
          state.bpm = null;
          state.statusText = offlineNote;
        }
        if (
          state.ws &&
          state.ws.readyState === WebSocket.OPEN &&
          !state.isConnecting &&
          !state.reconnectTimer &&
          now - state.lastSessionDataMs > 30000
        ) {
          state.lastSessionDataMs = now;
          connectSocket();
        }
        updateDom();
      }, 1000);
    }
    connectSocket();
  }

  return {
    cfg,
    state,
    formatTime,
    isLiveNow,
    updateDom,
    syncLifecycle,
  };
}
