import { environment } from '../../../environments/environment';

/** Absolute origin of the API (e.g. http://localhost:8000). */
export function apiOrigin(): string {
  try {
    return new URL(environment.apiUrl).origin;
  } catch {
    return '';
  }
}

/**
 * Backend returns paths like `/static/uploads/...`. In local dev the SPA runs on
 * another origin (:4200), so those must be prefixed with the API host.
 * Absolute http(s)/data/blob URLs are left unchanged.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = apiOrigin();
  if (!origin) return trimmed;

  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

/** Rewrite `/static/...` (and other relative media) inside HTML for display. */
export function resolveMediaUrlsInHtml(html: string): string {
  if (!html) return html;
  return html.replace(
    /(src=["'])(\/[^"']+)(["'])/gi,
    (_match, prefix: string, path: string, suffix: string) => {
      const resolved = resolveMediaUrl(path);
      return `${prefix}${resolved ?? path}${suffix}`;
    },
  );
}
