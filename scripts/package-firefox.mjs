#!/usr/bin/env node

import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ROOT,
  copyProjectFile,
  assertNonEmptyFile,
  normalizeArchiveFiles,
  readJson,
  run,
} from "./script-utils.mjs";

const BUILD_DIR = path.join(ROOT, "build/firefox");
const FIREFOX_ID = "jike-polish@bowugit.github.io";
const MIN_FIREFOX_VERSION = 142;
const REQUIRED_DATA_COLLECTION = [
  "authenticationInfo",
  "locationInfo",
  "personalCommunications",
  "personallyIdentifyingInfo",
  "websiteActivity",
  "websiteContent",
];
const EXTENSION_FILES = new Map([
  ["content.js", "content.js"],
  ["icon.png", "icon.png"],
  ["firefox/icons/icon-16.png", "icons/icon-16.png"],
  ["firefox/icons/icon-48.png", "icons/icon-48.png"],
  ["jike-twitter-font.user.css", "jike-twitter-font.user.css"],
  ["jike-polish-page-bridge.js", "jike-polish-page-bridge.js"],
]);
const DEMO_FILES = new Map([
  ["edge/demo/launcher.html", "firefox-demo/launcher.html"],
  ["edge/demo/launcher.css", "firefox-demo/launcher.css"],
  ["edge/demo/index.html", "firefox-demo/index.html"],
  ["edge/demo/platform.css", "firefox-demo/platform.css"],
  ["safari/JikePolish/JikePolish/Resources/Style.css", "firefox-demo/style.css"],
  ["safari/JikePolish/JikePolish/Resources/Script.js", "firefox-demo/script.js"],
]);
const PACKAGE_FILES = [
  "manifest.json",
  ...EXTENSION_FILES.values(),
  ...DEMO_FILES.values(),
].sort();
const SOURCE_ENTRIES = [
  "firefox/BUILD.md",
  "firefox/icons/icon-16.png",
  "firefox/icons/icon-48.png",
  "manifest.json",
  "package-lock.json",
  "package.json",
  "src",
  "scripts/package-firefox.mjs",
  "scripts/script-utils.mjs",
  "icon.png",
  "jike-twitter-font.user.css",
  "edge/demo",
  "safari/JikePolish/JikePolish/Resources/Script.js",
  "safari/JikePolish/JikePolish/Resources/Style.css",
];

async function copyEntryInto(directory, relativePath) {
  const source = path.join(ROOT, relativePath);
  const sourceStat = await lstat(source);
  if (sourceStat.isFile()) {
    await copyProjectFile(directory, relativePath);
    return;
  }
  if (!sourceStat.isDirectory()) throw new Error(`Unsupported source entry: ${relativePath}`);

  for (const entry of await readdir(source, { withFileTypes: true })) {
    await copyEntryInto(directory, path.join(relativePath, entry.name));
  }
}

async function listFiles(directory, relativePath = "") {
  const entries = await readdir(path.join(directory, relativePath), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(directory, entryPath));
    else if (entry.isFile()) files.push(entryPath);
    else throw new Error(`Unsupported staged entry: ${entryPath}`);
  }
  return files.sort();
}

function zipFiles(directory, output, files) {
  run("zip", ["-X", "-q", output, ...files], {
    cwd: directory,
    env: { ...process.env, TZ: "UTC" },
  });
}

function createFirefoxManifest(manifest) {
  const gecko = manifest.browser_specific_settings?.gecko;
  if (gecko?.id !== FIREFOX_ID) {
    throw new Error(`Firefox extension ID must remain ${FIREFOX_ID}.`);
  }
  if (Number.parseFloat(gecko.strict_min_version) < MIN_FIREFOX_VERSION) {
    throw new Error(`Firefox strict_min_version must be ${MIN_FIREFOX_VERSION}.0 or newer.`);
  }
  const declaredData = gecko.data_collection_permissions?.required;
  const requiredData = Array.isArray(declaredData) ? [...new Set(declaredData)].sort() : [];
  if (JSON.stringify(requiredData) !== JSON.stringify(REQUIRED_DATA_COLLECTION)) {
    throw new Error(
      `Firefox required data collection must remain: ${REQUIRED_DATA_COLLECTION.join(", ")}.`,
    );
  }

  const firefoxManifest = structuredClone(manifest);
  firefoxManifest.icons = {
    16: "icons/icon-16.png",
    48: "icons/icon-48.png",
    128: "icon.png",
  };
  firefoxManifest.action = {
    default_icon: firefoxManifest.icons,
    default_title: "打开阅赏离线功能演示",
    default_popup: "firefox-demo/launcher.html",
  };
  return firefoxManifest;
}

async function validateVersions() {
  const [manifest, packageJson, packageLock] = await Promise.all([
    readJson("manifest.json"),
    readJson("package.json"),
    readJson("package-lock.json"),
  ]);
  const versions = new Map([
    ["package.json", packageJson.version],
    ["package-lock.json", packageLock.version],
    ["package-lock.json packages['']", packageLock.packages?.[""]?.version],
  ]);
  for (const [source, version] of versions) {
    if (version !== manifest.version) {
      throw new Error(`Version mismatch: ${source}=${version}, manifest.json=${manifest.version}.`);
    }
  }
  return manifest;
}

async function prepareExtension(manifest) {
  run("npm", ["run", "build"]);
  await rm(BUILD_DIR, { recursive: true, force: true });
  await mkdir(BUILD_DIR, { recursive: true });

  const firefoxManifest = createFirefoxManifest(manifest);
  await Promise.all([
    writeFile(
      path.join(BUILD_DIR, "manifest.json"),
      `${JSON.stringify(firefoxManifest, null, 2)}\n`,
    ),
    ...[...EXTENSION_FILES].map(([source, destination]) => (
      copyProjectFile(BUILD_DIR, source, destination)
    )),
    ...[...DEMO_FILES].map(([source, destination]) => (
      copyProjectFile(BUILD_DIR, source, destination)
    )),
  ]);
  await normalizeArchiveFiles(BUILD_DIR, PACKAGE_FILES);

  const webExt = path.join(
    ROOT,
    "node_modules/.bin",
    process.platform === "win32" ? "web-ext.cmd" : "web-ext",
  );
  run(webExt, [
    "lint",
    "--source-dir", BUILD_DIR,
    "--no-input",
    "--no-config-discovery",
  ]);
}

async function createSourceArchive(version, output) {
  const stage = await mkdtemp(path.join(os.tmpdir(), "jike-polish-firefox-source-"));
  const sourceRootName = `jike-polish-firefox-source-v${version}`;
  const sourceRoot = path.join(stage, sourceRootName);
  try {
    await Promise.all(SOURCE_ENTRIES.map((entry) => copyEntryInto(sourceRoot, entry)));
    const sourceFiles = await listFiles(stage);
    await normalizeArchiveFiles(stage, sourceFiles);
    await rm(output, { force: true });
    zipFiles(stage, output, sourceFiles);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function assertArchive(output, label) {
  const size = await assertNonEmptyFile(output, label);
  console.log(`${label}: ${path.basename(output)} (${size} bytes)`);
}

async function prepareFirefox() {
  const manifest = await validateVersions();
  await prepareExtension(manifest);
  return manifest;
}

async function packageFirefox() {
  const manifest = await prepareFirefox();
  const extensionOutput = path.join(ROOT, `jike-polish-firefox-v${manifest.version}.zip`);
  const sourceOutput = path.join(ROOT, `jike-polish-firefox-source-v${manifest.version}.zip`);
  await rm(extensionOutput, { force: true });
  zipFiles(BUILD_DIR, extensionOutput, PACKAGE_FILES);
  await createSourceArchive(manifest.version, sourceOutput);
  await Promise.all([
    assertArchive(extensionOutput, "Firefox release package"),
    assertArchive(sourceOutput, "Firefox source package"),
  ]);
}

try {
  const command = process.argv[2] || "package";
  if (command === "check") {
    const manifest = await prepareFirefox();
    console.log(`Firefox extension validated for v${manifest.version}.`);
  } else if (command === "package") {
    await packageFirefox();
  } else {
    throw new Error("Usage: node scripts/package-firefox.mjs [check|package]");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
