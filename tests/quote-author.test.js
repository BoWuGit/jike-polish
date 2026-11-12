import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../src/content/quote-author.js", import.meta.url), "utf8");

function fixture(rects = [{ left: 100, right: 180, top: 50, bottom: 74 }]) {
  const avatar = { href: "/u/reposter" };
  const name = { nodeType: 3, textContent: "Reposter", nextSibling: { textContent: ":" } };
  const main = { querySelector: () => avatar };
  const content = { firstChild: name, closest: () => main };
  const element = { closest: (selector) => selector === "._content_1kp3y_20" ? content : null };
  const avatarElement = { closest: (selector) => selector === "a._avatar_1kp3y_16" ? avatar : null };
  const context = vm.createContext({
    Node: { TEXT_NODE: 3 },
    document: {
      createRange: () => ({
        selectNodeContents: (node) => assert.equal(node, name),
        getClientRects: () => rects,
      }),
    },
  });
  vm.runInContext(source.replaceAll("export ", ""), context);
  return {
    avatar, name, content,
    hover: (clientX, clientY) => context.getQuoteAuthorLink(element, { clientX, clientY }),
    hoverAvatar: () => context.getQuoteAuthorLink(avatarElement),
  };
}

test("native quote name hovers identify the reposter without making the body a profile trigger", () => {
  const { avatar, hover } = fixture();
  assert.equal(hover(120, 60), avatar);
  assert.equal(hover(180, 60), null);
  assert.equal(hover(120, 80), null);
  assert.equal(hover(undefined, undefined), null);
});

test("avatar hover and keyboard focus resolve to the same popup anchor as the quote name", () => {
  const { avatar, hover, hoverAvatar } = fixture();
  assert.equal(hoverAvatar(), avatar);
  assert.equal(hoverAvatar(), hover(120, 60));
});

test("wrapped quote names remain hoverable on every visible line", () => {
  const { avatar, hover } = fixture([
    { left: 100, right: 180, top: 50, bottom: 74 },
    { left: 100, right: 130, top: 74, bottom: 98 },
  ]);
  assert.equal(hover(120, 85), avatar);
  assert.equal(hover(160, 85), null);
});

test("missing or changed native name markup does not mistake post text for an author", () => {
  const { name, content, hover } = fixture();
  name.nextSibling.textContent = "Post text";
  assert.equal(hover(120, 60), null);
  name.nextSibling.textContent = ":";
  name.nodeType = 1;
  assert.equal(hover(120, 60), null);
  content.firstChild = null;
  assert.equal(hover(120, 60), null);
});
