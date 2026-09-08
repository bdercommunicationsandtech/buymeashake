/** Development: ng serve :4300 + BuyMeAShake FastAPI :8000. */
export const environment = {
  production: false,
  useMock: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
  /** Empty = Turnstile disabled. */
  cloudflareTurnstileSiteKey: '',
};
