import { log } from "../shared/debug.js";

const PAGE_BRIDGE_SCRIPT = "jike-polish-page-bridge.js";

function extensionRuntime() {
  return globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
}

export function injectPageBridge({ force = false } = {}) {
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

export async function injectUserStyle() {
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
    const inner = raw
      .replace(/\/\*[\s\S]*?==\/UserStyle== \*\//, "")
      .match(/@-moz-document\s+domain\("web\.okjike\.com"\)\s*\{([\s\S]*)\}\s*$/)?.[1] || raw;
    const style = document.createElement("style");
    style.id = "jike-polish-userstyle";
    style.textContent = inner;
    document.head.appendChild(style);
  } catch (error) {
    log("style err", error);
  }
}
