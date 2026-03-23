import { Route } from '@angular/router';
import { activeMatchGuard, validModeGuard } from '@gx/go/state';

export const goFeatureShellRoutes: Route[] = [
  {
    path: '',
    async loadComponent() {
      return (await import('./pages/online-create-page.component')).OnlineCreatePageComponent;
    },
  },
  {
    path: 'setup/:mode',
    async loadComponent() {
      return (await import('./pages/setup-page.component')).SetupPageComponent;
    },
    canActivate: [validModeGuard],
  },
  {
    path: 'online',
    async loadComponent() {
      return (await import('./pages/online-lobby-page.component')).OnlineLobbyPageComponent;
    },
  },
  {
    path: 'online/new',
    redirectTo: 'online',
    pathMatch: 'full',
  },
  {
    path: 'online/room/:roomId',
    async loadComponent() {
      const m = await import('./pages/online-room-page.component');
      return m.OnlineRoomPageComponent;
    }
  },
  {
    path: 'play/:mode',
    async loadComponent() {
      const m = await import('./pages/play-page.component');
      return m.PlayPageComponent;
    },
    canActivate: [validModeGuard, activeMatchGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
