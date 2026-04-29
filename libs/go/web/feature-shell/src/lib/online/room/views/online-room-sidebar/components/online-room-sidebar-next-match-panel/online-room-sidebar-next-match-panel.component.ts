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
  DEFAULT_GO_RULE_OPTIONS,
  DEFAULT_GO_TIME_CONTROL,
  GO_KO_RULES,
  GO_SCORING_RULES,
  cloneTimeControlSettings,
  resolveGoRuleOptions,
  type GoKoRule,
  type GoScoringRule,
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
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <fieldset
                class="space-y-2"
                data-testid="room-next-match-ko-rule-fieldset"
                [disabled]="!canEdit()"
              >
                <legend class="text-xs font-semibold text-stone-400">
                  {{ i18n.t('go_rules.ko_rule.title') }}
                </legend>
                <div class="grid gap-2">
                  @for (option of koRuleOptions; track option) {
                    <label
                      class="flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-stone-100 transition has-[:checked]:border-amber-300/40 has-[:checked]:bg-amber-300/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                    >
                      <input
                        type="radio"
                        class="h-3.5 w-3.5 accent-amber-300"
                        name="room-next-match-ko-rule"
                        [checked]="goRules().koRule === option"
                        [disabled]="!canEdit()"
                        [attr.data-testid]="'room-next-match-ko-rule-' + option"
                        (change)="updateKoRule(option)"
                      />
                      <span>{{ koRuleLabel(option) }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <fieldset
                class="space-y-2"
                data-testid="room-next-match-scoring-rule-fieldset"
                [disabled]="!canEdit()"
              >
                <legend class="text-xs font-semibold text-stone-400">
                  {{ i18n.t('go_rules.scoring_rule.title') }}
                </legend>
                <div class="grid gap-2">
                  @for (option of scoringRuleOptions; track option) {
                    <label
                      class="flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-stone-100 transition has-[:checked]:border-amber-300/40 has-[:checked]:bg-amber-300/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                    >
                      <input
                        type="radio"
                        class="h-3.5 w-3.5 accent-amber-300"
                        name="room-next-match-scoring-rule"
                        [checked]="goRules().scoringRule === option"
                        [disabled]="!canEdit()"
                        [attr.data-testid]="
                          'room-next-match-scoring-rule-' + option
                        "
                        (change)="updateScoringRule(option)"
                      />
                      <span>{{ scoringRuleLabel(option) }}</span>
                    </label>
                  }
                </div>
              </fieldset>
            </div>

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
              <p
                class="text-sm font-semibold text-stone-100"
                data-testid="room-next-match-readonly-go-rules"
              >
                {{ goRulesSummary() }}
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
  protected readonly koRuleOptions = GO_KO_RULES;
  protected readonly scoringRuleOptions = GO_SCORING_RULES;

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
  protected readonly goRules = computed(() => {
    const settings = this.settings();

    if (settings?.mode !== 'go') {
      return DEFAULT_GO_RULE_OPTIONS;
    }

    return resolveGoRuleOptions(settings);
  });
  protected readonly goRulesSummary = computed(
    () =>
      `${this.koRuleLabel(this.goRules().koRule)} | ${this.scoringRuleLabel(
        this.goRules().scoringRule,
      )}`,
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

  protected updateKoRule(koRule: GoKoRule): void {
    const settings = this.settings();

    if (!settings || settings.mode !== 'go' || !this.canEdit()) {
      return;
    }

    this.settingsChange.emit({
      ...settings,
      goRules: {
        ...this.goRules(),
        koRule,
      },
    });
  }

  protected updateScoringRule(scoringRule: GoScoringRule): void {
    const settings = this.settings();

    if (!settings || settings.mode !== 'go' || !this.canEdit()) {
      return;
    }

    this.settingsChange.emit({
      ...settings,
      goRules: {
        ...this.goRules(),
        scoringRule,
      },
    });
  }

  protected koRuleLabel(rule: GoKoRule): string {
    return this.i18n.t(`go_rules.ko_rule.${rule.replace('-', '_')}`);
  }

  protected scoringRuleLabel(rule: GoScoringRule): string {
    return this.i18n.t(`go_rules.scoring_rule.${rule.replace('-', '_')}`);
  }
}
