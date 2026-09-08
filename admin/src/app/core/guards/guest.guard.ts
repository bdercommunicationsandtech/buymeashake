import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.getToken()) {
    return true;
  }
  return auth.restoreSession().pipe(
    take(1),
    map(() => {
      if (auth.isAdmin()) {
        void router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }),
  );
};
