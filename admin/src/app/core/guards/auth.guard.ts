import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().pipe(
    take(1),
    map((user) => {
      if (auth.isAuthenticated() && user && auth.isAdmin()) {
        return true;
      }
      void router.navigate(['/login']);
      return false;
    }),
  );
};
