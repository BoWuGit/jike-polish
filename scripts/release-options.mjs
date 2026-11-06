import { parseArgs } from "node:util";

/** Keep submission confirmation and supported flags consistent across stores. */
export function parseReleaseOptions(args, { modes = ["package", "upload", "submit"], allowNewListing = false } = {}) {
  const { values } = parseArgs({
    args,
    options: {
      mode: { type: "string", default: "package" },
      confirm: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      ...(allowNewListing ? { "allow-new-listing": { type: "boolean", default: false } } : {}),
    },
  });

  if (!modes.includes(values.mode)) {
    throw new Error(`--mode must be ${modes.join(", ")}.`);
  }
  if (values.mode === "submit" && !values.confirm && !values["dry-run"] && !values.help) {
    throw new Error("--mode submit requires --confirm.");
  }
  return {
    mode: values.mode,
    confirm: values.confirm,
    dryRun: values["dry-run"],
    help: values.help,
    ...(allowNewListing ? { allowNewListing: values["allow-new-listing"] } : {}),
  };
}
