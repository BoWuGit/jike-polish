import assert from "node:assert/strict";
import test from "node:test";

import { giftCommentPath, handleGiftCardClick } from "../src/page-bridge/gift-card.js";

const comment = {
  type: "COMMENT",
  id: "c123",
  user: { username: "comment-author" },
  link: "jike://page.jk/originalPost/abc123?locateCommentId=c123",
};

test("a comment gift links to the comment detail under its parent post", () => {
  assert.equal(giftCommentPath(comment), "/u/comment-author/post/abc123/c123");
});

test("other gifts and incomplete or mismatched comment links fall through", () => {
  for (const target of [
    null,
    { ...comment, type: "ORIGINAL_POST" },
    { ...comment, user: {} },
    { ...comment, link: undefined },
    { ...comment, link: "jike://page.jk/originalPost/abc123" },
    { ...comment, link: "jike://page.jk/originalPost/abc123?locateCommentId=other" },
  ]) {
    assert.equal(giftCommentPath(target), "");
  }
});

test("a reused card opens its current gift and leaves other clicks to Jike", (t) => {
  const visits = [];
  globalThis.window = {
    open: (...args) => visits.push(args),
    location: { assign: (path) => visits.push([path]) },
  };
  t.after(() => { delete globalThis.window; });
  const data = { action: "USER_ENDOW", endowTarget: comment };
  const owner = { __reactProps$test: { children: { props: { data } } } };
  const card = { parentElement: owner };
  const event = {
    button: 0, metaKey: true, target: { closest: () => card },
    preventDefault() {}, stopPropagation() {},
  };
  handleGiftCardClick(event);
  event.metaKey = false;
  handleGiftCardClick(event);
  data.endowTarget = { ...comment, type: "ORIGINAL_POST" };
  handleGiftCardClick(event);
  const path = "/u/comment-author/post/abc123/c123";
  assert.deepEqual(visits, [[path, "_blank", "noopener"], [path]]);
});
