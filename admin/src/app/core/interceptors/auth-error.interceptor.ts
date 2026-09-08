import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_ENDPOINTS } from '../config/api.config';

const UNAUTHORIZED_WHITELIST_PATHS = [API_ENDPOINTS.auth.adminLogin] as const;

function isWhitelistedUnauthorizedUrl(url: string): boolean {
  return UNAUTHORIZED_WHITELIST_PATHS.some((path) => url.includes(path));
}

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !isWhitelistedUnauthorizedUrl(req.url)
      ) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
