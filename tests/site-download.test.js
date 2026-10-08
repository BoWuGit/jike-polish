import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../site/download.js", import.meta.url), "utf8");
const chromium = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36";
const safari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";

function render(navigator) {
  const listeners = {};
  const label = { textContent: "选择浏览器" };
  const note = { hidden: true };
  const recommended = { hidden: true, append(card) { this.card = card; } };
  const cards = Object.fromEntries(["chrome", "safari", "edge", "firefox"].map((browser) => [browser, {
    hidden: false,
    cloneNode() {
      const name = { textContent: browser };
      return { browser, classList: { add() {} }, querySelector() { return name; }, name };
    },
  }]));
  const summary = { focus() { this.focused = true; } };
  const picker = {
    open: true,
    querySelector(selector) {
      if (selector === "summary") return summary;
      if (selector === "[data-browser-picker-label]") return label;
      return cards[selector.match(/data-browser="(\w+)"/)?.[1]];
    },
    contains(target) { return target === summary; },
    addEventListener(type, listener) { listeners[type] = listener; },
  };
  const download = {
    dataset: {},
    querySelector(selector) {
      return { ".browser-picker": picker, "[data-browser-recommended]": recommended, "[data-download-note]": note }[selector];
    },
  };
  const document = {
    activeElement: summary,
    querySelector() { return download; },
    addEventListener(type, listener) { listeners[type] = listener; },
  };
  vm.runInNewContext(script, { navigator, document });
  return { download, picker, label, note, recommended, cards, summary, listeners };
}

test("desktop browsers get their own collapsed install entry", () => {
  const cases = [
    [chromium, "chrome"],
    [`${chromium} Edg/140.0.0.0`, "edge"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0", "firefox"],
    [safari, "safari"],
  ];
  for (const [userAgent, expected] of cases) {
    const result = render({ userAgent });
    assert.equal(result.download.dataset.browser, expected);
    assert.equal(result.recommended.card.browser, expected);
    assert.equal(result.recommended.card.name.textContent, `添加到 ${expected}`);
    assert.equal(result.recommended.hidden, false);
    assert.equal(result.cards[expected].hidden, true);
    assert.equal(result.picker.open, false);
    assert.equal(result.label.textContent, "其他浏览器");
  }
});

test("Edge client hints take priority over its shared Chromium UA", () => {
  const result = render({
    userAgent: chromium,
    userAgentData: { brands: [{ brand: "Chromium" }, { brand: "Microsoft Edge" }] },
  });
  assert.equal(result.download.dataset.browser, "edge");
});

test("mobile and iPad desktop mode retain all desktop options", () => {
  const cases = [
    { userAgent: chromium.replace("Windows NT 10.0; Win64; x64", "Linux; Android 14") },
    { userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/140.0 Mobile Safari/604.1" },
    { userAgent: safari, maxTouchPoints: 5 },
    { userAgent: chromium, userAgentData: { mobile: true } },
  ];
  for (const navigator of cases) {
    const result = render(navigator);
    assert.equal(result.recommended.hidden, true);
    assert.equal(result.picker.open, true);
    assert.equal(result.label.textContent, "选择桌面浏览器");
    assert.equal(result.note.hidden, false);
    assert.ok(Object.values(result.cards).every((card) => !card.hidden));
  }
});

test("unrecognized browsers retain a neutral complete selection", () => {
  for (const userAgent of ["", "Unknown browser", `${chromium} OPR/120.0`, safari.replace("Macintosh", "Windows")]) {
    const result = render({ userAgent });
    assert.equal(result.recommended.hidden, true);
    assert.equal(result.picker.open, true);
    assert.equal(result.label.textContent, "选择浏览器");
  }
});

test("browser picker closes on outside click, Escape, or focus leaving", () => {
  const { picker, summary, listeners } = render({ userAgent: chromium });
  picker.open = true;
  listeners.click({ target: summary });
  assert.equal(picker.open, true);
  listeners.click({ target: {} });
  assert.equal(picker.open, false);
  picker.open = true;
  listeners.keydown({ key: "Escape" });
  assert.equal(picker.open, false);
  assert.equal(summary.focused, true);
  picker.open = true;
  listeners.focusout({ relatedTarget: {} });
  assert.equal(picker.open, false);
});
