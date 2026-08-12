import { MAIN_SCROLL_VIEWPORT_SELECTOR } from "./constants.js";
import { syncKeyboardScrollTarget, syncWindowScrollBridge } from "./scroll.js";

const POST_DETAIL_PATH = /\/u\/[^/]+\/(?:post|repost)\//i;
const NAV_DESKTOP_STACK_SELECTOR = '.mantine-ScrollArea-content > [class*="_desktopStack_"]';
const SCROLL_CONTENT_SELECTOR = ".mantine-ScrollArea-content";
const SCROLL_CONTENT_CHILD_LIST_OBSERVER = { childList: true, subtree: false };
const LAYOUT_SYNC_DELAYS = [0, 55, 160, 320];

let layoutSyncTimers = [];
let childResizeObserver = null;
let childResizeDebounce = 0;
let observedScrollChildren = new Set();
let layoutWidthResizeObserver = null;
let observedLayoutViewport = null;
let scrollContentObserver = null;
let observedScrollContent = null;

function syncPostDetailLayoutClass() {
  document.documentElement.classList.toggle("jp-detail-post", POST_DETAIL_PATH.test(location.pathname));
}

/** Read the narrowest viewport measurement so the CSS layout excludes every scrollbar. */
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

  const left = getComputedStyle(document.documentElement)
    .getPropertyValue("--jp-nav-left")
    .trim();
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
    content ? Array.from(content.children).filter((node) => node instanceof Element) : [],
  );
  observedScrollChildren = replaceObservedElements(
    childResizeObserver,
    observedScrollChildren,
    children,
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

/** Wait through React's immediate, frame, and delayed SPA commits before finalizing layout. */
export function scheduleLayoutSync() {
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
    history[key] = function (...args) {
      const result = original.apply(history, args);
      scheduleLayoutSync();
      return result;
    };
  }
  bindScrollContentObserver();
}

export function installLayoutEnhancements() {
  installSpaLocationHook();
  installLayoutWidthTracking();
}
