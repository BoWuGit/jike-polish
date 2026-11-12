export const NATIVE_QUOTE_CONTENT_SELECTOR = "._content_1kp3y_20";
export const NATIVE_QUOTE_AVATAR_SELECTOR = "a._avatar_1kp3y_16";

/** Native quote names are bare text nodes, so detect their bounds without changing React's DOM. */
export function getQuoteAuthorLink(element, pointer) {
  const directAvatar = element.closest(NATIVE_QUOTE_AVATAR_SELECTOR);
  if (directAvatar) return directAvatar;
  if (!pointer || !Number.isFinite(pointer.clientX) || !Number.isFinite(pointer.clientY)) return null;
  const content = element.closest(NATIVE_QUOTE_CONTENT_SELECTOR);
  const name = content?.firstChild;
  if (name?.nodeType !== Node.TEXT_NODE || !name.nextSibling?.textContent?.startsWith(":")) return null;
  const avatar = content.closest("._main_1kp3y_9")?.querySelector(NATIVE_QUOTE_AVATAR_SELECTOR);
  if (!avatar) return null;

  const range = document.createRange();
  range.selectNodeContents(name);
  const overName = Array.from(range.getClientRects()).some((rect) => (
    pointer.clientX >= rect.left && pointer.clientX < rect.right
    && pointer.clientY >= rect.top && pointer.clientY < rect.bottom
  ));
  range.detach?.();
  return overName ? avatar : null;
}
