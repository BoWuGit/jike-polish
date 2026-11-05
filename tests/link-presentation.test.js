import assert from "node:assert/strict";
import test from "node:test";

import { linkPresentation } from "../src/shared/link-presentation.js";

const author = "吴建京｜以电传心";
const episode = "华语新浪漫 04｜娱乐世界";

test("audio metadata supplies the episode title instead of the combined share title", () => {
  const title = `${author} - ${episode}`;
  assert.deepEqual(linkPresentation({ title, audio: { title: episode, author } }), {
    title: episode, author, originalTitle: title, isAudio: true,
  });
});

test("legacy audio titles remove only a complete author at either boundary", () => {
  for (const title of [
    `${author} - ${episode}`,
    `吴建京 | 以电传心：${episode}`,
    `${author}—${episode}`,
    `${episode} | ${author}`,
  ]) {
    assert.equal(linkPresentation({ title, audio: { author } }).title, episode);
  }
  for (const title of [
    `对谈 ${author}：新专辑`,
    `${author}的音乐世界`,
    `前奏 - ${author} - 尾声`,
  ]) {
    assert.equal(linkPresentation({ title, audio: { author } }).title, title);
  }
});

test("identical titles and authors appear once and empty metadata keeps a useful title", () => {
  assert.equal(linkPresentation({ title: author, audio: { author } }).author, "");
  assert.equal(linkPresentation({ audio: { author } }).title, author);
  assert.equal(linkPresentation({ title: episode, audio: {} }).title, episode);
  assert.equal(linkPresentation({ title: episode, audio: { author: "  " } }).author, "");
});

test("ordinary links keep their full title and are not styled as audio", () => {
  const title = `${author} - ${episode}`;
  assert.deepEqual(linkPresentation({ title }), {
    title, author: "", originalTitle: title, isAudio: false,
  });
  assert.equal(linkPresentation(null).isAudio, false);
});
