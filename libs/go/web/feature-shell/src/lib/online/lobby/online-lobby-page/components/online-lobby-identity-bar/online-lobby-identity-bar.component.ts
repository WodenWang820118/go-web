import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LobbyRoomStatus } from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  countLabel,
  LobbyOverviewStatsViewModel,
  LobbySectionViewModel,
} from '../../../online-lobby.presentation';

@Component({
  selector: 'lib-go-online-lobby-identity-bar',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './online-lobby-identity-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyIdentityBarComponent {
  readonly i18n = inject(GoI18nService);

  readonly sections = input.required<readonly LobbySectionViewModel[]>();
  readonly activeStatus = input.required<LobbyRoomStatus>();
  readonly displayName = input.required<FormControl<string>>();
  readonly canSubmitIdentity = input.required<boolean>();
  readonly creating = input.required<boolean>();
  readonly stats = input.required<LobbyOverviewStatsViewModel>();
  readonly message = input.required<string>();
  readonly messageIsError = input.required<boolean>();
  readonly isMdUp = input.required<boolean>();

  readonly activeStatusChange = output<LobbyRoomStatus>();
  readonly createRoomRequested = output<void>();

  protected readonly countLabel = (
    count: number,
    unit: 'room' | 'person' | 'online' | 'spectator',
  ) => countLabel(this.i18n, count, unit);

  protected isActiveStatus(status: LobbyRoomStatus): boolean {
    return this.activeStatus() === status;
  }
}
