import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomJoinFormGroup } from '../../online-room-sidebar.models';

@Component({
  selector: 'lib-go-online-room-sidebar-identity-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule],
  template: `
    <section
      class="go-hosted-panel-dark-soft space-y-3 p-4"
      data-testid="room-sidebar-identity"
    >
      <p class="go-hosted-eyebrow-muted">
        {{ i18n.t('room.participants.join_room') }}
      </p>
      <h2 class="text-xl font-semibold text-stone-50">{{ joinCardTitle() }}</h2>
      <p class="text-sm leading-6 text-stone-300/80">
        {{ joinCardDescription() }}
      </p>

      <form
        class="mt-2 grid gap-3"
        data-testid="join-room-form"
        [formGroup]="joinForm()"
        (ngSubmit)="joinRequested.emit()"
      >
        <label
          [for]="joinDisplayNameInputId"
          class="grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-300/70"
        >
          <span>{{ i18n.t('room.participants.display_name') }}</span>
          <input
            [id]="joinDisplayNameInputId"
            pInputText
            formControlName="displayName"
            maxlength="24"
            class="go-hosted-input"
          />
        </label>

        <button
          pButton
          type="submit"
          class="go-hosted-button-primary justify-center"
          [disabled]="joining()"
        >
          {{
            joining()
              ? i18n.t('room.participants.joining_room')
              : i18n.t('room.participants.join_room')
          }}
        </button>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarIdentityPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly joinForm = input.required<OnlineRoomJoinFormGroup>();
  readonly joining = input.required<boolean>();
  readonly joinCardTitle = input.required<string>();
  readonly joinCardDescription = input.required<string>();

  readonly joinRequested = output<void>();

  protected readonly joinDisplayNameInputId = 'room-join-display-name';
}
