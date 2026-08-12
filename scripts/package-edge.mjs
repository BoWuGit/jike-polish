#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
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
} from "./script-utils.mjs";

const EXTENSION_FILES = [
  "content.js",
  "icon.png",
  "jike-twitter-font.user.css",
  "jike-polish-page-bridge.js",
];
const EDGE_LOCALE = "zh_CN";
const EDGE_LOCALE_FILE = `_locales/${EDGE_LOCALE}/messages.json`;
const ACTION_TITLE = "打开阅赏离线功能演示";
const DEMO_FILES = new Map([
  ["edge/demo/launcher.html", "edge-demo/launcher.html"],
  ["edge/demo/launcher.css", "edge-demo/launcher.css"],
  ["edge/demo/index.html", "edge-demo/index.html"],
  ["edge/demo/platform.css", "edge-demo/platform.css"],
  ["safari/JikePolish/JikePolish/Resources/Style.css", "edge-demo/style.css"],
  ["safari/JikePolish/JikePolish/Resources/Script.js", "edge-demo/script.js"],
]);
const PACKAGE_FILES = [
  "manifest.json",
  ...EXTENSION_FILES,
  EDGE_LOCALE_FILE,
  ...DEMO_FILES.values(),
];

function run(command, args, cwd = ROOT, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}

async function packageEdge() {
  const [manifest, packageJson] = await Promise.all([
    readJson("manifest.json"),
    readJson("package.json"),
  ]);
  if (manifest.version !== packageJson.version) {
    throw new Error(`Version mismatch: manifest.json=${manifest.version}, package.json=${packageJson.version}.`);
  }

  run("npm", ["run", "lint"]);
  run("npm", ["run", "build"]);
  run("npm", ["run", "safari:check"]);

  const stage = await mkdtemp(path.join(os.tmpdir(), "jike-polish-edge-"));
  const output = path.join(ROOT, `jike-polish-edge-v${manifest.version}.zip`);
  try {
    const edgeManifest = structuredClone(manifest);
    delete edgeManifest.browser_specific_settings;
    edgeManifest.name = "__MSG_extensionName__";
    edgeManifest.description = "__MSG_extensionDescription__";
    edgeManifest.default_locale = EDGE_LOCALE;
    edgeManifest.action = {
      default_icon: {
        16: "icon.png",
        48: "icon.png",
        128: "icon.png",
      },
      default_title: "__MSG_actionTitle__",
      default_popup: "edge-demo/launcher.html",
    };
    const localeMessages = {
      extensionName: { message: manifest.name },
      extensionDescription: { message: manifest.description },
      actionTitle: { message: ACTION_TITLE },
    };
    await mkdir(path.join(stage, path.dirname(EDGE_LOCALE_FILE)), { recursive: true });
    await Promise.all([
      writeFile(path.join(stage, "manifest.json"), `${JSON.stringify(edgeManifest, null, 2)}\n`),
      writeFile(
        path.join(stage, EDGE_LOCALE_FILE),
        `${JSON.stringify(localeMessages, null, 2)}\n`,
      ),
      ...EXTENSION_FILES.map((file) => copyProjectFile(stage, file)),
      ...[...DEMO_FILES].map(([source, destination]) => (
        copyProjectFile(stage, source, destination)
      )),
    ]);
    await normalizeArchiveFiles(stage, PACKAGE_FILES);

    await rm(output, { force: true });
    run(
      "zip",
      [
        "-X",
        "-q",
        output,
        ...PACKAGE_FILES,
      ],
      stage,
      { ...process.env, TZ: "UTC" },
    );

    const outputSize = await assertNonEmptyFile(output, "Edge package");
    console.log(`Edge release package: ${path.basename(output)} (${outputSize} bytes)`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

try {
  await packageEdge();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
