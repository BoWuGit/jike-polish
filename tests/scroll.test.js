import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
  entryPoints: [new URL("../src/content/scroll.js", import.meta.url).pathname],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "scrollEnhancements",
});

function scrollFixture() {
  class Element {
    scrollTop = 0;
    scrollHeight = 30000;
    clientHeight = 800;
    style = {};
    classList = { add() {}, remove() {} };
    listeners = new Map();
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    removeEventListener(type) { this.listeners.delete(type); }
    setAttribute() {}
    hasAttribute() { return true; }
    appendChild() {}
    remove() {}
    emitScroll() { this.listeners.get("scroll")?.(); }
  }

  const main = new Element();
  const root = new Element();
  const spacer = new Element();
  const window = new Element();
  const frames = [];
  const document = {
    body: new Element(),
    documentElement: root,
    scrollingElement: root,
    hasFocus: () => false,
    querySelectorAll: (selector) => selector.includes("ScrollArea") ? [main] : [],
    getElementById: () => spacer,
    addEventListener() {},
  };
  const context = vm.createContext({
    document,
    window,
    Element,
    HTMLElement: Element,
    MutationObserver: class { observe() {} },
    requestAnimationFrame: (callback) => frames.push(callback),
  });
  vm.runInContext(outputFiles[0].text, context);
  const flushFrames = () => {
    for (const callback of frames.splice(0)) callback();
  };
  main.scrollTop = 20000;
  context.scrollEnhancements.installScrollEnhancements();
  flushFrames();
  root.emitScroll = () => window.emitScroll();
  root.emitScroll();
  flushFrames();
  return { main, root, flushFrames, syncBridge: context.scrollEnhancements.syncWindowScrollBridge };
}

test("a delayed mirrored scroll event does not rewind Vimium's next animation frame", () => {
  const { main, root, flushFrames } = scrollFixture();
  root.scrollTop = 18000;
  root.emitScroll();
  assert.equal(main.scrollTop, 18000);

  flushFrames();
  root.scrollTop = 16000;
  // The previous main scroll event arrives after Vimium advances the document.
  main.emitScroll();
  assert.equal(root.scrollTop, 16000);
  root.emitScroll();
  assert.equal(main.scrollTop, 16000);

  // A new animation step must also work before the next animation frame.
  root.scrollTop = 0;
  root.emitScroll();
  main.emitScroll();
  assert.equal(main.scrollTop, 0);
  assert.equal(root.scrollTop, 0);
});

test("new main scroll input is forwarded while a mirrored window event is pending", () => {
  const { main, root, flushFrames } = scrollFixture();
  main.scrollTop = 18000;
  main.emitScroll();
  flushFrames();

  main.scrollTop = 16000;
  root.emitScroll();
  assert.equal(main.scrollTop, 16000);
  main.emitScroll();
  assert.equal(root.scrollTop, 16000);
});

test("revisiting the same position after changing scroll direction still synchronizes", () => {
  const { main, root } = scrollFixture();
  root.scrollTop = 25000;
  root.emitScroll();
  main.emitScroll();

  for (const top of [0, 25000, 0, 25000]) {
    main.scrollTop = top;
    main.emitScroll();
    root.emitScroll();
    assert.equal(root.scrollTop, top);
    assert.equal(main.scrollTop, top);
  }
});

test("layout updates preserve a pending Vimium scroll before its scroll event", () => {
  const { main, root, syncBridge } = scrollFixture();
  for (const top of [18000, 12000, 5000, 0, 10000, 25000]) {
    root.scrollTop = top;
    // React updates and resize observers refresh the bridge during animations.
    syncBridge();
    syncBridge();
    assert.equal(root.scrollTop, top);
    root.emitScroll();
    main.emitScroll();
    assert.equal(main.scrollTop, top);
  }
});
