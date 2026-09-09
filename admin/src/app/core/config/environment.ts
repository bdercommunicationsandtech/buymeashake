/** Development: ng serve :4300 + BuyMeAShake FastAPI :8000. */
export const environment = {
  production: false,
  useMock: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
  /** Cloudflare Turnstile Site Key. '1x00000000000000000000AA' is Cloudflare's always-passing test key for dev. */
  cloudflareTurnstileSiteKey: '1x00000000000000000000AA',
};
