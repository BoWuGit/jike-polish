import { readFile } from "node:fs/promises";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/chromewebstore/v1.1/items";
const UPLOAD_BASE = "https://www.googleapis.com/upload/chromewebstore/v1.1/items";
const API_VERSION = "2";
const REQUIRED_ENV = ["CWS_EXTENSION_ID", "CWS_CLIENT_ID", "CWS_CLIENT_SECRET", "CWS_REFRESH_TOKEN"];

function value(input) {
  return String(input || "").trim();
}

export function readChromeWebStoreConfig(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !value(env[name]));
  if (missing.length) {
    throw new Error(`Missing Chrome Web Store environment variables: ${missing.join(", ")}.`);
  }

  return {
    extensionId: value(env.CWS_EXTENSION_ID),
    clientId: value(env.CWS_CLIENT_ID),
    clientSecret: value(env.CWS_CLIENT_SECRET),
    refreshToken: value(env.CWS_REFRESH_TOKEN),
  };
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorDetail(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload.slice(0, 500);
  if (payload.error?.message) return String(payload.error.message);
  if (typeof payload.error === "string") return payload.error;
  if (payload.error_description) return String(payload.error_description);
  if (Array.isArray(payload.itemError)) {
    return payload.itemError
      .map((item) => item?.error_detail || item?.error_code)
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

async function requestJson(url, options, label) {
  const response = await fetch(url, options);
  const payload = await responseBody(response);
  if (!response.ok) {
    const detail = errorDetail(payload);
    throw new Error(`${label} failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return payload || {};
}

async function accessToken(config) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });
  const payload = await requestJson(
    TOKEN_ENDPOINT,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    "Chrome Web Store OAuth token refresh",
  );

  if (!value(payload.access_token)) {
    throw new Error("Chrome Web Store OAuth response did not include an access token.");
  }
  return payload.access_token;
}

export async function uploadChromeWebStoreZip(config, zipPath) {
  const token = await accessToken(config);
  const zip = await readFile(zipPath);
  const payload = await requestJson(
    `${UPLOAD_BASE}/${encodeURIComponent(config.extensionId)}`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/zip",
        "content-length": String(zip.length),
        "x-goog-api-version": API_VERSION,
      },
      body: zip,
    },
    "Chrome Web Store upload",
  );

  if (payload.uploadState && payload.uploadState !== "SUCCESS") {
    const detail = errorDetail(payload);
    throw new Error(`Chrome Web Store upload state was ${payload.uploadState}${detail ? `: ${detail}` : ""}`);
  }
  return payload;
}

export async function submitChromeWebStoreItem(config) {
  const token = await accessToken(config);
  return requestJson(
    `${API_BASE}/${encodeURIComponent(config.extensionId)}/publish`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "x-goog-api-version": API_VERSION,
      },
    },
    "Chrome Web Store submit for review",
  );
}
