import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LanguageService } from './language.service';

export const acceptLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  const lang = inject(LanguageService).lang();
  return next(
    req.clone({
      setHeaders: { 'Accept-Language': lang },
    })
  );
};
