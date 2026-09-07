import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  OAuthProvider,
  UserCredential,
  getAuth,
  signInWithPopup,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

export type SocialProvider = 'google' | 'apple';

@Injectable({
  providedIn: 'root',
})
export class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;

  isConfigured(): boolean {
    const cfg = environment.firebase;
    return !!(cfg?.apiKey && cfg?.authDomain && cfg?.projectId && cfg?.appId);
  }

  async signInWithGoogle(): Promise<string> {
    return this.signInWithProvider('google');
  }

  async signInWithApple(): Promise<string> {
    return this.signInWithProvider('apple');
  }

  private async signInWithProvider(provider: SocialProvider): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('FIREBASE_NOT_CONFIGURED');
    }

    const auth = this.getAuthInstance();
    const credential = await signInWithPopup(auth, this.buildProvider(provider));
    return this.getIdToken(credential);
  }

  private buildProvider(provider: SocialProvider): GoogleAuthProvider | OAuthProvider {
    if (provider === 'google') {
      const google = new GoogleAuthProvider();
      google.setCustomParameters({ prompt: 'select_account' });
      google.addScope('email');
      google.addScope('profile');
      return google;
    }

    const apple = new OAuthProvider('apple.com');
    apple.addScope('email');
    apple.addScope('name');
    return apple;
  }

  private getAuthInstance(): Auth {
    if (this.auth) {
      return this.auth;
    }

    const existing = getApps();
    this.app = existing.length ? existing[0]! : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    return this.auth;
  }

  private async getIdToken(credential: UserCredential): Promise<string> {
    const idToken = await credential.user.getIdToken();
    if (!idToken) {
      throw new Error('FIREBASE_NO_ID_TOKEN');
    }
    return idToken;
  }
}
