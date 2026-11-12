import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
  entryPoints: [new URL("../src/page-bridge/quote-card.js", import.meta.url).pathname],
  bundle: true, write: false, format: "iife", globalName: "quoteCard",
});

// Only model the DOM operations needed by card rendering. Network timing stays under test control.
class Element {
  children = [];
  dataset = {};
  className = "";
  style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
  classList = {
    contains: (name) => this.className.split(" ").includes(name),
    toggle: (name, enabled) => {
      const names = new Set(this.className.split(" ").filter(Boolean));
      if (enabled) names.add(name);
      else names.delete(name);
      this.className = [...names].join(" ");
    },
  };
  get nextSibling() {
    const siblings = this.parentElement?.children || [];
    return siblings[siblings.indexOf(this) + 1] || null;
  }
  setAttribute(name, value) { this[name] = value; }
  removeAttribute(name) { delete this[name]; }
  addEventListener() {}
  appendChild(child) { this.insertBefore(child, null); }
  insertBefore(child, next) {
    child.remove();
    const index = next ? this.children.indexOf(next) : this.children.length;
    this.children.splice(index, 0, child);
    child.parentElement = this;
  }
  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }
  replaceWith(child) { this.parentElement.insertBefore(child, this); this.remove(); }
  querySelector(selector) {
    for (const child of this.children) {
      if (child.classList.contains(selector.slice(1))) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}

function fixture(data, fetchImpl = async () => assert.fail("Unexpected API request")) {
  const card = new Element();
  card.__reactFiber$test = { memoizedProps: { data } };
  const nativeFooter = new Element();
  nativeFooter.className = "native-footer";
  card.appendChild(nativeFooter);
  const context = vm.createContext({
    HTMLElement: Element, URL, URLSearchParams,
    localStorage: { getItem: () => null },
    location: { href: "https://web.okjike.com/" },
    document: { createElement: () => new Element(), contains: (node) => node === card },
    fetch: fetchImpl,
  });
  vm.runInContext(outputFiles[0].text, context);
  return {
    card, nativeFooter,
    sync: () => context.quoteCard.syncQuoteCard(card),
    setData: (next) => { card.__reactFiber$test.memoizedProps.data = next; },
  };
}

function post(overrides = {}) {
  return { id: "post", type: "ORIGINAL_POST", user: {}, pictures: [], ...overrides };
}

function link(overrides = {}) {
  return { title: "Title", linkUrl: "https://example.com/", pictureUrl: "https://cdn.example/cover.jpg", ...overrides };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("link metadata refreshes even when the shared URL stays unchanged", async () => {
  const data = post({ linkInfo: link() });
  const { card, sync } = fixture(data);
  await sync();
  data.linkInfo = link({ title: "Updated", pictureUrl: "https://cdn.example/new.jpg", audio: { author: "Author" } });
  await sync();
  assert.equal(card.querySelector(".jp-repost-link-title").textContent, "Updated");
  assert.equal(card.querySelector(".jp-repost-link-image").src, "https://cdn.example/new.jpg");
  assert.equal(card.querySelector(".jp-repost-link-footer").textContent, "Author");
  assert.equal(card.querySelector(".jp-repost-link").classList.contains("jp-audio-card"), true);
});

test("image URLs and geometry refresh even when the picture key stays unchanged", async () => {
  const data = post({ pictures: [{ key: "same", picUrl: "https://cdn.example/old.jpg", width: 200, height: 200 }] });
  const { card, sync } = fixture(data);
  await sync();
  data.pictures = [{ key: "same", picUrl: "https://cdn.example/new.jpg", width: 400, height: 200 }];
  await sync();
  assert.equal(card.querySelector(".jp-repost-media-img").src, "https://cdn.example/new.jpg");
  assert.equal(card.querySelector(".jp-repost-media").style["--jp-repost-media-aspect-ratio"], "400 / 200");
});

test("attachment ordering preserves native children and unchanged video playback", async () => {
  const data = post({
    pictures: [{ picUrl: "https://cdn.example/image.jpg" }],
    video: { source: ["https://cdn.example/video.mp4"], thumbnailUrl: "https://cdn.example/poster.jpg" },
  });
  const { card, nativeFooter, sync } = fixture(data);
  const main = new Element();
  main.className = "_main_1kp3y_9";
  card.insertBefore(main, nativeFooter);
  await sync();
  const video = card.querySelector(".jp-repost-video");
  data.linkInfo = link();
  await sync();
  assert.deepEqual(card.children.map((child) => child.className), [
    "_main_1kp3y_9", "jp-repost-link", "jp-repost-media", "jp-repost-video", "native-footer",
  ]);
  assert.equal(card.querySelector(".jp-repost-video"), video);
  data.video.thumbnailUrl = "https://cdn.example/new-poster.jpg";
  await sync();
  assert.equal(card.querySelector(".jp-repost-video"), video);
  assert.equal(video.poster, "https://cdn.example/new-poster.jpg");
  delete data.video;
  delete data.linkInfo;
  data.pictures = [];
  await sync();
  assert.deepEqual(card.children, [main, nativeFooter]);
});

test("an older video lookup cannot overwrite a newer scan of the same post", async () => {
  const response = deferred();
  const old = post({ video: { source: [] } });
  const { card, sync } = fixture(old, async () => response.promise);
  const pending = sync();
  old.video = { source: ["https://cdn.example/new.mp4"] };
  await sync();
  response.resolve(Response.json({ url: "https://cdn.example/old.mp4" }));
  await pending;
  assert.equal(card.querySelector(".jp-repost-video").src, "https://cdn.example/new.mp4");
});

test("detail results are discarded when React replaces props for the same post", async () => {
  const response = deferred();
  const data = post();
  delete data.pictures;
  const { card, setData, nativeFooter, sync } = fixture(data, async () => response.promise);
  const pending = sync();
  setData(post());
  response.resolve(Response.json({ data: post({ linkInfo: link() }) }));
  await pending;
  assert.deepEqual(card.children, [nativeFooter]);
});

test("video and link detail lookups start independently", async () => {
  const detailResponse = deferred();
  const videoResponse = deferred();
  const urls = [];
  const { card, sync } = fixture(post({
    video: { source: [] }, linkInfo: link({ pictureUrl: "" }),
  }), async (url) => {
    urls.push(String(url));
    return String(url).includes("mediaMeta") ? videoResponse.promise : detailResponse.promise;
  });
  const pending = sync();
  assert.equal(urls.length, 2);
  assert.ok(urls.some((url) => url.includes("mediaMeta")));
  assert.ok(urls.some((url) => url.includes("originalPosts/get")));
  detailResponse.resolve(Response.json({ data: post({ linkInfo: link() }) }));
  videoResponse.resolve(Response.json({ url: "https://cdn.example/video.mp4" }));
  await pending;
  assert.equal(card.querySelector(".jp-repost-link-image").src, "https://cdn.example/cover.jpg");
  assert.equal(card.querySelector(".jp-repost-video").src, "https://cdn.example/video.mp4");
});

test("a second repost groups the original author, text and attachments in their own quote", async () => {
  const target = post({
    id: "original", user: { screenName: "Original author", username: "original-user" },
    content: "Original text\n\nSecond paragraph",
    pictures: [{ picUrl: "https://cdn.example/original.jpg" }],
    linkInfo: link(), video: { source: ["https://cdn.example/original.mp4"] },
  });
  const { card, nativeFooter, sync } = fixture(post({ type: "REPOST", target }));
  await sync();
  const source = card.querySelector(".jp-repost-source");
  assert.deepEqual(card.children, [nativeFooter, source]);
  assert.equal(source["aria-label"], "Original author的动态");
  assert.equal(source.querySelector(".jp-repost-source-name").textContent, "Original author");
  assert.equal(source.querySelector(".jp-repost-source-name").href,
    "https://web.okjike.com/u/original-user");
  assert.equal(source.querySelector(".jp-repost-source-avatar").href,
    "https://web.okjike.com/u/original-user");
  assert.equal(source.querySelector(".jp-repost-source-content").textContent, target.content);
  assert.equal(source.querySelector(".jp-repost-source-content").href,
    "https://web.okjike.com/u/original-user/post/original");
  assert.equal(source.querySelector(".jp-repost-media-img").src, target.pictures[0].picUrl);
  assert.equal(source.querySelector(".jp-repost-video").src, target.video.source[0]);
  assert.ok(source.querySelector(".jp-repost-link"));
});

test("target attribution is recovered from detail even when the repost has its own attachments", async () => {
  const target = post({ id: "original", content: "Original text", linkInfo: link() });
  const data = post({ type: "REPOST", pictures: [{ picUrl: "https://cdn.example/reposter.jpg" }] });
  let requests = 0;
  const { card, sync } = fixture(data, async () => {
    requests++;
    return Response.json({ data: { ...data, target } });
  });
  await sync();
  assert.equal(requests, 1);
  const source = card.querySelector(".jp-repost-source");
  assert.ok(source.querySelector(".jp-repost-link"));
  assert.equal(source.querySelector(".jp-repost-media"), null);
  assert.equal(card.children.find((child) => child.className === "jp-repost-media")
    .querySelector(".jp-repost-media-img").src, data.pictures[0].picUrl);
});

test("target updates preserve playback and remove obsolete quote layers when props change", async () => {
  const target = post({
    id: "original", user: { screenName: "Author" }, content: "Text",
    video: { source: ["https://cdn.example/original.mp4"] },
  });
  const data = post({ type: "REPOST", target });
  const { card, setData, nativeFooter, sync } = fixture(data);
  await sync();
  const source = card.querySelector(".jp-repost-source");
  const video = source.querySelector(".jp-repost-video");
  await sync();
  assert.equal(card.querySelector(".jp-repost-source"), source);
  assert.equal(card.querySelector(".jp-repost-video"), video);
  target.user.screenName = "Renamed author";
  target.content = "Updated text";
  await sync();
  assert.equal(card.querySelector(".jp-repost-source")["aria-label"], "Renamed author的动态");
  assert.equal(card.querySelector(".jp-repost-source-content").textContent, "Updated text");
  assert.equal(card.querySelector(".jp-repost-video"), video);
  setData(post({ type: "REPOST", target: null }));
  await sync();
  assert.deepEqual(card.children, [nativeFooter]);
});

test("text-only targets still retain attribution and repost targets link to their own details", async () => {
  const target = post({
    id: "another-repost", type: "REPOST", user: { username: "user", screenName: "Reposter" },
    content: "Comment on an earlier post", target: null,
  });
  const { card, sync } = fixture(post({ type: "REPOST", target }));
  await sync();
  assert.equal(card.querySelector(".jp-repost-source")["aria-label"], "Reposter的转发");
  assert.equal(card.querySelector(".jp-repost-source-content").href,
    "https://web.okjike.com/u/user/repost/another-repost");
});
