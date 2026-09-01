import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const isAuthEndpoint = (url: string): boolean =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq =
    token && !isAuthEndpoint(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        auth.clearSession(true);
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((tokens) => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          auth.clearSession(true);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
