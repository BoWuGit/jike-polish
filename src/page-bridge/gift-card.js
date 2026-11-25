import { stringValue } from "../shared/values.js";

// Read the current host props so a recycled feed card uses its current gift.
function getGiftTarget(card) {
  for (let element = card; element; element = element.parentElement) {
    const key = Object.keys(element).find((name) => name.startsWith("__reactProps$"));
    const data = element[key]?.children?.props?.data;
    if (data) return data.action === "USER_ENDOW" ? data.endowTarget : null;
  }
  return null;
}

export function giftCommentPath(target) {
  const username = stringValue(target?.user?.username);
  if (target?.type !== "COMMENT" || !username || !target.id) return "";

  let link;
  try {
    link = new URL(target.link);
  } catch {
    return "";
  }
  if (link.protocol !== "jike:" || link.host !== "page.jk") return "";
  const postId = /^\/originalPost\/([a-zA-Z0-9]+)$/.exec(link.pathname)?.[1];
  if (!postId || link.searchParams.get("locateCommentId") !== target.id) return "";
  return `/u/${encodeURIComponent(username)}/post/${postId}/${encodeURIComponent(target.id)}`;
}

export function handleGiftCardClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  const card = event.target.closest?.("._targetCard_75bfh_32");
  if (!card) return;
  const path = giftCommentPath(getGiftTarget(card));
  if (!path) return;

  event.preventDefault();
  event.stopPropagation();
  if (event.metaKey || event.ctrlKey) window.open(path, "_blank", "noopener");
  else window.location.assign(path);
}
