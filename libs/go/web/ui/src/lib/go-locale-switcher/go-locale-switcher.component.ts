import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { GO_LOCALE_OPTIONS, GoI18nService, GoLocale } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-locale-switcher',
  standalone: true,
  template: `
    <label
      class="inline-flex items-center rounded-sm border border-white/10 bg-white/10 px-2 py-1 text-stone-100"
      data-testid="locale-switcher"
    >
      <span class="sr-only">{{ i18n.languageLabel() }}</span>
      <select
        class="min-h-9 rounded-sm border-0 bg-transparent px-2 text-xs font-semibold text-stone-100 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-300"
        data-testid="locale-select"
        [attr.aria-label]="i18n.languageLabel()"
        [value]="i18n.locale()"
        (change)="selectLocale($event)"
      >
        @for (option of localeOptions; track option.locale) {
          <option
            class="bg-slate-950 text-stone-100"
            [attr.data-testid]="'locale-option-' + option.locale"
            [value]="option.locale"
          >
            {{ option.label }}
          </option>
        }
      </select>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoLocaleSwitcherComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly localeOptions = GO_LOCALE_OPTIONS;
  readonly localeChangeRequested = output<{
    locale: GoLocale;
    targetLocale: GoLocale;
  }>();

  protected selectLocale(event: Event): void {
    const targetLocale = (event.target as HTMLSelectElement).value as GoLocale;
    const locale = this.i18n.locale();

    if (locale !== targetLocale) {
      this.localeChangeRequested.emit({
        locale,
        targetLocale,
      });
    }

    this.i18n.setLocale(targetLocale);
  }
}
