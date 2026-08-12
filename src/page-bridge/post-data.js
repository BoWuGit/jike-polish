import { stringValue } from "../shared/values.js";

function getReactFiber(element) {
  for (const key of Object.keys(element)) {
    if (key.startsWith("__reactFiber$")) return element[key];
  }
  return null;
}

export function isPostLike(value) {
  return !!(
    value
    && typeof value === "object"
    && typeof value.id === "string"
    && typeof value.type === "string"
    && value.user
    && typeof value.user === "object"
  );
}

export function getQuoteData(card) {
  const fiber = getReactFiber(card);
  for (let node = fiber; node; node = node.return) {
    const props = node.memoizedProps || node.pendingProps;
    if (isPostLike(props?.data)) return props.data;
  }
  return null;
}

export function pictureUrl(picture, count) {
  if (!picture) return "";
  if (count === 1) {
    return picture.middlePicUrl
      || picture.smallPicUrl
      || picture.thumbnailUrl
      || picture.picUrl
      || "";
  }
  return picture.smallPicUrl
    || picture.thumbnailUrl
    || picture.middlePicUrl
    || picture.picUrl
    || "";
}

export function fullPictureUrl(picture) {
  return picture?.picUrl || pictureUrl(picture, 1);
}

export function getPictures(data) {
  if (!Array.isArray(data?.pictures)) return [];
  return data.pictures.filter((picture) => pictureUrl(picture, data.pictures.length));
}

export function linkPreviewImageUrl(linkInfo) {
  return stringValue(linkInfo?.pictureUrl)
    || stringValue(linkInfo?.audio?.coverUrl)
    || stringValue(linkInfo?.audio?.originCoverUrl);
}

export function linkImageUrl(linkInfo) {
  return linkPreviewImageUrl(linkInfo)
    || stringValue(linkInfo?.brandLogoImage?.thumbnailUrl)
    || stringValue(linkInfo?.brandLogoImage?.smallPicUrl)
    || stringValue(linkInfo?.brandLogoImage?.picUrl);
}

function hasUsableLinkInfo(linkInfo) {
  if (!linkInfo || typeof linkInfo !== "object") return false;
  return !!(
    stringValue(linkInfo.title)
    || stringValue(linkInfo.linkUrl)
    || linkImageUrl(linkInfo)
  );
}

export function getLinkInfo(data) {
  return hasUsableLinkInfo(data?.linkInfo) ? data.linkInfo : null;
}

export function getMediaSource(data) {
  if (getPictures(data).length) return data;
  if (getPictures(data?.target).length) return data.target;
  return null;
}

export function getVideoSource(data) {
  if (data?.video) return data;
  if (data?.target?.video) return data.target;
  return null;
}

export function getLinkSource(data) {
  if (getLinkInfo(data)) return data;
  if (getLinkInfo(data?.target)) return data.target;
  return null;
}

export function shouldFetchLinkImage(source) {
  const linkInfo = getLinkInfo(source);
  return isPostLike(source) && !!linkInfo && !linkPreviewImageUrl(linkInfo);
}

function hasOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

export function shouldFetchDetail(data) {
  if (!isPostLike(data)) return false;
  if (data.type === "ORIGINAL_POST") return !hasOwn(data, "pictures");
  if (data.type === "REPOST") return !hasOwn(data, "target");
  return false;
}

export function samePost(left, right) {
  return !!left && !!right && left.id === right.id && left.type === right.type;
}
