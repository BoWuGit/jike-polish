import { safeHttpUrl, stringValue } from "../shared/values.js";
import { syncAttachment } from "./quote-attachments.js";

/** Keep a repost's target and its attachments visibly separate from the reposter. */
export function renderQuoteSource(card, source) {
  const user = source?.user;
  const name = stringValue(user?.screenName) || "未知作者";
  const avatar = safeHttpUrl(user?.avatarImage?.thumbnailUrl || user?.profileImageUrl);
  const content = stringValue(source?.content);
  const username = stringValue(user?.username);
  const profileHref = username
    ? `https://web.okjike.com/u/${encodeURIComponent(username)}` : "";
  const path = source?.type === "REPOST" ? "repost" : "post";
  const href = source && profileHref
    ? `${profileHref}/${path}/${encodeURIComponent(source.id)}`
    : "";
  const key = source && JSON.stringify([source.type, source.id]);
  const section = syncAttachment(card, "jp-repost-source", key, source ? () => {
    const section = document.createElement("section");
    section.className = "jp-repost-source";
    // Empty space must not bubble into the outer repost's navigation handler.
    for (const eventName of ["click", "pointerdown", "keydown"]) {
      section.addEventListener(eventName, (event) => event.stopPropagation());
    }
    return section;
  } : null);
  if (!section) return null;
  const previewKey = JSON.stringify([name, avatar, content, href]);
  if (section.dataset.jpSourcePreviewKey !== previewKey) {
    section.setAttribute("aria-label", `${name}的${source.type === "REPOST" ? "转发" : "动态"}`);

    const preview = document.createElement("div");
    preview.className = "jp-repost-source-preview";

    const avatarLink = document.createElement(profileHref ? "a" : "span");
    avatarLink.className = "jp-repost-source-avatar jp-repost-source-author";
    if (profileHref) {
      avatarLink.href = profileHref;
      avatarLink.setAttribute("aria-label", `查看${name}的资料`);
    }
    if (avatar) {
      const image = document.createElement("img");
      image.src = avatar;
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      avatarLink.appendChild(image);
    } else {
      avatarLink.textContent = Array.from(name)[0];
    }
    preview.appendChild(avatarLink);

    const body = document.createElement("div");
    body.className = "jp-repost-source-body";
    const author = document.createElement(profileHref ? "a" : "span");
    author.className = "jp-repost-source-name jp-repost-source-author";
    if (profileHref) author.href = profileHref;
    author.textContent = name;
    body.appendChild(author);

    if (content) {
      const text = document.createElement(href ? "a" : "div");
      text.className = "jp-repost-source-content";
      if (href) text.href = href;
      text.textContent = content;
      body.appendChild(text);
    }
    preview.appendChild(body);
    const existing = section.querySelector(".jp-repost-source-preview");
    if (existing) existing.replaceWith(preview);
    else section.insertBefore(preview, section.children[0] || null);
    section.dataset.jpSourcePreviewKey = previewKey;
  }
  return section;
}
