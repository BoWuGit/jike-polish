const body = document.body;
const overview = document.querySelector(".overview");
const demo = document.querySelector(".demo");
const tabs = [...document.querySelectorAll(".demo-tab")];
const panels = [...document.querySelectorAll(".demo-panel")];
const lightbox = document.querySelector(".lightbox");
const viewport = document.querySelector(".lightbox-viewport");
const canvas = document.querySelector(".zoom-canvas");
const zoomLevel = document.querySelector(".zoom-level");
const profileDemo = document.querySelector(".profile-demo");
const profileTrigger = document.querySelector(".profile-trigger");

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dragStart = null;

window.show = (enabled) => {
    body.classList.toggle("state-on", enabled === true);
    body.classList.toggle("state-off", enabled === false);
};

function openPreferences() {
    window.webkit?.messageHandlers?.controller?.postMessage("open-preferences");
}

function setDemoOpen(open) {
    overview.hidden = open;
    demo.hidden = !open;
    if (!open) closeLightbox();
}

function selectTab(name) {
    tabs.forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => {
        const active = panel.dataset.panel === name;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
    });
}

function selectLayout(mode) {
    document.querySelector(".layout-preview")?.classList.toggle("is-polished", mode === "polished");
    document.querySelectorAll("[data-layout]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.layout === mode);
    });
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function updateZoom() {
    offsetX = clamp(offsetX, -240 * scale, 240 * scale);
    offsetY = clamp(offsetY, -160 * scale, 160 * scale);
    canvas.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    zoomLevel.value = `${scale}×`;
    zoomLevel.textContent = `${scale}×`;
    document.querySelector(".zoom-out").disabled = scale === 1;
    document.querySelector(".zoom-in").disabled = scale === 6;
}

function setScale(nextScale) {
    scale = clamp(Math.round(nextScale), 1, 6);
    if (scale === 1) {
        offsetX = 0;
        offsetY = 0;
    }
    updateZoom();
}

function openLightbox() {
    lightbox.hidden = false;
    setScale(1);
    document.querySelector(".close-lightbox")?.focus();
}

function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    dragStart = null;
    viewport.classList.remove("is-dragging");
}

function moveCanvas(deltaX, deltaY) {
    if (scale === 1) return;
    offsetX += deltaX;
    offsetY += deltaY;
    updateZoom();
}

document.querySelector(".open-preferences")?.addEventListener("click", openPreferences);
document.querySelector(".open-demo")?.addEventListener("click", () => setDemoOpen(true));
document.querySelector(".close-demo")?.addEventListener("click", () => setDemoOpen(false));

tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
document.querySelectorAll("[data-layout]").forEach((button) => {
    button.addEventListener("click", () => selectLayout(button.dataset.layout));
});

profileTrigger?.addEventListener("click", () => {
    const open = profileDemo.classList.toggle("is-open");
    profileTrigger.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".open-lightbox").forEach((button) => button.addEventListener("click", openLightbox));
document.querySelector(".close-lightbox")?.addEventListener("click", closeLightbox);
document.querySelector(".zoom-in")?.addEventListener("click", () => setScale(scale + 1));
document.querySelector(".zoom-out")?.addEventListener("click", () => setScale(scale - 1));
document.querySelector(".reset-zoom")?.addEventListener("click", () => setScale(1));

viewport?.addEventListener("wheel", (event) => {
    event.preventDefault();
    setScale(scale + (event.deltaY < 0 ? 1 : -1));
}, { passive: false });

viewport?.addEventListener("dblclick", () => setScale(scale === 1 ? 2 : 1));
viewport?.addEventListener("pointerdown", (event) => {
    if (scale === 1) return;
    dragStart = { x: event.clientX, y: event.clientY, offsetX, offsetY };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-dragging");
});
viewport?.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    offsetX = dragStart.offsetX + event.clientX - dragStart.x;
    offsetY = dragStart.offsetY + event.clientY - dragStart.y;
    updateZoom();
});
viewport?.addEventListener("pointerup", (event) => {
    dragStart = null;
    viewport.releasePointerCapture(event.pointerId);
    viewport.classList.remove("is-dragging");
});

window.addEventListener("keydown", (event) => {
    if (lightbox?.hidden) return;
    if (event.key === "Escape") closeLightbox();
    else if (event.key === "+" || event.key === "=") setScale(scale + 1);
    else if (event.key === "-") setScale(scale - 1);
    else if (event.key === "0") setScale(1);
    else if (event.key === "ArrowLeft") moveCanvas(-24, 0);
    else if (event.key === "ArrowRight") moveCanvas(24, 0);
    else if (event.key === "ArrowUp") moveCanvas(0, -24);
    else if (event.key === "ArrowDown") moveCanvas(0, 24);
});
