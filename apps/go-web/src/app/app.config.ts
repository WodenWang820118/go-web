import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { GO_SERVER_ORIGIN, GoServerOriginResolverService } from '@gx/go/state/server-origin';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    {
      provide: GO_SERVER_ORIGIN,
      useFactory: () => inject(GoServerOriginResolverService).resolveOrigin(),
    },
    provideHttpClient(),
    provideRouter(appRoutes),
  ],
};
