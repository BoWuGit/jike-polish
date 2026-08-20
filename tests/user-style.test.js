import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(new URL("../jike-twitter-font.user.css", import.meta.url), "utf8");

function rule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

test("repost card text uses Jike's theme-aware color tokens", () => {
  assert.match(rule("._root_1kp3y_1 ._content_1kp3y_20"), /color:\s*var\(--tint-primary,/);
  assert.match(rule("._root_1kp3y_1 .jp-repost-link-title"), /color:\s*var\(--tint-primary,/);
  assert.match(rule("._root_1kp3y_1 .jp-repost-link-footer"), /color:\s*var\(--tint-secondary,/);
});
