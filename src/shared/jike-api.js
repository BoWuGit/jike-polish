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
      if (!nextAccessToken || refreshToken() !== currentRefreshToken) return null;
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
  const url = new URL(path.replace(/^\/+/, ""), `${API_BASE}/`);
  if (url.origin !== JIKE_API_ORIGIN || !url.pathname.startsWith("/1.0/")) {
    throw new Error("Jike API requests must stay within the API origin and /1.0/ path.");
  }
  const sendRequest = (requestToken) => fetch(url, {
    ...fetchOptions,
    headers: jikeApiHeaders(requestToken, extraHeaders),
  });

  let token = accessToken();
  if (!token && !allowAnonymous) token = await refreshAccessToken();
  if (!token && !allowAnonymous) return null;

  let response = await sendRequest(token);
  if (response.status !== 401 || fetchOptions.signal?.aborted) return response;

  // Another request may already have refreshed the token before this 401 arrived.
  const currentToken = accessToken();
  if (allowAnonymous) token = null;
  else if (currentToken && currentToken !== token) token = currentToken;
  else token = await refreshAccessToken();
  if (fetchOptions.signal?.aborted) return response;
  if (!token && !allowAnonymous) return response;
  response = await sendRequest(token);
  return response;
}
