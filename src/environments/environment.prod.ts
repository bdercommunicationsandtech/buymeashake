export const environment = {
  production: true,
  apiUrl: 'https://buymeashake.fit/api/v1',
  /** Cloudflare Turnstile site key (same widget as local / Bder). */
  cloudflareTurnstileSiteKey: '0x4AAAAAAEwu6VJZ5Ua_uUuA',
  /**
   * Firebase web config (Console → Project settings → Your apps).
   * Same project as development unless you use a separate Firebase app for prod.
   */
  firebase: {
    apiKey: 'AIzaSyBEx2DITPsplizlZOEWWoIFnD37wcfrlCg',
    authDomain: 'buymeashake.firebaseapp.com',
    projectId: 'buymeashake',
    storageBucket: 'buymeashake.firebasestorage.app',
    messagingSenderId: '525386549434',
    appId: '1:525386549434:web:13bf4fa62fb5d903991a83',
    measurementId: 'G-VXT6VW8S69',
  },
};
