#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIREFOX_ID = "jike-polish@bowugit.github.io";
const AMO_ADDON_API = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(FIREFOX_ID)}/`;
const AMO_DASHBOARD_URL = "https://addons.mozilla.org/developers/addons";
const AMO_METADATA = path.join(ROOT, "firefox/amo-metadata.json");
const MODES = new Set(["package", "submit"]);

function usage() {
  return `Usage: npm run release:firefox -- [options]

Options:
  --mode package       Validate and create extension/source packages (default)
  --mode submit        Submit a listed version to AMO for review
  --confirm            Required with --mode submit
  --dry-run            Validate/package without calling AMO
  -h, --help           Show this help

AMO credentials are read only from WEB_EXT_API_KEY and WEB_EXT_API_SECRET.
`;
}

function parseArgs(args) {
  const options = {
    mode: "package",
    confirm: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--confirm") options.confirm = true;
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

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: ROOT, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}

function assertCleanGit() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.status !== 0) throw new Error("Could not verify Git status.");
  if (result.stdout.trim()) throw new Error("AMO submission requires a clean Git working tree.");
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function assertFile(file, label) {
  const fileStat = await stat(file);
  if (!fileStat.isFile() || fileStat.size === 0) throw new Error(`${label} is empty: ${file}`);
  return fileStat.size;
}

function assertCredential(name) {
  const value = process.env[name]?.trim();
  if (!value || /^(?:<.*>|replace[-_ ]?me|placeholder)$/i.test(value)) {
    throw new Error(`Set ${name} to the AMO API credential before submitting.`);
  }
}

async function listingExists() {
  const response = await fetch(AMO_ADDON_API, { headers: { Accept: "application/json" } });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Could not check AMO listing (${response.status}).`);
  return true;
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
    assertFile(extensionZip, "Firefox release package"),
    assertFile(sourceZip, "Firefox source package"),
  ]);
  console.log(`Validated Firefox package: ${path.basename(extensionZip)} (${extensionSize} bytes)`);
  console.log(`Validated source package: ${path.basename(sourceZip)} (${sourceSize} bytes)`);
  return { extensionZip, sourceZip, version: manifest.version };
}

async function release(options) {
  const usesApi = options.mode === "submit" && !options.dryRun;
  if (usesApi) assertCleanGit();

  const artifacts = await buildPackages();
  if (usesApi) assertCleanGit();

  if (options.mode === "package") return;
  if (options.dryRun) {
    console.log(`Dry run: would submit Firefox v${artifacts.version} to AMO as ${FIREFOX_ID}.`);
    return;
  }

  assertCredential("WEB_EXT_API_KEY");
  assertCredential("WEB_EXT_API_SECRET");
  if (!await listingExists()) {
    throw new Error(
      "No AMO listing exists yet. Complete the first submission in AMO Developer Hub "
      + "so its privacy policy, license, support links, and screenshots are reviewed together.",
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
