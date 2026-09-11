/** Production: reverse-proxy /api/v1. */
export const environment = {
  production: true,
  useMock: false,
  apiBaseUrl: 'https://buymeashake.fit/api/v1',
  /** Cloudflare Turnstile site key (same widget as local / Bder). */
  cloudflareTurnstileSiteKey: '0x4AAAAAAEwu6VJZ5Ua_uUuA',
};
