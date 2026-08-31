import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
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

  register(payload: UserRegisterPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap((res) => {
        this.saveTokens(res);
        this.loadMe().subscribe();
      })
    );
  }

  login(payload: UserLoginPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => {
        this.saveTokens(res);
        this.loadMe().subscribe();
      })
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

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  private saveTokens(tokens: TokenResponse): void {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    this.isAuthenticated.set(true);
  }
}
