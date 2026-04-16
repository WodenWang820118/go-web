import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  ChatMessage,
  HostedMatchSnapshot,
  ParticipantSummary,
} from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { OnlineRoomSeatViewModel } from '../../online-room-page.models';
import { OnlineRoomSidebarActionsComponent } from './components/online-room-sidebar-actions/online-room-sidebar-actions.component';
import { OnlineRoomSidebarChatPanelComponent } from './components/online-room-sidebar-chat-panel/online-room-sidebar-chat-panel.component';
import { OnlineRoomSidebarIdentityPanelComponent } from './components/online-room-sidebar-identity-panel/online-room-sidebar-identity-panel.component';
import { OnlineRoomSidebarMessagesComponent } from './components/online-room-sidebar-messages/online-room-sidebar-messages.component';
import {
  OnlineRoomChatFormGroup,
  OnlineRoomJoinFormGroup,
  OnlineRoomSidebarMessageViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
} from './online-room-sidebar.models';
import { OnlineRoomSidebarRematchPanelComponent } from './components/online-room-sidebar-rematch-panel/online-room-sidebar-rematch-panel.component';
import { OnlineRoomSidebarSeatsPanelComponent } from './components/online-room-sidebar-seats-panel/online-room-sidebar-seats-panel.component';

@Component({
  selector: 'lib-go-online-room-sidebar',
  standalone: true,
  imports: [
    OnlineRoomSidebarMessagesComponent,
    OnlineRoomSidebarIdentityPanelComponent,
    OnlineRoomSidebarSeatsPanelComponent,
    OnlineRoomSidebarRematchPanelComponent,
    OnlineRoomSidebarChatPanelComponent,
    OnlineRoomSidebarActionsComponent,
  ],
  templateUrl: './online-room-sidebar.component.html',
  host: {
    class: 'block min-h-0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarComponent {
  readonly joinForm = input.required<OnlineRoomJoinFormGroup>();
  readonly chatForm = input.required<OnlineRoomChatFormGroup>();
  readonly participantId = input<string | null>(null);
  readonly joining = input.required<boolean>();
  readonly isMuted = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();
  readonly canChangeSeats = input.required<boolean>();
  readonly joinCardTitle = input.required<string>();
  readonly joinCardDescription = input.required<string>();
  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly participants = input.required<readonly ParticipantSummary[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly messages = input.required<readonly ChatMessage[]>();
  readonly helperText = input.required<string>();
  readonly roomMessages =
    input.required<readonly OnlineRoomSidebarMessageViewModel[]>();
  readonly canPass = input.required<boolean>();
  readonly canResign = input.required<boolean>();
  readonly showRematch = input.required<boolean>();
  readonly canRespondToRematch = input.required<boolean>();
  readonly rematchStatuses =
    input.required<readonly OnlineRoomSidebarRematchStatusViewModel[]>();

  readonly joinRequested = output<void>();
  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();
  readonly passRequested = output<void>();
  readonly resignRequested = output<void>();
  readonly acceptRematchRequested = output<void>();
  readonly declineRematchRequested = output<void>();
  readonly sendRequested = output<void>();
}
