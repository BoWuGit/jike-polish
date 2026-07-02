(() => {
  if (window.__JIKE_POLISH_REPOST_MEDIA_BRIDGE__) return;
  window.__JIKE_POLISH_REPOST_MEDIA_BRIDGE__ = true;

  const API_ORIGIN = "https://api.ruguoapp.com";
  const QUOTE_CARD_SELECTOR = "._root_1kp3y_1";
  const QUOTE_MAIN_SELECTOR = "._main_1kp3y_9";
  const MEDIA_CLASS = "jp-repost-media";
  const MEDIA_ITEM_CLASS = "jp-repost-media-item";
  const MEDIA_IMAGE_CLASS = "jp-repost-media-img";
  const MEDIA_MORE_CLASS = "jp-repost-media-more";
  const LIGHTBOX_CLASS = "jp-repost-lightbox";
  const LIGHTBOX_PORTAL_SELECTOR = `.${LIGHTBOX_CLASS}`;
  const DETAIL_ENDPOINT_BY_TYPE = {
    ORIGINAL_POST: "/1.0/originalPosts/get",
    REPOST: "/1.0/reposts/get"
  };

  const detailCache = new Map();
  let scanRaf = 0;
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

  function getMediaSource(data) {
    if (getPictures(data).length) return data;
    if (getPictures(data?.target).length) return data.target;
    return null;
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

  function removeMedia(card, key) {
    getExistingMedia(card)?.remove();
    if (key) card.dataset.jpRepostMediaKey = key;
  }

  function insertMedia(card, media) {
    const main = card.querySelector(QUOTE_MAIN_SELECTOR);
    if (main?.nextSibling) {
      card.insertBefore(media, main.nextSibling);
      return;
    }
    card.appendChild(media);
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

  function renderMedia(card, source, pictures) {
    const mediaKey = `${source.type || "UNKNOWN"}:${source.id}:${pictures.map((picture) => picture.key || fullPictureUrl(picture)).join(",")}`;
    if (card.dataset.jpRepostMediaKey === mediaKey && getExistingMedia(card)) return;

    getExistingMedia(card)?.remove();
    const shownPictures = pictures.slice(0, 4);
    const media = document.createElement("div");
    media.className = MEDIA_CLASS;
    media.dataset.count = String(shownPictures.length);
    media.dataset.total = String(pictures.length);

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

    insertMedia(card, media);
    card.dataset.jpRepostMediaKey = mediaKey;
  }

  function samePost(a, b) {
    return !!a && !!b && a.id === b.id && a.type === b.type;
  }

  async function syncQuoteCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const data = getQuoteData(card);
    if (!isPostLike(data)) return;

    let source = getMediaSource(data);
    if (!source && shouldFetchDetail(data)) {
      const detail = await fetchPostDetail(data);
      if (!document.contains(card) || !samePost(getQuoteData(card), data)) return;
      source = getMediaSource(detail);
    }

    if (!source) {
      removeMedia(card, `${data.type}:${data.id}:none`);
      return;
    }

    const pictures = getPictures(source);
    if (!pictures.length) {
      removeMedia(card, `${source.type}:${source.id}:none`);
      return;
    }

    renderMedia(card, source, pictures);
  }

  function scanQuoteCards() {
    for (const card of document.querySelectorAll(QUOTE_CARD_SELECTOR)) {
      void syncQuoteCard(card);
    }
  }

  function scheduleScan() {
    if (scanRaf) return;
    scanRaf = requestAnimationFrame(() => {
      scanRaf = 0;
      scanQuoteCards();
    });
  }

  scheduleScan();

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
})();
