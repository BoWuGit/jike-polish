import { POPUP_ID, WINDOW_SCROLL_BRIDGE_ID } from "./constants.js";

const CONTENT_STYLES = `
#${POPUP_ID}{position:fixed;z-index:99999;width:calc(17.5rem * var(--mantine-scale,1));max-width:calc(100vw - 24px);padding:12px;border-radius:calc(0.75rem * var(--mantine-scale,1));background:var(--bg-body-1,var(--mantine-color-body,#fff)) !important;border:1px solid var(--border-primary,rgba(15,23,42,.08)) !important;box-shadow:0 6px 24px rgba(15,23,42,.16);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important;animation:jpIn .12s ease}
@keyframes jpIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
#${POPUP_ID} .jp-scroll{max-height:min(60vh,420px);overflow-y:auto;overscroll-behavior:contain}
#${POPUP_ID} .jp-head{display:flex;align-items:flex-start;gap:10px}
#${POPUP_ID} .jp-av-link{flex-shrink:0}
#${POPUP_ID} .jp-av{width:48px;height:48px;border-radius:50%;object-fit:cover}
#${POPUP_ID} .jp-info{display:flex;flex-direction:column}
#${POPUP_ID} .jp-name{font-size:15px;font-weight:700;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important;text-decoration:none;display:flex;align-items:center;gap:2px;margin-top:2px}
#${POPUP_ID} .jp-name:hover{text-decoration:underline}
#${POPUP_ID} .jp-badge{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:var(--tint-jike-blue,#1da1f2);color:#fff;font-size:9px;font-weight:700;margin-left:3px}
#${POPUP_ID} .jp-stats{margin-top:6px;font-size:13px;display:flex;gap:14px;color:var(--mantine-color-dimmed,var(--color-text-secondary,#5a5e66)) !important}
#${POPUP_ID} .jp-stats span{color:inherit !important}
#${POPUP_ID} .jp-stats b{font-weight:700;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important}
#${POPUP_ID} .jp-tags{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px}
#${POPUP_ID} .jp-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:var(--bg-tag,#f0f1f5) !important;color:var(--color-text-secondary,#5a5e66) !important}
#${POPUP_ID} .jp-gender-m{background:#e8f4fd !important;color:#1da1f2 !important}
#${POPUP_ID} .jp-gender-f{background:#fde8ef !important;color:#e84887 !important}
#${POPUP_ID} .jp-bio{margin-top:6px;font-size:13px;line-height:1.45;color:var(--mantine-color-dimmed,var(--color-text-secondary,#5a5e66)) !important;white-space:pre-wrap;word-break:break-word}
#${POPUP_ID} .jp-follow{margin-top:10px;padding:5px 16px;border-radius:999px;border:1px solid #f8e71c;background:#f8e71c;font-size:13px;font-weight:600;cursor:pointer;color:#1d2129;transition:all .15s}
#${POPUP_ID} .jp-follow:hover{filter:brightness(.96)}
#${POPUP_ID} .jp-follow.jp-following{border-color:var(--border-primary,#d9d9d9);background:transparent;color:var(--color-text-secondary,#5a5e66) !important;font-weight:400}
#${POPUP_ID} .jp-follow:not(.jp-following){border-color:#f8e71c;color:#1d2129;background:#f8e71c}
#${POPUP_ID} .jp-status{padding:6px 2px 2px}
#${POPUP_ID} .jp-status-title{font-size:14px;font-weight:700;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important}
#${POPUP_ID} .jp-status-text{margin-top:6px;font-size:13px;line-height:1.5;color:var(--mantine-color-dimmed,var(--color-text-secondary,#5a5e66)) !important}
#${POPUP_ID} .jp-skeleton{position:relative;overflow:hidden;background:rgba(15,23,42,.08);border-radius:999px}
#${POPUP_ID} .jp-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent);animation:jpShimmer 1.2s infinite}
#${POPUP_ID} .jp-skeleton-avatar{width:48px;height:48px;border-radius:50%}
#${POPUP_ID} .jp-skeleton-group{gap:8px;padding-top:2px}
#${POPUP_ID} .jp-skeleton-line{height:10px;margin-top:10px}
#${POPUP_ID} .jp-skeleton-name{width:124px;margin-top:0}
#${POPUP_ID} .jp-skeleton-meta{width:148px}
#${POPUP_ID} .jp-skeleton-line-short{width:72%}
#${POPUP_ID} .jp-skeleton-chip{width:44px;height:22px;border-radius:10px}
#${POPUP_ID} .jp-skeleton-chip-wide{width:76px}
#${POPUP_ID} .jp-skeleton-button{width:84px;height:32px;margin-top:10px}
@keyframes jpShimmer{100%{transform:translateX(100%)}}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID}{background:var(--bg-body-1,#1d1f24) !important;border-color:var(--border-primary,rgba(255,255,255,.1)) !important;box-shadow:0 8px 30px rgba(0,0,0,.4);color:#eef1f5 !important}
#${POPUP_ID}.jp-dark{background:var(--mantine-color-dark-7,#1d1f24) !important;border-color:rgba(255,255,255,.1) !important;box-shadow:0 8px 30px rgba(0,0,0,.4);color:#eef1f5 !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-name,:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-stats b,:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-status-title,#${POPUP_ID}.jp-dark .jp-name,#${POPUP_ID}.jp-dark .jp-stats b,#${POPUP_ID}.jp-dark .jp-status-title{color:#eef1f5 !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-bio,:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-stats,:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-stats span,#${POPUP_ID}.jp-dark .jp-bio,#${POPUP_ID}.jp-dark .jp-stats,#${POPUP_ID}.jp-dark .jp-stats span{color:#b7bfcc !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-tag,#${POPUP_ID}.jp-dark .jp-tag{background:#2a2d35 !important;color:#b7bfcc !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-gender-m,#${POPUP_ID}.jp-dark .jp-gender-m{background:#103a5a !important;color:#7ecbff !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-gender-f,#${POPUP_ID}.jp-dark .jp-gender-f{background:#4d1d34 !important;color:#ff9bc2 !important}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-follow:hover,#${POPUP_ID}.jp-dark .jp-follow:hover{background:#2a2d35}
:is([data-mantine-color-scheme="dark"], [data-theme="dark"], html.dark, body.dark) #${POPUP_ID} .jp-status-text,#${POPUP_ID}.jp-dark .jp-status-text{color:#b7bfcc !important}
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
