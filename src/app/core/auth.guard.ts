import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() || auth.getAccessToken()) {
    if (!auth.isAuthenticated() && auth.getAccessToken()) {
      auth.isAuthenticated.set(true);
    }
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

/** Evita abrir login/register si ya hay sesión activa. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated() && !auth.getAccessToken()) {
    return true;
  }

  if (auth.currentUser()) {
    return router.createUrlTree([auth.getDefaultRoute()]);
  }

  if (!auth.getAccessToken()) {
    return true;
  }

  return auth.loadMe().pipe(
    map(() => router.createUrlTree([auth.getDefaultRoute()])),
    catchError(() => {
      auth.clearSession(false);
      return of(true);
    })
  );
};

export const athleteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated() && !auth.getAccessToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  const user = auth.currentUser();
  if (user?.role === 'athlete') {
    if (user.athlete_handle) {
      return true;
    }
    return router.createUrlTree(['/onboarding']);
  }

  return router.createUrlTree(['/supporter/home']);
};

export const supporterGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated() && !auth.getAccessToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  const user = auth.currentUser();
  if (user?.role === 'athlete') {
    return router.createUrlTree([user.athlete_handle ? '/dashboard/home' : '/onboarding']);
  }

  return true;
};

export const onboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated() && !auth.getAccessToken()) {
    return router.createUrlTree(['/auth/login']);
  }

  const user = auth.currentUser();
  if (user?.role !== 'athlete') {
    return router.createUrlTree(['/supporter/home']);
  }

  if (user.athlete_handle) {
    return router.createUrlTree(['/dashboard/home']);
  }

  return true;
};
