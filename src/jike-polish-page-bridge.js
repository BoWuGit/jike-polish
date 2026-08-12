import { QUOTE_CARD_SELECTOR, syncQuoteCard } from "./page-bridge/quote-card.js";

const BRIDGE_KEY = "__JIKE_POLISH_REPOST_MEDIA_BRIDGE__";
const WARMUP_SCAN_DELAYS = [120, 360, 800, 1600, 3000, 5000];
const PERIODIC_SCAN_DELAY = 1800;

function installPageBridge() {
  const existingBridge = window[BRIDGE_KEY];
  if (typeof existingBridge?.rescan === "function") {
    existingBridge.rescan();
    return;
  }

  const bridge = { rescan: null };
  window[BRIDGE_KEY] = bridge;
  let scanTimer = 0;

  function scanQuoteCards() {
    for (const card of document.querySelectorAll(QUOTE_CARD_SELECTOR)) {
      void syncQuoteCard(card);
    }
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = 0;
      scanQuoteCards();
    }, 32);
  }

  function scheduleWarmupScans() {
    scheduleScan();
    for (const delay of WARMUP_SCAN_DELAYS) setTimeout(scheduleScan, delay);
  }

  bridge.rescan = scheduleWarmupScans;
  scheduleWarmupScans();
  window.addEventListener("pageshow", scheduleWarmupScans);
  setInterval(scheduleScan, PERIODIC_SCAN_DELAY);

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
}

installPageBridge();
