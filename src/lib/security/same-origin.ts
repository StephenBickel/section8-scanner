/** Next can expose an internal localhost URL while Host retains the public host. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Non-browser callers still have to authenticate; they need not send Origin.
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host = request.headers.get("host") ?? new URL(request.url).host;
    const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return parsed.host === host && parsed.protocol === `${protocol}:` && parsed.origin === origin;
  } catch { return false; }
}
