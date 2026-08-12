import assert from "node:assert/strict";
import test from "node:test";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const { hasJikeAuthToken, requestJike } = await import("../src/shared/jike-api.js");

test.beforeEach(() => {
  storage.clear();
});

test("hasJikeAuthToken accepts either site token", () => {
  assert.equal(hasJikeAuthToken(), false);
  storage.set("JK_REFRESH_TOKEN", "refresh");
  assert.equal(hasJikeAuthToken(), true);
});

test("requestJike returns null without authentication", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new globalThis.Response();
  };

  assert.equal(await requestJike("users/profile"), null);
  assert.equal(called, false);
});

test("requestJike can preserve anonymous API access", async () => {
  let headers;
  globalThis.fetch = async (_url, options) => {
    headers = options.headers;
    return globalThis.Response.json({ ok: true });
  };

  const response = await requestJike("originalPosts/get?id=post", { allowAnonymous: true });

  assert.equal(response.status, 200);
  assert.equal(headers.platform, "web");
  assert.equal(headers["x-jike-access-token"], undefined);
});

test("requestJike retries anonymous access without refreshing stale credentials", async () => {
  storage.set("JK_ACCESS_TOKEN", "expired-access");
  storage.set("JK_REFRESH_TOKEN", "refresh-token");
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return new globalThis.Response(null, { status: 401 });
    return globalThis.Response.json({ ok: true });
  };

  const response = await requestJike("originalPosts/get?id=post", { allowAnonymous: true });

  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers["x-jike-access-token"], "expired-access");
  assert.equal(calls[1].options.headers["x-jike-access-token"], undefined);
  assert.equal(calls.some(({ url }) => url.includes("app_auth_tokens.refresh")), false);
});

test("requestJike refreshes once after an unauthorized response", async () => {
  storage.set("JK_ACCESS_TOKEN", "expired-access");
  storage.set("JK_REFRESH_TOKEN", "refresh-token");
  storage.set("JK_DEVICE_ID", "device-id");
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return new globalThis.Response(null, { status: 401 });
    if (calls.length === 2) {
      return globalThis.Response.json({
        "x-jike-access-token": "next-access",
        "x-jike-refresh-token": "next-refresh",
      });
    }
    return globalThis.Response.json({ ok: true });
  };

  const response = await requestJike("users/profile?username=user");

  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].options.headers["x-jike-access-token"], "expired-access");
  assert.equal(calls[0].options.headers["x-jike-device-id"], "device-id");
  assert.equal(calls[1].options.headers["x-jike-refresh-token"], "refresh-token");
  assert.equal(calls[2].options.headers["x-jike-access-token"], "next-access");
  assert.equal(storage.get("JK_REFRESH_TOKEN"), "next-refresh");
});
