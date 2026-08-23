import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  readMicrosoftEdgeAddonsConfig,
  submitMicrosoftEdgeAddonsItem,
  uploadMicrosoftEdgeAddonsZip,
} from "../scripts/microsoft-edge-addons-api.mjs";

const CONFIG = {
  productId: "product-id",
  clientId: "client-id-value",
  apiKey: "api-key-value",
};

function accepted(id) {
  return new Response(null, {
    status: 202,
    headers: { location: `https://example.invalid/operations/${id}` },
  });
}

function json(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("Edge Add-ons config prefers environment credentials", () => {
  const config = readMicrosoftEdgeAddonsConfig(
    {
      EDGE_PRODUCT_ID: " product-id ",
      EDGE_CLIENT_ID: " client-id-value ",
      EDGE_API_KEY: " api-key-value ",
    },
    () => assert.fail("Keychain lookup should not run"),
  );
  assert.deepEqual(config, CONFIG);
});

test("Edge Add-ons config falls back to shared Keychain credentials", () => {
  const credentials = new Map([
    ["microsoft-edge-addons-client-id", "client-id-value"],
    ["microsoft-edge-addons-api-key", "api-key-value"],
  ]);
  const config = readMicrosoftEdgeAddonsConfig(
    { EDGE_PRODUCT_ID: "product-id" },
    (service) => credentials.get(service),
  );
  assert.deepEqual(config, CONFIG);
});

test("Edge Add-ons package upload waits for validation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "edge-api-test-"));
  const zipPath = path.join(directory, "extension.zip");
  await writeFile(zipPath, "zip bytes");
  const requests = [];
  const responses = [accepted("upload-operation"), json({ status: "InProgress" }), json({ status: "Succeeded" })];
  try {
    const result = await uploadMicrosoftEdgeAddonsZip(CONFIG, zipPath, {
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return responses.shift();
      },
      pollIntervalMs: 0,
      pollTimeoutMs: 1_000,
    });
    assert.equal(result.status, "Succeeded");
    assert.equal(requests.length, 3);
    assert.match(requests[0].url, /\/v1\/products\/product-id\/submissions\/draft\/package$/);
    assert.equal(requests[0].options.method, "POST");
    assert.equal(requests[0].options.headers.Authorization, "ApiKey api-key-value");
    assert.equal(requests[0].options.headers["X-ClientID"], "client-id-value");
    assert.match(requests[1].url, /\/package\/operations\/upload-operation$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Edge Add-ons submission sends certification notes and waits for review submission", async () => {
  const requests = [];
  const responses = [accepted("submit-operation"), json({ status: "Succeeded" })];
  const result = await submitMicrosoftEdgeAddonsItem(CONFIG, "Certification notes", {
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return responses.shift();
    },
    pollIntervalMs: 0,
    pollTimeoutMs: 1_000,
  });
  assert.equal(result.status, "Succeeded");
  assert.match(requests[0].url, /\/v1\/products\/product-id\/submissions$/);
  assert.deepEqual(JSON.parse(requests[0].options.body), { notes: "Certification notes" });
  assert.match(requests[1].url, /\/submissions\/operations\/submit-operation$/);
});

test("Edge Add-ons operations fail closed on terminal API failures", async () => {
  const responses = [accepted("submit-operation"), json({ status: "Failed", message: "Package rejected" })];
  await assert.rejects(
    submitMicrosoftEdgeAddonsItem(CONFIG, "Certification notes", {
      fetchImpl: async () => responses.shift(),
      pollIntervalMs: 0,
      pollTimeoutMs: 1_000,
    }),
    /status was Failed: Package rejected/,
  );
});
