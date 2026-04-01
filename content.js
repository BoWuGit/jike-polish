(() => {
  const API_BASE = "https://api.ruguoapp.com/1.0";
  const DEBUG = localStorage.getItem("JIKE_POLISH_DEBUG") === "1";
  const POPUP_ID = "jike-polish-popup";
  const CACHE = new Map();
  const PENDING = new Map();
  const SHOW_DELAY = 140;

  let activeLink = null;
  let hideTimer = null;
  let hoverTimer = null;
  let requestSeq = 0;

  function log(...a) { if (DEBUG) console.log("[jike-polish]", ...a); }
  function token() { return localStorage.getItem("JK_ACCESS_TOKEN"); }
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function isDarkModeActive() {
    const root = document.documentElement;
    const body = document.body;
    if (root?.getAttribute("data-mantine-color-scheme") === "dark") return true;
    if (root?.getAttribute("data-theme") === "dark") return true;
    if (root?.classList?.contains("dark") || body?.classList?.contains("dark")) return true;
    const bg = getComputedStyle(body || root).backgroundColor || "";
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return false;
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.45;
  }

  function applyPopupTheme(card) {
    card.classList.toggle("jp-dark", isDarkModeActive());
  }

  function isBodyMention(el) {
    if (!(el instanceof HTMLElement)) return false;
    const link = el.closest('a[href*="/u/"]');
    if (!link) return false;
    if (!link.querySelector('[class*="_mentionUser_"], [class*="_name_1rdwv_"], [class*="_avatar_1rdwv_"]')) return false;
    return true;
  }

  function getLink(el) {
    if (!(el instanceof HTMLElement)) return null;
    const link = el.closest('a[href*="/u/"]');
    if (!link || !isBodyMention(el)) return null;
    return link;
  }

  function extractId(link) {
    const m = (link.getAttribute("href") || "").match(/\/u\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function fetchUser(id) {
    if (CACHE.has(id)) return CACHE.get(id);
    if (PENDING.has(id)) return PENDING.get(id);
    const t = token();
    if (!t) return null;
    const isUuid = /^[0-9a-f]{8}-/.test(id);
    const qs = isUuid
      ? [`username=${encodeURIComponent(id)}`, `id=${encodeURIComponent(id)}`]
      : [`username=${encodeURIComponent(id)}`];
    const task = (async () => {
      for (const q of qs) {
        try {
          const r = await fetch(`${API_BASE}/users/profile?${q}`, {
            headers: { "X-Jike-Access-Token": t }
          });
          if (!r.ok) continue;
          const j = await r.json();
          if (j.user) {
            CACHE.set(id, j.user);
            return j.user;
          }
        } catch (e) {
          log("fetch err", q, e);
        }
      }
      return null;
    })();
    PENDING.set(id, task);
    try {
      return await task;
    } finally {
      PENDING.delete(id);
    }
  }

  async function toggleFollow(username, isFollowing) {
    const t = token();
    if (!t || !username) return null;
    const endpoint = isFollowing ? "userRelation/unfollow" : "userRelation/follow";
    try {
      const r = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: {
          "X-Jike-Access-Token": t,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username })
      });
      return r.ok;
    } catch (e) { log("follow err", e); return false; }
  }

  function removePopup() {
    const el = document.getElementById(POPUP_ID);
    if (el) el.remove();
  }

  function cancelHide() {
    clearTimeout(hideTimer);
  }

  function cancelHover() {
    clearTimeout(hoverTimer);
  }

  function closePopup() {
    cancelHide();
    cancelHover();
    removePopup();
    activeLink = null;
  }

  function hide() {
    cancelHide();
    hideTimer = setTimeout(() => closePopup(), 160);
  }

  function positionCard(card, anchor) {
    const rect = anchor.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + cr.width > innerWidth - 10) left = innerWidth - cr.width - 10;
    if (left < 10) left = 10;
    if (top + cr.height > innerHeight - 10) top = rect.top - cr.height - 8;
    if (top < 10) top = 10;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function findScrollableContainer(startNode = document.body) {
    const start = startNode instanceof HTMLElement ? startNode : document.body;
    for (let el = start; el; el = el.parentElement) {
      const style = getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4) {
        return el;
      }
    }

    const viewport = Array.from(document.querySelectorAll(".mantine-ScrollArea-viewport, [class*='ScrollArea-viewport'], [class*='ScrollArea_viewport']"))
      .find((el) => el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 4);
    if (viewport instanceof HTMLElement) return viewport;

    return document.scrollingElement || document.documentElement;
  }

  function forwardNativeHoverCardWheel(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const nativeCard = target.closest(".mantine-HoverCard-dropdown, [class*='mantine-HoverCard-dropdown']");
    if (!nativeCard) return;
    const scroller = findScrollableContainer(nativeCard);
    if (!scroller) return;
    event.preventDefault();
    scroller.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
  }

  function forwardCustomPopupWheel(event) {
    const target = event.currentTarget;
    const scroller = findScrollableContainer(target instanceof HTMLElement ? target : activeLink);
    if (!scroller) return;
    event.preventDefault();
    scroller.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto"
    });
    closePopup();
  }

  function bindCardControls(card) {
    card.addEventListener("mouseenter", cancelHide);
    card.addEventListener("mouseleave", hide);
    card.addEventListener("wheel", forwardCustomPopupWheel, { passive: false });
  }

  function renderLoadingCard(anchor) {
    removePopup();
    const card = document.createElement("div");
    card.id = POPUP_ID;
    card.innerHTML = `
      <div class="jp-head">
        <div class="jp-skeleton jp-skeleton-avatar"></div>
        <div class="jp-info jp-skeleton-group">
          <div class="jp-skeleton jp-skeleton-line jp-skeleton-name"></div>
          <div class="jp-skeleton jp-skeleton-line jp-skeleton-meta"></div>
        </div>
      </div>
      <div class="jp-tags">
        <span class="jp-skeleton jp-skeleton-chip"></span>
        <span class="jp-skeleton jp-skeleton-chip jp-skeleton-chip-wide"></span>
      </div>
      <div class="jp-skeleton jp-skeleton-line"></div>
      <div class="jp-skeleton jp-skeleton-line jp-skeleton-line-short"></div>
      <div class="jp-skeleton jp-skeleton-button"></div>
    `;
    applyPopupTheme(card);
    document.body.appendChild(card);
    bindCardControls(card);
    positionCard(card, anchor);
  }

  function renderErrorCard(anchor, message) {
    removePopup();
    const card = document.createElement("div");
    card.id = POPUP_ID;
    card.innerHTML = `
      <div class="jp-status">
        <div class="jp-status-title">资料暂时不可用</div>
        <div class="jp-status-text">${esc(message)}</div>
      </div>
    `;
    applyPopupTheme(card);
    document.body.appendChild(card);
    bindCardControls(card);
    positionCard(card, anchor);
  }

  function renderCard(user, anchor) {
    removePopup();
    const card = document.createElement("div");
    card.id = POPUP_ID;

    const avatar = user.avatarImage?.thumbnailUrl || user.avatarImage?.picUrl || "";
    const name = esc(user.screenName || "");
    const bio = esc(user.bio || user.briefIntro || "");
    const following = user.statsCount?.followingCount ?? 0;
    const followers = user.statsCount?.followedCount ?? user.statsCount?.followerCount ?? 0;
    const verified = user.isVerified || user.isBetaUser;
    const profileUrl = `https://web.okjike.com/u/${user.username || ""}`;
    const isFollowing = !!user.following;
    const isSelf = user.isSelf;

    const genderIcon = user.gender === "MALE"
      ? '<span class="jp-tag jp-gender-m">♂</span>'
      : user.gender === "FEMALE"
        ? '<span class="jp-tag jp-gender-f">♀</span>'
        : "";
    const province = user.province ? `<span class="jp-tag">${esc(user.province)}</span>` : "";
    const industry = user.industry ? `<span class="jp-tag">${esc(user.industry)}</span>` : "";

    const tags = [genderIcon, province, industry].filter(Boolean);

    card.innerHTML = `
      <div class="jp-head">
        <a href="${profileUrl}" class="jp-av-link"><img class="jp-av" src="${avatar}"></a>
        <div class="jp-info">
          <a href="${profileUrl}" class="jp-name">${name}${verified ? '<span class="jp-badge">✓</span>' : ""}</a>
          <div class="jp-stats">
            <span><b>${following}</b> 关注</span>
            <span><b>${followers}</b> 被关注</span>
          </div>
        </div>
      </div>
      ${tags.length ? `<div class="jp-tags">${tags.join("")}</div>` : ""}
      ${bio ? `<div class="jp-bio">${bio}</div>` : ""}
      ${!isSelf ? `<button class="jp-follow ${isFollowing ? "jp-following" : ""}">${isFollowing ? "已关注" : "关注"}</button>` : ""}
    `;
    applyPopupTheme(card);

    const btn = card.querySelector(".jp-follow");
    if (btn) {
      let state = isFollowing;
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.disabled = true;
        const ok = await toggleFollow(user.username, state);
        if (ok) {
          state = !state;
          btn.textContent = state ? "已关注" : "关注";
          btn.classList.toggle("jp-following", state);
          const activeId = extractId(activeLink);
          if (activeId) CACHE.delete(activeId);
        }
        btn.disabled = false;
      });
    }

    document.body.appendChild(card);
    bindCardControls(card);
    positionCard(card, anchor);
  }

  function scheduleShow(link, { immediate = false } = {}) {
    cancelHover();
    activeLink = link;
    const run = () => void showCard(link);
    if (immediate) {
      run();
      return;
    }
    hoverTimer = setTimeout(run, SHOW_DELAY);
  }

  async function showCard(link) {
    if (activeLink !== link) return;
    cancelHide();
    const id = extractId(link);
    if (!id) return;
    const t = token();
    const seq = ++requestSeq;
    log("hover", id);
    renderLoadingCard(link);
    if (!t) {
      renderErrorCard(link, "未检测到登录状态，无法加载用户资料。");
      return;
    }
    const user = await fetchUser(id);
    if (seq !== requestSeq || activeLink !== link) return;
    if (!user) {
      renderErrorCard(link, "接口没有返回资料，可能是网络波动或页面结构已变更。");
      return;
    }
    renderCard(user, link);
  }

  function injectStyles() {
    if (document.getElementById("jike-polish-css")) return;
    const s = document.createElement("style");
    s.id = "jike-polish-css";
    s.textContent = `
#${POPUP_ID}{position:fixed;z-index:99999;width:calc(17.5rem * var(--mantine-scale,1));max-width:calc(100vw - 24px);padding:12px;border-radius:calc(0.75rem * var(--mantine-scale,1));background:var(--bg-body-1,var(--mantine-color-body,#fff)) !important;border:1px solid var(--border-primary,rgba(15,23,42,.08)) !important;box-shadow:0 6px 24px rgba(15,23,42,.16);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--mantine-color-text,var(--color-text-primary,#1d2129)) !important;animation:jpIn .12s ease}
@keyframes jpIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
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
#${POPUP_ID} .jp-bio{margin-top:6px;font-size:13px;line-height:1.45;color:var(--mantine-color-dimmed,var(--color-text-secondary,#5a5e66)) !important;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
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
`;
    document.head.appendChild(s);
  }

  async function injectUserStyle() {
    if (document.getElementById("jike-polish-userstyle")) return;
    try {
      const url = chrome.runtime.getURL("jike-twitter-font.user.css");
      const raw = await fetch(url).then(r => r.text());
      const inner = raw.replace(/\/\*[\s\S]*?==\/UserStyle== \*\//, "")
        .match(/@-moz-document\s+domain\("web\.okjike\.com"\)\s*\{([\s\S]*)\}\s*$/)?.[1] || raw;
      const s = document.createElement("style");
      s.id = "jike-polish-userstyle";
      s.textContent = inner;
      document.head.appendChild(s);
    } catch (e) { log("style err", e); }
  }

  function boot() {
    injectStyles();
    injectUserStyle();

    document.body.addEventListener("mouseover", (e) => {
      const link = getLink(e.target);
      if (link) {
        if (activeLink === link && document.getElementById(POPUP_ID)) return;
        scheduleShow(link);
        return;
      }
      if (activeLink && !e.target.closest(`#${POPUP_ID}`)) hide();
    });
    document.body.addEventListener("focusin", (e) => {
      const link = getLink(e.target);
      if (link) scheduleShow(link, { immediate: true });
    });
    document.body.addEventListener("focusout", (e) => {
      if (!e.relatedTarget?.closest?.(`#${POPUP_ID}`)) hide();
    });
    document.body.addEventListener("mouseleave", hide);
    document.addEventListener("wheel", forwardNativeHoverCardWheel, { passive: false, capture: true });
    document.addEventListener("mousedown", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(`#${POPUP_ID}`) && !target.closest('a[href*="/u/"]')) closePopup();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.getElementById(POPUP_ID)) closePopup();
    });
    window.addEventListener("resize", () => {
      const card = document.getElementById(POPUP_ID);
      if (card && activeLink) positionCard(card, activeLink);
    });
    log("ready");
  }

  boot();
})();
