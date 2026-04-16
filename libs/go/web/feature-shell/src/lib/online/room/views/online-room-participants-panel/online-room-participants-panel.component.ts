import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HostedMatchSnapshot, ParticipantSummary } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import {
  OnlineRoomJoinFormGroup,
  OnlineRoomSettingsFormGroup,
} from '../../contracts/online-room-form.contracts';
import { OnlineRoomSeatViewModel } from '../../contracts/online-room-view.contracts';
import { OnlineRoomNextMatchPanelComponent } from './components/online-room-next-match-panel/online-room-next-match-panel.component';
import { OnlineRoomRosterPanelComponent } from './components/online-room-roster-panel/online-room-roster-panel.component';
import { OnlineRoomViewerPanelComponent } from './components/online-room-viewer-panel/online-room-viewer-panel.component';

@Component({
  selector: 'lib-go-online-room-participants-panel',
  standalone: true,
  imports: [
    OnlineRoomViewerPanelComponent,
    OnlineRoomNextMatchPanelComponent,
    OnlineRoomRosterPanelComponent,
  ],
  template: `
    <div class="grid gap-4" data-testid="room-participants-panel">
      <lib-go-online-room-viewer-panel
        [joinForm]="joinForm()"
        [participantId]="participantId()"
        [joining]="joining()"
        [viewer]="viewer()"
        [viewerSeat]="viewerSeat()"
        [isHost]="isHost()"
        [joinCardTitle]="joinCardTitle()"
        [joinCardDescription]="joinCardDescription()"
        (joinRequested)="joinRequested.emit()"
      />

      <lib-go-online-room-next-match-panel
        [settingsForm]="settingsForm()"
        [boardSizeOptions]="boardSizeOptions()"
        [isHost]="isHost()"
        [realtimeConnected]="realtimeConnected()"
        [canEditNextMatchSettings]="canEditNextMatchSettings()"
        [settingsLockedMessage]="settingsLockedMessage()"
        (settingsSavedRequested)="settingsSavedRequested.emit()"
      />

      <lib-go-online-room-roster-panel
        [participants]="participants()"
        [seats]="seats()"
        [isHost]="isHost()"
        [realtimeConnected]="realtimeConnected()"
        [canChangeSeats]="canChangeSeats()"
        [match]="match()"
        [canPass]="canPass()"
        [canResign]="canResign()"
        [canFinalizeScoring]="canFinalizeScoring()"
        (claimSeatRequested)="claimSeatRequested.emit($event)"
        (releaseSeatRequested)="releaseSeatRequested.emit()"
        (passRequested)="passRequested.emit()"
        (resignRequested)="resignRequested.emit()"
        (finalizeScoringRequested)="finalizeScoringRequested.emit()"
        (muteParticipantRequested)="muteParticipantRequested.emit($event)"
        (unmuteParticipantRequested)="unmuteParticipantRequested.emit($event)"
        (kickParticipantRequested)="kickParticipantRequested.emit($event)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomParticipantsPanelComponent {
  readonly joinForm = input.required<OnlineRoomJoinFormGroup>();
  readonly settingsForm = input.required<OnlineRoomSettingsFormGroup>();
  readonly boardSizeOptions = input.required<readonly number[]>();
  readonly participantId = input<string | null>(null);
  readonly joining = input.required<boolean>();
  readonly viewer = input<ParticipantSummary | null>(null);
  readonly viewerSeat = input<PlayerColor | null>(null);
  readonly isHost = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly canChangeSeats = input.required<boolean>();
  readonly canEditNextMatchSettings = input.required<boolean>();
  readonly settingsLockedMessage = input<string | null>(null);
  readonly canPass = input.required<boolean>();
  readonly canResign = input.required<boolean>();
  readonly canFinalizeScoring = input.required<boolean>();
  readonly joinCardTitle = input.required<string>();
  readonly joinCardDescription = input.required<string>();
  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);

  readonly joinRequested = output<void>();
  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();
  readonly settingsSavedRequested = output<void>();
  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();
  readonly finalizeScoringRequested = output<void>();
  readonly muteParticipantRequested = output<string>();
  readonly unmuteParticipantRequested = output<string>();
  readonly kickParticipantRequested = output<string>();
}
