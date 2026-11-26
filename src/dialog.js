import { attachImageFallbacks, getWorkCoverSvg } from "./icons.js";
import { esc, extractYouTubeId, isExternalUrl, normalizeTab, safeUrl } from "./utils.js";

/**
 * Quick-view modal controller for Peripherals and Works items.
 * Software cards are intentionally excluded from pop-up inspection.
 */
export function createDialogController({
  itemDialog,
  dialogEyebrow,
  dialogBody,
  dialogClose,
  uiStr,
  onNavigate,
}) {
  function renderWorkMedia(work) {
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

    const gallery = Array.isArray(work.gallery) ? work.gallery.map(safeUrl).filter((u) => u !== "#") : [];
    const primaryImg = work.image ? safeUrl(work.image) : gallery[0] || "";
    const visualHtml =
      primaryImg && primaryImg !== "#"
        ? `<img id="dialog-main-img" src="${esc(primaryImg)}" alt="${esc(work.title)}" data-fallback="true" data-kind="work" data-seed="${esc(work.gradientSeed || 1)}">`
        : getWorkCoverSvg(work.gradientSeed || 1);

    const thumbsList =
      primaryImg && primaryImg !== "#" && gallery.length && !gallery.includes(primaryImg)
        ? [primaryImg, ...gallery]
        : gallery;
    const galleryHtml =
      thumbsList.length > 1
        ? `<div class="dialog-gallery-thumbs" role="group" aria-label="Project gallery">${thumbsList
            .map(
              (src, idx) =>
                `<button class="dialog-thumb-btn${idx === 0 ? " is-active" : ""}" type="button" data-gallery-src="${esc(src)}" aria-label="View image ${idx + 1}"><img src="${esc(src)}" alt=""></button>`
            )
            .join("")}</div>`
        : "";

    return { isVideo: false, visualHtml, galleryHtml };
  }

  function open(_triggerEl, eyebrow, visualHtml, title, meta, notes, url, mediaOpts = {}) {
    if (!itemDialog || !dialogBody || !dialogEyebrow) return;
    dialogEyebrow.textContent = eyebrow;
    const href = safeUrl(url);
    const hasLink = href && href !== "#";
    const tabTarget = href.startsWith("#") ? normalizeTab(href.slice(1)) : null;
    const ext = isExternalUrl(href);

    const tabLabelMap = {
      home: uiStr("navHome"),
      tools: uiStr("navTools"),
      works: uiStr("navWorks"),
      contact: uiStr("navContact"),
    };

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
                ${tabTarget ? `${esc(uiStr("goToTab"))} ${esc(tabLabelMap[tabTarget] || tabTarget)} →` : esc(uiStr("visitLink"))}
              </a>
            </div>`
          : ""
      }
    `;

    attachImageFallbacks(dialogBody);
    dialogBody.querySelectorAll("[data-gallery-src]").forEach((thumbBtn) => {
      thumbBtn.addEventListener("click", () => {
        const nextSrc = safeUrl(thumbBtn.dataset.gallerySrc || "");
        const mainImg = document.getElementById("dialog-main-img");
        if (mainImg && nextSrc !== "#") mainImg.setAttribute("src", nextSrc);
        dialogBody.querySelectorAll("[data-gallery-src]").forEach((b) => b.classList.remove("is-active"));
        thumbBtn.classList.add("is-active");
      });
    });

    dialogBody.querySelector("[data-dialog-tab]")?.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = e.currentTarget.dataset.dialogTab;
      itemDialog.close();
      if (targetTab) onNavigate(targetTab);
    });

    itemDialog.showModal();
  }

  function close() {
    if (itemDialog?.open) itemDialog.close();
  }

  dialogClose?.addEventListener("click", close);
  // Light-dismiss fallback for browsers without <dialog closedby="any"> support (Safari)
  if (itemDialog && !("closedBy" in HTMLDialogElement.prototype)) {
    const isOutside = (e) => {
      const r = itemDialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    itemDialog.addEventListener("pointerdown", (e) => {
      pressedOutside = isOutside(e);
    });
    itemDialog.addEventListener("pointerup", (e) => {
      if (pressedOutside && isOutside(e)) itemDialog.close();
      pressedOutside = false;
    });
  }
  itemDialog?.addEventListener("close", () => {
    itemDialog.returnValue = "";
    dialogBody?.replaceChildren();
  });

  return {
    open,
    close,
    renderWorkMedia,
    isOpen: () => Boolean(itemDialog?.open),
  };
}

