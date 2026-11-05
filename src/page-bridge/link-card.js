import { linkPresentation } from "../shared/link-presentation.js";
import { getNativeLinkInfo } from "./post-data.js";

export const NATIVE_LINK_CARD_SELECTOR = "._root_8timl_1";

export function syncNativeLinkCard(card) {
  const info = getNativeLinkInfo(card);
  const presentation = linkPresentation(info);
  card.classList.toggle("jp-audio-card", presentation.isAudio);
  if (!presentation.isAudio) return;

  const title = card.querySelector("._header_8timl_20");
  const footer = card.querySelector("._footer_8timl_31");
  const author = footer?.firstElementChild;
  if (title && presentation.title) {
    if (title.textContent !== presentation.title) title.textContent = presentation.title;
    title.title = presentation.originalTitle || presentation.title;
  }
  if (author && author.textContent !== presentation.author) author.textContent = presentation.author;
  footer?.classList.toggle("jp-audio-footer-empty", !footer.textContent.trim());
}
