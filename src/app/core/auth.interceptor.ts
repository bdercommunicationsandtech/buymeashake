import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  let authReq = req;
  if (token && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      // Solo limpiar token si es un endpoint protegido del dashboard
      const isDashboardRoute = req.url.includes('/dashboard/') || req.url.includes('/auth/me');
      if (error.status === 401 && isDashboardRoute) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
