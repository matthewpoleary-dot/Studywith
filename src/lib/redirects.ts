/**
 * Returns `value` only if it is a same-origin path, otherwise `fallback`.
 * Rejects protocol-relative URLs such as `//evil.example` and `/\evil.example`,
 * which browsers treat as absolute URLs to another host.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
