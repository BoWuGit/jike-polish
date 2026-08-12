#!/usr/bin/env node

import { rm } from "node:fs/promises";
import path from "node:path";

import {
  ROOT,
  assertCleanGit,
  assertNonEmptyFile,
  readJson,
  run,
} from "./script-utils.mjs";

const FIREFOX_ID = "jike-polish@bowugit.github.io";
const AMO_DASHBOARD_URL = "https://addons.mozilla.org/developers/addons";
const AMO_METADATA = path.join(ROOT, "firefox/amo-metadata.json");
const MODES = new Set(["package", "submit"]);
const CLEAN_GIT_ERROR = "AMO submission requires a clean Git working tree.";

function usage() {
  return `Usage: npm run release:firefox -- [options]

Options:
  --mode package       Validate and create extension/source packages (default)
  --mode submit        Submit a listed version to AMO for review
  --confirm            Required with --mode submit
  --allow-new-listing  Required if no existing AMO listing has been confirmed
  --dry-run            Validate/package without calling AMO
  -h, --help           Show this help

AMO credentials are read only from WEB_EXT_API_KEY and WEB_EXT_API_SECRET.
`;
}

function parseArgs(args) {
  const options = {
    mode: "package",
    confirm: false,
    allowNewListing: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--confirm") options.confirm = true;
    else if (arg === "--allow-new-listing") options.allowNewListing = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--mode") {
      options.mode = args[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--mode=")) options.mode = arg.slice("--mode=".length);
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!MODES.has(options.mode)) throw new Error("--mode must be package or submit.");
  if (options.mode === "submit" && !options.confirm && !options.dryRun) {
    throw new Error("--mode submit requires --confirm.");
  }
  return options;
}

function assertCredential(name) {
  const value = process.env[name]?.trim();
  if (!value || /^(?:<.*>|replace[-_ ]?me|placeholder)$/i.test(value)) {
    throw new Error(`Set ${name} to the AMO API credential before submitting.`);
  }
}

async function buildPackages() {
  const [manifest, metadata] = await Promise.all([
    readJson("manifest.json"),
    readJson("firefox/amo-metadata.json"),
  ]);
  if (manifest.browser_specific_settings?.gecko?.id !== FIREFOX_ID) {
    throw new Error(`manifest.json must use the stable Firefox ID ${FIREFOX_ID}.`);
  }
  if (!metadata.version?.license) {
    throw new Error("firefox/amo-metadata.json must specify the AMO version license.");
  }

  run("npm", ["run", "lint"]);
  run("npm", ["test"]);
  run("npm", ["run", "safari:check"]);
  run("npm", ["run", "firefox:package"]);

  const extensionZip = path.join(ROOT, `jike-polish-firefox-v${manifest.version}.zip`);
  const sourceZip = path.join(ROOT, `jike-polish-firefox-source-v${manifest.version}.zip`);
  const [extensionSize, sourceSize] = await Promise.all([
    assertNonEmptyFile(extensionZip, "Firefox release package"),
    assertNonEmptyFile(sourceZip, "Firefox source package"),
  ]);
  console.log(`Validated Firefox package: ${path.basename(extensionZip)} (${extensionSize} bytes)`);
  console.log(`Validated source package: ${path.basename(sourceZip)} (${sourceSize} bytes)`);
  return { extensionZip, sourceZip, version: manifest.version };
}

async function release(options) {
  const usesApi = options.mode === "submit" && !options.dryRun;
  if (usesApi) assertCleanGit(CLEAN_GIT_ERROR);

  const artifacts = await buildPackages();
  if (usesApi) assertCleanGit(CLEAN_GIT_ERROR);

  if (options.mode === "package") return;
  if (options.dryRun) {
    console.log(`Dry run: would submit Firefox v${artifacts.version} to AMO as ${FIREFOX_ID}.`);
    return;
  }

  assertCredential("WEB_EXT_API_KEY");
  assertCredential("WEB_EXT_API_SECRET");
  if (!options.allowNewListing && process.env.AMO_EXISTING_LISTING !== FIREFOX_ID) {
    throw new Error(
      `Set AMO_EXISTING_LISTING=${FIREFOX_ID} after confirming the listing in Developer Hub, `
      + "or pass --allow-new-listing only for an intentional API-created first submission.",
    );
  }

  const signedArtifacts = path.join(ROOT, "build/firefox-signed");
  await rm(signedArtifacts, { recursive: true, force: true });
  const webExt = path.join(
    ROOT,
    "node_modules/.bin",
    process.platform === "win32" ? "web-ext.cmd" : "web-ext",
  );
  run(webExt, [
    "sign",
    "--source-dir", path.join(ROOT, "build/firefox"),
    "--artifacts-dir", signedArtifacts,
    "--channel", "listed",
    "--amo-metadata", AMO_METADATA,
    "--upload-source-code", artifacts.sourceZip,
    "--approval-timeout", "0",
    "--no-input",
    "--no-config-discovery",
  ]);

  console.log(`AMO update submitted: Firefox v${artifacts.version}.`);
  console.log(`Review and complete listing fields at: ${AMO_DASHBOARD_URL}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) process.stdout.write(usage());
  else await release(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
