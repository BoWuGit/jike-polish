import assert from "node:assert/strict";
import test from "node:test";
import { parseReleaseOptions } from "../scripts/release-options.mjs";

const firefox = { modes: ["package", "submit"], allowNewListing: true };

test("release commands default to packaging and accept both mode syntaxes", () => {
  assert.equal(parseReleaseOptions([]).mode, "package");
  assert.equal(parseReleaseOptions(["--mode", "upload"]).mode, "upload");
  assert.equal(parseReleaseOptions(["--mode=submit", "--confirm"]).confirm, true);
  assert.equal(parseReleaseOptions(["--mode=submit", "--dry-run"]).dryRun, true);
  assert.equal(parseReleaseOptions(["--mode=submit", "-h"]).help, true);
});

test("all stores require confirmation for a real submission", () => {
  for (const config of [undefined, firefox]) {
    assert.throws(() => parseReleaseOptions(["--mode", "submit"], config), /requires --confirm/);
  }
});

test("release parsing rejects unsupported modes, unknown flags, and malformed values", () => {
  for (const args of [["--mode"], ["--mode=bad"], ["--unknown"], ["extra"], ["--confirm=false"]]) {
    assert.throws(() => parseReleaseOptions(args));
  }
  assert.throws(() => parseReleaseOptions(["--mode=upload"], firefox));
  assert.throws(() => parseReleaseOptions(["--allow-new-listing"]));
  assert.equal(parseReleaseOptions(["--allow-new-listing"], firefox).allowNewListing, true);
});
