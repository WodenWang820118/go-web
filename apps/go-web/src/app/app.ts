import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GoI18nService } from '@gx/go/state';
import { GoLocaleSwitcherComponent } from './go-locale-switcher.component';

@Component({
  imports: [RouterOutlet, GoLocaleSwitcherComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly i18n = inject(GoI18nService);
}
