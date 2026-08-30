import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("the website exposes a CSP-safe manual theme control", async () => {
  const [homepage, privacy, notFound, styles, headers] = await Promise.all([
    source("site/index.html"),
    source("site/privacy/index.html"),
    source("site/404.html"),
    source("site/styles.css"),
    source("site/_headers"),
  ]);

  for (const page of [homepage, privacy, notFound]) {
    assert.match(page, /<script src="\/theme\.js"><\/script>/);
    assert.ok(page.indexOf('/theme.js') < page.indexOf('/styles.css'));
  }

  assert.match(homepage, /<button class="theme-toggle"[^>]+data-theme-toggle/);
  assert.match(privacy, /<button class="theme-toggle"[^>]+data-theme-toggle/);
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(headers, /script-src 'self'/);
  assert.doesNotMatch(headers, /script-src[^;]*'unsafe-inline'/);
});

test("the theme control switches and persists the selected scheme", async () => {
  const script = await source("site/theme.js");
  const listeners = new Map();
  const attributes = new Map();
  const storage = new Map();
  const button = {
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
  const media = {
    matches: false,
    addEventListener() {},
  };
  const context = {
    document: {
      documentElement: root,
      querySelector(selector) {
        if (selector === '[data-theme-toggle]') return button;
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
    },
    matchMedia() {
      return media;
    },
  };

  vm.runInNewContext(script, context);
  ready();

  assert.equal(root.dataset.theme, "light");
  assert.equal(attributes.get("aria-label"), "切换到深色模式");

  listeners.get("click")();

  assert.equal(root.dataset.theme, "dark");
  assert.equal(storage.get("yueshang-theme"), "dark");
  assert.equal(attributes.get("aria-label"), "切换到浅色模式");
  assert.equal(themeColor.content, "#0b1020");
});
