/** Development: ng serve :4300 + BuyMeAShake FastAPI :8000. */
export const environment = {
  production: false,
  useMock: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
  /**
   * Cloudflare Turnstile site key (Widget "local host" — same as Bder).
   * Empty = widget hidden / CAPTCHA disabled.
   */
  cloudflareTurnstileSiteKey: '0x4AAAAAAEwu6VJZ5Ua_uUuA',
};