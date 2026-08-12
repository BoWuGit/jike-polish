(() => {
  // src/shared/values.js
  function stringValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }
  function safeHttpUrl(value, baseUrl = globalThis.location?.href) {
    const raw = stringValue(value);
    if (!raw) return "";
    try {
      const url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  // src/page-bridge/post-data.js
  function getReactFiber(element) {
    for (const key of Object.keys(element)) {
      if (key.startsWith("__reactFiber$")) return element[key];
    }
    return null;
  }
  function isPostLike(value) {
    return !!(value && typeof value === "object" && typeof value.id === "string" && typeof value.type === "string" && value.user && typeof value.user === "object");
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
  function linkPreviewImageUrl(linkInfo) {
    return stringValue(linkInfo?.pictureUrl) || stringValue(linkInfo?.audio?.coverUrl) || stringValue(linkInfo?.audio?.originCoverUrl);
  }
  function linkImageUrl(linkInfo) {
    return linkPreviewImageUrl(linkInfo) || stringValue(linkInfo?.brandLogoImage?.thumbnailUrl) || stringValue(linkInfo?.brandLogoImage?.smallPicUrl) || stringValue(linkInfo?.brandLogoImage?.picUrl);
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
  function getVideoSource(data) {
    if (data?.video) return data;
    if (data?.target?.video) return data.target;
    return null;
  }
  function getLinkSource(data) {
    if (getLinkInfo(data)) return data;
    if (getLinkInfo(data?.target)) return data.target;
    return null;
  }
  function shouldFetchLinkImage(source) {
    const linkInfo = getLinkInfo(source);
    return isPostLike(source) && !!linkInfo && !linkPreviewImageUrl(linkInfo);
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
  function samePost(left, right) {
    return !!left && !!right && left.id === right.id && left.type === right.type;
  }

  // src/page-bridge/lightbox.js
  var LIGHTBOX_CLASS = "jp-repost-lightbox";
  var LIGHTBOX_PORTAL_SELECTOR = `.${LIGHTBOX_CLASS}`;
  var lightboxState = null;
  function createLightboxButton(className, label, pathData) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `yarl__button ${className}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  }
  function closeLightbox() {
    if (!lightboxState) return;
    const { opener, portal } = lightboxState;
    portal.remove();
    document.removeEventListener("keydown", handleLightboxKeydown);
    lightboxState = null;
    if (!opener?.isConnected) return;
    try {
      opener.focus({ preventScroll: true });
    } catch {
      opener.focus();
    }
  }
  function renderLightboxSlide() {
    if (!lightboxState) return;
    const { image, count, prevButton, nextButton, pictures, index } = lightboxState;
    const picture = pictures[index];
    const imageUrl = safeHttpUrl(fullPictureUrl(picture));
    if (imageUrl) image.src = imageUrl;
    else image.removeAttribute("src");
    image.alt = `\u8F6C\u53D1\u539F\u5E16\u56FE\u7247 ${index + 1}`;
    if (picture.width) image.width = picture.width;
    else image.removeAttribute("width");
    if (picture.height) image.height = picture.height;
    else image.removeAttribute("height");
    count.textContent = `${index + 1} / ${pictures.length}`;
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
    if (event.key === "Tab") {
      const controls = Array.from(
        lightboxState.portal.querySelectorAll("button:not([hidden]):not([disabled])")
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (!lightboxState.portal.contains(document.activeElement) || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!lightboxState.portal.contains(document.activeElement) || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(event.key === "ArrowLeft" ? -1 : 1);
    }
  }
  function openLightbox(pictures, index) {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.querySelector(LIGHTBOX_PORTAL_SELECTOR)?.remove();
    document.removeEventListener("keydown", handleLightboxKeydown);
    const portal = document.createElement("div");
    portal.className = `yarl__portal yarl__portal_open ${LIGHTBOX_CLASS}`;
    portal.setAttribute("role", "dialog");
    portal.setAttribute("aria-modal", "true");
    portal.setAttribute("aria-label", "\u56FE\u7247\u9884\u89C8");
    const container = document.createElement("div");
    container.className = "yarl__container jp-repost-lightbox-container";
    const toolbar = document.createElement("div");
    toolbar.className = "yarl__toolbar jp-repost-lightbox-toolbar";
    const closeButton = createLightboxButton(
      "yarl__button_close jp-repost-lightbox-close",
      "\u5173\u95ED\u56FE\u7247\u9884\u89C8",
      "M18 6 6 18M6 6l12 12"
    );
    closeButton.addEventListener("click", closeLightbox);
    toolbar.appendChild(closeButton);
    const prevButton = createLightboxButton(
      "yarl__navigation_prev jp-repost-lightbox-prev",
      "\u4E0A\u4E00\u5F20\u56FE\u7247",
      "M15 18l-6-6 6-6"
    );
    prevButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stepLightbox(-1);
    });
    const nextButton = createLightboxButton(
      "yarl__navigation_next jp-repost-lightbox-next",
      "\u4E0B\u4E00\u5F20\u56FE\u7247",
      "M9 6l6 6-6 6"
    );
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
      if (target.closest(
        ".yarl__toolbar, .yarl__navigation_prev, .yarl__navigation_next, .yarl__slide_image"
      )) return;
      closeLightbox();
    });
    portal.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
    document.body.appendChild(portal);
    lightboxState = {
      portal,
      image,
      count,
      prevButton,
      nextButton,
      pictures,
      index,
      opener
    };
    document.addEventListener("keydown", handleLightboxKeydown);
    renderLightboxSlide();
    closeButton.focus({ preventScroll: true });
  }

  // src/shared/debug.js
  var DEBUG = localStorage.getItem("JIKE_POLISH_DEBUG") === "1";
  function log(...args) {
    if (DEBUG) console.log("[jike-polish]", ...args);
  }

  // src/shared/jike-api.js
  var JIKE_API_ORIGIN = "https://api.ruguoapp.com";
  var API_BASE = `${JIKE_API_ORIGIN}/1.0`;
  var AUTH_REFRESH_PATH = "/app_auth_tokens.refresh";
  var authRefreshTask = null;
  function accessToken() {
    return localStorage.getItem("JK_ACCESS_TOKEN");
  }
  function refreshToken() {
    return localStorage.getItem("JK_REFRESH_TOKEN");
  }
  function deviceId() {
    return localStorage.getItem("JK_DEVICE_ID");
  }
  function jikeApiHeaders(token, extraHeaders = {}) {
    const headers = { ...extraHeaders, platform: "web" };
    if (token) headers["x-jike-access-token"] = token;
    const device = deviceId();
    if (device) headers["x-jike-device-id"] = device;
    return headers;
  }
  async function refreshAccessToken() {
    if (authRefreshTask) return authRefreshTask;
    const currentRefreshToken = refreshToken();
    if (!currentRefreshToken) return null;
    authRefreshTask = (async () => {
      try {
        const response = await fetch(`${JIKE_API_ORIGIN}${AUTH_REFRESH_PATH}`, {
          method: "POST",
          headers: jikeApiHeaders(null, {
            "x-jike-refresh-token": currentRefreshToken,
            "Content-Type": "application/json"
          }),
          body: "{}"
        });
        if (!response.ok) return null;
        const payload = await response.json();
        const nextAccessToken = stringValue(payload?.["x-jike-access-token"]);
        const nextRefreshToken = stringValue(payload?.["x-jike-refresh-token"]);
        if (!nextAccessToken) return null;
        localStorage.setItem("JK_ACCESS_TOKEN", nextAccessToken);
        if (nextRefreshToken) localStorage.setItem("JK_REFRESH_TOKEN", nextRefreshToken);
        return nextAccessToken;
      } catch (error) {
        log("refresh err", error);
        return null;
      } finally {
        authRefreshTask = null;
      }
    })();
    return authRefreshTask;
  }
  async function requestJike(path, options = {}) {
    const { allowAnonymous = false, headers: extraHeaders, ...fetchOptions } = options;
    const url = path.startsWith("http") ? path : `${API_BASE}/${path.replace(/^\/+/, "")}`;
    let token = accessToken();
    if (!token && !allowAnonymous) token = await refreshAccessToken();
    if (!token && !allowAnonymous) return null;
    let response = await fetch(url, {
      ...fetchOptions,
      headers: jikeApiHeaders(token, extraHeaders)
    });
    if (response.status !== 401 || fetchOptions.signal?.aborted) return response;
    token = allowAnonymous ? null : await refreshAccessToken();
    if (fetchOptions.signal?.aborted) return response;
    if (!token && !allowAnonymous) return response;
    response = await fetch(url, {
      ...fetchOptions,
      headers: jikeApiHeaders(token, extraHeaders)
    });
    return response;
  }

  // src/page-bridge/post-api.js
  var DETAIL_ENDPOINT_BY_TYPE = {
    ORIGINAL_POST: "/1.0/originalPosts/get",
    REPOST: "/1.0/reposts/get"
  };
  var detailRequests = /* @__PURE__ */ new Map();
  var videoUrlRequests = /* @__PURE__ */ new Map();
  function memoizeTruthyRequest(cache, key, load) {
    if (cache.has(key)) return cache.get(key);
    const request = load().then((result) => {
      if (!result) cache.delete(key);
      return result;
    });
    cache.set(key, request);
    return request;
  }
  function fetchPostDetail(data) {
    const endpoint = DETAIL_ENDPOINT_BY_TYPE[data.type];
    if (!endpoint) return Promise.resolve(null);
    const cacheKey = `${data.type}:${data.id}`;
    return memoizeTruthyRequest(detailRequests, cacheKey, () => requestJike(`${JIKE_API_ORIGIN}${endpoint}?id=${encodeURIComponent(data.id)}`, {
      allowAnonymous: true
    }).then((response) => response.ok ? response.json() : null).then((payload) => payload?.data || null).catch(() => null));
  }
  function embeddedVideoUrl(video) {
    const sources = Array.isArray(video?.source) ? video.source : [];
    for (const source of sources) {
      const url = safeHttpUrl(typeof source === "string" ? source : source?.url || source?.src);
      if (url) return url;
    }
    return "";
  }
  function fetchVideoUrl(source) {
    const embeddedUrl = embeddedVideoUrl(source.video);
    if (embeddedUrl) return Promise.resolve(embeddedUrl);
    const cacheKey = `${source.type}:${source.id}`;
    return memoizeTruthyRequest(videoUrlRequests, cacheKey, () => {
      const parameters = new URLSearchParams({ id: source.id, type: source.type });
      return requestJike(`${JIKE_API_ORIGIN}/1.0/mediaMeta/interactive?${parameters}`, {
        allowAnonymous: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }).then((response) => response.ok ? response.json() : null).then((payload) => safeHttpUrl(payload?.url)).catch(() => "");
    });
  }

  // src/page-bridge/quote-card.js
  var QUOTE_CARD_SELECTOR = "._root_1kp3y_1";
  var QUOTE_MAIN_SELECTOR = "._main_1kp3y_9";
  var MEDIA_CLASS = "jp-repost-media";
  var MEDIA_ITEM_CLASS = "jp-repost-media-item";
  var MEDIA_IMAGE_CLASS = "jp-repost-media-img";
  var MEDIA_MORE_CLASS = "jp-repost-media-more";
  var VIDEO_CLASS = "jp-repost-video";
  var LINK_CLASS = "jp-repost-link";
  var LINK_IMAGE_CLASS = "jp-repost-link-image";
  var LINK_PLACEHOLDER_CLASS = "jp-repost-link-placeholder";
  var LINK_BODY_CLASS = "jp-repost-link-body";
  var LINK_TITLE_CLASS = "jp-repost-link-title";
  var LINK_FOOTER_CLASS = "jp-repost-link-footer";
  var ATTACHMENT_SELECTOR = `.${LINK_CLASS}, .${MEDIA_CLASS}, .${VIDEO_CLASS}`;
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
    const displayWidth = ratio >= 1 ? baseSize * ratio : Math.min(baseSize, maxHeight * ratio);
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
      placeholder.textContent = "\u2197";
      card.appendChild(placeholder);
    }
    const body = document.createElement("div");
    body.className = LINK_BODY_CLASS;
    const title = document.createElement("div");
    title.className = LINK_TITLE_CLASS;
    title.textContent = stringValue(linkInfo?.title) || href || "\u6253\u5F00\u94FE\u63A5";
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
    const mediaKey = `${source.type || "UNKNOWN"}:${source.id}:${pictures.map((picture) => picture.key || fullPictureUrl(picture)).join(",")}`;
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
      item.setAttribute("aria-label", `\u6253\u5F00\u8F6C\u53D1\u539F\u5E16\u56FE\u7247 ${index + 1}`);
      item.addEventListener(
        "click",
        (event) => openLightboxFromMedia(event, pictures, index),
        true
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
      image.alt = `\u8F6C\u53D1\u539F\u5E16\u56FE\u7247 ${index + 1}`;
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
    video.setAttribute("aria-label", "\u8F6C\u53D1\u539F\u5E16\u89C6\u9891");
    stopAttachmentEventPropagation(video);
    insertAttachment(card, video);
    card.dataset.jpRepostVideoKey = videoKey;
    syncAttachmentGapOffset(card);
  }
  async function syncQuoteCard(card) {
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

  // src/jike-polish-page-bridge.js
  var BRIDGE_KEY = "__JIKE_POLISH_REPOST_MEDIA_BRIDGE__";
  var WARMUP_SCAN_DELAYS = [120, 360, 800, 1600, 3e3, 5e3];
  var PERIODIC_SCAN_DELAY = 1800;
  function installPageBridge() {
    const existingBridge = window[BRIDGE_KEY];
    if (typeof existingBridge?.rescan === "function") {
      existingBridge.rescan();
      return;
    }
    const bridge = { rescan: null };
    window[BRIDGE_KEY] = bridge;
    let scanTimer = 0;
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
      for (const delay of WARMUP_SCAN_DELAYS) setTimeout(scheduleScan, delay);
    }
    bridge.rescan = scheduleWarmupScans;
    scheduleWarmupScans();
    window.addEventListener("pageshow", scheduleWarmupScans);
    setInterval(scheduleScan, PERIODIC_SCAN_DELAY);
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  installPageBridge();
})();
