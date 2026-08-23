import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const API_ROOT = "https://api.addons.microsoftedge.microsoft.com";
const KEYCHAIN_ACCOUNT = "bowugit";
const KEYCHAIN_SERVICES = {
  clientId: "microsoft-edge-addons-client-id",
  apiKey: "microsoft-edge-addons-api-key",
};
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60_000;
const SUCCESS_STATUSES = new Set(["succeeded", "success", "completed"]);
const FAILURE_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);

function value(input) {
  return String(input || "").trim();
}

function isCredential(input) {
  return Boolean(input) && !/^(?:<.*>|replace[-_ ]?me|placeholder)$/i.test(input);
}

function readKeychainCredential(service) {
  const result = spawnSync(
    "security",
    ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", service, "-w"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  return result.status === 0 ? value(result.stdout) : "";
}

export function readMicrosoftEdgeAddonsConfig(
  env = process.env,
  keychainLookup = readKeychainCredential,
) {
  const productId = value(env.EDGE_PRODUCT_ID);
  const clientId = value(env.EDGE_CLIENT_ID) || value(keychainLookup(KEYCHAIN_SERVICES.clientId));
  const apiKey = value(env.EDGE_API_KEY) || value(keychainLookup(KEYCHAIN_SERVICES.apiKey));
  const missing = [];
  if (!productId) missing.push("EDGE_PRODUCT_ID");
  if (!isCredential(clientId)) missing.push("EDGE_CLIENT_ID or the client-ID Keychain item");
  if (!isCredential(apiKey)) missing.push("EDGE_API_KEY or the API-key Keychain item");
  if (missing.length) {
    throw new Error(`Missing Microsoft Edge Add-ons configuration: ${missing.join(", ")}.`);
  }
  return { productId, clientId, apiKey };
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function errorDetail(payload) {
  if (!payload || typeof payload !== "object") return "";
  const detail = payload.message || payload.error?.message || payload.error;
  return typeof detail === "string" ? detail.slice(0, 500) : "";
}

async function request(url, options, label, timeoutMs, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let payload;
  try {
    response = await fetchImpl(url, { ...options, signal: controller.signal });
    payload = await responseBody(response);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${label} timed out after ${timeoutMs}ms.`);
    throw new Error(`${label} failed: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const detail = errorDetail(payload);
    throw new Error(`${label} failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return { response, payload };
}

function authHeaders(config) {
  return {
    Authorization: `ApiKey ${config.apiKey}`,
    "X-ClientID": config.clientId,
  };
}

function operationId(response, label) {
  const location = response.headers.get("location") || "";
  const id = location.split("/").filter(Boolean).at(-1) || "";
  if (!id) throw new Error(`${label} response did not include an operation location.`);
  return id;
}

async function startOperation(path, options, label, fetchImpl, timeoutMs) {
  const { response } = await request(
    `${API_ROOT}${path}`,
    options,
    label,
    timeoutMs,
    fetchImpl,
  );
  if (response.status !== 202) {
    throw new Error(`${label} returned HTTP ${response.status}; expected 202.`);
  }
  return operationId(response, label);
}

async function waitForOperation(config, path, label, options) {
  const {
    fetchImpl,
    pollIntervalMs = POLL_INTERVAL_MS,
    pollTimeoutMs = POLL_TIMEOUT_MS,
  } = options;
  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    const requestBudget = Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now());
    const { payload } = await request(
      `${API_ROOT}${path}`,
      { method: "GET", headers: authHeaders(config) },
      `${label} status`,
      requestBudget,
      fetchImpl,
    );
    const status = value(payload.status);
    if (SUCCESS_STATUSES.has(status.toLowerCase())) return payload;
    if (FAILURE_STATUSES.has(status.toLowerCase())) {
      const detail = errorDetail(payload);
      throw new Error(`${label} status was ${status}${detail ? `: ${detail}` : ""}`);
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remaining)));
  }
  throw new Error(`${label} did not complete within ${pollTimeoutMs}ms.`);
}

function apiOptions(options = {}) {
  return { ...options, fetchImpl: options.fetchImpl || fetch };
}

export async function uploadMicrosoftEdgeAddonsZip(config, zipPath, options = {}) {
  const resolvedOptions = apiOptions(options);
  const zip = await readFile(zipPath);
  const basePath = `/v1/products/${encodeURIComponent(config.productId)}/submissions/draft/package`;
  const id = await startOperation(
    basePath,
    {
      method: "POST",
      headers: {
        ...authHeaders(config),
        "Content-Type": "application/zip",
        "Content-Length": String(zip.length),
      },
      body: zip,
    },
    "Microsoft Edge Add-ons package upload",
    resolvedOptions.fetchImpl,
    UPLOAD_TIMEOUT_MS,
  );
  return waitForOperation(
    config,
    `${basePath}/operations/${encodeURIComponent(id)}`,
    "Microsoft Edge Add-ons package validation",
    resolvedOptions,
  );
}

export async function submitMicrosoftEdgeAddonsItem(config, notes, options = {}) {
  const resolvedOptions = apiOptions(options);
  const basePath = `/v1/products/${encodeURIComponent(config.productId)}/submissions`;
  const id = await startOperation(
    basePath,
    {
      method: "POST",
      headers: {
        ...authHeaders(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes }),
    },
    "Microsoft Edge Add-ons submission",
    resolvedOptions.fetchImpl,
    REQUEST_TIMEOUT_MS,
  );
  return waitForOperation(
    config,
    `${basePath}/operations/${encodeURIComponent(id)}`,
    "Microsoft Edge Add-ons submission",
    resolvedOptions,
  );
}
