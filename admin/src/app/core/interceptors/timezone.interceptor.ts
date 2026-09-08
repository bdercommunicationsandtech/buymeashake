import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TimezoneService } from '../services/timezone.service';

export const timezoneInterceptor: HttpInterceptorFn = (req, next) => {
  const timezone = inject(TimezoneService);
  const cloned = req.clone({
    setHeaders: {
      'X-Timezone': timezone.getTimezone(),
      'X-Timezone-Offset': timezone.getOffset().toString(),
    },
  });
  return next(cloned);
};
