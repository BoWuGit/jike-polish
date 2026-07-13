#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readChromeWebStoreConfig,
  submitChromeWebStoreItem,
  uploadChromeWebStoreZip,
} from "./chrome-web-store-api.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSION_ID = "hnbakdoibeogigpihopfjfjbacfmcfck";
const DASHBOARD_URL = "https://chrome.google.com/webstore/devconsole";
const MODES = new Set(["package", "upload", "submit"]);

function usage() {
  return `Usage: npm run release:extension -- [options]

Options:
  --mode package  Validate and package only (default)
  --mode upload   Upload the package as a draft
  --mode submit   Upload and submit the package for review
  --confirm       Required with --mode submit
  --dry-run       Validate and package without calling the API
  -h, --help      Show this help
`;
}

function parseArgs(args) {
  const options = { mode: "package", confirm: false, dryRun: false, help: false };

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

  if (!MODES.has(options.mode)) throw new Error("--mode must be package, upload, or submit.");
  if (options.mode === "submit" && !options.confirm && !options.dryRun) {
    throw new Error("--mode submit requires --confirm.");
  }
  return options;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}

function assertCleanGit() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.status !== 0) throw new Error("Could not verify Git status.");
  if (result.stdout.trim()) throw new Error("Upload and submit require a clean Git working tree.");
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(ROOT, file), "utf8"));
}

async function buildPackage() {
  const [manifest, packageJson] = await Promise.all([readJson("manifest.json"), readJson("package.json")]);
  if (manifest.version !== packageJson.version) {
    throw new Error(`Version mismatch: manifest.json=${manifest.version}, package.json=${packageJson.version}.`);
  }

  run("npm", ["run", "lint"]);
  run("bash", ["pack.sh"]);

  const zipPath = path.join(ROOT, `jike-polish-v${manifest.version}.zip`);
  const zipStat = await stat(zipPath);
  if (!zipStat.isFile() || zipStat.size === 0) throw new Error(`Release package is empty: ${zipPath}`);
  console.log(`Release package: ${path.basename(zipPath)} (${zipStat.size} bytes)`);
  return { version: manifest.version, zipPath };
}

async function release(options) {
  const usesApi = options.mode !== "package" && !options.dryRun;
  if (usesApi) assertCleanGit();

  const { version, zipPath } = await buildPackage();
  if (usesApi) assertCleanGit();

  if (options.mode === "package" || options.dryRun) {
    if (options.dryRun && options.mode !== "package") {
      console.log(`Dry run: would ${options.mode} v${version} for Chrome Web Store item ${EXTENSION_ID}.`);
    }
    return;
  }

  const config = readChromeWebStoreConfig({ ...process.env, CWS_EXTENSION_ID: EXTENSION_ID });
  const uploadResult = await uploadChromeWebStoreZip(config, zipPath);
  console.log(`Chrome Web Store upload: ${uploadResult.uploadState || "accepted"}`);

  if (options.mode === "submit") {
    const result = await submitChromeWebStoreItem(config);
    const status = Array.isArray(result.status) ? result.status.join(", ") : result.status || "accepted";
    console.log(`Chrome Web Store submit: ${status}`);
  }

  console.log(`Review status: ${DASHBOARD_URL}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) process.stdout.write(usage());
  else await release(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
