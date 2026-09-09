import { environment } from '../../environments/environment';

/** Origin of the API host (e.g. http://localhost:8000) derived from environment.apiUrl. */
function apiOrigin(): string {
  try {
    const api = new URL(environment.apiUrl);
    return api.origin;
  } catch {
    return '';
  }
}

/**
 * Resolve upload / static media paths so they load from the API host
 * instead of the Angular origin (required when apiUrl is absolute and
 * content stores relative `/static/...` paths).
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const origin = apiOrigin();
  if (!origin) return trimmed;

  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }

  return `${origin}/${trimmed}`;
}

export function isSafeMediaUrl(url: string): boolean {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return false;
  try {
    if (resolved.startsWith('data:') || resolved.startsWith('blob:')) return false;
    const parsed = new URL(resolved, apiOrigin() || 'https://example.invalid');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Rewrite img src and markdown image URLs inside post HTML/markdown to absolute API URLs. */
export function resolveMediaUrlsInContent(content: string): string {
  if (!content) return content;

  let next = content.replace(/<img\b([^>]*?)\bsrc=["']([^"']+)["']/gi, (_m, attrs: string, src: string) => {
    const resolved = resolveMediaUrl(src) || src;
    return `<img${attrs}src="${resolved}"`;
  });

  next = next.replace(/!\[([^\]]*)]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    const resolved = resolveMediaUrl(src) || src;
    return `![${alt}](${resolved})`;
  });

  return next;
}
