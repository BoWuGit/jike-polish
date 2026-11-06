import { hasJikeAuthToken, requestJike } from "../shared/jike-api.js";
import { log } from "../shared/debug.js";

export const AUTH_EXPIRED = Symbol("auth-expired");
const profileCache = new Map();
const pendingProfiles = new Map();

function sameIdentifier(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

// Repeated hovers share the request; closing a card only invalidates its eventual render.
export async function fetchUser(id) {
  if (profileCache.has(id)) return profileCache.get(id);
  if (pendingProfiles.has(id)) return pendingProfiles.get(id);

  const isUuid = /^[0-9a-f]{8}-/i.test(id);
  const keys = isUuid ? ["username", "id"] : ["username"];
  const task = (async () => {
    try {
      for (const key of keys) {
        const parameter = `${key}=${encodeURIComponent(id)}`;
        try {
          const response = await requestJike(`/users/profile?${parameter}`);
          if (!response || response.status === 401) return AUTH_EXPIRED;
          if (!response.ok) continue;

          const payload = await response.json();
          if (sameIdentifier(payload.user?.[key], id)) {
            if (pendingProfiles.get(id) === task) profileCache.set(id, payload.user);
            return payload.user;
          }
        } catch (error) {
          log("fetch err", parameter, error);
        }
      }
      return null;
    } finally {
      if (pendingProfiles.get(id) === task) pendingProfiles.delete(id);
    }
  })();
  pendingProfiles.set(id, task);
  return task;
}

export async function toggleFollow(username, isFollowing) {
  if (!username || !hasJikeAuthToken()) return null;
  const endpoint = isFollowing ? "userRelation/unfollow" : "userRelation/follow";
  try {
    const response = await requestJike(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (!response?.ok) return false;
    // A user may have been cached through either their username or UUID.
    // Invalidate pending lookups too, so an older response cannot repopulate the cache.
    profileCache.clear();
    pendingProfiles.clear();
    return true;
  } catch (error) {
    log("follow err", error);
    return false;
  }
}
