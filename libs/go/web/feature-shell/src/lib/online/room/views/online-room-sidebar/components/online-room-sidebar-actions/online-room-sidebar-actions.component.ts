import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { HostedMatchSnapshot } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';

@Component({
  selector: 'lib-go-online-room-sidebar-actions',
  standalone: true,
  imports: [ButtonModule],
  host: {
    class: 'block mt-auto',
  },
  template: `
    <section data-testid="room-sidebar-actions">
      <div class="grid gap-2 md:grid-cols-3">
        @if (showMatchActions()) {
          <button
            pButton
            type="button"
            class="go-hosted-button-secondary justify-center"
            [disabled]="!canPass() || !realtimeConnected()"
            (click)="passRequested.emit()"
          >
            {{ i18n.t('common.move.pass') }}
          </button>
          <button
            pButton
            type="button"
            class="go-hosted-button-secondary justify-center"
            [disabled]="!canResign() || !realtimeConnected()"
            (click)="resignRequested.emit()"
          >
            {{ i18n.t('common.move.resign') }}
          </button>
        }

        <button
          pButton
          type="button"
          class="go-hosted-button-secondary justify-center md:col-span-1"
          data-testid="room-back-to-lobby"
          (click)="backToLobbyRequested.emit()"
        >
          {{ i18n.t('room.page.back_to_lobby') }}
        </button>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarActionsComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly canPass = input.required<boolean>();
  readonly canResign = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();

  readonly backToLobbyRequested = output<void>();
  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();

  protected readonly showMatchActions = computed(() => {
    const match = this.match();
    return !!match && match.state.phase !== 'finished';
  });
}
