export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',
  // apiUrl: 'http://207.38.88.6/api/v1',
  /**
   * Cloudflare Turnstile site key (Widget "local host" — same as Bder).
   * Empty = CAPTCHA disabled on password login.
   */
  cloudflareTurnstileSiteKey: '0x4AAAAAAEwu6VJZ5Ua_uUuA',
  /**
   * Firebase web config (Console → Project settings → Your apps).
   * Leave apiKey empty to disable social login until configured.
   * Also enable Google + Apple providers under Authentication → Sign-in method.
   */
  firebase: {
  apiKey: "AIzaSyBEx2DITPsplizlZOEWWoIFnD37wcfrlCg",
  authDomain: "buymeashake.firebaseapp.com",
  projectId: "buymeashake",
  storageBucket: "buymeashake.firebasestorage.app",
  messagingSenderId: "525386549434",
  appId: "1:525386549434:web:13bf4fa62fb5d903991a83",
  measurementId: "G-VXT6VW8S69"
  },
};
