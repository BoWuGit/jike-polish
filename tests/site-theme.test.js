import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("the website exposes a CSP-safe theme mode control", async () => {
  const [homepage, privacy, notFound, styles, headers] = await Promise.all([
    source("site/index.html"),
    source("site/privacy/index.html"),
    source("site/404.html"),
    source("site/styles.css"),
    source("site/_headers"),
  ]);

  for (const page of [homepage, privacy, notFound]) {
    assert.match(page, /<script src="\/theme\.js\?v=theme-auto"><\/script>/);
    assert.ok(page.indexOf("/theme.js") < page.indexOf("/styles.css"));
  }

  for (const page of [homepage, privacy]) {
    assert.match(page, /<button class="theme-toggle"[^>]+data-theme-toggle/);
    assert.match(page, /class="theme-icon-auto"/);
    assert.match(page, /class="theme-icon-light"/);
    assert.match(page, /class="theme-icon-dark"/);
  }

  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /:root\[data-theme-mode="auto"\] \.theme-icon-auto/);
  assert.match(headers, /script-src 'self'/);
  assert.doesNotMatch(headers, /script-src[^;]*'unsafe-inline'/);
});

test("the theme control cycles through auto, light, and dark modes", async () => {
  const script = await source("site/theme.js");
  const listeners = new Map();
  const attributes = new Map();
  const storage = new Map();
  const button = {
    dataset: {},
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
  const themeColor = { content: "" };
  const root = {
    dataset: {},
    style: {},
    classList: { add() {} },
  };
  let ready;
  let mediaChange;
  const media = {
    matches: false,
    addEventListener(type, listener) {
      if (type === "change") mediaChange = listener;
    },
  };
  const context = {
    document: {
      documentElement: root,
      querySelector(selector) {
        if (selector === "[data-theme-toggle]") return button;
        if (selector === 'meta[name="theme-color"]') return themeColor;
        return null;
      },
      addEventListener(type, listener) {
        if (type === "DOMContentLoaded") ready = listener;
      },
    },
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
    matchMedia() {
      return media;
    },
  };

  vm.runInNewContext(script, context);
  ready();

  assert.equal(root.dataset.themeMode, "auto");
  assert.equal(root.dataset.theme, "light");
  assert.equal(button.dataset.themeMode, "auto");
  assert.match(attributes.get("aria-label"), /显示模式：自动（跟随系统）/);

  listeners.get("click")();

  assert.equal(root.dataset.themeMode, "light");
  assert.equal(root.dataset.theme, "light");
  assert.equal(storage.get("yueshang-theme"), "light");
  assert.match(attributes.get("aria-label"), /切换到深色模式/);

  listeners.get("click")();

  assert.equal(root.dataset.themeMode, "dark");
  assert.equal(root.dataset.theme, "dark");
  assert.equal(storage.get("yueshang-theme"), "dark");
  assert.equal(themeColor.content, "#0b1020");

  listeners.get("click")();

  assert.equal(root.dataset.themeMode, "auto");
  assert.equal(root.dataset.theme, "light");
  assert.equal(storage.has("yueshang-theme"), false);

  media.matches = true;
  mediaChange();

  assert.equal(root.dataset.themeMode, "auto");
  assert.equal(root.dataset.theme, "dark");
  assert.equal(themeColor.content, "#0b1020");
});
