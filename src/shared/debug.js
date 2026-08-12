const DEBUG = localStorage.getItem("JIKE_POLISH_DEBUG") === "1";

export function log(...args) {
  if (DEBUG) console.log("[jike-polish]", ...args);
}
