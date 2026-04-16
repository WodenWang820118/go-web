import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomSidebarRematchStatusViewModel } from '../../online-room-sidebar.models';

@Component({
  selector: 'lib-go-online-room-sidebar-rematch-panel',
  standalone: true,
  imports: [ButtonModule, TagModule],
  template: `
    <section
      class="go-hosted-panel-dark-soft space-y-3 p-4"
      data-testid="room-sidebar-rematch"
    >
      <p class="go-hosted-eyebrow-muted">
        {{ i18n.t('room.rematch.eyebrow') }}
      </p>
      <h2 class="text-xl font-semibold text-stone-50">
        {{ i18n.t('room.rematch.title') }}
      </h2>
      <p class="text-sm leading-6 text-stone-300/80">
        {{
          canRespondToRematch()
            ? i18n.t('room.rematch.description.player')
            : i18n.t('room.rematch.description.spectator')
        }}
      </p>

      <div class="grid gap-2">
        @for (status of rematchStatuses(); track status.color) {
          <div
            class="flex items-center justify-between gap-3 rounded-[1rem] bg-white/5 px-3 py-2.5"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-stone-50">
                {{ status.name }}
              </p>
              <p class="text-xs uppercase tracking-[0.16em] text-stone-400">
                {{ i18n.playerLabel(status.color) }}
              </p>
            </div>
            <p-tag
              severity="contrast"
              [rounded]="true"
              [value]="i18n.t('room.rematch.response.' + status.response)"
              styleClass="go-hosted-pill-subtle"
            />
          </div>
        }
      </div>

      @if (canRespondToRematch()) {
        <div class="grid gap-2 sm:grid-cols-2">
          <button
            pButton
            type="button"
            class="go-hosted-button-primary justify-center"
            (click)="acceptRematchRequested.emit()"
          >
            {{ i18n.t('room.rematch.accept') }}
          </button>
          <button
            pButton
            type="button"
            class="go-hosted-button-secondary justify-center"
            (click)="declineRematchRequested.emit()"
          >
            {{ i18n.t('room.rematch.decline') }}
          </button>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarRematchPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly canRespondToRematch = input.required<boolean>();
  readonly rematchStatuses =
    input.required<readonly OnlineRoomSidebarRematchStatusViewModel[]>();

  readonly acceptRematchRequested = output<void>();
  readonly declineRematchRequested = output<void>();
}
