import assert from "node:assert/strict";
import test from "node:test";

// Each scenario uses its own identifiers; the module intentionally keeps a page-lifetime cache.
globalThis.localStorage = { getItem: (key) => key === "JK_ACCESS_TOKEN" ? "access" : null };
const { AUTH_EXPIRED, fetchUser, toggleFollow } = await import("../src/content/profile-api.js");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("concurrent profile hovers share one request and reuse the successful result", async () => {
  let calls = 0;
  const response = deferred();
  const user = { username: "shared-profile", screenName: "Shared" };
  globalThis.fetch = async () => { calls += 1; return response.promise; };
  const first = fetchUser(user.username);
  const second = fetchUser(user.username);
  response.resolve(Response.json({ user }));
  assert.deepEqual(await first, user);
  assert.deepEqual(await second, user);
  await fetchUser(user.username);
  assert.equal(calls, 1);
});

test("UUID fallback accepts only the requested user's identity", async () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  const user = { id, username: "uuid-profile" };
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ user: urls.length === 1 ? { username: "wrong-person" } : user });
  };
  assert.deepEqual(await fetchUser(id), user);
  assert.match(urls[0], /username=/);
  assert.match(urls[1], /\?id=/);
});

test("failed and unauthorized profiles are retried rather than cached", async () => {
  globalThis.fetch = async () => new Response(null, { status: 503 });
  assert.equal(await fetchUser("retry-profile"), null);
  globalThis.fetch = async () => Response.json({ user: { username: "retry-profile" } });
  assert.equal((await fetchUser("retry-profile")).username, "retry-profile");
  globalThis.fetch = async () => new Response(null, { status: 401 });
  assert.equal(await fetchUser("expired-profile"), AUTH_EXPIRED);
});

test("follow invalidates username and UUID aliases, including older pending requests", async () => {
  const id = "87654321-1234-1234-1234-123456789abc";
  const user = { id, username: "follow-profile", following: false };
  const oldResponse = deferred();
  let delayed = false;
  globalThis.fetch = async (url, options) => {
    if (options.method === "POST") return Response.json({ ok: true });
    if (String(url).includes("username=pending-profile")) {
      delayed = true;
      return oldResponse.promise;
    }
    return Response.json({ user });
  };
  await fetchUser(id);
  await fetchUser(user.username);
  const pending = fetchUser("pending-profile");
  assert.equal(delayed, true);
  assert.equal(await toggleFollow(user.username, false), true);
  oldResponse.resolve(Response.json({ user: { username: "pending-profile", following: false } }));
  await pending;

  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    return Response.json({ user: {
      ...user,
      username: String(url).includes("pending-profile") ? "pending-profile" : user.username,
      following: true,
    } });
  };
  assert.equal((await fetchUser(id)).following, true);
  assert.equal((await fetchUser(user.username)).following, true);
  assert.equal((await fetchUser("pending-profile")).following, true);
  assert.equal(calls, 4); // UUID uses username first, then the ID fallback.
});

test("an invalidated lookup cannot delete a newer pending lookup", async () => {
  const oldResponse = deferred();
  const newResponse = deferred();
  let profileCalls = 0;
  globalThis.fetch = async (_url, options) => {
    if (options.method === "POST") return Response.json({ ok: true });
    profileCalls += 1;
    return profileCalls === 1 ? oldResponse.promise : newResponse.promise;
  };
  const old = fetchUser("pending-identity");
  await toggleFollow("pending-identity", false);
  const current = fetchUser("pending-identity");
  oldResponse.resolve(Response.json({ user: { username: "pending-identity", following: false } }));
  await old;
  const shared = fetchUser("pending-identity");
  assert.equal(profileCalls, 2);
  newResponse.resolve(Response.json({ user: { username: "pending-identity", following: true } }));
  assert.equal((await current).following, true);
  assert.equal((await shared).following, true);
});
