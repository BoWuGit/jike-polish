import { MAIN_SCROLL_VIEWPORT_SELECTOR, WINDOW_SCROLL_BRIDGE_ID } from "./constants.js";
import { getOpenLightbox } from "./lightbox.js";

const POST_LOCATION_SELECTOR = "._locationContainer_1mslw_69";
const KEYBOARD_SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  " ",
  "Spacebar",
  "Home",
  "End",
]);
const KEYBOARD_SCROLL_LINE_PX = 48;
const KEYBOARD_SCROLL_PAGE_RATIO = 0.9;
const SCROLL_SYNC_EPSILON = 1;

let scrollBridgeObserver = null;
let scrollBridgeRaf = 0;
let postLocationTooltipRaf = 0;
let scrollBridgeNeedsFocus = false;
let bridgedMainScroller = null;
let keyboardScrollTarget = null;
let syncingMainScroller = false;
let syncingWindowScroller = false;

function getMainScrollViewport() {
  return Array.from(document.querySelectorAll(MAIN_SCROLL_VIEWPORT_SELECTOR))
    .find((element) => (
      element instanceof HTMLElement
      && element.scrollHeight > element.clientHeight + 4
    )) || null;
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
  const documentClientHeight = getDocumentScroller().clientHeight
    || window.innerHeight
    || scroller.clientHeight;
  const scrollHeight = scroller.scrollHeight + documentClientHeight - scroller.clientHeight;
  const height = `${Math.ceil(Math.max(scrollHeight, documentClientHeight + 1))}px`;
  if (spacer.style.height !== height) spacer.style.height = height;
}

function syncWindowScrollToMainScroller(top) {
  const documentScroller = getDocumentScroller();
  if (Math.abs(documentScroller.scrollTop - top) <= SCROLL_SYNC_EPSILON) return;

  syncingWindowScroller = true;
  documentScroller.scrollTop = top;
  requestAnimationFrame(() => {
    syncingWindowScroller = false;
  });
}

function handleMainScrollerBridgeScroll() {
  if (syncingMainScroller) return;
  const scroller = syncWindowScrollBridge({ syncWindow: false });
  if (scroller) syncWindowScrollToMainScroller(scroller.scrollTop);
}

function bindWindowScrollBridgeScroller(scroller) {
  if (bridgedMainScroller === scroller) return;
  bridgedMainScroller?.removeEventListener("scroll", handleMainScrollerBridgeScroll);
  bridgedMainScroller = scroller;
  bridgedMainScroller.addEventListener("scroll", handleMainScrollerBridgeScroll, { passive: true });
}

function teardownWindowScrollBridge() {
  document.documentElement.classList.remove("jp-window-scroll-bridge");
  document.getElementById(WINDOW_SCROLL_BRIDGE_ID)?.remove();
  bridgedMainScroller?.removeEventListener("scroll", handleMainScrollerBridgeScroll);
  bridgedMainScroller = null;
  syncingMainScroller = false;
  syncingWindowScroller = false;
}

export function syncWindowScrollBridge({ syncWindow = true } = {}) {
  const scroller = getMainScrollViewport();
  if (!scroller) {
    teardownWindowScrollBridge();
    return null;
  }

  document.documentElement.classList.add("jp-window-scroll-bridge");
  syncWindowScrollBridgeHeight(scroller);
  bindWindowScrollBridgeScroller(scroller);
  if (syncWindow) syncWindowScrollToMainScroller(scroller.scrollTop);
  return scroller;
}

function handleWindowBridgeScroll() {
  if (syncingWindowScroller) return;
  const scroller = syncWindowScrollBridge({ syncWindow: false });
  if (!scroller) return;

  const top = getDocumentScroller().scrollTop;
  if (Math.abs(scroller.scrollTop - top) <= SCROLL_SYNC_EPSILON) return;
  syncingMainScroller = true;
  scroller.scrollTop = top;
  requestAnimationFrame(() => {
    syncingMainScroller = false;
  });
}

export function findScrollableContainer(startNode = document.body) {
  const start = startNode instanceof Element ? startNode : document.body;
  for (let element = start; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element);
    if (
      (overflowY === "auto" || overflowY === "scroll")
      && element.scrollHeight > element.clientHeight + 4
    ) return element;
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
    "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']",
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

export function syncKeyboardScrollTarget({ focus = false } = {}) {
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
  if (
    event.defaultPrevented
    || event.metaKey
    || event.ctrlKey
    || event.altKey
    || getOpenLightbox()
    || !scroller
  ) return false;

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
  const location = element.closest(POST_LOCATION_SELECTOR);
  if (!(location instanceof HTMLElement)) return;
  const label = location.querySelector(":scope > span");
  if (!(label instanceof HTMLElement)) return;

  if (label.scrollWidth > label.clientWidth + 1) {
    location.title = label.textContent?.trim() || "";
  } else {
    location.removeAttribute("title");
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
    ".mantine-HoverCard-dropdown, [class*='mantine-HoverCard-dropdown']",
  );
  if (!nativeCard) return;

  const scroller = findScrollableContainer(nativeCard);
  if (!scroller) return;
  event.preventDefault();
  scroller.scrollBy({
    top: event.deltaY,
    left: event.deltaX,
    behavior: "auto",
  });
}

export function installScrollEnhancements() {
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
