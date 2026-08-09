#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSION_FILES = [
  "content.js",
  "icon.png",
  "jike-twitter-font.user.css",
  "jike-polish-page-bridge.js",
];
const DEMO_FILES = new Map([
  ["edge/demo/launcher.html", "edge-demo/launcher.html"],
  ["edge/demo/launcher.css", "edge-demo/launcher.css"],
  ["edge/demo/index.html", "edge-demo/index.html"],
  ["edge/demo/platform.css", "edge-demo/platform.css"],
  ["safari/JikePolish/JikePolish/Resources/Style.css", "edge-demo/style.css"],
  ["safari/JikePolish/JikePolish/Resources/Script.js", "edge-demo/script.js"],
]);
const PACKAGE_FILES = ["manifest.json", ...EXTENSION_FILES, ...DEMO_FILES.values()];
const ARCHIVE_MTIME = new Date("1980-01-01T00:00:00.000Z");

function run(command, args, cwd = ROOT, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(ROOT, file), "utf8"));
}

async function copyIntoStage(stage, source, destination = source) {
  const output = path.join(stage, destination);
  await mkdir(path.dirname(output), { recursive: true });
  await copyFile(path.join(ROOT, source), output);
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
    edgeManifest.action = {
      default_icon: {
        16: "icon.png",
        48: "icon.png",
        128: "icon.png",
      },
      default_title: "打开阅赏离线功能演示",
      default_popup: "edge-demo/launcher.html",
    };
    await writeFile(path.join(stage, "manifest.json"), `${JSON.stringify(edgeManifest, null, 2)}\n`);

    await Promise.all([
      ...EXTENSION_FILES.map((file) => copyIntoStage(stage, file)),
      ...[...DEMO_FILES].map(([source, destination]) => copyIntoStage(stage, source, destination)),
    ]);
    await Promise.all(PACKAGE_FILES.map(async (file) => {
      const stagedFile = path.join(stage, file);
      await chmod(stagedFile, 0o644);
      await utimes(stagedFile, ARCHIVE_MTIME, ARCHIVE_MTIME);
    }));

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

    const outputStat = await stat(output);
    if (!outputStat.isFile() || outputStat.size === 0) {
      throw new Error(`Edge package is empty: ${output}`);
    }
    console.log(`Edge release package: ${path.basename(output)} (${outputStat.size} bytes)`);
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
