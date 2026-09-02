import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
// import { provideNgtRenderer } from 'angular-three/dom'; // prototipo 3D inactivo

function initializeAuth(auth: AuthService): () => Promise<void> {
  return () => {
    auth.initialize();

    if (!auth.getAccessToken()) {
      return Promise.resolve();
    }

    return firstValueFrom(
      auth.loadMe().pipe(
        catchError(() => {
          auth.clearSession(false);
          return of(null);
        })
      )
    ).then(() => undefined);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // provideNgtRenderer(), // prototipo 3D inactivo — reactivar junto con <app-shaker-3d>
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
