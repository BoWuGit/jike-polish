import { stringValue } from "./values.js";

function comparableText(value) {
  return value.normalize("NFKC").replace(/\s+/gu, "").toLowerCase();
}

function episodeTitle(title, author) {
  if (!author) return title;
  const expected = comparableText(author);
  // Only remove a complete author at a separator boundary, never a mention in the title.
  for (const match of title.matchAll(/\s*[-–—|｜:：·•]+\s*/gu)) {
    const before = title.slice(0, match.index).trim();
    const after = title.slice(match.index + match[0].length).trim();
    if (after && comparableText(before) === expected) return after;
    if (before && comparableText(after) === expected) return before;
  }
  return title;
}

export function linkPresentation(linkInfo) {
  const originalTitle = stringValue(linkInfo?.title);
  const isAudio = !!linkInfo?.audio && typeof linkInfo.audio === "object";
  const author = isAudio ? stringValue(linkInfo.audio.author) : "";
  const title = isAudio
    ? episodeTitle(stringValue(linkInfo.audio.title) || originalTitle, author) || author
    : originalTitle;
  return {
    title,
    author: comparableText(title) === comparableText(author) ? "" : author,
    originalTitle,
    isAudio,
  };
}
