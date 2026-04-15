import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-stone-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex h-7 w-7 items-center justify-center rounded-full border text-[0.6rem] font-bold uppercase tracking-[0.24em]"
      [class.border-stone-900]="color() === 'black'"
      [class.bg-stone-950]="color() === 'black'"
      [class.text-stone-50]="color() === 'black'"
      [class.border-stone-300]="color() === 'white'"
      [class.bg-stone-50]="color() === 'white'"
      [class.text-stone-600]="color() === 'white'"
      [attr.aria-label]="label()"
    >
      {{ color() === 'black' ? 'B' : 'W' }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoneBadgeComponent {
  private readonly i18n = inject(GoI18nService);

  readonly color = input<PlayerColor>('black');
  readonly label = computed(() =>
    this.i18n.t('ui.stone_badge.aria', {
      player: this.i18n.playerLabel(this.color()),
    })
  );
}
