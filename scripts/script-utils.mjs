import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  stat,
  utimes,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ARCHIVE_MTIME = new Date("1980-01-01T00:00:00.000Z");

export function run(command, args, { cwd = ROOT, env = process.env, silent = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: silent ? "ignore" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed.`);
}

export async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

export async function copyProjectFile(directory, source, destination = source) {
  const output = path.join(directory, destination);
  await mkdir(path.dirname(output), { recursive: true });
  await copyFile(path.join(ROOT, source), output);
}

export async function normalizeArchiveFiles(directory, files) {
  await Promise.all(files.map(async (file) => {
    const stagedFile = path.join(directory, file);
    await chmod(stagedFile, 0o644);
    await utimes(stagedFile, ARCHIVE_MTIME, ARCHIVE_MTIME);
  }));
}

export async function assertNonEmptyFile(file, label) {
  const fileStat = await stat(file);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`${label} is empty: ${file}`);
  }
  return fileStat.size;
}

export function assertCleanGit(errorMessage) {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.status !== 0) throw new Error("Could not verify Git status.");
  if (result.stdout.trim()) throw new Error(errorMessage);
}
