import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import type { GameStartSettings } from '@gx/go/contracts';
import {
  DEFAULT_GO_TIME_CONTROL,
  cloneTimeControlSettings,
  type TimeControlSettings,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { TimeControlPresetSelectorComponent } from '../../../../../../shared/time-control/time-control-preset-selector.component';
import { summarizeTimeControl } from '../../../../../../shared/time-control/time-control-presentation';

@Component({
  selector: 'lib-go-online-room-sidebar-next-match-panel',
  standalone: true,
  imports: [TimeControlPresetSelectorComponent],
  template: `
    @if (settings(); as settings) {
      <section
        class="space-y-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-3"
        data-testid="room-next-match-panel"
      >
        <div class="space-y-1">
          <p
            class="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            {{ i18n.t('room.next_match.eyebrow') }}
          </p>
          <h2 class="text-sm font-semibold text-stone-50">
            {{ i18n.t('room.next_match.title') }}
          </h2>
          <p class="text-xs leading-5 text-stone-400">
            {{ i18n.t('room.next_match.description') }}
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt class="text-stone-500">
              {{ i18n.t('room.participants.mode') }}
            </dt>
            <dd class="mt-1 font-semibold text-stone-100">
              {{ modeLabel(settings) }}
            </dd>
          </div>
          <div>
            <dt class="text-stone-500">
              {{ i18n.t('room.participants.board_size') }}
            </dt>
            <dd class="mt-1 font-semibold text-stone-100">
              {{ settings.boardSize }} x {{ settings.boardSize }}
            </dd>
          </div>
        </dl>

        @if (settings.mode === 'go') {
          @if (isHost()) {
            <lib-go-time-control-preset-selector
              controlId="room-next-match-time-control"
              [compact]="true"
              [disabled]="!canEdit()"
              [selected]="timeControl()"
              (selectionChange)="updateTimeControl($event)"
            />

            @if (!realtimeConnected()) {
              <p
                class="rounded-sm border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50"
                data-testid="room-next-match-offline-lock"
              >
                {{ i18n.t('room.next_match.locked.offline') }}
              </p>
            } @else if (lockedReason()) {
              <p
                class="rounded-sm border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50"
                data-testid="room-next-match-lock-reason"
              >
                {{ lockedReason() }}
              </p>
            }
          } @else {
            <div
              class="space-y-1 rounded-sm border border-white/8 bg-white/[0.03] px-3 py-2"
              data-testid="room-next-match-readonly-time-control"
            >
              <p class="text-xs text-stone-500">
                {{ i18n.t('time_control.title') }}
              </p>
              <p class="text-sm font-semibold text-stone-100">
                {{ timeControlSummary() }}
              </p>
              <p class="text-xs leading-5 text-stone-400">
                {{ i18n.t('room.next_match.host_only') }}
              </p>
            </div>
          }
        } @else {
          <p
            class="rounded-sm border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-stone-400"
            data-testid="room-next-match-gomoku-time-control"
          >
            {{ i18n.t('time_control.not_available_gomoku') }}
          </p>
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarNextMatchPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly settings = input<GameStartSettings | null>(null);
  readonly isHost = input.required<boolean>();
  readonly canEdit = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly lockedReason = input<string | null>(null);
  readonly settingsChange = output<GameStartSettings>();

  protected readonly timeControl = computed(() => {
    const settings = this.settings();

    if (settings?.mode !== 'go') {
      return cloneTimeControlSettings(DEFAULT_GO_TIME_CONTROL);
    }

    return cloneTimeControlSettings(
      settings.timeControl ?? DEFAULT_GO_TIME_CONTROL,
    );
  });
  protected readonly timeControlSummary = computed(() =>
    summarizeTimeControl(this.timeControl(), this.i18n),
  );

  protected modeLabel(settings: GameStartSettings): string {
    return this.i18n.t(`common.mode.${settings.mode}`);
  }

  protected updateTimeControl(timeControl: TimeControlSettings): void {
    const settings = this.settings();

    if (!settings || settings.mode !== 'go' || !this.canEdit()) {
      return;
    }

    this.settingsChange.emit({
      ...settings,
      timeControl: cloneTimeControlSettings(timeControl),
    });
  }
}
