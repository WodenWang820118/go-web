import { computed, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { GoI18nService } from '@gx/go/state/i18n';
import { filter, map } from 'rxjs';
import { GoLocaleSwitcherComponent } from './go-locale-switcher/go-locale-switcher.component';

@Component({
  imports: [RouterOutlet, GoLocaleSwitcherComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly i18n = inject(GoI18nService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );
  protected readonly showLocaleSwitcher = computed(() => {
    const primarySegments =
      this.router.parseUrl(this.currentUrl()).root.children['primary']?.segments ?? [];

    return primarySegments.length === 0;
  });
}
