(() => {
  const existingBridge = window.__JIKE_POLISH_REPOST_MEDIA_BRIDGE__;
  if (existingBridge && typeof existingBridge.rescan === "function") {
    existingBridge.rescan();
    return;
  }
  window.__JIKE_POLISH_REPOST_MEDIA_BRIDGE__ = { rescan: null };

  const API_ORIGIN = "https://api.ruguoapp.com";
  const QUOTE_CARD_SELECTOR = "._root_1kp3y_1";
  const QUOTE_MAIN_SELECTOR = "._main_1kp3y_9";
  const MEDIA_CLASS = "jp-repost-media";
  const MEDIA_ITEM_CLASS = "jp-repost-media-item";
  const MEDIA_IMAGE_CLASS = "jp-repost-media-img";
  const MEDIA_MORE_CLASS = "jp-repost-media-more";
  const LINK_CLASS = "jp-repost-link";
  const LINK_IMAGE_CLASS = "jp-repost-link-image";
  const LINK_PLACEHOLDER_CLASS = "jp-repost-link-placeholder";
  const LINK_BODY_CLASS = "jp-repost-link-body";
  const LINK_TITLE_CLASS = "jp-repost-link-title";
  const LINK_FOOTER_CLASS = "jp-repost-link-footer";
  const ATTACHMENT_SELECTOR = `.${LINK_CLASS}, .${MEDIA_CLASS}`;
  const LIGHTBOX_CLASS = "jp-repost-lightbox";
  const LIGHTBOX_PORTAL_SELECTOR = `.${LIGHTBOX_CLASS}`;
  const DETAIL_ENDPOINT_BY_TYPE = {
    ORIGINAL_POST: "/1.0/originalPosts/get",
    REPOST: "/1.0/reposts/get"
  };

  const detailCache = new Map();
  let scanTimer = 0;
  let lightboxState = null;

  function getReactFiber(el) {
    for (const key of Object.keys(el)) {
      if (key.startsWith("__reactFiber$")) return el[key];
    }
    return null;
  }

  function isPostLike(value) {
    return !!(
      value
      && typeof value === "object"
      && typeof value.id === "string"
      && typeof value.type === "string"
      && value.user
      && typeof value.user === "object"
    );
  }

  function getQuoteData(card) {
    const fiber = getReactFiber(card);
    for (let node = fiber; node; node = node.return) {
      const props = node.memoizedProps || node.pendingProps;
      if (isPostLike(props?.data)) return props.data;
    }
    return null;
  }

  function pictureUrl(picture, count) {
    if (!picture) return "";
    if (count === 1) {
      return picture.middlePicUrl || picture.smallPicUrl || picture.thumbnailUrl || picture.picUrl || "";
    }
    return picture.smallPicUrl || picture.thumbnailUrl || picture.middlePicUrl || picture.picUrl || "";
  }

  function fullPictureUrl(picture) {
    return picture?.picUrl || pictureUrl(picture, 1);
  }

  function getPictures(data) {
    if (!Array.isArray(data?.pictures)) return [];
    return data.pictures.filter((picture) => pictureUrl(picture, data.pictures.length));
  }

  function stringValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function linkImageUrl(linkInfo) {
    return stringValue(linkInfo?.pictureUrl)
      || stringValue(linkInfo?.audio?.coverUrl)
      || stringValue(linkInfo?.audio?.originCoverUrl)
      || stringValue(linkInfo?.brandLogoImage?.thumbnailUrl)
      || stringValue(linkInfo?.brandLogoImage?.smallPicUrl)
      || stringValue(linkInfo?.brandLogoImage?.picUrl);
  }

  function hasUsableLinkInfo(linkInfo) {
    if (!linkInfo || typeof linkInfo !== "object") return false;
    return !!(stringValue(linkInfo.title) || stringValue(linkInfo.linkUrl) || linkImageUrl(linkInfo));
  }

  function getLinkInfo(data) {
    return hasUsableLinkInfo(data?.linkInfo) ? data.linkInfo : null;
  }

  function getMediaSource(data) {
    if (getPictures(data).length) return data;
    if (getPictures(data?.target).length) return data.target;
    return null;
  }

  function getLinkSource(data) {
    if (getLinkInfo(data)) return data;
    if (getLinkInfo(data?.target)) return data.target;
    return null;
  }

  function shouldFetchLinkImage(source) {
    const linkInfo = getLinkInfo(source);
    return isPostLike(source) && !!linkInfo && !linkImageUrl(linkInfo);
  }

  function hasOwn(value, key) {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
  }

  function shouldFetchDetail(data) {
    if (!isPostLike(data)) return false;
    if (data.type === "ORIGINAL_POST") return !hasOwn(data, "pictures");
    if (data.type === "REPOST") return !hasOwn(data, "target");
    return false;
  }

  async function fetchPostDetail(data) {
    const endpoint = DETAIL_ENDPOINT_BY_TYPE[data.type];
    if (!endpoint) return null;
    const cacheKey = `${data.type}:${data.id}`;
    if (detailCache.has(cacheKey)) return detailCache.get(cacheKey);

    const task = fetch(`${API_ORIGIN}${endpoint}?id=${encodeURIComponent(data.id)}`, {
      headers: { platform: "web" }
    })
      .then((response) => response.ok ? response.json() : null)
      .then((json) => json?.data || null)
      .catch(() => null);

    detailCache.set(cacheKey, task);
    const result = await task;
    detailCache.set(cacheKey, result);
    return result;
  }

  function getExistingMedia(card) {
    return Array.from(card.children).find((child) => child.classList?.contains(MEDIA_CLASS)) || null;
  }

  function getExistingLink(card) {
    return Array.from(card.children).find((child) => child.classList?.contains(LINK_CLASS)) || null;
  }

  function getAttachments(card) {
    return Array.from(card.children).filter((child) => child.matches?.(ATTACHMENT_SELECTOR));
  }

  function attachmentOrder(attachment) {
    return Number(attachment.dataset?.jpRepostAttachmentOrder) || 0;
  }

  function insertAfter(card, node, reference) {
    if (reference?.nextSibling) {
      card.insertBefore(node, reference.nextSibling);
      return;
    }
    card.appendChild(node);
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
    if (main) {
      insertAfter(card, attachment, main);
      return;
    }
    card.appendChild(attachment);
  }

  function removeMedia(card, key) {
    getExistingMedia(card)?.remove();
    if (key) card.dataset.jpRepostMediaKey = key;
    syncAttachmentGapOffset(card);
  }

  function removeLink(card, key) {
    getExistingLink(card)?.remove();
    if (key) card.dataset.jpRepostLinkKey = key;
    syncAttachmentGapOffset(card);
  }

  function actualContentBottom(content) {
    const range = document.createRange();
    range.selectNodeContents(content);
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
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

  function createLightboxButton(className, label, svgPath) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `yarl__button ${className}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${svgPath}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return button;
  }

  function closeLightbox() {
    if (!lightboxState) return;
    lightboxState.portal.remove();
    document.removeEventListener("keydown", handleLightboxKeydown);
    lightboxState = null;
  }

  function renderLightboxSlide() {
    if (!lightboxState) return;
    const { image, count, prevButton, nextButton, pictures } = lightboxState;
    const picture = pictures[lightboxState.index];
    image.src = fullPictureUrl(picture);
    image.alt = `转发原帖图片 ${lightboxState.index + 1}`;
    if (picture.width) image.width = picture.width;
    if (picture.height) image.height = picture.height;
    count.textContent = `${lightboxState.index + 1} / ${pictures.length}`;
    prevButton.hidden = pictures.length <= 1;
    nextButton.hidden = pictures.length <= 1;
  }

  function stepLightbox(delta) {
    if (!lightboxState) return;
    const { pictures } = lightboxState;
    lightboxState.index = (lightboxState.index + delta + pictures.length) % pictures.length;
    renderLightboxSlide();
  }

  function handleLightboxKeydown(event) {
    if (!lightboxState) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepLightbox(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(1);
    }
  }

  function openLightbox(pictures, index) {
    document.querySelector(LIGHTBOX_PORTAL_SELECTOR)?.remove();
    document.removeEventListener("keydown", handleLightboxKeydown);

    const portal = document.createElement("div");
    portal.className = `yarl__portal yarl__portal_open ${LIGHTBOX_CLASS}`;
    portal.setAttribute("role", "dialog");
    portal.setAttribute("aria-modal", "true");
    portal.setAttribute("aria-label", "图片预览");

    const container = document.createElement("div");
    container.className = "yarl__container jp-repost-lightbox-container";

    const toolbar = document.createElement("div");
    toolbar.className = "yarl__toolbar jp-repost-lightbox-toolbar";
    const closeButton = createLightboxButton("yarl__button_close jp-repost-lightbox-close", "关闭图片预览", "M18 6 6 18M6 6l12 12");
    closeButton.addEventListener("click", closeLightbox);
    toolbar.appendChild(closeButton);

    const prevButton = createLightboxButton("yarl__navigation_prev jp-repost-lightbox-prev", "上一张图片", "M15 18l-6-6 6-6");
    prevButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stepLightbox(-1);
    });

    const nextButton = createLightboxButton("yarl__navigation_next jp-repost-lightbox-next", "下一张图片", "M9 6l6 6-6 6");
    nextButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stepLightbox(1);
    });

    const slide = document.createElement("div");
    slide.className = "yarl__slide yarl__slide_current jp-repost-lightbox-slide";
    const image = document.createElement("img");
    image.className = "yarl__slide_image jp-repost-lightbox-image";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    slide.appendChild(image);

    const count = document.createElement("div");
    count.className = "jp-repost-lightbox-count";

    container.append(prevButton, slide, nextButton, count);
    portal.append(toolbar, container);
    portal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".yarl__toolbar, .yarl__navigation_prev, .yarl__navigation_next, .yarl__slide_image")) return;
      closeLightbox();
    });
    portal.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });

    document.body.appendChild(portal);
    lightboxState = { portal, image, count, prevButton, nextButton, pictures, index };
    document.addEventListener("keydown", handleLightboxKeydown);
    renderLightboxSlide();
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

  function safeHttpUrl(value) {
    const raw = stringValue(value);
    if (!raw) return "";
    try {
      const url = new URL(raw, location.href);
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch {
      /* Invalid URL, render non-clickable preview. */
    }
    return "";
  }

  function hostFromUrl(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function linkFooterText(linkInfo, href) {
    return stringValue(linkInfo?.audio?.author)
      || stringValue(linkInfo?.source)
      || hostFromUrl(href);
  }

  function bindLinkCardEvents(card) {
    for (const eventName of ["click", "pointerdown", "keydown"]) {
      card.addEventListener(eventName, (event) => event.stopPropagation());
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
    bindLinkCardEvents(card);

    const imageUrl = linkImageUrl(linkInfo);
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

    const footerText = linkFooterText(linkInfo, href);
    if (footerText) {
      const footer = document.createElement("div");
      footer.className = LINK_FOOTER_CLASS;
      footer.textContent = footerText;
      body.appendChild(footer);
    }

    card.appendChild(body);
    return card;
  }

  function renderLink(card, source, linkInfo) {
    const linkKey = `${source.type || "UNKNOWN"}:${source.id}:${stringValue(linkInfo.linkUrl) || stringValue(linkInfo.title) || linkImageUrl(linkInfo)}`;
    const existingLink = getExistingLink(card);
    if (card.dataset.jpRepostLinkKey === linkKey && existingLink) {
      syncAttachmentGapOffset(card);
      return;
    }

    existingLink?.remove();
    const link = createLinkCard(linkInfo);
    insertAttachment(card, link);
    card.dataset.jpRepostLinkKey = linkKey;
    syncAttachmentGapOffset(card);
  }

  function renderMedia(card, source, pictures) {
    const mediaKey = `${source.type || "UNKNOWN"}:${source.id}:${pictures.map((picture) => picture.key || fullPictureUrl(picture)).join(",")}`;
    const existingMedia = getExistingMedia(card);
    if (card.dataset.jpRepostMediaKey === mediaKey && existingMedia) {
      syncAttachmentGapOffset(card);
      return;
    }

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
      item.addEventListener("click", (event) => openLightboxFromMedia(event, pictures, index), true);
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        openLightboxFromMedia(event, pictures, index);
      });

      const image = document.createElement("img");
      image.className = MEDIA_IMAGE_CLASS;
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.alt = `转发原帖图片 ${index + 1}`;
      image.src = pictureUrl(picture, shownPictures.length);
      image.dataset.fullSrc = fullPictureUrl(picture);
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

  function samePost(a, b) {
    return !!a && !!b && a.id === b.id && a.type === b.type;
  }

  async function syncQuoteCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const data = getQuoteData(card);
    if (!isPostLike(data)) return;

    let mediaSource = getMediaSource(data);
    let linkSource = getLinkSource(data);
    if ((!mediaSource || !linkSource) && shouldFetchDetail(data)) {
      const detail = await fetchPostDetail(data);
      if (!document.contains(card) || !samePost(getQuoteData(card), data)) return;
      mediaSource = mediaSource || getMediaSource(detail);
      linkSource = linkSource || getLinkSource(detail);
    }

    if (shouldFetchLinkImage(linkSource)) {
      const detail = await fetchPostDetail(linkSource);
      if (!document.contains(card) || !samePost(getQuoteData(card), data)) return;
      const detailedLinkSource = getLinkSource(detail);
      if (linkImageUrl(getLinkInfo(detailedLinkSource))) linkSource = detailedLinkSource;
    }

    const linkInfo = getLinkInfo(linkSource);
    if (linkInfo) {
      renderLink(card, linkSource, linkInfo);
    } else {
      removeLink(card, `${data.type}:${data.id}:link:none`);
    }

    if (!mediaSource) {
      removeMedia(card, `${data.type}:${data.id}:media:none`);
      return;
    }

    const pictures = getPictures(mediaSource);
    if (!pictures.length) {
      removeMedia(card, `${mediaSource.type}:${mediaSource.id}:media:none`);
      return;
    }

    renderMedia(card, mediaSource, pictures);
  }

  function scanQuoteCards() {
    for (const card of document.querySelectorAll(QUOTE_CARD_SELECTOR)) {
      void syncQuoteCard(card);
    }
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = 0;
      scanQuoteCards();
    }, 32);
  }

  function scheduleWarmupScans() {
    scheduleScan();
    for (const delay of [120, 360, 800, 1600, 3000, 5000]) {
      setTimeout(scheduleScan, delay);
    }
  }

  window.__JIKE_POLISH_REPOST_MEDIA_BRIDGE__.rescan = scheduleWarmupScans;
  scheduleWarmupScans();
  window.addEventListener("pageshow", scheduleWarmupScans);
  setInterval(scheduleScan, 1800);

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
})();
