import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError, switchMap, map } from 'rxjs';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import type { LoginRequest, LoginResponse, CurrentUser } from '../../shared/models/auth.model';
import { hasAdminAccess } from '../constants/roles';

const TOKEN_KEY = 'bms_admin_token';
const USER_KEY = 'bms_admin_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(this.getStoredToken());
  private readonly currentUser = signal<CurrentUser | null>(this.getStoredUser());

  readonly isAuthenticated = computed(() => !!this.token());
  readonly user = computed(() => this.currentUser());
  readonly isAdmin = computed(() => {
    const u = this.currentUser();
    if (u?.is_admin) return true;
    return u?.roles ? hasAdminAccess(u.roles) : false;
  });
  /** Alias for leftover Buyer1 guards (same as isAdmin in BMS). */
  readonly isSuperOrAdmin = this.isAdmin;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.auth.adminLogin}`;
    return this.http.post<LoginResponse>(url, credentials).pipe(
      switchMap((res) => {
        this.setToken(res.access_token);
        return this.loadMe().pipe(map(() => res));
      }),
    );
  }

  loadMe(): Observable<CurrentUser> {
    const url = `${API_CONFIG.baseUrl}${API_ENDPOINTS.auth.me}`;
    return this.http.get<CurrentUser>(url).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.setStoredUser(user);
      }),
      catchError((err) => {
        this.clearSession(false);
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    this.clearSession(true);
  }

  getToken(): string | null {
    return this.token();
  }

  private setToken(accessToken: string): void {
    this.token.set(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setStoredUser(user: CurrentUser): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  private getStoredUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }

  private clearSession(navigateToLogin: boolean): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (navigateToLogin) {
      void this.router.navigate(['/login']);
    }
  }

  /** Restore session from stored token (e.g. after page refresh). */
  restoreSession(): Observable<CurrentUser | null> {
    const t = this.getStoredToken();
    if (!t) {
      this.token.set(null);
      this.currentUser.set(null);
      return of(null);
    }
    this.token.set(t);
    return this.loadMe().pipe(
      catchError(() => {
        this.token.set(null);
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }
}
