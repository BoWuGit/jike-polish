import assert from "node:assert/strict";
import test from "node:test";

import {
  getLinkInfo,
  getLinkSource,
  getNativeLinkInfo,
  getMediaSource,
  getPictures,
  getQuoteData,
  getVideoSource,
  linkImageUrl,
  pictureUrl,
  shouldFetchDetail,
  shouldFetchLinkImage,
} from "../src/page-bridge/post-data.js";

function post(overrides = {}) {
  return {
    id: "post-id",
    type: "ORIGINAL_POST",
    user: { id: "user-id" },
    ...overrides,
  };
}

test("picture helpers preserve the preferred single and grid image sizes", () => {
  const picture = {
    picUrl: "full",
    middlePicUrl: "middle",
    smallPicUrl: "small",
    thumbnailUrl: "thumbnail",
  };
  assert.equal(pictureUrl(picture, 1), "middle");
  assert.equal(pictureUrl(picture, 2), "small");
  assert.deepEqual(getPictures({ pictures: [picture, {}] }), [picture]);
});

test("attachment sources fall back from a repost to its target", () => {
  const target = post({
    id: "target-id",
    pictures: [{ picUrl: "https://cdn.example/full.jpg" }],
    video: { source: [] },
    linkInfo: { title: "Preview" },
  });
  const repost = post({ type: "REPOST", target });

  assert.equal(getMediaSource(repost), target);
  assert.equal(getVideoSource(repost), target);
  assert.equal(getLinkSource(repost), target);
});

test("link helpers require useful content and identify missing preview images", () => {
  assert.equal(getLinkInfo({ linkInfo: {} }), null);
  const source = post({ linkInfo: { title: "Audio", audio: { coverUrl: " cover " } } });
  assert.equal(linkImageUrl(source.linkInfo), "cover");
  assert.equal(shouldFetchLinkImage(source), false);
  assert.equal(shouldFetchLinkImage(post({ linkInfo: { title: "No image" } })), true);
});

test("detail fetch policy distinguishes absent fields from explicit empty fields", () => {
  assert.equal(shouldFetchDetail(post()), true);
  assert.equal(shouldFetchDetail(post({ pictures: [] })), false);
  assert.equal(shouldFetchDetail(post({ type: "REPOST" })), true);
  assert.equal(shouldFetchDetail(post({ type: "REPOST", target: null })), false);
});

test("quote data follows the owning React fiber chain", () => {
  const data = post();
  const card = {
    __reactFiber$test: {
      memoizedProps: {},
      return: { pendingProps: { data }, return: null },
    },
  };
  assert.equal(getQuoteData(card), data);
});

test("native link data comes from its own component rather than the owning post", () => {
  const link = { title: "Episode", audio: { author: "Podcast" } };
  const owner = { memoizedProps: { data: post({ title: "Post title", linkInfo: link }) }, return: null };
  const card = {
    __reactFiber$test: {
      memoizedProps: {},
      return: { memoizedProps: { data: link }, return: owner },
    },
  };
  assert.equal(getNativeLinkInfo(card), link);
  card.__reactFiber$test.return = owner;
  assert.equal(getNativeLinkInfo(card), null);
  assert.equal(getNativeLinkInfo({}), null);
});
