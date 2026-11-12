(() => {
  // src/shared/debug.js
  var DEBUG = localStorage.getItem("JIKE_POLISH_DEBUG") === "1";
  function log(...args) {
    if (DEBUG) console.log("[jike-polish]", ...args);
  }

  // src/content/constants.js
  var MAIN_SCROLL_VIEWPORT_SELECTOR = ".mantine-ScrollArea-viewport, [class*='ScrollArea-viewport'], [class*='ScrollArea_viewport']";
  var POPUP_ID = "jike-polish-popup";
  var WINDOW_SCROLL_BRIDGE_ID = "jike-polish-window-scroll-bridge";

  // src/content/lightbox.js
  var LIGHTBOX_ZOOM_OUT_BUTTON_ID = "jike-polish-lightbox-zoom-out";
  var LIGHTBOX_ZOOM_IN_BUTTON_ID = "jike-polish-lightbox-zoom-in";
  var LIGHTBOX_MIN_SCALE = 1;
  var LIGHTBOX_MAX_SCALE = 6;
  var LIGHTBOX_SCALE_STEP = 0.5;
  var lightboxRaf = 0;
  var lightboxZoom = {
    image: null,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  };
  function getOpenLightbox() {
    return document.querySelector(".yarl__portal.yarl__portal_open");
  }
  function getActiveLightboxImage() {
    const lightbox = getOpenLightbox();
    if (!lightbox) return null;
    return lightbox.querySelector(".yarl__slide_current .yarl__slide_image") || lightbox.querySelector('.yarl__slide[aria-hidden="false"] .yarl__slide_image') || lightbox.querySelector(".yarl__slide_image");
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function clampLightboxOffset(image, x, y, scale = lightboxZoom.scale) {
    const maxX = Math.max(0, image.clientWidth * (scale - 1) / 2);
    const maxY = Math.max(0, image.clientHeight * (scale - 1) / 2);
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY)
    };
  }
  function updateLightboxZoomButtons() {
    const zoomOutButton = document.getElementById(LIGHTBOX_ZOOM_OUT_BUTTON_ID);
    const zoomInButton = document.getElementById(LIGHTBOX_ZOOM_IN_BUTTON_ID);
    if (zoomOutButton instanceof HTMLButtonElement) {
      zoomOutButton.disabled = lightboxZoom.scale <= LIGHTBOX_MIN_SCALE;
      zoomOutButton.setAttribute("title", "\u7F29\u5C0F\u56FE\u7247");
      zoomOutButton.setAttribute("aria-label", "\u7F29\u5C0F\u56FE\u7247");
    }
    if (zoomInButton instanceof HTMLButtonElement) {
      zoomInButton.disabled = lightboxZoom.scale >= LIGHTBOX_MAX_SCALE;
      zoomInButton.setAttribute("title", "\u653E\u5927\u56FE\u7247");
      zoomInButton.setAttribute("aria-label", "\u653E\u5927\u56FE\u7247");
    }
  }
  function applyLightboxTransform() {
    const image = lightboxZoom.image;
    if (!(image instanceof HTMLElement) || !document.contains(image)) {
      lightboxZoom.image = null;
      return;
    }
    const { x, y } = clampLightboxOffset(image, lightboxZoom.x, lightboxZoom.y);
    lightboxZoom.x = x;
    lightboxZoom.y = y;
    image.style.transformOrigin = "center center";
    image.style.transition = lightboxZoom.dragging ? "none" : "transform 140ms ease";
    image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${lightboxZoom.scale})`;
    let cursor = "zoom-in";
    if (lightboxZoom.scale > LIGHTBOX_MIN_SCALE) {
      cursor = lightboxZoom.dragging ? "grabbing" : "grab";
    }
    image.style.cursor = cursor;
    image.classList.toggle("jp-lightbox-zoomed", lightboxZoom.scale > 1);
    updateLightboxZoomButtons();
  }
  function resetLightboxZoom() {
    if (lightboxZoom.image instanceof HTMLElement) {
      lightboxZoom.image.style.transform = "";
      lightboxZoom.image.style.transformOrigin = "";
      lightboxZoom.image.style.transition = "";
      lightboxZoom.image.style.cursor = "";
      lightboxZoom.image.classList.remove("jp-lightbox-zoomed", "jp-lightbox-dragging");
    }
    lightboxZoom.scale = 1;
    lightboxZoom.x = 0;
    lightboxZoom.y = 0;
    lightboxZoom.dragging = false;
    lightboxZoom.pointerId = null;
    lightboxZoom.image = null;
    updateLightboxZoomButtons();
  }
  function syncActiveLightboxImage() {
    const image = getActiveLightboxImage();
    if (!(image instanceof HTMLElement)) {
      resetLightboxZoom();
      return null;
    }
    if (lightboxZoom.image !== image) {
      resetLightboxZoom();
      lightboxZoom.image = image;
      bindLightboxImage(image);
    }
    return image;
  }
  function setLightboxScale(nextScale) {
    const image = syncActiveLightboxImage();
    if (!image) return;
    const scale = clamp(nextScale, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE);
    if (scale === LIGHTBOX_MIN_SCALE) {
      lightboxZoom.scale = LIGHTBOX_MIN_SCALE;
      lightboxZoom.x = 0;
      lightboxZoom.y = 0;
    } else {
      lightboxZoom.scale = scale;
      const nextOffset = clampLightboxOffset(image, lightboxZoom.x, lightboxZoom.y, scale);
      lightboxZoom.x = nextOffset.x;
      lightboxZoom.y = nextOffset.y;
    }
    applyLightboxTransform();
  }
  function zoomLightboxIn() {
    const nextScale = lightboxZoom.scale > LIGHTBOX_MIN_SCALE ? lightboxZoom.scale + LIGHTBOX_SCALE_STEP : 2;
    setLightboxScale(nextScale);
  }
  function zoomLightboxOut() {
    const nextScale = lightboxZoom.scale > LIGHTBOX_MIN_SCALE ? lightboxZoom.scale - LIGHTBOX_SCALE_STEP : LIGHTBOX_MIN_SCALE;
    setLightboxScale(nextScale);
  }
  function onLightboxPointerDown(event) {
    const image = syncActiveLightboxImage();
    if (!image || event.currentTarget !== image || lightboxZoom.scale <= 1 || event.button !== 0) return;
    lightboxZoom.dragging = true;
    lightboxZoom.pointerId = event.pointerId;
    lightboxZoom.startX = event.clientX;
    lightboxZoom.startY = event.clientY;
    lightboxZoom.originX = lightboxZoom.x;
    lightboxZoom.originY = lightboxZoom.y;
    image.classList.add("jp-lightbox-dragging");
    image.setPointerCapture?.(event.pointerId);
    applyLightboxTransform();
    event.preventDefault();
  }
  function onLightboxPointerMove(event) {
    const image = lightboxZoom.image;
    if (!(image instanceof HTMLElement) || event.currentTarget !== image || !lightboxZoom.dragging || lightboxZoom.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - lightboxZoom.startX;
    const deltaY = event.clientY - lightboxZoom.startY;
    const nextOffset = clampLightboxOffset(
      image,
      lightboxZoom.originX + deltaX,
      lightboxZoom.originY + deltaY
    );
    lightboxZoom.x = nextOffset.x;
    lightboxZoom.y = nextOffset.y;
    applyLightboxTransform();
    event.preventDefault();
    event.stopPropagation();
  }
  function onLightboxPointerEnd(event) {
    const image = lightboxZoom.image;
    if (!(image instanceof HTMLElement) || event.currentTarget !== image || lightboxZoom.pointerId !== event.pointerId) return;
    lightboxZoom.dragging = false;
    lightboxZoom.pointerId = null;
    image.classList.remove("jp-lightbox-dragging");
    if (image.hasPointerCapture?.(event.pointerId)) image.releasePointerCapture(event.pointerId);
    applyLightboxTransform();
    event.preventDefault();
    event.stopPropagation();
  }
  function onLightboxImageClick(event) {
    if (lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
    event.preventDefault();
    event.stopPropagation();
  }
  function panLightboxBy(deltaX, deltaY) {
    const image = syncActiveLightboxImage();
    if (!image || lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
    const nextOffset = clampLightboxOffset(
      image,
      lightboxZoom.x + deltaX,
      lightboxZoom.y + deltaY
    );
    lightboxZoom.x = nextOffset.x;
    lightboxZoom.y = nextOffset.y;
    applyLightboxTransform();
  }
  function panLightboxByViewport(direction = 1) {
    const image = syncActiveLightboxImage();
    if (!image || lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
    const step = Math.max(120, Math.round(window.innerHeight * 0.72));
    panLightboxBy(0, direction * step);
  }
  function bindLightboxImage(image) {
    if (!(image instanceof HTMLElement) || image.dataset.jpZoomBound === "1") return;
    image.dataset.jpZoomBound = "1";
    image.addEventListener("dblclick", (event) => {
      event.preventDefault();
      setLightboxScale(lightboxZoom.scale > LIGHTBOX_MIN_SCALE ? LIGHTBOX_MIN_SCALE : 2);
    });
    image.addEventListener("pointerdown", onLightboxPointerDown);
    image.addEventListener("pointermove", onLightboxPointerMove);
    image.addEventListener("pointerup", onLightboxPointerEnd);
    image.addEventListener("pointercancel", onLightboxPointerEnd);
    image.addEventListener("click", onLightboxImageClick, true);
    image.addEventListener("dragstart", (event) => event.preventDefault());
  }
  function createZoomButton(id, label, pathData) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.className = "yarl__button jp-lightbox-zoom-button";
    button.title = label;
    button.setAttribute("aria-label", label);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  }
  function ensureLightboxZoomButtons() {
    const lightbox = getOpenLightbox();
    if (!lightbox) {
      resetLightboxZoom();
      return;
    }
    const toolbar = lightbox.querySelector(".yarl__toolbar");
    if (!(toolbar instanceof HTMLElement)) return;
    let zoomOutButton = toolbar.querySelector(`#${LIGHTBOX_ZOOM_OUT_BUTTON_ID}`);
    let zoomInButton = toolbar.querySelector(`#${LIGHTBOX_ZOOM_IN_BUTTON_ID}`);
    if (!(zoomOutButton instanceof HTMLButtonElement)) {
      zoomOutButton = createZoomButton(
        LIGHTBOX_ZOOM_OUT_BUTTON_ID,
        "\u7F29\u5C0F\u56FE\u7247",
        "M7 12h10"
      );
      zoomOutButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        zoomLightboxOut();
      });
      toolbar.insertBefore(zoomOutButton, toolbar.firstChild);
    }
    if (!(zoomInButton instanceof HTMLButtonElement)) {
      zoomInButton = createZoomButton(
        LIGHTBOX_ZOOM_IN_BUTTON_ID,
        "\u653E\u5927\u56FE\u7247",
        "M12 7v10M7 12h10"
      );
      zoomInButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        zoomLightboxIn();
      });
      toolbar.insertBefore(zoomInButton, zoomOutButton.nextSibling);
    }
    syncActiveLightboxImage();
    updateLightboxZoomButtons();
  }
  function scheduleLightboxSync() {
    if (lightboxRaf) return;
    lightboxRaf = requestAnimationFrame(() => {
      lightboxRaf = 0;
      ensureLightboxZoomButtons();
    });
  }
  function mutationTouchesLightbox(node) {
    if (node instanceof Element) {
      return !!(node.matches?.(".yarl__portal") || node.closest?.(".yarl__portal"));
    }
    return node instanceof DocumentFragment && !!node.querySelector?.(".yarl__portal");
  }
  function isLightboxMutationRelevant(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (mutationTouchesLightbox(node)) return true;
        }
        for (const node of mutation.removedNodes) {
          if (mutationTouchesLightbox(node)) return true;
        }
        continue;
      }
      if (mutation.type === "attributes" && ["class", "aria-hidden", "src"].includes(mutation.attributeName) && mutation.target instanceof Element && mutation.target.closest(".yarl__portal")) return true;
    }
    return false;
  }
  function handleLightboxClick(event) {
    scheduleLightboxSync();
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".yarl__navigation_prev, .yarl__navigation_next")) {
      requestAnimationFrame(() => {
        resetLightboxZoom();
        scheduleLightboxSync();
      });
    }
    const lightbox = getOpenLightbox();
    if (!(lightbox instanceof HTMLElement) || !lightbox.contains(target)) return;
    if (lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
    if (target.closest(".yarl__toolbar, .yarl__navigation_prev, .yarl__navigation_next")) return;
    event.preventDefault();
    event.stopPropagation();
  }
  function handleLightboxKeydown(event) {
    if (!getOpenLightbox()) return;
    if (event.key === "Escape") {
      resetLightboxZoom();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      requestAnimationFrame(() => {
        resetLightboxZoom();
        scheduleLightboxSync();
      });
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      panLightboxBy(0, event.key === "ArrowUp" ? 80 : -80);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      panLightboxByViewport(event.shiftKey ? 1 : -1);
      return;
    }
    if ((event.key === "+" || event.key === "=") && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      zoomLightboxIn();
      return;
    }
    if (event.key === "-" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      zoomLightboxOut();
      return;
    }
    if (event.key === "0" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      setLightboxScale(LIGHTBOX_MIN_SCALE);
    }
  }
  function handleLightboxWheel(event) {
    const lightbox = getOpenLightbox();
    const target = event.target;
    if (!(lightbox instanceof HTMLElement) || !(target instanceof HTMLElement) || !lightbox.contains(target)) return;
    if (lightboxZoom.scale > LIGHTBOX_MIN_SCALE && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      panLightboxBy(-event.deltaX, -event.deltaY);
      return;
    }
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const nextScale = lightboxZoom.scale + (event.deltaY < 0 ? 0.25 : -0.25);
    setLightboxScale(nextScale);
  }
  function installLightboxZoom() {
    const observer = new MutationObserver((mutations) => {
      if (isLightboxMutationRelevant(mutations)) scheduleLightboxSync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-hidden", "src"]
    });
    document.addEventListener("click", handleLightboxClick, true);
    document.addEventListener("keydown", handleLightboxKeydown, true);
    document.addEventListener("wheel", handleLightboxWheel, { passive: false, capture: true });
    scheduleLightboxSync();
  }

  // src/content/scroll.js
  var POST_LOCATION_SELECTOR = "._locationContainer_1mslw_69";
  var KEYBOARD_SCROLL_KEYS = /* @__PURE__ */ new Set([
    "ArrowDown",
    "ArrowUp",
    "PageDown",
    "PageUp",
    " ",
    "Spacebar",
    "Home",
    "End"
  ]);
  var KEYBOARD_SCROLL_LINE_PX = 48;
  var KEYBOARD_SCROLL_PAGE_RATIO = 0.9;
  var SCROLL_SYNC_EPSILON = 1;
  var scrollBridgeObserver = null;
  var scrollBridgeRaf = 0;
  var postLocationTooltipRaf = 0;
  var scrollBridgeNeedsFocus = false;
  var bridgedMainScroller = null;
  var keyboardScrollTarget = null;
  var syncedMainScrollTop = null;
  var syncedWindowScrollTop = null;
  function getMainScrollViewport() {
    return Array.from(document.querySelectorAll(MAIN_SCROLL_VIEWPORT_SELECTOR)).find((element) => element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 4) || null;
  }
  function getDocumentScroller() {
    return document.scrollingElement || document.documentElement;
  }
  function ensureWindowScrollBridgeSpacer() {
    let spacer = document.getElementById(WINDOW_SCROLL_BRIDGE_ID);
    if (spacer instanceof HTMLElement) return spacer;
    spacer = document.createElement("div");
    spacer.id = WINDOW_SCROLL_BRIDGE_ID;
    spacer.setAttribute("aria-hidden", "true");
    document.body.appendChild(spacer);
    return spacer;
  }
  function syncWindowScrollBridgeHeight(scroller) {
    const spacer = ensureWindowScrollBridgeSpacer();
    const documentClientHeight = getDocumentScroller().clientHeight || window.innerHeight || scroller.clientHeight;
    const scrollHeight = scroller.scrollHeight + documentClientHeight - scroller.clientHeight;
    const height = `${Math.ceil(Math.max(scrollHeight, documentClientHeight + 1))}px`;
    if (spacer.style.height !== height) spacer.style.height = height;
  }
  function syncWindowScrollToMainScroller(top) {
    const documentScroller = getDocumentScroller();
    if (Math.abs(documentScroller.scrollTop - top) > SCROLL_SYNC_EPSILON) {
      documentScroller.scrollTop = top;
    }
    syncedWindowScrollTop = documentScroller.scrollTop;
  }
  function handleMainScrollerBridgeScroll() {
    if (bridgedMainScroller?.scrollTop === syncedMainScrollTop) return;
    const scroller = syncWindowScrollBridge({ syncWindow: false });
    if (scroller) {
      syncedMainScrollTop = scroller.scrollTop;
      syncWindowScrollToMainScroller(scroller.scrollTop);
    }
  }
  function bindWindowScrollBridgeScroller(scroller) {
    if (bridgedMainScroller === scroller) return;
    bridgedMainScroller?.removeEventListener("scroll", handleMainScrollerBridgeScroll);
    bridgedMainScroller = scroller;
    syncedMainScrollTop = null;
    bridgedMainScroller.addEventListener("scroll", handleMainScrollerBridgeScroll, { passive: true });
  }
  function teardownWindowScrollBridge() {
    document.documentElement.classList.remove("jp-window-scroll-bridge");
    document.getElementById(WINDOW_SCROLL_BRIDGE_ID)?.remove();
    bridgedMainScroller?.removeEventListener("scroll", handleMainScrollerBridgeScroll);
    bridgedMainScroller = null;
    syncedMainScrollTop = null;
    syncedWindowScrollTop = null;
  }
  function syncWindowScrollBridge({ syncWindow = true } = {}) {
    const scroller = getMainScrollViewport();
    if (!scroller) {
      teardownWindowScrollBridge();
      return null;
    }
    document.documentElement.classList.add("jp-window-scroll-bridge");
    syncWindowScrollBridgeHeight(scroller);
    const scrollerChanged = bridgedMainScroller !== scroller;
    bindWindowScrollBridgeScroller(scroller);
    if (syncWindow && (scrollerChanged || getDocumentScroller().scrollTop === syncedWindowScrollTop)) {
      syncedMainScrollTop = scroller.scrollTop;
      syncWindowScrollToMainScroller(scroller.scrollTop);
    }
    return scroller;
  }
  function handleWindowBridgeScroll() {
    const top = getDocumentScroller().scrollTop;
    if (top === syncedWindowScrollTop) return;
    const scroller = syncWindowScrollBridge({ syncWindow: false });
    if (!scroller) return;
    syncedWindowScrollTop = top;
    if (Math.abs(scroller.scrollTop - top) <= SCROLL_SYNC_EPSILON) return;
    scroller.scrollTop = top;
    syncedMainScrollTop = scroller.scrollTop;
  }
  function findScrollableContainer(startNode = document.body) {
    const start = startNode instanceof Element ? startNode : document.body;
    for (let element = start; element; element = element.parentElement) {
      const { overflowY } = getComputedStyle(element);
      if ((overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight + 4) return element;
    }
    return getMainScrollViewport() || getDocumentScroller();
  }
  function isDocumentRootFocus(element) {
    return !element || element === document.body || element === document.documentElement;
  }
  function isEditableKeyboardTarget(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.isContentEditable) return true;
    return !!element.closest(
      "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']"
    );
  }
  function focusKeyboardScrollTarget(scroller) {
    try {
      scroller.focus({ preventScroll: true });
    } catch {
      scroller.focus();
    }
  }
  function shouldFocusKeyboardScrollTarget(scroller) {
    if (!document.hasFocus() || getOpenLightbox()) return false;
    const active = document.activeElement;
    return isDocumentRootFocus(active) || active === scroller;
  }
  function syncKeyboardScrollTarget({ focus = false } = {}) {
    const scroller = getMainScrollViewport();
    if (keyboardScrollTarget !== scroller) {
      keyboardScrollTarget?.classList.remove("jp-keyboard-scroll-target");
      keyboardScrollTarget = scroller;
    }
    if (!scroller) return null;
    scroller.classList.add("jp-keyboard-scroll-target");
    if (!scroller.hasAttribute("tabindex")) scroller.setAttribute("tabindex", "-1");
    if (focus && shouldFocusKeyboardScrollTarget(scroller)) focusKeyboardScrollTarget(scroller);
    return scroller;
  }
  function scheduleScrollBridgeSync(focus = false) {
    scrollBridgeNeedsFocus ||= focus;
    if (scrollBridgeRaf) return;
    scrollBridgeRaf = requestAnimationFrame(() => {
      scrollBridgeRaf = 0;
      const shouldFocus = scrollBridgeNeedsFocus;
      scrollBridgeNeedsFocus = false;
      syncKeyboardScrollTarget({ focus: shouldFocus });
      syncWindowScrollBridge();
    });
  }
  function shouldHandleKeyboardScroll(event, scroller) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || getOpenLightbox() || !scroller) return false;
    const active = document.activeElement;
    if (isEditableKeyboardTarget(active)) return false;
    return isDocumentRootFocus(active) || active === scroller;
  }
  function scrollMainViewportFromKey(scroller, event) {
    const pageStep = Math.max(1, Math.floor(scroller.clientHeight * KEYBOARD_SCROLL_PAGE_RATIO));
    const scrollOptions = { behavior: "auto" };
    switch (event.key) {
      case "ArrowDown":
        scroller.scrollBy({ ...scrollOptions, top: KEYBOARD_SCROLL_LINE_PX });
        return true;
      case "ArrowUp":
        scroller.scrollBy({ ...scrollOptions, top: -KEYBOARD_SCROLL_LINE_PX });
        return true;
      case "PageDown":
        scroller.scrollBy({ ...scrollOptions, top: pageStep });
        return true;
      case "PageUp":
        scroller.scrollBy({ ...scrollOptions, top: -pageStep });
        return true;
      case " ":
      case "Spacebar":
        scroller.scrollBy({ ...scrollOptions, top: event.shiftKey ? -pageStep : pageStep });
        return true;
      case "Home":
        scroller.scrollTo({ ...scrollOptions, top: 0 });
        return true;
      case "End":
        scroller.scrollTo({ ...scrollOptions, top: scroller.scrollHeight });
        return true;
      default:
        return false;
    }
  }
  function handleKeyboardScroll(event) {
    if (!KEYBOARD_SCROLL_KEYS.has(event.key)) return;
    const scroller = syncKeyboardScrollTarget();
    if (!shouldHandleKeyboardScroll(event, scroller)) return;
    if (!scrollMainViewportFromKey(scroller, event)) return;
    event.preventDefault();
    if (document.activeElement !== scroller) focusKeyboardScrollTarget(scroller);
  }
  function syncPostLocationTooltip(element) {
    if (!(element instanceof Element)) return;
    const location2 = element.closest(POST_LOCATION_SELECTOR);
    if (!(location2 instanceof HTMLElement)) return;
    const label = location2.querySelector(":scope > span");
    if (!(label instanceof HTMLElement)) return;
    if (label.scrollWidth > label.clientWidth + 1) {
      location2.title = label.textContent?.trim() || "";
    } else {
      location2.removeAttribute("title");
    }
  }
  function schedulePostLocationTooltipSync() {
    if (postLocationTooltipRaf) return;
    postLocationTooltipRaf = requestAnimationFrame(() => {
      postLocationTooltipRaf = 0;
      document.querySelectorAll(POST_LOCATION_SELECTOR).forEach(syncPostLocationTooltip);
    });
  }
  function forwardNativeHoverCardWheel(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const nativeCard = target.closest(
      ".mantine-HoverCard-dropdown, [class*='mantine-HoverCard-dropdown']"
    );
    if (!nativeCard) return;
    const scroller = findScrollableContainer(nativeCard);
    if (!scroller) return;
    event.preventDefault();
    scroller.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
  }
  function installScrollEnhancements() {
    syncKeyboardScrollTarget({ focus: true });
    syncWindowScrollBridge();
    scheduleScrollBridgeSync(true);
    schedulePostLocationTooltipSync();
    window.addEventListener("scroll", handleWindowBridgeScroll, { passive: true });
    document.addEventListener("keydown", handleKeyboardScroll, { capture: true });
    document.addEventListener("wheel", forwardNativeHoverCardWheel, { passive: false, capture: true });
    document.body.addEventListener("mouseover", (event) => syncPostLocationTooltip(event.target));
    if (scrollBridgeObserver) return;
    scrollBridgeObserver = new MutationObserver(() => {
      scheduleScrollBridgeSync();
      schedulePostLocationTooltipSync();
    });
    scrollBridgeObserver.observe(document.body, { childList: true, subtree: true });
  }

  // src/content/layout.js
  var POST_DETAIL_PATH = /\/u\/[^/]+\/(?:post|repost)\//i;
  var NAV_DESKTOP_STACK_SELECTOR = '.mantine-ScrollArea-content > [class*="_desktopStack_"]';
  var SCROLL_CONTENT_SELECTOR = ".mantine-ScrollArea-content";
  var SCROLL_CONTENT_CHILD_LIST_OBSERVER = { childList: true, subtree: false };
  var LAYOUT_SYNC_DELAYS = [0, 55, 160, 320];
  var layoutSyncTimers = [];
  var childResizeObserver = null;
  var childResizeDebounce = 0;
  var observedScrollChildren = /* @__PURE__ */ new Set();
  var layoutWidthResizeObserver = null;
  var observedLayoutViewport = null;
  var scrollContentObserver = null;
  var observedScrollContent = null;
  function syncPostDetailLayoutClass() {
    document.documentElement.classList.toggle("jp-detail-post", POST_DETAIL_PATH.test(location.pathname));
  }
  function readLayoutWidthPx() {
    const widths = [];
    const scrollViewport = document.querySelector(MAIN_SCROLL_VIEWPORT_SELECTOR);
    if (scrollViewport?.clientWidth > 0) widths.push(scrollViewport.clientWidth);
    const root = document.documentElement;
    const visualViewport = window.visualViewport;
    if (visualViewport?.width > 0) widths.push(visualViewport.width);
    if (root.clientWidth > 0) widths.push(root.clientWidth);
    if (window.innerWidth > 0) widths.push(window.innerWidth);
    return widths.length ? Math.floor(Math.min(...widths)) : 0;
  }
  function syncNavInlineLeft() {
    const nav = document.querySelector(NAV_DESKTOP_STACK_SELECTOR);
    if (!(nav instanceof HTMLElement)) return;
    if (!window.matchMedia?.("(min-width: 960px)").matches) {
      nav.style.removeProperty("left");
      return;
    }
    const left = getComputedStyle(document.documentElement).getPropertyValue("--jp-nav-left").trim();
    if (left) nav.style.setProperty("left", left, "important");
  }
  function syncLayoutWidth() {
    const width = readLayoutWidthPx();
    if (width > 0) document.documentElement.style.setProperty("--jp-layout-width", `${width}px`);
    syncNavInlineLeft();
  }
  function replaceObservedElements(observer, previous, next) {
    for (const element of previous) {
      if (!next.has(element)) observer.unobserve(element);
    }
    for (const element of next) {
      if (!previous.has(element)) observer.observe(element);
    }
    return next;
  }
  function syncScrollAreaChildResizeObservers() {
    if (!globalThis.ResizeObserver) return;
    if (!childResizeObserver) {
      childResizeObserver = new ResizeObserver(() => {
        clearTimeout(childResizeDebounce);
        childResizeDebounce = setTimeout(layoutTick, 32);
      });
    }
    const content = document.querySelector(SCROLL_CONTENT_SELECTOR);
    const children = new Set(
      content ? Array.from(content.children).filter((node) => node instanceof Element) : []
    );
    observedScrollChildren = replaceObservedElements(
      childResizeObserver,
      observedScrollChildren,
      children
    );
  }
  function syncLayoutWidthResizeTarget() {
    if (!layoutWidthResizeObserver) return;
    const viewport = document.querySelector(MAIN_SCROLL_VIEWPORT_SELECTOR);
    if (observedLayoutViewport === viewport) return;
    if (observedLayoutViewport) layoutWidthResizeObserver.unobserve(observedLayoutViewport);
    if (viewport) layoutWidthResizeObserver.observe(viewport);
    observedLayoutViewport = viewport;
  }
  function bindScrollContentObserver() {
    if (!globalThis.MutationObserver) return;
    const content = document.querySelector(SCROLL_CONTENT_SELECTOR);
    if (observedScrollContent === content) return;
    scrollContentObserver?.disconnect();
    observedScrollContent = content;
    if (!content) return;
    scrollContentObserver ||= new MutationObserver(scheduleLayoutSync);
    scrollContentObserver.observe(content, SCROLL_CONTENT_CHILD_LIST_OBSERVER);
  }
  function layoutTick() {
    syncPostDetailLayoutClass();
    syncLayoutWidth();
    syncKeyboardScrollTarget();
    syncWindowScrollBridge();
    syncScrollAreaChildResizeObservers();
    syncLayoutWidthResizeTarget();
    bindScrollContentObserver();
  }
  function scheduleLayoutAnimationFrames(remaining) {
    if (remaining <= 0) return;
    requestAnimationFrame(() => {
      layoutTick();
      scheduleLayoutAnimationFrames(remaining - 1);
    });
  }
  function scheduleLayoutSync() {
    for (const timer of layoutSyncTimers) clearTimeout(timer);
    layoutSyncTimers = [];
    layoutTick();
    queueMicrotask(layoutTick);
    scheduleLayoutAnimationFrames(3);
    for (const delay of LAYOUT_SYNC_DELAYS) {
      layoutSyncTimers.push(setTimeout(layoutTick, delay));
    }
  }
  function installLayoutWidthTracking() {
    syncLayoutWidth();
    syncScrollAreaChildResizeObservers();
    const queueWidthSync = () => queueMicrotask(syncLayoutWidth);
    window.visualViewport?.addEventListener("resize", queueWidthSync);
    window.visualViewport?.addEventListener("scroll", queueWidthSync);
    window.addEventListener("resize", queueWidthSync);
    window.addEventListener("load", queueWidthSync, { once: true });
    if (globalThis.ResizeObserver) {
      layoutWidthResizeObserver = new ResizeObserver(queueWidthSync);
      layoutWidthResizeObserver.observe(document.documentElement);
      if (document.body) layoutWidthResizeObserver.observe(document.body);
      syncLayoutWidthResizeTarget();
    }
    requestAnimationFrame(() => {
      syncLayoutWidth();
      requestAnimationFrame(syncLayoutWidth);
    });
  }
  function installSpaLocationHook() {
    scheduleLayoutSync();
    window.addEventListener("popstate", scheduleLayoutSync);
    for (const key of ["pushState", "replaceState"]) {
      const original = history[key];
      history[key] = function(...args) {
        const result = original.apply(history, args);
        scheduleLayoutSync();
        return result;
      };
    }
    bindScrollContentObserver();
  }
  function installLayoutEnhancements() {
    installSpaLocationHook();
    installLayoutWidthTracking();
  }

  // src/shared/values.js
  function stringValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }
  function safeHttpUrl(value, baseUrl = globalThis.location?.href) {
    const raw = stringValue(value);
    if (!raw) return "";
    try {
      const url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  // src/shared/jike-api.js
  var JIKE_API_ORIGIN = "https://api.ruguoapp.com";
  var API_BASE = `${JIKE_API_ORIGIN}/1.0`;
  var AUTH_REFRESH_PATH = "/app_auth_tokens.refresh";
  var authRefreshTask = null;
  function accessToken() {
    return localStorage.getItem("JK_ACCESS_TOKEN");
  }
  function refreshToken() {
    return localStorage.getItem("JK_REFRESH_TOKEN");
  }
  function deviceId() {
    return localStorage.getItem("JK_DEVICE_ID");
  }
  function hasJikeAuthToken() {
    return !!(accessToken() || refreshToken());
  }
  function jikeApiHeaders(token, extraHeaders = {}) {
    const headers = { ...extraHeaders, platform: "web" };
    if (token) headers["x-jike-access-token"] = token;
    const device = deviceId();
    if (device) headers["x-jike-device-id"] = device;
    return headers;
  }
  async function refreshAccessToken() {
    if (authRefreshTask) return authRefreshTask;
    const currentRefreshToken = refreshToken();
    if (!currentRefreshToken) return null;
    authRefreshTask = (async () => {
      try {
        const response = await fetch(`${JIKE_API_ORIGIN}${AUTH_REFRESH_PATH}`, {
          method: "POST",
          headers: jikeApiHeaders(null, {
            "x-jike-refresh-token": currentRefreshToken,
            "Content-Type": "application/json"
          }),
          body: "{}"
        });
        if (!response.ok) return null;
        const payload = await response.json();
        const nextAccessToken = stringValue(payload?.["x-jike-access-token"]);
        const nextRefreshToken = stringValue(payload?.["x-jike-refresh-token"]);
        if (!nextAccessToken || refreshToken() !== currentRefreshToken) return null;
        localStorage.setItem("JK_ACCESS_TOKEN", nextAccessToken);
        if (nextRefreshToken) localStorage.setItem("JK_REFRESH_TOKEN", nextRefreshToken);
        return nextAccessToken;
      } catch (error) {
        log("refresh err", error);
        return null;
      } finally {
        authRefreshTask = null;
      }
    })();
    return authRefreshTask;
  }
  async function requestJike(path, options = {}) {
    const { allowAnonymous = false, headers: extraHeaders, ...fetchOptions } = options;
    const url = new URL(path.replace(/^\/+/, ""), `${API_BASE}/`);
    if (url.origin !== JIKE_API_ORIGIN || !url.pathname.startsWith("/1.0/")) {
      throw new Error("Jike API requests must stay within the API origin and /1.0/ path.");
    }
    const sendRequest = (requestToken) => fetch(url, {
      ...fetchOptions,
      headers: jikeApiHeaders(requestToken, extraHeaders)
    });
    let token = accessToken();
    if (!token && !allowAnonymous) token = await refreshAccessToken();
    if (!token && !allowAnonymous) return null;
    let response = await sendRequest(token);
    if (response.status !== 401 || fetchOptions.signal?.aborted) return response;
    const currentToken = accessToken();
    if (allowAnonymous) token = null;
    else if (currentToken && currentToken !== token) token = currentToken;
    else token = await refreshAccessToken();
    if (fetchOptions.signal?.aborted) return response;
    if (!token && !allowAnonymous) return response;
    response = await sendRequest(token);
    return response;
  }

  // src/content/profile-api.js
  var AUTH_EXPIRED = Symbol("auth-expired");
  var profileCache = /* @__PURE__ */ new Map();
  var pendingProfiles = /* @__PURE__ */ new Map();
  function sameIdentifier(left, right) {
    return String(left || "").toLowerCase() === String(right || "").toLowerCase();
  }
  async function fetchUser(id) {
    if (profileCache.has(id)) return profileCache.get(id);
    if (pendingProfiles.has(id)) return pendingProfiles.get(id);
    const isUuid = /^[0-9a-f]{8}-/i.test(id);
    const keys = isUuid ? ["username", "id"] : ["username"];
    const task = (async () => {
      try {
        for (const key of keys) {
          const parameter = `${key}=${encodeURIComponent(id)}`;
          try {
            const response = await requestJike(`/users/profile?${parameter}`);
            if (!response || response.status === 401) return AUTH_EXPIRED;
            if (!response.ok) continue;
            const payload = await response.json();
            if (sameIdentifier(payload.user?.[key], id)) {
              if (pendingProfiles.get(id) === task) profileCache.set(id, payload.user);
              return payload.user;
            }
          } catch (error) {
            log("fetch err", parameter, error);
          }
        }
        return null;
      } finally {
        if (pendingProfiles.get(id) === task) pendingProfiles.delete(id);
      }
    })();
    pendingProfiles.set(id, task);
    return task;
  }
  async function toggleFollow(username, isFollowing) {
    if (!username || !hasJikeAuthToken()) return null;
    const endpoint = isFollowing ? "userRelation/unfollow" : "userRelation/follow";
    try {
      const response = await requestJike(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      if (!response?.ok) return false;
      profileCache.clear();
      pendingProfiles.clear();
      return true;
    } catch (error) {
      log("follow err", error);
      return false;
    }
  }

  // src/content/profile-presentation.js
  function getProfileTags(user) {
    if (Array.isArray(user.profileTags)) {
      return user.profileTags.map((tag) => ({
        text: stringValue(tag?.text),
        imageUrl: safeHttpUrl(tag?.picUrl),
        gender: tag?.type === "MALE_RELATIONSHIP_STATE" ? "m" : tag?.type === "FEMALE_RELATIONSHIP_STATE" ? "f" : ""
      })).filter((tag) => tag.text || tag.imageUrl);
    }
    const tags = [];
    if (user.gender === "MALE") tags.push({ text: "\u2642", gender: "m" });
    else if (user.gender === "FEMALE") tags.push({ text: "\u2640", gender: "f" });
    const province = stringValue(user.province);
    for (const text of [province && !/^\d+$/.test(province) ? province : "", stringValue(user.industry)]) {
      if (text) tags.push({ text });
    }
    return tags;
  }
  function getProfileSponsorIcons(user) {
    const sponsor = user.decorations?.sponsor;
    const light = safeHttpUrl(sponsor?.picUrl);
    const dark = safeHttpUrl(sponsor?.themes?.dark?.picUrl) || light;
    return { light, dark };
  }

  // src/content/quote-author.js
  var NATIVE_QUOTE_CONTENT_SELECTOR = "._content_1kp3y_20";
  var NATIVE_QUOTE_AVATAR_SELECTOR = "a._avatar_1kp3y_16";
  function getQuoteAuthorLink(element, pointer) {
    const directAvatar = element.closest(NATIVE_QUOTE_AVATAR_SELECTOR);
    if (directAvatar) return directAvatar;
    if (!pointer || !Number.isFinite(pointer.clientX) || !Number.isFinite(pointer.clientY)) return null;
    const content = element.closest(NATIVE_QUOTE_CONTENT_SELECTOR);
    const name = content?.firstChild;
    if (name?.nodeType !== Node.TEXT_NODE || !name.nextSibling?.textContent?.startsWith(":")) return null;
    const avatar = content.closest("._main_1kp3y_9")?.querySelector(NATIVE_QUOTE_AVATAR_SELECTOR);
    if (!avatar) return null;
    const range = document.createRange();
    range.selectNodeContents(name);
    const overName = Array.from(range.getClientRects()).some((rect) => pointer.clientX >= rect.left && pointer.clientX < rect.right && pointer.clientY >= rect.top && pointer.clientY < rect.bottom);
    range.detach?.();
    return overName ? avatar : null;
  }

  // src/content/profile-card.js
  var PROFILE_LINK_SELECTOR = 'a[href*="/u/"]';
  var PROFILE_HOVER_CONTENT_SELECTOR = '.jp-repost-source-author, [class*="_mentionUser_"], [class*="_name_1rdwv_"], [class*="_avatar_1rdwv_"], [class*="_root_1y0hs_"]';
  var USER_CARD_TRIGGER_SELECTOR = '[class*="_userCard_"]';
  var USER_CARD_MAX_ANCESTOR_DEPTH = 8;
  var USER_CARD_MAX_HEIGHT = 220;
  var USER_CARD_MIN_WIDTH = 120;
  var SHOW_DELAY = 140;
  var activeLink = null;
  var hideTimer = null;
  var hoverTimer = null;
  var requestSequence = 0;
  function isDarkModeActive() {
    const root = document.documentElement;
    const body = document.body;
    if (root.getAttribute("data-mantine-color-scheme") === "dark") return true;
    if (root.getAttribute("data-theme") === "dark") return true;
    if (root.classList.contains("dark") || body?.classList.contains("dark")) return true;
    const background = getComputedStyle(body || root).backgroundColor || "";
    const match = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return false;
    const [red, green, blue] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    return luminance < 0.45;
  }
  function applyPopupTheme(card) {
    const dark = isDarkModeActive();
    card.classList.toggle("jp-dark", dark);
    const sponsor = card.querySelector(".jp-sponsor-icon");
    if (sponsor) sponsor.src = dark ? sponsor.dataset.darkSrc : sponsor.dataset.lightSrc;
  }
  function isProfileHoverLink(element) {
    if (!(element instanceof Element)) return false;
    return element.matches(PROFILE_HOVER_CONTENT_SELECTOR) || !!element.querySelector(PROFILE_HOVER_CONTENT_SELECTOR);
  }
  function hasUserCardBounds(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return true;
    return rect.width >= USER_CARD_MIN_WIDTH && rect.height <= USER_CARD_MAX_HEIGHT;
  }
  function isUserCardTrigger(element) {
    if (!(element instanceof HTMLElement) || !hasUserCardBounds(element)) return false;
    if (!element.matches(USER_CARD_TRIGGER_SELECTOR)) return false;
    return Array.from(element.querySelectorAll(PROFILE_LINK_SELECTOR)).some(isProfileHoverLink);
  }
  function findUserCardTrigger(element) {
    let node = element;
    for (let depth = 0; node && node !== document.body && depth < USER_CARD_MAX_ANCESTOR_DEPTH; depth += 1) {
      if (isUserCardTrigger(node)) return node;
      node = node.parentElement;
    }
    return null;
  }
  function getProfileLink(element) {
    if (!(element instanceof Element)) return null;
    if (element.matches(PROFILE_LINK_SELECTOR)) return element;
    const links = Array.from(element.querySelectorAll(PROFILE_LINK_SELECTOR));
    return links.find(isProfileHoverLink) || links[0] || null;
  }
  function getLink(element, pointer) {
    if (!(element instanceof Element)) return null;
    const sourceAuthor = element.closest("a.jp-repost-source-author");
    if (sourceAuthor) return sourceAuthor;
    const quoteAuthor = getQuoteAuthorLink(element, pointer);
    if (quoteAuthor) return quoteAuthor;
    const card = findUserCardTrigger(element);
    if (card) return card;
    const link = element.closest(PROFILE_LINK_SELECTOR);
    return link && isProfileHoverLink(link) ? link : null;
  }
  function extractId(link) {
    const profileLink = getProfileLink(link);
    if (!profileLink) return null;
    const match = (profileLink.getAttribute("href") || "").match(/\/u\/([^/?#]+)/i);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  function removePopup() {
    document.getElementById(POPUP_ID)?.remove();
  }
  function createPopupCard() {
    removePopup();
    const card = document.createElement("div");
    card.id = POPUP_ID;
    return card;
  }
  function cancelHide() {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  function cancelHover() {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  function closePopup() {
    requestSequence += 1;
    cancelHide();
    cancelHover();
    removePopup();
    activeLink = null;
  }
  function hidePopupSoon() {
    cancelHide();
    hideTimer = setTimeout(closePopup, 160);
  }
  function positionCard(card, anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    let left = anchorRect.left;
    let top = anchorRect.bottom + 8;
    if (left + cardRect.width > innerWidth - 10) left = innerWidth - cardRect.width - 10;
    if (left < 10) left = 10;
    if (top + cardRect.height > innerHeight - 10) top = anchorRect.top - cardRect.height - 8;
    if (top < 10) top = 10;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }
  function forwardCustomPopupWheel(event) {
    const card = event.currentTarget;
    if (!(card instanceof HTMLElement)) return;
    const inner = card.querySelector(".jp-scroll");
    const scrollElement = inner instanceof HTMLElement ? inner : card;
    const overflowY = scrollElement.scrollHeight - scrollElement.clientHeight;
    if (overflowY > 1) {
      const atTop = scrollElement.scrollTop <= 0;
      const atBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 1;
      if (event.deltaY < 0 && !atTop || event.deltaY > 0 && !atBottom) {
        event.preventDefault();
        scrollElement.scrollTop += event.deltaY;
        return;
      }
    }
    const scroller = findScrollableContainer(
      activeLink instanceof Element ? activeLink : document.body
    );
    if (!scroller) return;
    event.preventDefault();
    scroller.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
  }
  function bindCardControls(card) {
    card.addEventListener("mouseenter", cancelHide);
    card.addEventListener("mouseleave", hidePopupSoon);
    card.addEventListener("wheel", forwardCustomPopupWheel, { passive: false });
  }
  function mountCard(card, anchor) {
    applyPopupTheme(card);
    document.body.appendChild(card);
    bindCardControls(card);
    positionCard(card, anchor);
  }
  function renderLoadingCard(anchor) {
    const card = createPopupCard();
    card.innerHTML = `
    <div class="jp-scroll">
      <div class="jp-head">
        <div class="jp-skeleton jp-skeleton-avatar"></div>
        <div class="jp-info jp-skeleton-group">
          <div class="jp-skeleton jp-skeleton-line jp-skeleton-name"></div>
          <div class="jp-skeleton jp-skeleton-line jp-skeleton-meta"></div>
        </div>
      </div>
      <div class="jp-tags">
        <span class="jp-skeleton jp-skeleton-chip"></span>
        <span class="jp-skeleton jp-skeleton-chip jp-skeleton-chip-wide"></span>
      </div>
      <div class="jp-skeleton jp-skeleton-line"></div>
      <div class="jp-skeleton jp-skeleton-line jp-skeleton-line-short"></div>
      <div class="jp-skeleton jp-skeleton-button"></div>
    </div>
  `;
    mountCard(card, anchor);
  }
  function renderErrorCard(anchor, message) {
    const card = createPopupCard();
    card.innerHTML = `
    <div class="jp-scroll">
      <div class="jp-status">
        <div class="jp-status-title">\u8D44\u6599\u6682\u65F6\u4E0D\u53EF\u7528</div>
        <div class="jp-status-text"></div>
      </div>
    </div>
  `;
    card.querySelector(".jp-status-text").textContent = message;
    mountCard(card, anchor);
  }
  function appendTag(container, { text, imageUrl, gender }) {
    const tag = document.createElement("span");
    tag.className = `jp-tag${gender ? ` jp-gender-${gender}` : ""}`;
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = gender === "m" ? "\u7537" : gender === "f" ? "\u5973" : text;
      image.referrerPolicy = "no-referrer";
      tag.appendChild(image);
    }
    if (text) tag.appendChild(document.createTextNode(text));
    container.appendChild(tag);
  }
  function profileUrl(username) {
    return new URL(`/u/${encodeURIComponent(stringValue(username))}`, "https://web.okjike.com").href;
  }
  function bindFollowButton(button, user) {
    if (user.isSelf) {
      button.remove();
      return;
    }
    let isFollowing = !!user.following;
    const renderFollowState = () => {
      button.textContent = isFollowing ? "\u5DF2\u5173\u6CE8" : "\u5173\u6CE8";
      button.classList.toggle("jp-following", isFollowing);
    };
    renderFollowState();
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      const updated = await toggleFollow(user.username, isFollowing);
      if (updated) {
        isFollowing = !isFollowing;
        renderFollowState();
      }
      button.disabled = false;
    });
  }
  function renderCard(user, anchor) {
    const card = createPopupCard();
    card.innerHTML = `
    <div class="jp-scroll">
      <div class="jp-head">
        <a class="jp-av-link"><img class="jp-av" alt=""><img class="jp-sponsor-icon" alt="\u8D5E\u52A9\u8005"></a>
        <div class="jp-info">
          <a class="jp-name"><span class="jp-screen-name"></span></a>
          <div class="jp-stats">
            <span><b class="jp-following-count"></b><span>\u5173\u6CE8</span></span>
            <span><b class="jp-follower-count"></b><span>\u88AB\u5173\u6CE8</span></span>
          </div>
        </div>
      </div>
      <div class="jp-tags"></div>
      <div class="jp-bio"></div>
      <button class="jp-follow" type="button"></button>
    </div>
  `;
    const url = profileUrl(user.username);
    card.querySelectorAll(".jp-av-link, .jp-name").forEach((link) => {
      link.href = url;
    });
    const avatarUrl = safeHttpUrl(
      user.avatarImage?.thumbnailUrl || user.avatarImage?.picUrl
    );
    const avatar = card.querySelector(".jp-av");
    if (avatarUrl) avatar.src = avatarUrl;
    else avatar.remove();
    const sponsor = card.querySelector(".jp-sponsor-icon");
    const sponsorIcons = getProfileSponsorIcons(user);
    if (sponsorIcons.light) {
      sponsor.dataset.lightSrc = sponsorIcons.light;
      sponsor.dataset.darkSrc = sponsorIcons.dark;
    } else sponsor.remove();
    card.querySelector(".jp-screen-name").textContent = stringValue(user.screenName);
    card.querySelector(".jp-following-count").textContent = String(user.statsCount?.followingCount ?? 0);
    card.querySelector(".jp-follower-count").textContent = String(
      user.statsCount?.followedCount ?? user.statsCount?.followerCount ?? 0
    );
    const tags = card.querySelector(".jp-tags");
    for (const tag of getProfileTags(user)) appendTag(tags, tag);
    if (!tags.children.length) tags.remove();
    const bio = card.querySelector(".jp-bio");
    bio.textContent = stringValue(user.bio || user.briefIntro);
    if (!bio.textContent) bio.remove();
    bindFollowButton(card.querySelector(".jp-follow"), user);
    mountCard(card, anchor);
  }
  function scheduleShow(link, { immediate = false } = {}) {
    cancelHover();
    activeLink = link;
    const show = () => {
      hoverTimer = null;
      void showCard(link);
    };
    if (immediate) show();
    else hoverTimer = setTimeout(show, SHOW_DELAY);
  }
  async function showCard(link) {
    if (activeLink !== link) return;
    cancelHide();
    const id = extractId(link);
    if (!id) return;
    const sequence = ++requestSequence;
    log("hover", id);
    renderLoadingCard(link);
    if (!hasJikeAuthToken()) {
      renderErrorCard(link, "\u672A\u68C0\u6D4B\u5230\u767B\u5F55\u72B6\u6001\uFF0C\u65E0\u6CD5\u52A0\u8F7D\u7528\u6237\u8D44\u6599\u3002");
      return;
    }
    const user = await fetchUser(id);
    if (sequence !== requestSequence || activeLink !== link) return;
    if (user === AUTH_EXPIRED) {
      renderErrorCard(link, "\u767B\u5F55\u72B6\u6001\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u6216\u91CD\u65B0\u767B\u5F55\u540E\u518D\u8BD5\u3002");
    } else if (!user) {
      renderErrorCard(link, "\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE\u8D44\u6599\uFF0C\u53EF\u80FD\u662F\u7F51\u7EDC\u6CE2\u52A8\u6216\u9875\u9762\u7ED3\u6784\u5DF2\u53D8\u66F4\u3002");
    } else {
      renderCard(user, link);
    }
  }
  function syncOpenPopupTheme() {
    const card = document.getElementById(POPUP_ID);
    if (card) applyPopupTheme(card);
  }
  function installProfileCards() {
    const themeObserver = new MutationObserver(syncOpenPopupTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-mantine-color-scheme", "data-theme"]
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    function handleHover(event) {
      const link = getLink(event.target, event);
      if (link) {
        if (activeLink === link && (hoverTimer !== null || document.getElementById(POPUP_ID))) {
          cancelHide();
          return;
        }
        scheduleShow(link);
      } else if (activeLink && !event.target.closest?.(`#${POPUP_ID}`)) {
        cancelHover();
        if (hideTimer === null) hidePopupSoon();
      }
    }
    for (const eventName of ["pointerover", "mouseover", "focusin"]) {
      document.addEventListener(eventName, (event) => {
        if (!(event.target instanceof Element)) return;
        const avatar = event.target.closest(NATIVE_QUOTE_AVATAR_SELECTOR);
        if (!avatar) return;
        event.stopPropagation();
        if (eventName === "mouseover") handleHover(event);
        else if (eventName === "focusin") scheduleShow(avatar, { immediate: true });
      }, true);
    }
    document.body.addEventListener("mouseover", handleHover);
    document.body.addEventListener("mousemove", (event) => {
      if (event.target instanceof Element && event.target.closest(NATIVE_QUOTE_CONTENT_SELECTOR)) {
        handleHover(event);
      }
    });
    document.body.addEventListener("focusin", (event) => {
      const link = getLink(event.target);
      if (link) scheduleShow(link, { immediate: true });
    });
    document.body.addEventListener("focusout", (event) => {
      if (!event.relatedTarget?.closest?.(`#${POPUP_ID}`)) hidePopupSoon();
    });
    document.body.addEventListener("mouseleave", hidePopupSoon);
    document.addEventListener("mousedown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(`#${POPUP_ID}`) && !target.closest(PROFILE_LINK_SELECTOR) && !getLink(target)) closePopup();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.getElementById(POPUP_ID)) closePopup();
    });
    window.addEventListener("resize", () => {
      const card = document.getElementById(POPUP_ID);
      if (card && activeLink) positionCard(card, activeLink);
    });
  }

  // src/content/runtime.js
  var PAGE_BRIDGE_SCRIPT = "jike-polish-page-bridge.js";
  function extensionRuntime() {
    return globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
  }
  function injectPageBridge({ force = false } = {}) {
    const existing = document.getElementById("jike-polish-page-bridge");
    if (existing && !force) return;
    existing?.remove();
    try {
      const runtime = extensionRuntime();
      if (!runtime?.getURL) {
        log("page bridge err: extension runtime unavailable");
        return;
      }
      const script = document.createElement("script");
      script.id = "jike-polish-page-bridge";
      script.src = `${runtime.getURL(PAGE_BRIDGE_SCRIPT)}?v=${Date.now()}`;
      script.async = false;
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      log("page bridge err", error);
    }
  }
  async function injectUserStyle() {
    if (document.getElementById("jike-polish-userstyle")) return;
    try {
      const runtime = extensionRuntime();
      if (!runtime?.getURL) {
        log("style err: extension runtime unavailable");
        return;
      }
      const url = `${runtime.getURL("jike-twitter-font.user.css")}?v=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      const raw = await response.text();
      const inner = raw.replace(/\/\*[\s\S]*?==\/UserStyle== \*\//, "").match(/@-moz-document\s+domain\("web\.okjike\.com"\)\s*\{([\s\S]*)\}\s*$/)?.[1] || raw;
      const style = document.createElement("style");
      style.id = "jike-polish-userstyle";
      style.textContent = inner;
      document.head.appendChild(style);
    } catch (error) {
      log("style err", error);
    }
  }

  // src/content/styles.js
  var CONTENT_STYLES = `
#${POPUP_ID}{position:fixed;z-index:99999;box-sizing:border-box;width:calc(17.5rem * var(--mantine-scale,1));max-width:calc(100vw - 24px);padding:calc(.75rem * var(--mantine-scale,1));border-radius:calc(.75rem * var(--mantine-scale,1));background:var(--bg-body-1,var(--mantine-color-body,#fff)) !important;border:0;box-shadow:0 2px 12px rgba(0,0,0,.24);font-family:inherit;color:var(--tint-primary,var(--color-text-primary,#333)) !important;animation:jpIn .12s ease}
@keyframes jpIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
#${POPUP_ID} .jp-scroll{display:flex;flex-direction:column;gap:calc(.75rem * var(--mantine-scale,1));max-height:min(60vh,420px);overflow-y:auto;overscroll-behavior:contain}
#${POPUP_ID} .jp-head{display:grid;grid-template-columns:calc(3.5rem * var(--mantine-scale,1)) minmax(0,1fr);align-items:start;gap:calc(.75rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-av-link{position:relative;display:block;width:calc(3.5rem * var(--mantine-scale,1));height:calc(3.5rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-av{display:block;box-sizing:border-box;width:100%;height:100%;border:1px solid var(--tint-pic-border,rgba(0,0,0,.06));border-radius:50%;object-fit:cover}
#${POPUP_ID} .jp-sponsor-icon{position:absolute;right:calc(-.125rem * var(--mantine-scale,1));bottom:calc(-.125rem * var(--mantine-scale,1));width:calc(.875rem * var(--mantine-scale,1));height:calc(.875rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-info{display:grid;grid-auto-rows:max-content;gap:calc(.5rem * var(--mantine-scale,1));min-width:0;overflow:hidden}
#${POPUP_ID} .jp-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(1.25rem * var(--mantine-scale,1));line-height:calc(1.75rem * var(--mantine-scale,1));font-weight:650;color:var(--tint-primary,var(--color-text-primary,#333)) !important;text-decoration:none}
#${POPUP_ID} .jp-name:hover{text-decoration:underline}
#${POPUP_ID} .jp-stats{display:flex;align-items:center;gap:calc(.5rem * var(--mantine-scale,1));font-size:calc(.875rem * var(--mantine-scale,1));line-height:calc(1.25rem * var(--mantine-scale,1));color:var(--tint-secondary,var(--color-text-secondary,#808080)) !important}
#${POPUP_ID} .jp-stats>span{display:inline-flex;align-items:center;gap:calc(.125rem * var(--mantine-scale,1));white-space:nowrap}
#${POPUP_ID} .jp-stats span{color:inherit !important}
#${POPUP_ID} .jp-stats b{font-weight:500;color:var(--tint-primary,var(--color-text-primary,#333)) !important}
#${POPUP_ID} .jp-tags{display:flex;flex-wrap:wrap;gap:calc(.25rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-tag{display:flex;align-items:center;box-sizing:border-box;height:calc(1rem * var(--mantine-scale,1));padding:calc(.125rem * var(--mantine-scale,1)) calc(.375rem * var(--mantine-scale,1));border-radius:calc(1.25rem * var(--mantine-scale,1));font-size:calc(.625rem * var(--mantine-scale,1));line-height:calc(.75rem * var(--mantine-scale,1));white-space:nowrap;background:var(--bg-on-body-2,#f0f3f5) !important;color:var(--tint-primary,#333) !important}
#${POPUP_ID} .jp-tag img{display:block;width:calc(.75rem * var(--mantine-scale,1));height:calc(.75rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-gender-m{background:var(--solid-label-male,rgba(3,169,244,.5)) !important;color:#fff !important}
#${POPUP_ID} .jp-gender-f{background:var(--solid-label-female,rgba(252,104,157,.5)) !important;color:#fff !important}
#${POPUP_ID} .jp-bio{font-size:calc(.875rem * var(--mantine-scale,1));line-height:calc(1.25rem * var(--mantine-scale,1));color:var(--tint-secondary,var(--color-text-secondary,#808080)) !important;white-space:normal;overflow-wrap:anywhere}
#${POPUP_ID} .jp-follow{align-self:flex-start;box-sizing:border-box;min-width:calc(3.5625rem * var(--mantine-scale,1));height:calc(1.875rem * var(--mantine-scale,1));padding:calc(.25rem * var(--mantine-scale,1)) calc(.875rem * var(--mantine-scale,1));border-radius:calc(6.25rem * var(--mantine-scale,1));border:1px solid transparent;background:var(--mantine-color-yellow-filled,#ffe411);font-family:inherit;font-size:calc(.875rem * var(--mantine-scale,1));line-height:calc(1.375rem * var(--mantine-scale,1));font-weight:400;cursor:pointer;color:var(--solid-gray-4,#333);transition:background-color .15s}
#${POPUP_ID} .jp-follow:hover{filter:brightness(.96)}
#${POPUP_ID} .jp-follow.jp-following{border-color:var(--tint-separator,#d9d9d9);background:transparent;color:var(--tint-primary,#333) !important}
#${POPUP_ID} .jp-status{padding:6px 2px 2px}
#${POPUP_ID} .jp-status-title{font-size:14px;font-weight:700;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important}
#${POPUP_ID} .jp-status-text{margin-top:6px;font-size:13px;line-height:1.5;color:var(--mantine-color-dimmed,var(--color-text-secondary,#5a5e66)) !important}
#${POPUP_ID} .jp-skeleton{position:relative;overflow:hidden;background:rgba(15,23,42,.08);border-radius:999px}
#${POPUP_ID} .jp-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent);animation:jpShimmer 1.2s infinite}
#${POPUP_ID} .jp-skeleton-avatar{width:calc(3.5rem * var(--mantine-scale,1));height:calc(3.5rem * var(--mantine-scale,1));border-radius:50%}
#${POPUP_ID} .jp-skeleton-group{gap:8px;padding-top:2px}
#${POPUP_ID} .jp-skeleton-line{height:10px;margin-top:10px}
#${POPUP_ID} .jp-skeleton-name{width:124px;margin-top:0}
#${POPUP_ID} .jp-skeleton-meta{width:148px}
#${POPUP_ID} .jp-skeleton-line-short{width:72%}
#${POPUP_ID} .jp-skeleton-chip{width:44px;height:calc(1rem * var(--mantine-scale,1));border-radius:10px}
#${POPUP_ID} .jp-skeleton-chip-wide{width:76px}
#${POPUP_ID} .jp-skeleton-button{width:84px;height:32px;margin-top:10px}
@keyframes jpShimmer{100%{transform:translateX(100%)}}
#${POPUP_ID}.jp-dark{background:var(--bg-body-1,#1d1f24) !important;box-shadow:0 2px 12px rgba(0,0,0,.24);color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-name,#${POPUP_ID}.jp-dark .jp-stats b,#${POPUP_ID}.jp-dark .jp-status-title{color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-bio,#${POPUP_ID}.jp-dark .jp-stats{color:var(--tint-secondary,#b7bfcc) !important}
#${POPUP_ID}.jp-dark .jp-tag{background:var(--bg-on-body-2,#2a2d35) !important;color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-gender-m{background:var(--solid-label-male,rgba(3,169,244,.5)) !important;color:#fff !important}
#${POPUP_ID}.jp-dark .jp-gender-f{background:var(--solid-label-female,rgba(252,104,157,.5)) !important;color:#fff !important}
#${POPUP_ID}.jp-dark .jp-follow.jp-following{color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-status-text{color:var(--tint-secondary,#b7bfcc) !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-skeleton,#${POPUP_ID}.jp-dark .jp-skeleton{background:rgba(255,255,255,.09)}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-skeleton::after,#${POPUP_ID}.jp-dark .jp-skeleton::after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)}
.mantine-HoverCard-dropdown [class*="_bio"],.mantine-HoverCard-dropdown [class*="_briefIntro"],.mantine-HoverCard-dropdown [class*="_desc"]{-webkit-line-clamp:unset !important;display:block !important;overflow:visible !important;max-height:none !important;text-overflow:unset !important}
.jp-window-scroll-bridge{overflow-y:auto !important;scrollbar-width:none}
.jp-window-scroll-bridge::-webkit-scrollbar{display:none}
.jp-window-scroll-bridge body{min-height:100vh !important;overflow:visible !important}
.jp-window-scroll-bridge #root{position:fixed !important;inset:0 !important;width:100% !important;height:100% !important;overflow:hidden !important}
#${WINDOW_SCROLL_BRIDGE_ID}{display:block !important;width:1px !important;min-height:100vh !important;pointer-events:none !important;opacity:0 !important}
.jp-keyboard-scroll-target:focus{outline:none}
.jp-lightbox-zoom-button svg{display:block;width:22px;height:22px}
.jp-lightbox-zoom-button:disabled{opacity:.45;cursor:default}
.yarl__slide_image.jp-lightbox-zoomed{max-width:none;will-change:transform;touch-action:none;user-select:none}
.yarl__slide_image.jp-lightbox-dragging{cursor:grabbing}
`;
  function installContentStyles() {
    if (document.getElementById("jike-polish-css")) return;
    const style = document.createElement("style");
    style.id = "jike-polish-css";
    style.textContent = CONTENT_STYLES;
    document.head.appendChild(style);
  }

  // src/content.js
  function boot() {
    installContentStyles();
    injectPageBridge();
    setTimeout(() => injectPageBridge({ force: true }), 1800);
    installLayoutEnhancements();
    void injectUserStyle().then(scheduleLayoutSync);
    installLightboxZoom();
    installScrollEnhancements();
    installProfileCards();
    log("ready");
  }
  boot();
})();
