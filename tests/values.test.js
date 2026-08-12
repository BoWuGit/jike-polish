import assert from "node:assert/strict";
import test from "node:test";

import { safeHttpUrl, stringValue } from "../src/shared/values.js";

test("stringValue accepts only trimmed strings", () => {
  assert.equal(stringValue("  value  "), "value");
  assert.equal(stringValue(42), "");
  assert.equal(stringValue(null), "");
});

test("safeHttpUrl resolves HTTP URLs and rejects executable protocols", () => {
  assert.equal(
    safeHttpUrl(" /image.png ", "https://web.okjike.com/post/1"),
    "https://web.okjike.com/image.png",
  );
  assert.equal(safeHttpUrl("https://cdn.example/image.png"), "https://cdn.example/image.png");
  assert.equal(safeHttpUrl("javascript:alert(1)", "https://web.okjike.com"), "");
  assert.equal(safeHttpUrl("data:text/html,unsafe", "https://web.okjike.com"), "");
  assert.equal(safeHttpUrl("not a url"), "");
});
