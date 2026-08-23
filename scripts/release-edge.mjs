#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  readMicrosoftEdgeAddonsConfig,
  submitMicrosoftEdgeAddonsItem,
  uploadMicrosoftEdgeAddonsZip,
} from "./microsoft-edge-addons-api.mjs";
import {
  ROOT,
  assertCleanGit,
  assertNonEmptyFile,
  readJson,
  run,
} from "./script-utils.mjs";

const PRODUCT_ID = "9cd2ac4e-c35f-466b-9636-2f6fee51c0c2";
const DASHBOARD_URL = `https://partner.microsoft.com/dashboard/microsoftedge/${PRODUCT_ID}/packages/dashboard`;
const REVIEW_NOTES_PATH = path.join(ROOT, "edge/review-notes.md");
const MODES = new Set(["package", "upload", "submit"]);
const CLEAN_GIT_ERROR = "Edge Add-ons upload and submit require a clean Git working tree.";

function usage() {
  return `Usage: npm run release:edge -- [options]

Options:
  --mode package  Validate and package only (default)
  --mode upload   Upload and validate the package as a draft
  --mode submit   Upload, validate, and submit the package for review
  --confirm       Required with --mode submit
  --dry-run       Validate and package without calling the API
  -h, --help      Show this help

Credentials are read from EDGE_CLIENT_ID and EDGE_API_KEY, or from the shared
macOS Keychain items documented in edge/README.md.
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

async function buildPackage() {
  const [manifest, packageJson] = await Promise.all([
    readJson("manifest.json"),
    readJson("package.json"),
  ]);
  if (manifest.version !== packageJson.version) {
    throw new Error(`Version mismatch: manifest.json=${manifest.version}, package.json=${packageJson.version}.`);
  }
  run("npm", ["run", "edge:package"]);
  const zipPath = path.join(ROOT, `jike-polish-edge-v${manifest.version}.zip`);
  const zipSize = await assertNonEmptyFile(zipPath, "Edge release package");
  console.log(`Validated Edge package: ${path.basename(zipPath)} (${zipSize} bytes)`);
  return { version: manifest.version, zipPath };
}

async function readReviewNotes(version) {
  const markdown = await readFile(REVIEW_NOTES_PATH, "utf8");
  const marker = "## Exact text submitted — under 2,000 characters";
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex < 0 || markdown.indexOf(marker, markerIndex + marker.length) >= 0) {
    throw new Error(`Expected one exact-text section in ${path.relative(ROOT, REVIEW_NOTES_PATH)}.`);
  }
  const match = markdown.slice(markerIndex + marker.length).match(/```text\n([\s\S]*?)\n```/);
  const notes = match?.[1]?.trim() || "";
  if (!notes) throw new Error("Edge certification notes are empty.");
  if (notes.length > 2_000) {
    throw new Error(`Edge certification notes contain ${notes.length} characters; the limit is 2,000.`);
  }
  if (!notes.includes(`Version ${version}`)) {
    throw new Error(`Edge certification notes must identify Version ${version}.`);
  }
  return notes;
}

async function release(options) {
  const usesApi = options.mode !== "package" && !options.dryRun;
  if (usesApi) assertCleanGit(CLEAN_GIT_ERROR);

  const artifact = await buildPackage();
  const notes = options.mode === "submit" ? await readReviewNotes(artifact.version) : "";
  if (usesApi) assertCleanGit(CLEAN_GIT_ERROR);

  if (options.mode === "package" || options.dryRun) {
    if (options.dryRun && options.mode !== "package") {
      console.log(`Dry run: would ${options.mode} Edge v${artifact.version} for product ${PRODUCT_ID}.`);
    }
    return;
  }

  const config = readMicrosoftEdgeAddonsConfig({
    ...process.env,
    EDGE_PRODUCT_ID: PRODUCT_ID,
  });
  await uploadMicrosoftEdgeAddonsZip(config, artifact.zipPath);
  console.log("Microsoft Edge Add-ons package upload: validated");

  if (options.mode === "submit") {
    await submitMicrosoftEdgeAddonsItem(config, notes);
    console.log(`Microsoft Edge Add-ons v${artifact.version}: submitted for review`);
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
