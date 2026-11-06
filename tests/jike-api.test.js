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

test("a late 401 reuses credentials refreshed by another request", async () => {
  storage.set("JK_ACCESS_TOKEN", "old-access");
  storage.set("JK_REFRESH_TOKEN", "refresh");
  let finishFirst;
  const firstResponse = new Promise((resolve) => { finishFirst = resolve; });
  let refreshes = 0;
  const tokens = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("app_auth_tokens.refresh")) {
      refreshes += 1;
      return Response.json({ "x-jike-access-token": "new-access" });
    }
    const token = options.headers["x-jike-access-token"];
    tokens.push(token);
    if (tokens.length === 1) return firstResponse;
    return token === "old-access" ? new Response(null, { status: 401 }) : Response.json({ ok: true });
  };
  const first = requestJike("users/profile?username=first");
  assert.equal((await requestJike("users/profile?username=second")).status, 200);
  finishFirst(new Response(null, { status: 401 }));
  assert.equal((await first).status, 200);
  assert.equal(refreshes, 1);
  assert.deepEqual(tokens, ["old-access", "old-access", "new-access", "new-access"]);
});

test("a pending refresh cannot restore tokens after logout", async () => {
  storage.set("JK_REFRESH_TOKEN", "old-refresh");
  let finishRefresh;
  const response = new Promise((resolve) => { finishRefresh = resolve; });
  globalThis.fetch = async () => response;
  const pending = requestJike("users/profile");
  storage.clear();
  finishRefresh(Response.json({
    "x-jike-access-token": "late-access",
    "x-jike-refresh-token": "late-refresh",
  }));
  assert.equal(await pending, null);
  assert.equal(storage.has("JK_ACCESS_TOKEN"), false);
  assert.equal(storage.has("JK_REFRESH_TOKEN"), false);
});

test("API authentication headers never go to an unrelated origin or path", async () => {
  storage.set("JK_ACCESS_TOKEN", "private-access");
  globalThis.fetch = async () => assert.fail("Invalid destinations must be rejected before fetch");
  for (const path of ["https://other.example/1.0/users/profile", "http://api.ruguoapp.com/1.0/users/profile", "../outside"]) {
    await assert.rejects(requestJike(path), /must stay within/);
  }
});
