import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GoI18nService, GoLocale } from '@gx/go/state';

@Component({
  selector: 'app-go-locale-switcher',
  standalone: true,
  template: `
    <div
      class="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/90 p-2 shadow-lg shadow-stone-950/10 backdrop-blur sm:right-6 sm:top-6"
      data-testid="locale-switcher"
      [attr.aria-label]="i18n.languageLabel()"
    >
      @for (locale of locales; track locale) {
        <button
          type="button"
          class="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition"
          [attr.data-testid]="'locale-option-' + locale"
          [class.bg-stone-950]="i18n.isActiveLocale(locale)"
          [class.text-stone-50]="i18n.isActiveLocale(locale)"
          [class.text-stone-700]="!i18n.isActiveLocale(locale)"
          [class.hover:bg-stone-100]="!i18n.isActiveLocale(locale)"
          (click)="i18n.setLocale(locale)"
        >
          {{ i18n.localeOptionLabel(locale) }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoLocaleSwitcherComponent {
  protected readonly i18n = inject(GoI18nService);
  protected readonly locales: GoLocale[] = ['zh-TW', 'en'];
}
