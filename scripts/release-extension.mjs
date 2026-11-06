#!/usr/bin/env node

import path from "node:path";
import { parseReleaseOptions } from "./release-options.mjs";

import {
  readChromeWebStoreConfig,
  submitChromeWebStoreItem,
  uploadChromeWebStoreZip,
} from "./chrome-web-store-api.mjs";
import {
  ROOT,
  assertCleanGit,
  assertNonEmptyFile,
  readJson,
  run,
} from "./script-utils.mjs";

const EXTENSION_ID = "hnbakdoibeogigpihopfjfjbacfmcfck";
const DASHBOARD_URL = "https://chrome.google.com/webstore/devconsole";
const CLEAN_GIT_ERROR = "Upload and submit require a clean Git working tree.";

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

async function buildPackage() {
  const [manifest, packageJson] = await Promise.all([readJson("manifest.json"), readJson("package.json")]);
  if (manifest.version !== packageJson.version) {
    throw new Error(`Version mismatch: manifest.json=${manifest.version}, package.json=${packageJson.version}.`);
  }

  run("npm", ["run", "lint"]);
  run("bash", ["pack.sh"]);

  const zipPath = path.join(ROOT, `jike-polish-v${manifest.version}.zip`);
  const zipSize = await assertNonEmptyFile(zipPath, "Release package");
  console.log(`Release package: ${path.basename(zipPath)} (${zipSize} bytes)`);
  return { version: manifest.version, zipPath };
}

async function release(options) {
  const usesApi = options.mode !== "package" && !options.dryRun;
  if (usesApi) assertCleanGit(CLEAN_GIT_ERROR);

  const { version, zipPath } = await buildPackage();
  if (usesApi) assertCleanGit(CLEAN_GIT_ERROR);

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
  const options = parseReleaseOptions(process.argv.slice(2));
  if (options.help) process.stdout.write(usage());
  else await release(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
