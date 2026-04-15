import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { GameMode } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';

type OnlineRoomSettingsFormGroup = FormGroup<{
  mode: FormControl<GameMode>;
  boardSize: FormControl<number>;
}>;

@Component({
  selector: 'lib-go-online-room-next-match-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section
      class="rounded-[1.35rem] border border-white/10 bg-slate-950/84 p-4 text-stone-100 shadow-xl shadow-slate-950/20"
      data-testid="room-next-match-panel"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
        {{ i18n.t('room.next_match.eyebrow') }}
      </p>
      <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold text-stone-50">
            {{ i18n.t('room.next_match.title') }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-stone-300">
            {{ i18n.t('room.next_match.description') }}
          </p>
        </div>

        <div
          class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-300"
          data-testid="room-next-match-summary"
        >
          {{ i18n.t('common.mode.' + settingsForm().controls.mode.value) }}
          ·
          {{ settingsForm().controls.boardSize.value }} x {{ settingsForm().controls.boardSize.value }}
        </div>
      </div>

      @if (isHost()) {
        @if (canEditNextMatchSettings()) {
          <form
            class="mt-4 space-y-4"
            data-testid="room-next-match-form"
            [formGroup]="settingsForm()"
            (ngSubmit)="settingsSavedRequested.emit()"
          >
            <label
              [for]="settingsModeSelectId"
              class="block space-y-2 text-sm font-medium text-stone-200"
            >
              <span>{{ i18n.t('room.participants.mode') }}</span>
            </label>
            <select
              [id]="settingsModeSelectId"
              formControlName="mode"
              class="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
            >
              <option value="go">{{ i18n.t('common.mode.go') }}</option>
              <option value="gomoku">{{ i18n.t('common.mode.gomoku') }}</option>
            </select>

            <label
              [for]="settingsBoardSizeSelectId"
              class="block space-y-2 text-sm font-medium text-stone-200"
            >
              <span>{{ i18n.t('room.participants.board_size') }}</span>
            </label>
            <select
              [id]="settingsBoardSizeSelectId"
              formControlName="boardSize"
              class="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-300/50"
            >
              @for (size of boardSizeOptions(); track size) {
                <option [value]="size">{{ size }} x {{ size }}</option>
              }
            </select>

            <button
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="save-next-match-settings"
              [disabled]="!realtimeConnected()"
            >
              {{ i18n.t('room.next_match.save') }}
            </button>
          </form>
        } @else if (settingsLockedMessage()) {
          <p class="mt-4 text-sm leading-6 text-stone-300">
            {{ settingsLockedMessage() }}
          </p>
        }
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomNextMatchPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly settingsForm = input.required<OnlineRoomSettingsFormGroup>();
  readonly boardSizeOptions = input.required<readonly number[]>();
  readonly isHost = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly canEditNextMatchSettings = input.required<boolean>();
  readonly settingsLockedMessage = input<string | null>(null);

  readonly settingsSavedRequested = output<void>();

  protected readonly settingsModeSelectId = 'room-settings-mode';
  protected readonly settingsBoardSizeSelectId = 'room-settings-board-size';
}
