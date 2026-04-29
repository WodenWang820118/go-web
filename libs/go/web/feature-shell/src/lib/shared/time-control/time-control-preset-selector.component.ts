import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  DEFAULT_GO_TIME_CONTROL_PRESET_ID,
  cloneTimeControlSettings,
  getOfficialGoTimeControlPreset,
  type TimeControlSettings,
} from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  buildTimeControlPresetGroups,
  findOfficialPresetForTimeControl,
  summarizeTimeControl,
} from './time-control-presentation';

@Component({
  selector: 'lib-go-time-control-preset-selector',
  standalone: true,
  template: `
    <fieldset
      class="space-y-2"
      data-testid="time-control-preset-selector"
      [class.text-xs]="compact()"
    >
      <label
        class="block text-sm font-semibold text-stone-100"
        [class.text-xs]="compact()"
        [attr.for]="controlId()"
      >
        {{ i18n.t('time_control.selector.legend') }}
      </label>

      <select
        class="w-full rounded-sm border border-white/10 bg-stone-950/70 px-3 py-2.5 text-sm text-stone-50 outline-none transition focus:border-amber-300/50 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="time-control-preset-select"
        [id]="controlId()"
        [name]="controlId()"
        [disabled]="disabled()"
        [value]="selectedPresetId()"
        (change)="selectPreset($event)"
      >
        @for (group of presetGroups(); track group.system) {
          <optgroup [label]="group.label">
            @for (option of group.options; track option.id) {
              <option [value]="option.id">
                {{ option.name }} - {{ option.summary }}
              </option>
            }
          </optgroup>
        }
      </select>

      <div
        class="space-y-1 rounded-sm border border-white/8 bg-white/[0.03] px-3 py-2"
        data-testid="time-control-preset-summary"
      >
        <p class="text-sm font-semibold text-stone-50">
          {{ selectedSummary() }}
        </p>
        @if (selectedPreset(); as preset) {
          <p class="text-xs leading-5 text-stone-400">
            {{ preset.name }} |
            {{ i18n.t('time_control.source', { source: preset.source }) }}
          </p>
        }
      </div>
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeControlPresetSelectorComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly selected = input.required<TimeControlSettings>();
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly controlId = input('go-time-control-preset');
  readonly selectionChange = output<TimeControlSettings>();

  protected readonly presetGroups = computed(() =>
    buildTimeControlPresetGroups(this.i18n),
  );
  protected readonly selectedPreset = computed(() =>
    findOfficialPresetForTimeControl(this.selected()),
  );
  protected readonly selectedPresetId = computed(
    () => this.selectedPreset()?.id ?? DEFAULT_GO_TIME_CONTROL_PRESET_ID,
  );
  protected readonly selectedSummary = computed(() =>
    summarizeTimeControl(this.selected(), this.i18n),
  );

  protected selectPreset(event: Event): void {
    if (this.disabled()) {
      return;
    }

    const presetId = (event.target as HTMLSelectElement).value;
    const preset = getOfficialGoTimeControlPreset(presetId);

    if (!preset) {
      return;
    }

    this.selectionChange.emit(cloneTimeControlSettings(preset.settings));
  }
}
