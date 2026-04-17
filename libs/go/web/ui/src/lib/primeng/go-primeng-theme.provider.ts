import { EnvironmentProviders } from '@angular/core';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

export function provideGoPrimeNGTheme(): EnvironmentProviders {
  return providePrimeNG({
    theme: {
      preset: Aura,
    },
  });
}
