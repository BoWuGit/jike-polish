(() => {
  const API_BASE = "https://api.ruguoapp.com/1.0";
  const DEBUG = localStorage.getItem("JIKE_POLISH_DEBUG") === "1";
  const POPUP_ID = "jike-polish-popup";
  const CACHE = new Map();

  let activeLink = null;
  let hideTimer = null;

  function log(...a) { if (DEBUG) console.log("[jike-polish]", ...a); }
  function token() { return localStorage.getItem("JK_ACCESS_TOKEN"); }
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

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
    const t = token();
    if (!t) return null;
    const isUuid = /^[0-9a-f]{8}-/.test(id);
    const qs = isUuid ? [`username=${id}`, `id=${id}`] : [`username=${id}`];
    for (const q of qs) {
      try {
        const r = await fetch(`${API_BASE}/users/profile?${q}`, {
          headers: { "X-Jike-Access-Token": t }
        });
        if (!r.ok) continue;
        const j = await r.json();
        if (j.user) { CACHE.set(id, j.user); return j.user; }
      } catch (e) { log("fetch err", q, e); }
    }
    return null;
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

  function hide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { removePopup(); activeLink = null; }, 200);
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
        </div>
      </div>
      <div class="jp-stats">
        <span><b>${following}</b> 关注</span>
        <span><b>${followers}</b> 被关注</span>
      </div>
      ${tags.length ? `<div class="jp-tags">${tags.join("")}</div>` : ""}
      ${bio ? `<div class="jp-bio">${bio}</div>` : ""}
      ${!isSelf ? `<button class="jp-follow ${isFollowing ? "jp-following" : ""}">${isFollowing ? "已关注" : "关注"}</button>` : ""}
    `;

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
          CACHE.delete(extractId(activeLink));
        }
        btn.disabled = false;
      });
    }

    document.body.appendChild(card);
    const rect = anchor.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + cr.width > innerWidth - 10) left = innerWidth - cr.width - 10;
    if (left < 10) left = 10;
    if (top + cr.height > innerHeight - 10) top = rect.top - cr.height - 6;
    if (top < 10) top = 10;
    card.style.left = left + "px";
    card.style.top = top + "px";

    card.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    card.addEventListener("mouseleave", hide);
  }

  function bindLeave(link) {
    const onLeave = () => {
      hide();
      link.removeEventListener("mouseleave", onLeave);
    };
    link.addEventListener("mouseleave", onLeave);
  }

  async function onHover(link) {
    if (activeLink === link) return;
    activeLink = link;
    clearTimeout(hideTimer);
    bindLeave(link);
    const id = extractId(link);
    if (!id) return;
    log("hover", id);
    const user = await fetchUser(id);
    if (!user || activeLink !== link) return;
    renderCard(user, link);
  }

  function injectStyles() {
    if (document.getElementById("jike-polish-css")) return;
    const s = document.createElement("style");
    s.id = "jike-polish-css";
    s.textContent = `
#${POPUP_ID}{position:fixed;z-index:99999;width:calc(17.5rem * var(--mantine-scale,1));max-width:calc(100vw - 24px);padding:12px;border-radius:calc(0.75rem * var(--mantine-scale,1));background:var(--bg-body-1,#fff);border:0;box-shadow:0 2px 12px 0 rgba(0,0,0,0.24);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--color-text-primary,#1d2129);animation:jpIn .12s ease}
@keyframes jpIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
#${POPUP_ID} .jp-head{display:flex;align-items:center;gap:10px}
#${POPUP_ID} .jp-av-link{flex-shrink:0}
#${POPUP_ID} .jp-av{width:48px;height:48px;border-radius:50%;object-fit:cover}
#${POPUP_ID} .jp-name{font-size:15px;font-weight:700;color:inherit;text-decoration:none;display:flex;align-items:center;gap:2px}
#${POPUP_ID} .jp-name:hover{text-decoration:underline}
#${POPUP_ID} .jp-badge{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:var(--tint-jike-blue,#1da1f2);color:#fff;font-size:9px;font-weight:700;margin-left:3px}
#${POPUP_ID} .jp-stats{margin-top:8px;font-size:13px;display:flex;gap:14px}
#${POPUP_ID} .jp-stats b{font-weight:700}
#${POPUP_ID} .jp-tags{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px}
#${POPUP_ID} .jp-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:var(--bg-tag,#f0f1f5);color:var(--color-text-secondary,#5a5e66)}
#${POPUP_ID} .jp-gender-m{background:#e8f4fd;color:#1da1f2}
#${POPUP_ID} .jp-gender-f{background:#fde8ef;color:#e84887}
#${POPUP_ID} .jp-bio{margin-top:6px;font-size:13px;line-height:1.45;color:var(--color-text-secondary,#5a5e66);white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#${POPUP_ID} .jp-follow{margin-top:10px;padding:5px 16px;border-radius:999px;border:1px solid #f8e71c;background:#f8e71c;font-size:13px;font-weight:600;cursor:pointer;color:#1d2129;transition:all .15s}
#${POPUP_ID} .jp-follow:hover{filter:brightness(.96)}
#${POPUP_ID} .jp-follow.jp-following{border-color:var(--border-primary,#d9d9d9);background:transparent;color:var(--color-text-secondary,#5a5e66);font-weight:400}
#${POPUP_ID} .jp-follow:not(.jp-following){border-color:#f8e71c;color:#1d2129;background:#f8e71c}
[data-mantine-color-scheme="dark"] #${POPUP_ID}{background:var(--bg-body-1,#1d1f24);border-color:rgba(255,255,255,.1);box-shadow:0 8px 30px rgba(0,0,0,.4);color:#eef1f5}
[data-mantine-color-scheme="dark"] #${POPUP_ID} .jp-bio,[data-mantine-color-scheme="dark"] #${POPUP_ID} .jp-stats{color:#b7bfcc}
[data-mantine-color-scheme="dark"] #${POPUP_ID} .jp-tag{background:#2a2d35;color:#b7bfcc}
[data-mantine-color-scheme="dark"] #${POPUP_ID} .jp-follow:hover{background:#2a2d35}
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
      if (link) { onHover(link); return; }
      if (activeLink && !e.target.closest(`#${POPUP_ID}`)) hide();
    });
    document.body.addEventListener("mouseleave", hide);
    log("ready");
  }

  boot();
})();
