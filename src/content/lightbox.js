const LIGHTBOX_ZOOM_OUT_BUTTON_ID = "jike-polish-lightbox-zoom-out";
const LIGHTBOX_ZOOM_IN_BUTTON_ID = "jike-polish-lightbox-zoom-in";
const LIGHTBOX_MIN_SCALE = 1;
const LIGHTBOX_MAX_SCALE = 6;
const LIGHTBOX_SCALE_STEP = 0.5;

let lightboxRaf = 0;

const lightboxZoom = {
  image: null,
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
};

export function getOpenLightbox() {
  return document.querySelector(".yarl__portal.yarl__portal_open");
}

function getActiveLightboxImage() {
  const lightbox = getOpenLightbox();
  if (!lightbox) return null;
  return lightbox.querySelector(".yarl__slide_current .yarl__slide_image")
    || lightbox.querySelector('.yarl__slide[aria-hidden="false"] .yarl__slide_image')
    || lightbox.querySelector(".yarl__slide_image");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampLightboxOffset(image, x, y, scale = lightboxZoom.scale) {
  const maxX = Math.max(0, (image.clientWidth * (scale - 1)) / 2);
  const maxY = Math.max(0, (image.clientHeight * (scale - 1)) / 2);
  return {
    x: clamp(x, -maxX, maxX),
    y: clamp(y, -maxY, maxY),
  };
}

function updateLightboxZoomButtons() {
  const zoomOutButton = document.getElementById(LIGHTBOX_ZOOM_OUT_BUTTON_ID);
  const zoomInButton = document.getElementById(LIGHTBOX_ZOOM_IN_BUTTON_ID);
  if (zoomOutButton instanceof HTMLButtonElement) {
    zoomOutButton.disabled = lightboxZoom.scale <= LIGHTBOX_MIN_SCALE;
    zoomOutButton.setAttribute("title", "缩小图片");
    zoomOutButton.setAttribute("aria-label", "缩小图片");
  }
  if (zoomInButton instanceof HTMLButtonElement) {
    zoomInButton.disabled = lightboxZoom.scale >= LIGHTBOX_MAX_SCALE;
    zoomInButton.setAttribute("title", "放大图片");
    zoomInButton.setAttribute("aria-label", "放大图片");
  }
}

function applyLightboxTransform() {
  const image = lightboxZoom.image;
  if (!(image instanceof HTMLElement) || !document.contains(image)) {
    lightboxZoom.image = null;
    return;
  }

  const { x, y } = clampLightboxOffset(image, lightboxZoom.x, lightboxZoom.y);
  lightboxZoom.x = x;
  lightboxZoom.y = y;
  image.style.transformOrigin = "center center";
  image.style.transition = lightboxZoom.dragging ? "none" : "transform 140ms ease";
  image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${lightboxZoom.scale})`;
  let cursor = "zoom-in";
  if (lightboxZoom.scale > LIGHTBOX_MIN_SCALE) {
    cursor = lightboxZoom.dragging ? "grabbing" : "grab";
  }
  image.style.cursor = cursor;
  image.classList.toggle("jp-lightbox-zoomed", lightboxZoom.scale > 1);
  updateLightboxZoomButtons();
}

function resetLightboxZoom() {
  if (lightboxZoom.image instanceof HTMLElement) {
    lightboxZoom.image.style.transform = "";
    lightboxZoom.image.style.transformOrigin = "";
    lightboxZoom.image.style.transition = "";
    lightboxZoom.image.style.cursor = "";
    lightboxZoom.image.classList.remove("jp-lightbox-zoomed", "jp-lightbox-dragging");
  }
  lightboxZoom.scale = 1;
  lightboxZoom.x = 0;
  lightboxZoom.y = 0;
  lightboxZoom.dragging = false;
  lightboxZoom.pointerId = null;
  lightboxZoom.image = null;
  updateLightboxZoomButtons();
}

function syncActiveLightboxImage() {
  const image = getActiveLightboxImage();
  if (!(image instanceof HTMLElement)) {
    resetLightboxZoom();
    return null;
  }
  if (lightboxZoom.image !== image) {
    resetLightboxZoom();
    lightboxZoom.image = image;
    bindLightboxImage(image);
  }
  return image;
}

function setLightboxScale(nextScale) {
  const image = syncActiveLightboxImage();
  if (!image) return;

  const scale = clamp(nextScale, LIGHTBOX_MIN_SCALE, LIGHTBOX_MAX_SCALE);
  if (scale === LIGHTBOX_MIN_SCALE) {
    lightboxZoom.scale = LIGHTBOX_MIN_SCALE;
    lightboxZoom.x = 0;
    lightboxZoom.y = 0;
  } else {
    lightboxZoom.scale = scale;
    const nextOffset = clampLightboxOffset(image, lightboxZoom.x, lightboxZoom.y, scale);
    lightboxZoom.x = nextOffset.x;
    lightboxZoom.y = nextOffset.y;
  }
  applyLightboxTransform();
}

function zoomLightboxIn() {
  const nextScale = lightboxZoom.scale > LIGHTBOX_MIN_SCALE
    ? lightboxZoom.scale + LIGHTBOX_SCALE_STEP
    : 2;
  setLightboxScale(nextScale);
}

function zoomLightboxOut() {
  const nextScale = lightboxZoom.scale > LIGHTBOX_MIN_SCALE
    ? lightboxZoom.scale - LIGHTBOX_SCALE_STEP
    : LIGHTBOX_MIN_SCALE;
  setLightboxScale(nextScale);
}

function onLightboxPointerDown(event) {
  const image = syncActiveLightboxImage();
  if (!image || event.currentTarget !== image || lightboxZoom.scale <= 1 || event.button !== 0) return;

  lightboxZoom.dragging = true;
  lightboxZoom.pointerId = event.pointerId;
  lightboxZoom.startX = event.clientX;
  lightboxZoom.startY = event.clientY;
  lightboxZoom.originX = lightboxZoom.x;
  lightboxZoom.originY = lightboxZoom.y;
  image.classList.add("jp-lightbox-dragging");
  image.setPointerCapture?.(event.pointerId);
  applyLightboxTransform();
  event.preventDefault();
}

function onLightboxPointerMove(event) {
  const image = lightboxZoom.image;
  if (
    !(image instanceof HTMLElement)
    || event.currentTarget !== image
    || !lightboxZoom.dragging
    || lightboxZoom.pointerId !== event.pointerId
  ) return;

  const deltaX = event.clientX - lightboxZoom.startX;
  const deltaY = event.clientY - lightboxZoom.startY;
  const nextOffset = clampLightboxOffset(
    image,
    lightboxZoom.originX + deltaX,
    lightboxZoom.originY + deltaY,
  );
  lightboxZoom.x = nextOffset.x;
  lightboxZoom.y = nextOffset.y;
  applyLightboxTransform();
  event.preventDefault();
  event.stopPropagation();
}

function onLightboxPointerEnd(event) {
  const image = lightboxZoom.image;
  if (
    !(image instanceof HTMLElement)
    || event.currentTarget !== image
    || lightboxZoom.pointerId !== event.pointerId
  ) return;

  lightboxZoom.dragging = false;
  lightboxZoom.pointerId = null;
  image.classList.remove("jp-lightbox-dragging");
  if (image.hasPointerCapture?.(event.pointerId)) image.releasePointerCapture(event.pointerId);
  applyLightboxTransform();
  event.preventDefault();
  event.stopPropagation();
}

function onLightboxImageClick(event) {
  if (lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
  event.preventDefault();
  event.stopPropagation();
}

function panLightboxBy(deltaX, deltaY) {
  const image = syncActiveLightboxImage();
  if (!image || lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;

  const nextOffset = clampLightboxOffset(
    image,
    lightboxZoom.x + deltaX,
    lightboxZoom.y + deltaY,
  );
  lightboxZoom.x = nextOffset.x;
  lightboxZoom.y = nextOffset.y;
  applyLightboxTransform();
}

function panLightboxByViewport(direction = 1) {
  const image = syncActiveLightboxImage();
  if (!image || lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
  const step = Math.max(120, Math.round(window.innerHeight * 0.72));
  panLightboxBy(0, direction * step);
}

function bindLightboxImage(image) {
  if (!(image instanceof HTMLElement) || image.dataset.jpZoomBound === "1") return;
  image.dataset.jpZoomBound = "1";
  image.addEventListener("dblclick", (event) => {
    event.preventDefault();
    setLightboxScale(lightboxZoom.scale > LIGHTBOX_MIN_SCALE ? LIGHTBOX_MIN_SCALE : 2);
  });
  image.addEventListener("pointerdown", onLightboxPointerDown);
  image.addEventListener("pointermove", onLightboxPointerMove);
  image.addEventListener("pointerup", onLightboxPointerEnd);
  image.addEventListener("pointercancel", onLightboxPointerEnd);
  image.addEventListener("click", onLightboxImageClick, true);
  image.addEventListener("dragstart", (event) => event.preventDefault());
}

function createZoomButton(id, label, pathData) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = id;
  button.className = "yarl__button jp-lightbox-zoom-button";
  button.title = label;
  button.setAttribute("aria-label", label);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.8");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);
  button.appendChild(svg);
  return button;
}

function ensureLightboxZoomButtons() {
  const lightbox = getOpenLightbox();
  if (!lightbox) {
    resetLightboxZoom();
    return;
  }

  const toolbar = lightbox.querySelector(".yarl__toolbar");
  if (!(toolbar instanceof HTMLElement)) return;

  let zoomOutButton = toolbar.querySelector(`#${LIGHTBOX_ZOOM_OUT_BUTTON_ID}`);
  let zoomInButton = toolbar.querySelector(`#${LIGHTBOX_ZOOM_IN_BUTTON_ID}`);
  if (!(zoomOutButton instanceof HTMLButtonElement)) {
    zoomOutButton = createZoomButton(
      LIGHTBOX_ZOOM_OUT_BUTTON_ID,
      "缩小图片",
      "M7 12h10",
    );
    zoomOutButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      zoomLightboxOut();
    });
    toolbar.insertBefore(zoomOutButton, toolbar.firstChild);
  }
  if (!(zoomInButton instanceof HTMLButtonElement)) {
    zoomInButton = createZoomButton(
      LIGHTBOX_ZOOM_IN_BUTTON_ID,
      "放大图片",
      "M12 7v10M7 12h10",
    );
    zoomInButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      zoomLightboxIn();
    });
    toolbar.insertBefore(zoomInButton, zoomOutButton.nextSibling);
  }
  syncActiveLightboxImage();
  updateLightboxZoomButtons();
}

function scheduleLightboxSync() {
  if (lightboxRaf) return;
  lightboxRaf = requestAnimationFrame(() => {
    lightboxRaf = 0;
    ensureLightboxZoomButtons();
  });
}

function mutationTouchesLightbox(node) {
  if (node instanceof Element) {
    return !!(node.matches?.(".yarl__portal") || node.closest?.(".yarl__portal"));
  }
  return node instanceof DocumentFragment && !!node.querySelector?.(".yarl__portal");
}

function isLightboxMutationRelevant(mutations) {
  for (const mutation of mutations) {
    if (mutation.type === "childList") {
      for (const node of mutation.addedNodes) {
        if (mutationTouchesLightbox(node)) return true;
      }
      for (const node of mutation.removedNodes) {
        if (mutationTouchesLightbox(node)) return true;
      }
      continue;
    }
    if (
      mutation.type === "attributes"
      && ["class", "aria-hidden", "src"].includes(mutation.attributeName)
      && mutation.target instanceof Element
      && mutation.target.closest(".yarl__portal")
    ) return true;
  }
  return false;
}

function handleLightboxClick(event) {
  // Safari can delay MutationObserver delivery for DOM inserted by the page world.
  scheduleLightboxSync();

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest(".yarl__navigation_prev, .yarl__navigation_next")) {
    requestAnimationFrame(() => {
      resetLightboxZoom();
      scheduleLightboxSync();
    });
  }

  const lightbox = getOpenLightbox();
  if (!(lightbox instanceof HTMLElement) || !lightbox.contains(target)) return;
  if (lightboxZoom.scale <= LIGHTBOX_MIN_SCALE) return;
  if (target.closest(".yarl__toolbar, .yarl__navigation_prev, .yarl__navigation_next")) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleLightboxKeydown(event) {
  if (!getOpenLightbox()) return;
  if (event.key === "Escape") {
    resetLightboxZoom();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    requestAnimationFrame(() => {
      resetLightboxZoom();
      scheduleLightboxSync();
    });
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    panLightboxBy(0, event.key === "ArrowUp" ? 80 : -80);
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    panLightboxByViewport(event.shiftKey ? 1 : -1);
    return;
  }
  if ((event.key === "+" || event.key === "=") && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    zoomLightboxIn();
    return;
  }
  if (event.key === "-" && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    zoomLightboxOut();
    return;
  }
  if (event.key === "0" && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    setLightboxScale(LIGHTBOX_MIN_SCALE);
  }
}

function handleLightboxWheel(event) {
  const lightbox = getOpenLightbox();
  const target = event.target;
  if (!(lightbox instanceof HTMLElement) || !(target instanceof HTMLElement) || !lightbox.contains(target)) return;

  if (lightboxZoom.scale > LIGHTBOX_MIN_SCALE && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    panLightboxBy(-event.deltaX, -event.deltaY);
    return;
  }
  if (!event.ctrlKey && !event.metaKey) return;

  event.preventDefault();
  const nextScale = lightboxZoom.scale + (event.deltaY < 0 ? 0.25 : -0.25);
  setLightboxScale(nextScale);
}

export function installLightboxZoom() {
  const observer = new MutationObserver((mutations) => {
    if (isLightboxMutationRelevant(mutations)) scheduleLightboxSync();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-hidden", "src"],
  });

  document.addEventListener("click", handleLightboxClick, true);
  document.addEventListener("keydown", handleLightboxKeydown, true);
  document.addEventListener("wheel", handleLightboxWheel, { passive: false, capture: true });
  scheduleLightboxSync();
}
