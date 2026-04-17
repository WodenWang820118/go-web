import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GoI18nService, GoLocale } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-locale-switcher',
  standalone: true,
  template: `
    <div
      class="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-white/10 p-1 text-stone-100"
      data-testid="locale-switcher"
      [attr.aria-label]="i18n.languageLabel()"
    >
      @for (locale of locales; track locale) {
        <button
          type="button"
          class="rounded-sm px-2.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] transition"
          [attr.data-testid]="'locale-option-' + locale"
          [class.bg-stone-50]="i18n.isActiveLocale(locale)"
          [class.text-slate-950]="i18n.isActiveLocale(locale)"
          [class.text-stone-200]="!i18n.isActiveLocale(locale)"
          [class.hover:bg-white/10]="!i18n.isActiveLocale(locale)"
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
