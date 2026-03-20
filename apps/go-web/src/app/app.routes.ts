import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('@org/go/feature-shell').then(module => module.goFeatureShellRoutes),
  },
];
