import { API_CONFIG } from '../config/api.config';

/** Absolute origin of the API (e.g. http://localhost:8000). */
export function apiOrigin(): string {
  return API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, '');
}

/**
 * Backend returns paths like `/static/uploads/...`. In local dev the SPA runs on
 * another origin, so those must be prefixed with the API host.
 * Absolute http(s)/data/blob URLs are left unchanged.
 */
export function mediaUrl(url: string | null | undefined): string {
  if (url == null) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = apiOrigin();
  if (!origin) return trimmed;

  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
