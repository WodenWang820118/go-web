import { Route } from '@angular/router';
import { activeMatchGuard, validModeGuard } from '@org/go/state';
import { LandingPageComponent } from './pages/landing-page.component';
import { OnlineCreatePageComponent } from './pages/online-create-page.component';
import { OnlineRoomPageComponent } from './pages/online-room-page.component';
import { PlayPageComponent } from './pages/play-page.component';
import { SetupPageComponent } from './pages/setup-page.component';

export const goFeatureShellRoutes: Route[] = [
  {
    path: '',
    component: LandingPageComponent,
  },
  {
    path: 'setup/:mode',
    component: SetupPageComponent,
    canActivate: [validModeGuard],
  },
  {
    path: 'online/new',
    component: OnlineCreatePageComponent,
  },
  {
    path: 'online/room/:roomId',
    component: OnlineRoomPageComponent,
  },
  {
    path: 'play/:mode',
    component: PlayPageComponent,
    canActivate: [validModeGuard, activeMatchGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
