#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = path.join(ROOT, "safari/JikePolish/JikePolish.xcodeproj");
const PROJECT_FILE = path.join(PROJECT, "project.pbxproj");
const DERIVED_DATA = path.join(ROOT, "build/safari");
const APP_BUNDLE_IDENTIFIER = "com.bowugit.jikepolish";
const EXTENSION_BUNDLE_IDENTIFIER = `${APP_BUNDLE_IDENTIFIER}.Extension`;
const EXTENSION_RESOURCES = [
  "manifest.json",
  "content.js",
  "icon.png",
  "jike-twitter-font.user.css",
  "jike-polish-page-bridge.js",
];
const ICON_MASTER = "assets/icon-1024.png";
const APP_ICON_DIRECTORY = "safari/JikePolish/JikePolish/Assets.xcassets/AppIcon.appiconset";
const appIcon = (filename) => `${APP_ICON_DIRECTORY}/${filename}`;
const ICON_OUTPUTS = new Map([
  ["icon.png", 128],
  ["safari/JikePolish/JikePolish/Resources/Icon.png", 1024],
  [appIcon("mac-icon-16@1x.png"), 16],
  [appIcon("mac-icon-16@2x.png"), 32],
  [appIcon("mac-icon-32@1x.png"), 32],
  [appIcon("mac-icon-32@2x.png"), 64],
  [appIcon("mac-icon-128@1x.png"), 128],
  [appIcon("mac-icon-128@2x.png"), 256],
  [appIcon("mac-icon-256@1x.png"), 256],
  [appIcon("mac-icon-256@2x.png"), 512],
  [appIcon("mac-icon-512@1x.png"), 512],
  [appIcon("mac-icon-512@2x.png"), 1024],
]);

function run(command, args, { silent = false } = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: silent ? "ignore" : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function readPngSize(relativePath) {
  const data = await readFile(path.join(ROOT, relativePath));
  const signature = data.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || data.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`Invalid PNG file: ${relativePath}`);
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

async function validateIcons() {
  const icons = new Map([[ICON_MASTER, 1024], ...ICON_OUTPUTS]);
  for (const [relativePath, expectedSize] of icons) {
    const { width, height } = await readPngSize(relativePath);
    if (width !== expectedSize || height !== expectedSize) {
      throw new Error(`Icon must be ${expectedSize}x${expectedSize}: ${relativePath}`);
    }
  }
}

async function generateIcons() {
  if (process.platform !== "darwin") {
    throw new Error("Generating Safari icons requires macOS sips.");
  }

  for (const [relativePath, size] of ICON_OUTPUTS) {
    const output = path.join(ROOT, relativePath);
    if (size === 1024) {
      await copyFile(path.join(ROOT, ICON_MASTER), output);
      continue;
    }
    run("sips", [
      "--resampleHeightWidth", String(size), String(size),
      path.join(ROOT, ICON_MASTER),
      "--out", output,
    ], { silent: true });
  }
  await validateIcons();
  console.log("Browser and Safari icons regenerated from assets/icon-1024.png.");
}

async function validate() {
  await validateIcons();

  const [manifest, packageJson, packageLock, projectFile, viewController] = await Promise.all([
    readJson("manifest.json"),
    readJson("package.json"),
    readJson("package-lock.json"),
    readFile(PROJECT_FILE, "utf8"),
    readFile(path.join(ROOT, "safari/JikePolish/JikePolish/ViewController.swift"), "utf8"),
  ]);

  const versions = new Map([
    ["manifest.json", manifest.version],
    ["package.json", packageJson.version],
    ["package-lock.json", packageLock.version],
    ["package-lock.json packages['']", packageLock.packages?.[""]?.version],
  ]);
  for (const [source, version] of versions) {
    if (version !== manifest.version) {
      throw new Error(`Version mismatch: ${source}=${version}, manifest.json=${manifest.version}.`);
    }
  }

  const xcodeVersions = [...projectFile.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((match) => match[1]);
  if (xcodeVersions.length !== 4 || xcodeVersions.some((version) => version !== manifest.version)) {
    throw new Error(`Safari MARKETING_VERSION must be ${manifest.version} in all four target configurations.`);
  }

  for (const bundleIdentifier of [APP_BUNDLE_IDENTIFIER, EXTENSION_BUNDLE_IDENTIFIER]) {
    if (!projectFile.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier};`)) {
      throw new Error(`Safari Xcode project is missing bundle identifier: ${bundleIdentifier}`);
    }
  }
  if (!viewController.includes(`extensionBundleIdentifier = "${EXTENSION_BUNDLE_IDENTIFIER}"`)) {
    throw new Error("Safari container and extension bundle identifiers do not match.");
  }

  for (const resource of EXTENSION_RESOURCES) {
    if (!projectFile.includes(`/* ${resource} in Resources */`)) {
      throw new Error(`Safari extension resource is missing from the Xcode project: ${resource}`);
    }
  }

  const forbiddenResources = ["node_modules in Resources", "screenshot.png in Resources", "package-lock.json in Resources"];
  for (const resource of forbiddenResources) {
    if (projectFile.includes(resource)) {
      throw new Error(`Unexpected Safari extension resource: ${resource}`);
    }
  }

  console.log(`Safari project validated for v${manifest.version}.`);
}

async function build() {
  if (process.platform !== "darwin") {
    throw new Error("Building the Safari app requires macOS and Xcode.");
  }

  await generateIcons();
  run("npm", ["run", "build"]);
  await validate();
  run("xcodebuild", [
    "-project", PROJECT,
    "-scheme", "JikePolish",
    "-configuration", "Debug",
    "-destination", "generic/platform=macOS",
    "-derivedDataPath", DERIVED_DATA,
    "CODE_SIGNING_ALLOWED=NO",
    "-quiet",
    "build",
  ]);
  console.log(`Safari Debug app built at ${path.relative(ROOT, DERIVED_DATA)}.`);
}

try {
  const command = process.argv[2] || "check";
  if (command === "check") await validate();
  else if (command === "icons") await generateIcons();
  else if (command === "build") await build();
  else throw new Error("Usage: node scripts/safari.mjs [check|icons|build]");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
