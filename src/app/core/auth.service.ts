import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenResponse, UserLoginPayload, UserMe, UserRegisterPayload } from './api.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<UserMe | null>(null);
  readonly isAuthenticated = signal<boolean>(!!localStorage.getItem('access_token'));

  private refreshInProgress = false;
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'access_token' || event.key === 'refresh_token') {
        this.syncFromStorage();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncFromStorage();
      }
    });
  }

  syncFromStorage(): void {
    const hasToken = !!localStorage.getItem('access_token');
    if (!hasToken) {
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
      return;
    }

    this.isAuthenticated.set(true);
    if (!this.currentUser()) {
      this.loadMe().subscribe({ error: () => this.clearSession(false) });
    }
  }

  register(payload: UserRegisterPayload): Observable<UserMe> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap((res) => this.saveTokens(res)),
      switchMap(() => this.loadMe())
    );
  }

  login(payload: UserLoginPayload): Observable<UserMe> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => this.saveTokens(res)),
      switchMap(() => this.loadMe())
    );
  }

  loadMe(): Observable<UserMe> {
    return this.http.get<UserMe>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      })
    );
  }

  refreshAccessToken(): Observable<TokenResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    if (this.refreshInProgress) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((accessToken) => {
          const response: TokenResponse = {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'bearer',
            expires_in: 0,
          };
          return new Observable<TokenResponse>((subscriber) => {
            subscriber.next(response);
            subscriber.complete();
          });
        })
      );
    }

    this.refreshInProgress = true;
    this.refreshTokenSubject.next(null);

    return this.http.post<TokenResponse>(`${this.apiUrl}/refresh`, { refresh_token: refreshToken }).pipe(
      tap((res) => {
        this.saveTokens(res);
        this.refreshInProgress = false;
        this.refreshTokenSubject.next(res.access_token);
      }),
      catchError((err) => {
        this.refreshInProgress = false;
        this.refreshTokenSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  isAthlete(): boolean {
    const user = this.currentUser();
    return user?.role === 'athlete' && !!user?.athlete_handle;
  }

  getDefaultRoute(): string {
    const user = this.currentUser();
    if (!user) {
      return '/';
    }
    if (user.role === 'athlete') {
      return user.athlete_handle ? '/dashboard/home' : '/onboarding';
    }
    return '/supporter/home';
  }

  logout(): void {
    this.clearSession(true);
  }

  clearSession(navigateToLogin = true): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.refreshInProgress = false;
    this.refreshTokenSubject.next(null);

    if (navigateToLogin) {
      this.router.navigate(['/auth/login']);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private saveTokens(tokens: TokenResponse): void {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    this.isAuthenticated.set(true);
  }
}
