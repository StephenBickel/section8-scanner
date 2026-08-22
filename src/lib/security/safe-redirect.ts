const FALLBACK_PATH = "/dashboard";

export function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return FALLBACK_PATH;
  }

  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return FALLBACK_PATH;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) {
      return FALLBACK_PATH;
    }
  } catch {
    return FALLBACK_PATH;
  }

  return value;
}
