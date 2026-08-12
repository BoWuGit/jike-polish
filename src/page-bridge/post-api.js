import { JIKE_API_ORIGIN, requestJike } from "../shared/jike-api.js";
import { safeHttpUrl } from "../shared/values.js";
const DETAIL_ENDPOINT_BY_TYPE = {
  ORIGINAL_POST: "/1.0/originalPosts/get",
  REPOST: "/1.0/reposts/get",
};

const detailRequests = new Map();
const videoUrlRequests = new Map();

function memoizeTruthyRequest(cache, key, load) {
  if (cache.has(key)) return cache.get(key);
  const request = load().then((result) => {
    if (!result) cache.delete(key);
    return result;
  });
  cache.set(key, request);
  return request;
}

export function fetchPostDetail(data) {
  const endpoint = DETAIL_ENDPOINT_BY_TYPE[data.type];
  if (!endpoint) return Promise.resolve(null);
  const cacheKey = `${data.type}:${data.id}`;
  return memoizeTruthyRequest(detailRequests, cacheKey, () => (
    requestJike(`${JIKE_API_ORIGIN}${endpoint}?id=${encodeURIComponent(data.id)}`, {
      allowAnonymous: true,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload?.data || null)
      .catch(() => null)
  ));
}

function embeddedVideoUrl(video) {
  const sources = Array.isArray(video?.source) ? video.source : [];
  for (const source of sources) {
    const url = safeHttpUrl(typeof source === "string" ? source : source?.url || source?.src);
    if (url) return url;
  }
  return "";
}

export function fetchVideoUrl(source) {
  const embeddedUrl = embeddedVideoUrl(source.video);
  if (embeddedUrl) return Promise.resolve(embeddedUrl);

  const cacheKey = `${source.type}:${source.id}`;
  return memoizeTruthyRequest(videoUrlRequests, cacheKey, () => {
    const parameters = new URLSearchParams({ id: source.id, type: source.type });
    return requestJike(`${JIKE_API_ORIGIN}/1.0/mediaMeta/interactive?${parameters}`, {
      allowAnonymous: true,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => safeHttpUrl(payload?.url))
      .catch(() => "");
  });
}
