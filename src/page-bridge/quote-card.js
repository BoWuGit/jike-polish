import { fetchPostDetail, fetchVideoUrl } from "./post-api.js";
import {
  renderLink, renderMedia, renderVideo, syncAttachmentGapOffset,
} from "./quote-attachments.js";
import {
  getLinkInfo, getLinkSource, getMediaSource, getQuoteData, getVideoSource,
  isPostLike, linkImageUrl, shouldFetchDetail, shouldFetchLinkImage,
} from "./post-data.js";

export const QUOTE_CARD_SELECTOR = "._root_1kp3y_1";
const cardSyncs = new WeakMap();

export async function syncQuoteCard(card) {
  if (!(card instanceof HTMLElement)) return;
  const data = getQuoteData(card);
  if (!isPostLike(data)) return;

  // A card can receive newer props for the same post while a request is pending.
  const sync = {};
  cardSyncs.set(card, sync);
  const isCurrent = () => document.contains(card)
    && cardSyncs.get(card) === sync && getQuoteData(card) === data;

  let mediaSource = getMediaSource(data);
  let videoSource = getVideoSource(data);
  let linkSource = getLinkSource(data);
  if ((!mediaSource || !videoSource || !linkSource) && shouldFetchDetail(data)) {
    const detail = await fetchPostDetail(data);
    if (!isCurrent()) return;
    mediaSource ||= getMediaSource(detail);
    videoSource ||= getVideoSource(detail);
    linkSource ||= getLinkSource(detail);
  }

  const videoUrlTask = videoSource ? fetchVideoUrl(videoSource) : Promise.resolve("");
  if (shouldFetchLinkImage(linkSource)) {
    const detail = await fetchPostDetail(linkSource);
    if (!isCurrent()) return;
    const detailedLinkSource = getLinkSource(detail);
    if (linkImageUrl(getLinkInfo(detailedLinkSource))) linkSource = detailedLinkSource;
  }

  // Video lookup does not delay the link and image previews.
  renderLink(card, linkSource);
  renderMedia(card, mediaSource);
  syncAttachmentGapOffset(card);

  const videoUrl = await videoUrlTask;
  if (!isCurrent()) return;
  renderVideo(card, videoSource, videoUrl);
  syncAttachmentGapOffset(card);
}
