import { safeHttpUrl } from "../shared/values.js";
import { fullPictureUrl } from "./post-data.js";

const LIGHTBOX_CLASS = "jp-repost-lightbox";
const LIGHTBOX_PORTAL_SELECTOR = `.${LIGHTBOX_CLASS}`;

let lightboxState = null;

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
  image.alt = `转发原帖图片 ${index + 1}`;
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
      lightboxState.portal.querySelectorAll("button:not([hidden]):not([disabled])"),
    );
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (
      event.shiftKey
      && (!lightboxState.portal.contains(document.activeElement) || document.activeElement === first)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey
      && (!lightboxState.portal.contains(document.activeElement) || document.activeElement === last)
    ) {
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

export function openLightbox(pictures, index) {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
  const closeButton = createLightboxButton(
    "yarl__button_close jp-repost-lightbox-close",
    "关闭图片预览",
    "M18 6 6 18M6 6l12 12",
  );
  closeButton.addEventListener("click", closeLightbox);
  toolbar.appendChild(closeButton);

  const prevButton = createLightboxButton(
    "yarl__navigation_prev jp-repost-lightbox-prev",
    "上一张图片",
    "M15 18l-6-6 6-6",
  );
  prevButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stepLightbox(-1);
  });

  const nextButton = createLightboxButton(
    "yarl__navigation_next jp-repost-lightbox-next",
    "下一张图片",
    "M9 6l6 6-6 6",
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
      ".yarl__toolbar, .yarl__navigation_prev, .yarl__navigation_next, .yarl__slide_image",
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
    opener,
  };
  document.addEventListener("keydown", handleLightboxKeydown);
  renderLightboxSlide();
  closeButton.focus({ preventScroll: true });
}
