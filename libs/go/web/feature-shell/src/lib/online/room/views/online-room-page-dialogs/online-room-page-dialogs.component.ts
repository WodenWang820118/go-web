import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomDialogComponent } from '../../components/online-room-dialog/online-room-dialog.component';
import { OnlineRoomSidebarRematchStatusViewModel } from '../../contracts/online-room-view.contracts';

@Component({
  selector: 'lib-go-online-room-page-dialogs',
  standalone: true,
  imports: [ButtonModule, TagModule, OnlineRoomDialogComponent],
  template: `
    <lib-go-online-room-dialog
      [visible]="autoStartVisible()"
      [title]="i18n.t('room.dialog.auto_start.title')"
      [width]="'min(32rem, calc(100vw - 2rem))'"
      [closeAriaLabel]="i18n.t('common.action.close')"
      (visibleChange)="onAutoStartVisibleChange($event)"
    >
      <div class="space-y-4" data-testid="room-auto-start-dialog">
        <p
          class="text-sm leading-7 text-surface-700"
          data-testid="room-auto-start-dialog-message"
        >
          {{ autoStartMessage() }}
        </p>
      </div>

      <div dialog-footer class="flex justify-end">
        <button
          pButton
          type="button"
          class="go-hosted-button-primary justify-center"
          data-testid="room-auto-start-dialog-close"
          (click)="autoStartDismissed.emit()"
        >
          {{ i18n.t('common.action.close') }}
        </button>
      </div>
    </lib-go-online-room-dialog>

    <lib-go-online-room-dialog
      [visible]="rematchVisible()"
      [title]="i18n.t('room.rematch.title')"
      [width]="'min(36rem, calc(100vw - 2rem))'"
      [dismissableMask]="!canRespondToRematch()"
      [closable]="!canRespondToRematch()"
      [closeAriaLabel]="i18n.t('common.action.close')"
      (visibleChange)="onRematchVisibleChange($event)"
    >
      <div class="space-y-4" data-testid="room-rematch-dialog">
        <p class="text-sm leading-7 text-surface-700">
          {{
            canRespondToRematch()
              ? i18n.t('room.rematch.description.player')
              : i18n.t('room.rematch.description.spectator')
          }}
        </p>

        <div class="grid gap-2">
          @for (status of rematchStatuses(); track status.color) {
            <div
              class="flex items-center justify-between gap-3 rounded-[1rem] border border-surface-200 bg-surface-50 px-3 py-2.5"
              [attr.data-testid]="'room-rematch-dialog-status-' + status.color"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-surface-900">
                  {{ status.name }}
                </p>
                <p class="text-xs uppercase tracking-[0.16em] text-surface-500">
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
      </div>

      <div dialog-footer class="flex flex-wrap justify-end gap-2">
        @if (canRespondToRematch()) {
          <button
            pButton
            type="button"
            class="go-hosted-button-secondary justify-center"
            data-testid="room-rematch-dialog-decline"
            (click)="rematchDeclined.emit()"
          >
            {{ i18n.t('room.rematch.decline') }}
          </button>
          <button
            pButton
            type="button"
            class="go-hosted-button-primary justify-center"
            data-testid="room-rematch-dialog-accept"
            (click)="rematchAccepted.emit()"
          >
            {{ i18n.t('room.rematch.accept') }}
          </button>
        } @else {
          <button
            pButton
            type="button"
            class="go-hosted-button-primary justify-center"
            data-testid="room-rematch-dialog-close"
            (click)="rematchDismissed.emit()"
          >
            {{ i18n.t('common.action.close') }}
          </button>
        }
      </div>
    </lib-go-online-room-dialog>

    <lib-go-online-room-dialog
      [visible]="resignVisible()"
      [title]="i18n.t('room.dialog.match_result.title')"
      [width]="'min(32rem, calc(100vw - 2rem))'"
      [closeAriaLabel]="i18n.t('common.action.close')"
      (visibleChange)="onResignVisibleChange($event)"
    >
      <div class="space-y-4" data-testid="room-resign-result-dialog">
        <p
          class="text-sm leading-7 text-surface-700"
          data-testid="room-resign-result-dialog-message"
        >
          {{ resignMessage() }}
        </p>
      </div>

      <div dialog-footer class="flex justify-end">
        <button
          pButton
          type="button"
          class="go-hosted-button-primary justify-center"
          data-testid="room-resign-result-dialog-close"
          (click)="resignDismissed.emit()"
        >
          {{ i18n.t('common.action.close') }}
        </button>
      </div>
    </lib-go-online-room-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomPageDialogsComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly autoStartVisible = input.required<boolean>();
  readonly autoStartMessage = input<string | null>(null);
  readonly rematchVisible = input.required<boolean>();
  readonly canRespondToRematch = input.required<boolean>();
  readonly rematchStatuses =
    input.required<readonly OnlineRoomSidebarRematchStatusViewModel[]>();
  readonly resignVisible = input.required<boolean>();
  readonly resignMessage = input<string | null>(null);

  readonly autoStartDismissed = output<void>();
  readonly rematchDismissed = output<void>();
  readonly rematchAccepted = output<void>();
  readonly rematchDeclined = output<void>();
  readonly resignDismissed = output<void>();

  protected onAutoStartVisibleChange(visible: boolean): void {
    if (!visible) {
      this.autoStartDismissed.emit();
    }
  }

  protected onRematchVisibleChange(visible: boolean): void {
    if (!visible) {
      this.rematchDismissed.emit();
    }
  }

  protected onResignVisibleChange(visible: boolean): void {
    if (!visible) {
      this.resignDismissed.emit();
    }
  }
}
