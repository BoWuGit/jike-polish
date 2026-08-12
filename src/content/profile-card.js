import { hasJikeAuthToken, requestJike } from "../shared/jike-api.js";
import { log } from "../shared/debug.js";
import { safeHttpUrl, stringValue } from "../shared/values.js";
import { POPUP_ID } from "./constants.js";
import { findScrollableContainer } from "./scroll.js";

const PROFILE_LINK_SELECTOR = 'a[href*="/u/"]';
const PROFILE_HOVER_CONTENT_SELECTOR =
  '[class*="_mentionUser_"], [class*="_name_1rdwv_"], [class*="_avatar_1rdwv_"], [class*="_root_1y0hs_"]';
const USER_CARD_TRIGGER_SELECTOR = '[class*="_userCard_"]';
const USER_CARD_MAX_ANCESTOR_DEPTH = 8;
const USER_CARD_MAX_HEIGHT = 220;
const USER_CARD_MIN_WIDTH = 120;
const SHOW_DELAY = 140;
const AUTH_EXPIRED = Symbol("auth-expired");

const profileCache = new Map();
const pendingProfiles = new Map();

let activeLink = null;
let hideTimer = null;
let hoverTimer = null;
let requestSequence = 0;

function isDarkModeActive() {
  const root = document.documentElement;
  const body = document.body;
  if (root.getAttribute("data-mantine-color-scheme") === "dark") return true;
  if (root.getAttribute("data-theme") === "dark") return true;
  if (root.classList.contains("dark") || body?.classList.contains("dark")) return true;

  const background = getComputedStyle(body || root).backgroundColor || "";
  const match = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return false;
  const [red, green, blue] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance < 0.45;
}

function applyPopupTheme(card) {
  card.classList.toggle("jp-dark", isDarkModeActive());
}

function isProfileHoverLink(element) {
  if (!(element instanceof Element)) return false;
  return element.matches(PROFILE_HOVER_CONTENT_SELECTOR)
    || !!element.querySelector(PROFILE_HOVER_CONTENT_SELECTOR);
}

function hasUserCardBounds(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return true;
  return rect.width >= USER_CARD_MIN_WIDTH && rect.height <= USER_CARD_MAX_HEIGHT;
}

function isUserCardTrigger(element) {
  if (!(element instanceof HTMLElement) || !hasUserCardBounds(element)) return false;
  if (!element.matches(USER_CARD_TRIGGER_SELECTOR)) return false;
  return Array.from(element.querySelectorAll(PROFILE_LINK_SELECTOR)).some(isProfileHoverLink);
}

function findUserCardTrigger(element) {
  let node = element;
  for (
    let depth = 0;
    node && node !== document.body && depth < USER_CARD_MAX_ANCESTOR_DEPTH;
    depth += 1
  ) {
    if (isUserCardTrigger(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function getProfileLink(element) {
  if (!(element instanceof Element)) return null;
  if (element.matches(PROFILE_LINK_SELECTOR)) return element;
  const links = Array.from(element.querySelectorAll(PROFILE_LINK_SELECTOR));
  return links.find(isProfileHoverLink) || links[0] || null;
}

function getLink(element) {
  if (!(element instanceof Element)) return null;
  const card = findUserCardTrigger(element);
  if (card) return card;
  const link = element.closest(PROFILE_LINK_SELECTOR);
  return link && isProfileHoverLink(link) ? link : null;
}

function extractId(link) {
  const profileLink = getProfileLink(link);
  if (!profileLink) return null;
  const match = (profileLink.getAttribute("href") || "").match(/\/u\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function sameIdentifier(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function userMatchesProfileQuery(user, query) {
  if (!user) return false;
  if (query.key === "username") return sameIdentifier(user.username, query.value);
  if (query.key === "id") return sameIdentifier(user.id, query.value);
  return false;
}

// Repeated hovers share the request; closing a card only invalidates its eventual render.
async function fetchUser(id) {
  if (profileCache.has(id)) return profileCache.get(id);
  if (pendingProfiles.has(id)) return pendingProfiles.get(id);

  const isUuid = /^[0-9a-f]{8}-/i.test(id);
  const queries = isUuid
    ? [{ key: "username", value: id }, { key: "id", value: id }]
    : [{ key: "username", value: id }];
  const task = (async () => {
    try {
      for (const query of queries) {
        const parameter = `${query.key}=${encodeURIComponent(query.value)}`;
        try {
          const response = await requestJike(`/users/profile?${parameter}`);
          if (!response || response.status === 401) return AUTH_EXPIRED;
          if (!response.ok) continue;

          const payload = await response.json();
          if (userMatchesProfileQuery(payload.user, query)) {
            profileCache.set(id, payload.user);
            return payload.user;
          }
        } catch (error) {
          log("fetch err", parameter, error);
        }
      }
      return null;
    } finally {
      pendingProfiles.delete(id);
    }
  })();
  pendingProfiles.set(id, task);
  return task;
}

async function toggleFollow(username, isFollowing) {
  if (!username || !hasJikeAuthToken()) return null;
  const endpoint = isFollowing ? "userRelation/unfollow" : "userRelation/follow";
  try {
    const response = await requestJike(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    return !!response?.ok;
  } catch (error) {
    log("follow err", error);
    return false;
  }
}

function removePopup() {
  document.getElementById(POPUP_ID)?.remove();
}

function createPopupCard() {
  removePopup();
  const card = document.createElement("div");
  card.id = POPUP_ID;
  return card;
}

function cancelHide() {
  clearTimeout(hideTimer);
}

function cancelHover() {
  clearTimeout(hoverTimer);
}

function closePopup() {
  requestSequence += 1;
  cancelHide();
  cancelHover();
  removePopup();
  activeLink = null;
}

function hidePopupSoon() {
  cancelHide();
  hideTimer = setTimeout(closePopup, 160);
}

function positionCard(card, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  let left = anchorRect.left;
  let top = anchorRect.bottom + 8;
  if (left + cardRect.width > innerWidth - 10) left = innerWidth - cardRect.width - 10;
  if (left < 10) left = 10;
  if (top + cardRect.height > innerHeight - 10) top = anchorRect.top - cardRect.height - 8;
  if (top < 10) top = 10;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function forwardCustomPopupWheel(event) {
  const card = event.currentTarget;
  if (!(card instanceof HTMLElement)) return;

  const inner = card.querySelector(".jp-scroll");
  const scrollElement = inner instanceof HTMLElement ? inner : card;
  const overflowY = scrollElement.scrollHeight - scrollElement.clientHeight;
  if (overflowY > 1) {
    const atTop = scrollElement.scrollTop <= 0;
    const atBottom = scrollElement.scrollTop + scrollElement.clientHeight
      >= scrollElement.scrollHeight - 1;
    if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
      event.preventDefault();
      scrollElement.scrollTop += event.deltaY;
      return;
    }
  }

  const scroller = findScrollableContainer(
    activeLink instanceof Element ? activeLink : document.body,
  );
  if (!scroller) return;
  event.preventDefault();
  scroller.scrollBy({
    top: event.deltaY,
    left: event.deltaX,
    behavior: "auto",
  });
}

function bindCardControls(card) {
  card.addEventListener("mouseenter", cancelHide);
  card.addEventListener("mouseleave", hidePopupSoon);
  card.addEventListener("wheel", forwardCustomPopupWheel, { passive: false });
}

function mountCard(card, anchor) {
  applyPopupTheme(card);
  document.body.appendChild(card);
  bindCardControls(card);
  positionCard(card, anchor);
}

function renderLoadingCard(anchor) {
  const card = createPopupCard();
  card.innerHTML = `
    <div class="jp-scroll">
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
    </div>
  `;
  mountCard(card, anchor);
}

function renderErrorCard(anchor, message) {
  const card = createPopupCard();
  card.innerHTML = `
    <div class="jp-scroll">
      <div class="jp-status">
        <div class="jp-status-title">资料暂时不可用</div>
        <div class="jp-status-text"></div>
      </div>
    </div>
  `;
  card.querySelector(".jp-status-text").textContent = message;
  mountCard(card, anchor);
}

function appendTag(container, text, className = "") {
  if (!text) return;
  const tag = document.createElement("span");
  tag.className = `jp-tag${className ? ` ${className}` : ""}`;
  tag.textContent = text;
  container.appendChild(tag);
}

function profileUrl(username) {
  return new URL(`/u/${encodeURIComponent(stringValue(username))}`, "https://web.okjike.com").href;
}

function bindFollowButton(button, user, anchor) {
  if (user.isSelf) {
    button.remove();
    return;
  }

  let isFollowing = !!user.following;
  const renderFollowState = () => {
    button.textContent = isFollowing ? "已关注" : "关注";
    button.classList.toggle("jp-following", isFollowing);
  };
  renderFollowState();
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    const updated = await toggleFollow(user.username, isFollowing);
    if (updated) {
      isFollowing = !isFollowing;
      renderFollowState();
      const activeId = extractId(anchor);
      if (activeId) profileCache.delete(activeId);
    }
    button.disabled = false;
  });
}

function renderCard(user, anchor) {
  const card = createPopupCard();
  card.innerHTML = `
    <div class="jp-scroll">
      <div class="jp-head">
        <a class="jp-av-link"><img class="jp-av" alt=""></a>
        <div class="jp-info">
          <a class="jp-name"><span class="jp-screen-name"></span><span class="jp-badge">✓</span></a>
          <div class="jp-stats">
            <span><b class="jp-following-count"></b> 关注</span>
            <span><b class="jp-follower-count"></b> 被关注</span>
          </div>
        </div>
      </div>
      <div class="jp-tags"></div>
      <div class="jp-bio"></div>
      <button class="jp-follow" type="button"></button>
    </div>
  `;

  const url = profileUrl(user.username);
  card.querySelectorAll(".jp-av-link, .jp-name").forEach((link) => {
    link.href = url;
  });
  const avatarUrl = safeHttpUrl(
    user.avatarImage?.thumbnailUrl || user.avatarImage?.picUrl,
  );
  const avatar = card.querySelector(".jp-av");
  if (avatarUrl) avatar.src = avatarUrl;
  else avatar.remove();
  card.querySelector(".jp-screen-name").textContent = stringValue(user.screenName);
  card.querySelector(".jp-following-count").textContent = String(user.statsCount?.followingCount ?? 0);
  card.querySelector(".jp-follower-count").textContent = String(
    user.statsCount?.followedCount ?? user.statsCount?.followerCount ?? 0,
  );

  if (!(user.isVerified || user.isBetaUser)) card.querySelector(".jp-badge").remove();

  const tags = card.querySelector(".jp-tags");
  if (user.gender === "MALE") appendTag(tags, "♂", "jp-gender-m");
  else if (user.gender === "FEMALE") appendTag(tags, "♀", "jp-gender-f");
  appendTag(tags, stringValue(user.province));
  appendTag(tags, stringValue(user.industry));
  if (!tags.children.length) tags.remove();

  const bio = card.querySelector(".jp-bio");
  bio.textContent = stringValue(user.bio || user.briefIntro);
  if (!bio.textContent) bio.remove();

  bindFollowButton(card.querySelector(".jp-follow"), user, anchor);
  mountCard(card, anchor);
}

function scheduleShow(link, { immediate = false } = {}) {
  cancelHover();
  activeLink = link;
  const show = () => void showCard(link);
  if (immediate) show();
  else hoverTimer = setTimeout(show, SHOW_DELAY);
}

async function showCard(link) {
  if (activeLink !== link) return;
  cancelHide();
  const id = extractId(link);
  if (!id) return;

  const sequence = ++requestSequence;
  log("hover", id);
  renderLoadingCard(link);
  if (!hasJikeAuthToken()) {
    renderErrorCard(link, "未检测到登录状态，无法加载用户资料。");
    return;
  }

  const user = await fetchUser(id);
  if (sequence !== requestSequence || activeLink !== link) return;
  if (user === AUTH_EXPIRED) {
    renderErrorCard(link, "登录状态已过期，请刷新页面或重新登录后再试。");
  } else if (!user) {
    renderErrorCard(link, "接口没有返回资料，可能是网络波动或页面结构已变更。");
  } else {
    renderCard(user, link);
  }
}

function syncOpenPopupTheme() {
  const card = document.getElementById(POPUP_ID);
  if (card) applyPopupTheme(card);
}

export function installProfileCards() {
  const themeObserver = new MutationObserver(syncOpenPopupTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-mantine-color-scheme", "data-theme"],
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  document.body.addEventListener("mouseover", (event) => {
    const link = getLink(event.target);
    if (link) {
      if (activeLink === link && document.getElementById(POPUP_ID)) return;
      scheduleShow(link);
    } else if (activeLink && !event.target.closest?.(`#${POPUP_ID}`)) {
      hidePopupSoon();
    }
  });
  document.body.addEventListener("focusin", (event) => {
    const link = getLink(event.target);
    if (link) scheduleShow(link, { immediate: true });
  });
  document.body.addEventListener("focusout", (event) => {
    if (!event.relatedTarget?.closest?.(`#${POPUP_ID}`)) hidePopupSoon();
  });
  document.body.addEventListener("mouseleave", hidePopupSoon);

  document.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      !target.closest(`#${POPUP_ID}`)
      && !target.closest(PROFILE_LINK_SELECTOR)
      && !getLink(target)
    ) closePopup();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById(POPUP_ID)) closePopup();
  });
  window.addEventListener("resize", () => {
    const card = document.getElementById(POPUP_ID);
    if (card && activeLink) positionCard(card, activeLink);
  });
}
