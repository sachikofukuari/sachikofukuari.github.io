import { getSmallIconSvg } from "./icons.js";
import { extractYouTubeId, formatClockSec, parseStartAtSeconds } from "./utils.js";

/**
 * Persistent offscreen YouTube IFrame music controller with seek, volume, mute, and mini-player sync.
 */
export function createMusicController({
  data,
  loc,
  uiStr,
  isOpenStage,
  isOpenHome,
  isPageInactive,
}) {
  function getMusicConfig() {
    const raw = data.music;
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
    const defaultVolume = Math.max(
      0,
      Math.min(100, Number.isFinite(Number(defaultVolRaw)) ? Math.round(Number(defaultVolRaw)) : 50)
    );
    return {
      heading: loc(raw, "heading", "favourite song"),
      videoId,
      startAtSec,
      defaultVolume,
      title: loc(raw, "title", ""),
      artist: loc(raw, "artist", ""),
      album: loc(raw, "album", ""),
      cover,
      openUrl,
    };
  }

  const initialCfg = getMusicConfig();
  const state = {
    apiRequested: false,
    player: null,
    videoId: initialCfg?.videoId || "",
    startAtSec: initialCfg?.startAtSec || 0,
    appliedInitialStart: false,
    hasStarted: false,
    miniDismissed: false,
    ready: false,
    playing: false,
    pendingPlay: false,
    seeking: false,
    duration: 0,
    currentTime: initialCfg?.startAtSec || 0,
    volume: initialCfg?.defaultVolume ?? 50,
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
      isOpenStage() &&
      !isOpenHome() &&
      state.hasStarted &&
      !state.miniDismissed;

    miniEl.hidden = !showMini;
    if (!showMini) return;

    const music = getMusicConfig();
    if (miniBtn) {
      miniBtn.innerHTML = state.playing ? getSmallIconSvg("pause") : getSmallIconSvg("play");
      miniBtn.setAttribute("aria-label", state.playing ? uiStr("pauseSong") : uiStr("playSong"));
    }
    if (eqBars) {
      eqBars.classList.toggle("is-active", state.playing);
    }
    if (miniTitle && music) {
      miniTitle.textContent = music.title || "Favourite song";
    }
  }

  function syncControlsDom() {
    const btnPlay = document.getElementById("btn-yt-play");
    const seekEl = document.getElementById("yt-seek");
    const curEl = document.getElementById("yt-cur-time");
    const durEl = document.getElementById("yt-dur-time");
    const btnMute = document.getElementById("btn-yt-mute");
    const volEl = document.getElementById("yt-volume");
    const widgetEq = document.getElementById("yt-widget-eq");

    if (btnPlay) {
      btnPlay.innerHTML = state.playing ? getSmallIconSvg("pause") : getSmallIconSvg("play");
      btnPlay.setAttribute("aria-label", state.playing ? uiStr("pauseSong") : uiStr("playSong"));
      btnPlay.classList.toggle("is-playing", state.playing);
    }
    if (widgetEq) {
      widgetEq.classList.toggle("is-active", state.playing);
    }
    if (curEl && !state.seeking) {
      curEl.textContent = formatClockSec(state.currentTime);
    }
    if (durEl) {
      durEl.textContent = state.duration > 0 ? formatClockSec(state.duration) : "--:--";
    }
    if (seekEl && !state.seeking) {
      const ratio = state.duration > 0 ? Math.min(1, state.currentTime / state.duration) : 0;
      seekEl.value = String(Math.round(ratio * 1000));
      setRangeFill(seekEl, ratio * 100);
    }
    if (btnMute) {
      const effectivelyMuted = state.muted || state.volume === 0;
      btnMute.innerHTML = effectivelyMuted ? getSmallIconSvg("volumeMuted") : getSmallIconSvg("volumeOn");
      btnMute.setAttribute("aria-label", effectivelyMuted ? uiStr("unmuteSong") : uiStr("muteSong"));
    }
    if (volEl) {
      const displayVol = state.muted ? 0 : state.volume;
      volEl.value = String(displayVol);
      setRangeFill(volEl, displayVol);
    }
    syncMiniPlayerDom();
  }

  function syncPolling() {
    const shouldPoll =
      state.playing &&
      isOpenHome() &&
      !document.hidden &&
      !isPageInactive();

    if (!shouldPoll) {
      clearInterval(state.pollTimer);
      state.pollTimer = 0;
      return;
    }

    if (!state.pollTimer) {
      state.pollTimer = setInterval(() => {
        if (!state.ready || !state.player || state.seeking) return;
        try {
          const cur = Number(state.player.getCurrentTime?.() || 0);
          const dur = Number(state.player.getDuration?.() || 0);
          if (dur > 0) state.duration = dur;
          state.currentTime = cur;
          syncControlsDom();
        } catch {
          // Ignore transient YT API read issues
        }
      }, 450);
    }
  }

  function createPlayerInstance() {
    const music = getMusicConfig();
    if (!music?.videoId || state.player || !window.YT?.Player) return;
    if (!document.getElementById("yt-audio-player")) return;

    state.videoId = music.videoId;
    const playerVars = {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
    };
    if (state.startAtSec > 0) {
      playerVars.start = state.startAtSec;
    }
    if (window.location.protocol.startsWith("http")) {
      playerVars.origin = window.location.origin;
    }

    try {
      state.player = new window.YT.Player("yt-audio-player", {
        width: 200,
        height: 113,
        videoId: music.videoId,
        playerVars,
        events: {
          onReady: (e) => {
            state.ready = true;
            try {
              e.target.setVolume(state.volume);
              if (state.muted) e.target.mute();
              const dur = Number(e.target.getDuration?.() || 0);
              if (dur > 0) state.duration = dur;
              if (state.pendingPlay) {
                state.pendingPlay = false;
                if (state.startAtSec > 0 && !state.appliedInitialStart) {
                  state.appliedInitialStart = true;
                  e.target.seekTo(state.startAtSec, true);
                }
                e.target.playVideo();
              }
            } catch {
              // Ignore
            }
            syncControlsDom();
            syncPolling();
          },
          onStateChange: (e) => {
            const st = window.YT?.PlayerState;
            if (!st) return;
            if (e.data === st.PLAYING) {
              state.playing = true;
              state.hasStarted = true;
              state.miniDismissed = false;
              const dur = Number(state.player?.getDuration?.() || 0);
              if (dur > 0) state.duration = dur;
              if (!state.appliedInitialStart && state.startAtSec > 0) {
                state.appliedInitialStart = true;
                const cur = Number(state.player?.getCurrentTime?.() || 0);
                if (cur < state.startAtSec - 2) {
                  try {
                    state.player.seekTo(state.startAtSec, true);
                    state.currentTime = state.startAtSec;
                  } catch {
                    // Ignore
                  }
                }
              }
            } else if (e.data === st.PAUSED) {
              state.playing = false;
            } else if (e.data === st.ENDED) {
              state.appliedInitialStart = true;
              state.currentTime = 0;
              try {
                state.player?.seekTo?.(0, true);
                state.player?.playVideo?.();
              } catch {
                state.playing = false;
              }
            }
            syncControlsDom();
            syncPolling();
          },
          onError: () => {
            state.playing = false;
            state.pendingPlay = false;
            syncControlsDom();
            syncPolling();
          },
        },
      });
    } catch {
      state.player = null;
    }
  }

  function ensureLoaded() {
    if (state.player) return;
    if (window.YT?.Player) {
      createPlayerInstance();
      return;
    }
    if (state.apiRequested) return;
    state.apiRequested = true;

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") {
        try {
          prevReady();
        } catch {
          // Ignore
        }
      }
      createPlayerInstance();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  }

  function togglePlayback() {
    ensureLoaded();
    if (!state.ready || !state.player) {
      state.pendingPlay = !state.pendingPlay;
      return;
    }
    try {
      if (state.playing) state.player.pauseVideo();
      else {
        if (!state.appliedInitialStart && state.startAtSec > 0) {
          state.appliedInitialStart = true;
          state.player.seekTo(state.startAtSec, true);
        }
        state.player.playVideo();
      }
    } catch {
      // Ignore transient YT state errors
    }
  }

  function wireHomeWidgetControls() {
    const btnPlay = document.getElementById("btn-yt-play");
    const seekEl = document.getElementById("yt-seek");
    const curEl = document.getElementById("yt-cur-time");
    const btnMute = document.getElementById("btn-yt-mute");
    const volEl = document.getElementById("yt-volume");

    btnPlay?.addEventListener("click", togglePlayback);

    seekEl?.addEventListener("input", () => {
      state.seeking = true;
      setRangeFill(seekEl, Number(seekEl.value) / 10);
      if (state.duration > 0 && curEl) {
        curEl.textContent = formatClockSec((Number(seekEl.value) / 1000) * state.duration);
      }
    });

    seekEl?.addEventListener("change", () => {
      const ratio = Math.max(0, Math.min(1, Number(seekEl.value) / 1000));
      setRangeFill(seekEl, ratio * 100);
      if (state.ready && state.player) {
        const dur = state.duration > 0 ? state.duration : Number(state.player.getDuration?.() || 0);
        if (dur > 0) {
          state.duration = dur;
          const targetSec = ratio * dur;
          state.currentTime = targetSec;
          try {
            state.player.seekTo(targetSec, true);
          } catch {
            // Ignore
          }
        }
      }
      state.seeking = false;
      syncControlsDom();
    });

    volEl?.addEventListener("input", () => {
      ensureLoaded();
      const val = Math.max(0, Math.min(100, parseInt(volEl.value, 10) || 0));
      state.volume = val;
      if (val > 0 && state.muted) {
        state.muted = false;
        try {
          state.player?.unMute?.();
        } catch {
          // Ignore
        }
      }
      try {
        state.player?.setVolume?.(val);
      } catch {
        // Ignore
      }
      syncControlsDom();
    });

    btnMute?.addEventListener("click", () => {
      ensureLoaded();
      state.muted = !state.muted;
      try {
        if (state.muted) state.player?.mute?.();
        else {
          state.player?.unMute?.();
          if (state.volume === 0) {
            state.volume = 60;
            state.player?.setVolume?.(60);
          }
        }
      } catch {
        // Ignore
      }
      syncControlsDom();
    });
  }

  function dismissMiniPlayer() {
    state.miniDismissed = true;
    state.hasStarted = false;
    try {
      state.player?.pauseVideo?.();
    } catch {
      // Ignore
    }
    syncMiniPlayerDom();
  }

  return {
    getMusicConfig,
    state,
    syncMiniPlayerDom,
    syncControlsDom,
    syncPolling,
    ensureLoaded,
    togglePlayback,
    wireHomeWidgetControls,
    dismissMiniPlayer,
  };
}

