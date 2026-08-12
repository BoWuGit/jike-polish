import { safeHttpUrl, stringValue } from "../shared/values.js";
import { openLightbox } from "./lightbox.js";
import { fetchPostDetail, fetchVideoUrl } from "./post-api.js";
import {
  fullPictureUrl,
  getLinkInfo,
  getLinkSource,
  getMediaSource,
  getPictures,
  getQuoteData,
  getVideoSource,
  isPostLike,
  linkImageUrl,
  pictureUrl,
  samePost,
  shouldFetchDetail,
  shouldFetchLinkImage,
} from "./post-data.js";

export const QUOTE_CARD_SELECTOR = "._root_1kp3y_1";

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
const ATTACHMENT_SELECTOR = `.${LINK_CLASS}, .${MEDIA_CLASS}, .${VIDEO_CLASS}`;

function getDirectChildByClass(card, className) {
  return Array.from(card.children).find((child) => child.classList?.contains(className)) || null;
}

function getAttachments(card) {
  return Array.from(card.children).filter((child) => child.matches?.(ATTACHMENT_SELECTOR));
}

function attachmentOrder(attachment) {
  return Number(attachment.dataset?.jpRepostAttachmentOrder) || 0;
}

function insertAfter(card, node, reference) {
  if (reference?.nextSibling) card.insertBefore(node, reference.nextSibling);
  else card.appendChild(node);
}

function insertAttachment(card, attachment) {
  const order = attachmentOrder(attachment);
  const siblings = getAttachments(card).filter((child) => child !== attachment);
  const next = siblings.find((child) => attachmentOrder(child) > order);
  if (next) {
    card.insertBefore(attachment, next);
    return;
  }

  for (let index = siblings.length - 1; index >= 0; index -= 1) {
    if (attachmentOrder(siblings[index]) <= order) {
      insertAfter(card, attachment, siblings[index]);
      return;
    }
  }

  const main = card.querySelector(QUOTE_MAIN_SELECTOR);
  if (main) insertAfter(card, attachment, main);
  else card.appendChild(attachment);
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

function syncAttachmentGapOffset(card) {
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

function removeAttachment(card, className, keyProperty, key) {
  const attachment = getDirectChildByClass(card, className);
  if (!attachment && card.dataset[keyProperty] === key) return;
  attachment?.remove();
  if (key) card.dataset[keyProperty] = key;
  syncAttachmentGapOffset(card);
}

function removeMedia(card, key) {
  removeAttachment(card, MEDIA_CLASS, "jpRepostMediaKey", key);
}

function removeVideo(card, key) {
  removeAttachment(card, VIDEO_CLASS, "jpRepostVideoKey", key);
}

function removeLink(card, key) {
  removeAttachment(card, LINK_CLASS, "jpRepostLinkKey", key);
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

function linkFooterText(linkInfo) {
  return stringValue(linkInfo?.audio?.author);
}

function stopAttachmentEventPropagation(element) {
  for (const eventName of ["click", "pointerdown", "keydown"]) {
    element.addEventListener(eventName, (event) => event.stopPropagation());
  }
}

function createLinkCard(linkInfo) {
  const href = safeHttpUrl(linkInfo?.linkUrl);
  const card = document.createElement(href ? "a" : "div");
  card.className = LINK_CLASS;
  card.dataset.jpRepostAttachmentOrder = "10";
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
  title.textContent = stringValue(linkInfo?.title) || href || "打开链接";
  body.appendChild(title);

  const footer = document.createElement("div");
  footer.className = LINK_FOOTER_CLASS;
  footer.textContent = linkFooterText(linkInfo);
  if (!footer.textContent) footer.setAttribute("aria-hidden", "true");
  body.appendChild(footer);

  card.appendChild(body);
  return card;
}

function renderLink(card, source, linkInfo) {
  const linkKey = `${source.type || "UNKNOWN"}:${source.id}:${stringValue(linkInfo.linkUrl) || stringValue(linkInfo.title) || linkImageUrl(linkInfo)}`;
  const existingLink = getDirectChildByClass(card, LINK_CLASS);
  if (card.dataset.jpRepostLinkKey === linkKey && existingLink) return;

  existingLink?.remove();
  const link = createLinkCard(linkInfo);
  insertAttachment(card, link);
  card.dataset.jpRepostLinkKey = linkKey;
  syncAttachmentGapOffset(card);
}

function renderMedia(card, source, pictures) {
  const mediaKey = `${source.type || "UNKNOWN"}:${source.id}:${pictures
    .map((picture) => picture.key || fullPictureUrl(picture))
    .join(",")}`;
  const existingMedia = getDirectChildByClass(card, MEDIA_CLASS);
  if (card.dataset.jpRepostMediaKey === mediaKey && existingMedia) return;

  existingMedia?.remove();
  const shownPictures = pictures.slice(0, 4);
  const media = document.createElement("div");
  media.className = MEDIA_CLASS;
  media.dataset.jpRepostAttachmentOrder = "20";
  media.dataset.count = String(shownPictures.length);
  media.dataset.total = String(pictures.length);
  if (shownPictures.length === 1) syncSingleImageWidth(media, shownPictures[0]);

  shownPictures.forEach((picture, index) => {
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
    const thumbnailUrl = safeHttpUrl(pictureUrl(picture, shownPictures.length));
    if (thumbnailUrl) image.src = thumbnailUrl;
    image.dataset.fullSrc = safeHttpUrl(fullPictureUrl(picture));
    if (picture.width) image.dataset.width = String(picture.width);
    if (picture.height) image.dataset.height = String(picture.height);
    item.appendChild(image);

    if (index === 3 && pictures.length > shownPictures.length) {
      const more = document.createElement("span");
      more.className = MEDIA_MORE_CLASS;
      more.textContent = `+${pictures.length - shownPictures.length}`;
      item.appendChild(more);
    }

    media.appendChild(item);
  });

  insertAttachment(card, media);
  card.dataset.jpRepostMediaKey = mediaKey;
  syncAttachmentGapOffset(card);
}

function renderVideo(card, source, url) {
  const poster = safeHttpUrl(source.video?.thumbnailUrl);
  const videoKey = `${source.type}:${source.id}:${url}`;
  const existingVideo = getDirectChildByClass(card, VIDEO_CLASS);
  if (card.dataset.jpRepostVideoKey === videoKey && existingVideo) return;

  existingVideo?.remove();
  const video = document.createElement("video");
  video.className = VIDEO_CLASS;
  video.dataset.jpRepostAttachmentOrder = "30";
  video.controls = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = url;
  if (poster) video.poster = poster;
  video.setAttribute("aria-label", "转发原帖视频");
  stopAttachmentEventPropagation(video);

  insertAttachment(card, video);
  card.dataset.jpRepostVideoKey = videoKey;
  syncAttachmentGapOffset(card);
}

export async function syncQuoteCard(card) {
  if (!(card instanceof HTMLElement)) return;
  const data = getQuoteData(card);
  if (!isPostLike(data)) return;

  let mediaSource = getMediaSource(data);
  let videoSource = getVideoSource(data);
  let linkSource = getLinkSource(data);
  if ((!mediaSource || !videoSource || !linkSource) && shouldFetchDetail(data)) {
    const detail = await fetchPostDetail(data);
    if (!document.contains(card) || !samePost(getQuoteData(card), data)) return;
    mediaSource ||= getMediaSource(detail);
    videoSource ||= getVideoSource(detail);
    linkSource ||= getLinkSource(detail);
  }

  if (shouldFetchLinkImage(linkSource)) {
    const detail = await fetchPostDetail(linkSource);
    if (!document.contains(card) || !samePost(getQuoteData(card), data)) return;
    const detailedLinkSource = getLinkSource(detail);
    if (linkImageUrl(getLinkInfo(detailedLinkSource))) linkSource = detailedLinkSource;
  }

  const linkInfo = getLinkInfo(linkSource);
  if (linkInfo) renderLink(card, linkSource, linkInfo);
  else removeLink(card, `${data.type}:${data.id}:link:none`);

  if (!mediaSource) {
    removeMedia(card, `${data.type}:${data.id}:media:none`);
  } else {
    const pictures = getPictures(mediaSource);
    if (pictures.length) renderMedia(card, mediaSource, pictures);
    else removeMedia(card, `${mediaSource.type}:${mediaSource.id}:media:none`);
  }

  if (!videoSource) {
    removeVideo(card, `${data.type}:${data.id}:video:none`);
    return;
  }

  const videoUrl = await fetchVideoUrl(videoSource);
  if (!document.contains(card) || !samePost(getQuoteData(card), data)) return;
  if (videoUrl) renderVideo(card, videoSource, videoUrl);
  else removeVideo(card, `${videoSource.type}:${videoSource.id}:video:none`);
}
