import { log } from "./debug.js";
import { stringValue } from "./values.js";

export const JIKE_API_ORIGIN = "https://api.ruguoapp.com";

const API_BASE = `${JIKE_API_ORIGIN}/1.0`;
const AUTH_REFRESH_PATH = "/app_auth_tokens.refresh";

let authRefreshTask = null;

function accessToken() {
  return localStorage.getItem("JK_ACCESS_TOKEN");
}

function refreshToken() {
  return localStorage.getItem("JK_REFRESH_TOKEN");
}

function deviceId() {
  return localStorage.getItem("JK_DEVICE_ID");
}

export function hasJikeAuthToken() {
  return !!(accessToken() || refreshToken());
}

export function jikeApiHeaders(token, extraHeaders = {}) {
  const headers = { ...extraHeaders, platform: "web" };
  if (token) headers["x-jike-access-token"] = token;
  const device = deviceId();
  if (device) headers["x-jike-device-id"] = device;
  return headers;
}

async function refreshAccessToken() {
  if (authRefreshTask) return authRefreshTask;
  const currentRefreshToken = refreshToken();
  if (!currentRefreshToken) return null;

  authRefreshTask = (async () => {
    try {
      const response = await fetch(`${JIKE_API_ORIGIN}${AUTH_REFRESH_PATH}`, {
        method: "POST",
        headers: jikeApiHeaders(null, {
          "x-jike-refresh-token": currentRefreshToken,
          "Content-Type": "application/json",
        }),
        body: "{}",
      });
      if (!response.ok) return null;

      const payload = await response.json();
      const nextAccessToken = stringValue(payload?.["x-jike-access-token"]);
      const nextRefreshToken = stringValue(payload?.["x-jike-refresh-token"]);
      if (!nextAccessToken) return null;
      localStorage.setItem("JK_ACCESS_TOKEN", nextAccessToken);
      if (nextRefreshToken) localStorage.setItem("JK_REFRESH_TOKEN", nextRefreshToken);
      return nextAccessToken;
    } catch (error) {
      log("refresh err", error);
      return null;
    } finally {
      authRefreshTask = null;
    }
  })();
  return authRefreshTask;
}

export async function requestJike(path, options = {}) {
  const { allowAnonymous = false, headers: extraHeaders, ...fetchOptions } = options;
  const url = path.startsWith("http") ? path : `${API_BASE}/${path.replace(/^\/+/, "")}`;
  let token = accessToken();
  if (!token && !allowAnonymous) token = await refreshAccessToken();
  if (!token && !allowAnonymous) return null;

  let response = await fetch(url, {
    ...fetchOptions,
    headers: jikeApiHeaders(token, extraHeaders),
  });
  if (response.status !== 401 || fetchOptions.signal?.aborted) return response;

  token = allowAnonymous ? null : await refreshAccessToken();
  if (fetchOptions.signal?.aborted) return response;
  if (!token && !allowAnonymous) return response;
  response = await fetch(url, {
    ...fetchOptions,
    headers: jikeApiHeaders(token, extraHeaders),
  });
  return response;
}
