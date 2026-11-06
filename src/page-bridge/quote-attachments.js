import { safeHttpUrl } from "../shared/values.js";
import { linkPresentation } from "../shared/link-presentation.js";
import { openLightbox } from "./lightbox.js";
import { fullPictureUrl, getLinkInfo, getPictures, linkImageUrl, pictureUrl } from "./post-data.js";

const QUOTE_MAIN_SELECTOR = "._main_1kp3y_9";
const MEDIA_CLASS = "jp-repost-media";
const MEDIA_ITEM_CLASS = "jp-repost-media-item";
const MEDIA_IMAGE_CLASS = "jp-repost-media-img";
const MEDIA_MORE_CLASS = "jp-repost-media-more";
const VIDEO_CLASS = "jp-repost-video";
const LINK_CLASS = "jp-repost-link";
const LINK_IMAGE_CLASS = "jp-repost-link-image";
const LINK_PLACEHOLDER_CLASS = "jp-repost-link-placeholder";
const LINK_BODY_CLASS = "jp-repost-link-body";
const LINK_TITLE_CLASS = "jp-repost-link-title";
const LINK_FOOTER_CLASS = "jp-repost-link-footer";
const ATTACHMENT_CLASSES = [LINK_CLASS, MEDIA_CLASS, VIDEO_CLASS];

function getDirectChildByClass(card, className) {
  return Array.from(card.children).find((child) => child.classList?.contains(className)) || null;
}

function getAttachments(card) {
  return ATTACHMENT_CLASSES.map((className) => getDirectChildByClass(card, className))
    .filter(Boolean);
}

/** Replace in place and preserve native card children; all attachment types share this lifecycle. */
function syncAttachment(card, className, key, create) {
  const existing = getDirectChildByClass(card, className);
  if (!create) {
    existing?.remove();
    return null;
  }
  if (existing?.dataset.jpRepostKey === key) return existing;

  const attachment = create();
  attachment.dataset.jpRepostKey = key;
  if (existing) {
    existing.replaceWith(attachment);
    return attachment;
  }

  const index = ATTACHMENT_CLASSES.indexOf(className);
  const next = ATTACHMENT_CLASSES.slice(index + 1)
    .map((name) => getDirectChildByClass(card, name)).find(Boolean);
  const previous = getAttachments(card).at(-1) || card.querySelector(QUOTE_MAIN_SELECTOR);
  card.insertBefore(attachment, next || previous?.nextSibling || null);
  return attachment;
}

function actualContentBottom(content) {
  const range = document.createRange();
  range.selectNodeContents(content);
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  range.detach?.();
  if (!rects.length) return content.getBoundingClientRect().bottom;
  return Math.max(...rects.map((rect) => rect.bottom));
}

export function syncAttachmentGapOffset(card) {
  const attachments = getAttachments(card);
  for (const attachment of attachments) {
    attachment.style.removeProperty("--jp-repost-attachment-offset");
  }
  if (!attachments.length) return;

  const main = card.querySelector(QUOTE_MAIN_SELECTOR);
  const content = card.querySelector("._content_1kp3y_20");
  if (!(main instanceof HTMLElement) || !(content instanceof HTMLElement)) return;

  const mainBottom = main.getBoundingClientRect().bottom;
  const contentBottom = actualContentBottom(content);
  const rowGap = Number.parseFloat(getComputedStyle(card).rowGap) || 0;
  const desiredGap = 15;
  const offset = Math.min(0, Math.round(contentBottom + desiredGap - mainBottom - rowGap));
  if (offset < 0) {
    attachments[0].style.setProperty("--jp-repost-attachment-offset", `${offset}px`);
  }
}

function openLightboxFromMedia(event, pictures, index) {
  event.preventDefault();
  event.stopPropagation();
  openLightbox(pictures, index);
}

function syncSingleImageWidth(media, picture) {
  const width = Number(picture?.width) || 0;
  const height = Number(picture?.height) || 0;
  if (width <= 0 || height <= 0) return;

  const ratio = width / height;
  const baseSize = 260;
  const maxHeight = 607;
  const displayWidth = ratio >= 1
    ? baseSize * ratio
    : Math.min(baseSize, maxHeight * ratio);
  media.style.setProperty("--jp-repost-media-width", `${Math.round(displayWidth)}px`);
  media.style.setProperty("--jp-repost-media-aspect-ratio", `${width} / ${height}`);
}

function stopAttachmentEventPropagation(element) {
  for (const eventName of ["click", "pointerdown", "keydown"]) {
    element.addEventListener(eventName, (event) => event.stopPropagation());
  }
}

function createLinkCard(linkInfo) {
  const presentation = linkPresentation(linkInfo);
  const href = safeHttpUrl(linkInfo?.linkUrl);
  const card = document.createElement(href ? "a" : "div");
  card.className = LINK_CLASS;
  card.classList.toggle("jp-audio-card", presentation.isAudio);
  if (href) {
    card.href = href;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
  }
  stopAttachmentEventPropagation(card);

  const imageUrl = safeHttpUrl(linkImageUrl(linkInfo));
  if (imageUrl) {
    const image = document.createElement("img");
    image.className = LINK_IMAGE_CLASS;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.alt = "";
    image.src = imageUrl;
    card.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = LINK_PLACEHOLDER_CLASS;
    placeholder.textContent = "↗";
    card.appendChild(placeholder);
  }

  const body = document.createElement("div");
  body.className = LINK_BODY_CLASS;

  const title = document.createElement("div");
  title.className = LINK_TITLE_CLASS;
  title.textContent = presentation.title || href || "打开链接";
  title.title = presentation.originalTitle || title.textContent;
  body.appendChild(title);

  const footer = document.createElement("div");
  footer.className = LINK_FOOTER_CLASS;
  footer.textContent = presentation.author;
  if (!footer.textContent) footer.setAttribute("aria-hidden", "true");
  body.appendChild(footer);

  card.appendChild(body);
  return card;
}

export function renderLink(card, source) {
  const info = getLinkInfo(source);
  const key = info && JSON.stringify([
    source.type, source.id, safeHttpUrl(info.linkUrl),
    linkPresentation(info), safeHttpUrl(linkImageUrl(info)),
  ]);
  syncAttachment(card, LINK_CLASS, key, info ? () => createLinkCard(info) : null);
}

function createMediaItem(picture, index, pictures, thumbnailCount) {
  const item = document.createElement("div");
  item.className = MEDIA_ITEM_CLASS;
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.setAttribute("aria-label", `打开转发原帖图片 ${index + 1}`);
  item.addEventListener(
    "click",
    (event) => openLightboxFromMedia(event, pictures, index),
    true,
  );
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      openLightboxFromMedia(event, pictures, index);
    }
  });

  const image = document.createElement("img");
  image.className = MEDIA_IMAGE_CLASS;
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.alt = `转发原帖图片 ${index + 1}`;
  const thumbnailUrl = safeHttpUrl(pictureUrl(picture, thumbnailCount));
  if (thumbnailUrl) image.src = thumbnailUrl;
  image.dataset.fullSrc = safeHttpUrl(fullPictureUrl(picture));
  if (picture.width) image.dataset.width = String(picture.width);
  if (picture.height) image.dataset.height = String(picture.height);
  item.appendChild(image);

  if (index === 3 && pictures.length > thumbnailCount) {
    const more = document.createElement("span");
    more.className = MEDIA_MORE_CLASS;
    more.textContent = `+${pictures.length - thumbnailCount}`;
    item.appendChild(more);
  }

  return item;
}

export function renderMedia(card, source) {
  const pictures = getPictures(source);
  const key = source && JSON.stringify([
    source.type, source.id,
    pictures.map((picture) => [
      pictureUrl(picture, Math.min(pictures.length, 4)), fullPictureUrl(picture),
      picture.width, picture.height,
    ]),
  ]);
  syncAttachment(card, MEDIA_CLASS, key, pictures.length ? () => {
    const shownPictures = pictures.slice(0, 4);
    const media = document.createElement("div");
    media.className = MEDIA_CLASS;
    media.dataset.count = String(shownPictures.length);
    media.dataset.total = String(pictures.length);
    if (shownPictures.length === 1) syncSingleImageWidth(media, shownPictures[0]);
    shownPictures.forEach((picture, index) => {
      media.appendChild(createMediaItem(picture, index, pictures, shownPictures.length));
    });
    return media;
  } : null);
}

export function renderVideo(card, source, url) {
  const poster = safeHttpUrl(source?.video?.thumbnailUrl);
  const key = source && JSON.stringify([source.type, source.id, url]);
  const video = syncAttachment(card, VIDEO_CLASS, key, url ? () => {
    const video = document.createElement("video");
    video.className = VIDEO_CLASS;
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    video.setAttribute("aria-label", "转发原帖视频");
    stopAttachmentEventPropagation(video);
    return video;
  } : null);
  if (video) {
    if (poster) video.poster = poster;
    else video.removeAttribute("poster");
  }
}
