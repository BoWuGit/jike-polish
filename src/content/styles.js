import { POPUP_ID, WINDOW_SCROLL_BRIDGE_ID } from "./constants.js";

const CONTENT_STYLES = `
#${POPUP_ID}{position:fixed;z-index:99999;box-sizing:border-box;width:calc(17.5rem * var(--mantine-scale,1));max-width:calc(100vw - 24px);padding:calc(.75rem * var(--mantine-scale,1));border-radius:calc(.75rem * var(--mantine-scale,1));background:var(--bg-body-1,var(--mantine-color-body,#fff)) !important;border:0;box-shadow:0 2px 12px rgba(0,0,0,.24);font-family:inherit;color:var(--tint-primary,var(--color-text-primary,#333)) !important;animation:jpIn .12s ease}
@keyframes jpIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
#${POPUP_ID} .jp-scroll{display:flex;flex-direction:column;gap:calc(.75rem * var(--mantine-scale,1));max-height:min(60vh,420px);overflow-y:auto;overscroll-behavior:contain}
#${POPUP_ID} .jp-head{display:grid;grid-template-columns:calc(3.5rem * var(--mantine-scale,1)) minmax(0,1fr);align-items:start;gap:calc(.75rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-av-link{position:relative;display:block;width:calc(3.5rem * var(--mantine-scale,1));height:calc(3.5rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-av{display:block;box-sizing:border-box;width:100%;height:100%;border:1px solid var(--tint-pic-border,rgba(0,0,0,.06));border-radius:50%;object-fit:cover}
#${POPUP_ID} .jp-sponsor-icon{position:absolute;right:calc(-.125rem * var(--mantine-scale,1));bottom:calc(-.125rem * var(--mantine-scale,1));width:calc(.875rem * var(--mantine-scale,1));height:calc(.875rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-info{display:grid;grid-auto-rows:max-content;gap:calc(.5rem * var(--mantine-scale,1));min-width:0;overflow:hidden}
#${POPUP_ID} .jp-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(1.25rem * var(--mantine-scale,1));line-height:calc(1.75rem * var(--mantine-scale,1));font-weight:650;color:var(--tint-primary,var(--color-text-primary,#333)) !important;text-decoration:none}
#${POPUP_ID} .jp-name:hover{text-decoration:underline}
#${POPUP_ID} .jp-stats{display:flex;align-items:center;gap:calc(.5rem * var(--mantine-scale,1));font-size:calc(.875rem * var(--mantine-scale,1));line-height:calc(1.25rem * var(--mantine-scale,1));color:var(--tint-secondary,var(--color-text-secondary,#808080)) !important}
#${POPUP_ID} .jp-stats>span{display:inline-flex;align-items:center;gap:calc(.125rem * var(--mantine-scale,1));white-space:nowrap}
#${POPUP_ID} .jp-stats span{color:inherit !important}
#${POPUP_ID} .jp-stats b{font-weight:500;color:var(--tint-primary,var(--color-text-primary,#333)) !important}
#${POPUP_ID} .jp-tags{display:flex;flex-wrap:wrap;gap:calc(.25rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-tag{display:flex;align-items:center;box-sizing:border-box;height:calc(1rem * var(--mantine-scale,1));padding:calc(.125rem * var(--mantine-scale,1)) calc(.375rem * var(--mantine-scale,1));border-radius:calc(1.25rem * var(--mantine-scale,1));font-size:calc(.625rem * var(--mantine-scale,1));line-height:calc(.75rem * var(--mantine-scale,1));white-space:nowrap;background:var(--bg-on-body-2,#f0f3f5) !important;color:var(--tint-primary,#333) !important}
#${POPUP_ID} .jp-tag img{display:block;width:calc(.75rem * var(--mantine-scale,1));height:calc(.75rem * var(--mantine-scale,1))}
#${POPUP_ID} .jp-gender-m{background:var(--solid-label-male,rgba(3,169,244,.5)) !important;color:#fff !important}
#${POPUP_ID} .jp-gender-f{background:var(--solid-label-female,rgba(252,104,157,.5)) !important;color:#fff !important}
#${POPUP_ID} .jp-bio{font-size:calc(.875rem * var(--mantine-scale,1));line-height:calc(1.25rem * var(--mantine-scale,1));color:var(--tint-secondary,var(--color-text-secondary,#808080)) !important;white-space:normal;overflow-wrap:anywhere}
#${POPUP_ID} .jp-follow{align-self:flex-start;box-sizing:border-box;min-width:calc(3.5625rem * var(--mantine-scale,1));height:calc(1.875rem * var(--mantine-scale,1));padding:calc(.25rem * var(--mantine-scale,1)) calc(.875rem * var(--mantine-scale,1));border-radius:calc(6.25rem * var(--mantine-scale,1));border:1px solid transparent;background:var(--mantine-color-yellow-filled,#ffe411);font-family:inherit;font-size:calc(.875rem * var(--mantine-scale,1));line-height:calc(1.375rem * var(--mantine-scale,1));font-weight:400;cursor:pointer;color:var(--solid-gray-4,#333);transition:background-color .15s}
#${POPUP_ID} .jp-follow:hover{filter:brightness(.96)}
#${POPUP_ID} .jp-follow.jp-following{border-color:var(--tint-separator,#d9d9d9);background:transparent;color:var(--tint-primary,#333) !important}
#${POPUP_ID} .jp-status{padding:6px 2px 2px}
#${POPUP_ID} .jp-status-title{font-size:14px;font-weight:700;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important}
#${POPUP_ID} .jp-status-text{margin-top:6px;font-size:13px;line-height:1.5;color:var(--mantine-color-dimmed,var(--color-text-secondary,#5a5e66)) !important}
#${POPUP_ID} .jp-skeleton{position:relative;overflow:hidden;background:rgba(15,23,42,.08);border-radius:999px}
#${POPUP_ID} .jp-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent);animation:jpShimmer 1.2s infinite}
#${POPUP_ID} .jp-skeleton-avatar{width:calc(3.5rem * var(--mantine-scale,1));height:calc(3.5rem * var(--mantine-scale,1));border-radius:50%}
#${POPUP_ID} .jp-skeleton-group{gap:8px;padding-top:2px}
#${POPUP_ID} .jp-skeleton-line{height:10px;margin-top:10px}
#${POPUP_ID} .jp-skeleton-name{width:124px;margin-top:0}
#${POPUP_ID} .jp-skeleton-meta{width:148px}
#${POPUP_ID} .jp-skeleton-line-short{width:72%}
#${POPUP_ID} .jp-skeleton-chip{width:44px;height:calc(1rem * var(--mantine-scale,1));border-radius:10px}
#${POPUP_ID} .jp-skeleton-chip-wide{width:76px}
#${POPUP_ID} .jp-skeleton-button{width:84px;height:32px;margin-top:10px}
@keyframes jpShimmer{100%{transform:translateX(100%)}}
#${POPUP_ID}.jp-dark{background:var(--bg-body-1,#1d1f24) !important;box-shadow:0 2px 12px rgba(0,0,0,.24);color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-name,#${POPUP_ID}.jp-dark .jp-stats b,#${POPUP_ID}.jp-dark .jp-status-title{color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-bio,#${POPUP_ID}.jp-dark .jp-stats{color:var(--tint-secondary,#b7bfcc) !important}
#${POPUP_ID}.jp-dark .jp-tag{background:var(--bg-on-body-2,#2a2d35) !important;color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-gender-m{background:var(--solid-label-male,rgba(3,169,244,.5)) !important;color:#fff !important}
#${POPUP_ID}.jp-dark .jp-gender-f{background:var(--solid-label-female,rgba(252,104,157,.5)) !important;color:#fff !important}
#${POPUP_ID}.jp-dark .jp-follow.jp-following{color:var(--tint-primary,#eef1f5) !important}
#${POPUP_ID}.jp-dark .jp-status-text{color:var(--tint-secondary,#b7bfcc) !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-skeleton,#${POPUP_ID}.jp-dark .jp-skeleton{background:rgba(255,255,255,.09)}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-skeleton::after,#${POPUP_ID}.jp-dark .jp-skeleton::after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)}
.mantine-HoverCard-dropdown [class*="_bio"],.mantine-HoverCard-dropdown [class*="_briefIntro"],.mantine-HoverCard-dropdown [class*="_desc"]{-webkit-line-clamp:unset !important;display:block !important;overflow:visible !important;max-height:none !important;text-overflow:unset !important}
.jp-window-scroll-bridge{overflow-y:auto !important;scrollbar-width:none}
.jp-window-scroll-bridge::-webkit-scrollbar{display:none}
.jp-window-scroll-bridge body{min-height:100vh !important;overflow:visible !important}
.jp-window-scroll-bridge #root{position:fixed !important;inset:0 !important;width:100% !important;height:100% !important;overflow:hidden !important}
#${WINDOW_SCROLL_BRIDGE_ID}{display:block !important;width:1px !important;min-height:100vh !important;pointer-events:none !important;opacity:0 !important}
.jp-keyboard-scroll-target:focus{outline:none}
.jp-lightbox-zoom-button svg{display:block;width:22px;height:22px}
.jp-lightbox-zoom-button:disabled{opacity:.45;cursor:default}
.yarl__slide_image.jp-lightbox-zoomed{max-width:none;will-change:transform;touch-action:none;user-select:none}
.yarl__slide_image.jp-lightbox-dragging{cursor:grabbing}
`;

export function installContentStyles() {
  if (document.getElementById("jike-polish-css")) return;

  const style = document.createElement("style");
  style.id = "jike-polish-css";
  style.textContent = CONTENT_STYLES;
  document.head.appendChild(style);
}
