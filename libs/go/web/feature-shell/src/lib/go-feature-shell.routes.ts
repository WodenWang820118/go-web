import { Route } from '@angular/router';
import { activeMatchGuard, validModeGuard } from '@gx/go/state/guards';
import { onlineRoomLeaveGuard } from './online/room/guards/online-room-leave.guard';

export const goFeatureShellRoutes: Route[] = [
  {
    path: '',
    async loadComponent() {
      return (await import('./online/lobby/online-lobby-page/online-lobby-page.component')).OnlineLobbyPageComponent;
    },
  },
  {
    path: 'setup/:mode',
    async loadComponent() {
      return (await import('./pages/setup-page/setup-page.component')).SetupPageComponent;
    },
    canActivate: [validModeGuard],
  },
  {
    path: 'online',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'online/new',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'online/room/:roomId',
    async loadComponent() {
      const m = await import('./online/room/pages/online-room-page/online-room-page.component');
      return m.OnlineRoomPageComponent;
    },
    canDeactivate: [onlineRoomLeaveGuard],
  },
  {
    path: 'play/:mode',
    async loadComponent() {
      const m = await import('./pages/play-page/play-page.component');
      return m.PlayPageComponent;
    },
    canActivate: [validModeGuard, activeMatchGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
