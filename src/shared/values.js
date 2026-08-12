export function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function safeHttpUrl(value, baseUrl = globalThis.location?.href) {
  const raw = stringValue(value);
  if (!raw) return "";

  try {
    const url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
