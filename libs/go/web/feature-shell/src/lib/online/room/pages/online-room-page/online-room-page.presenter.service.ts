import { Injectable, inject } from '@angular/core';
import { OnlineRoomPageDialogsService } from './services/online-room-page-dialogs/online-room-page-dialogs.service';
import { OnlineRoomPageInteractionsService } from './services/online-room-page-interactions/online-room-page-interactions.service';
import { OnlineRoomPageLeaveService } from './services/online-room-page-leave/online-room-page-leave.service';
import { OnlineRoomPageShareService } from './services/online-room-page-share/online-room-page-share.service';
import { OnlineRoomPageViewStateService } from './services/online-room-page-view-state/online-room-page-view-state.service';

@Injectable()
export class OnlineRoomPagePresenterService {
  readonly view = inject(OnlineRoomPageViewStateService);
  readonly interactions = inject(OnlineRoomPageInteractionsService);
  readonly share = inject(OnlineRoomPageShareService);
  readonly dialogs = inject(OnlineRoomPageDialogsService);
  readonly leave = inject(OnlineRoomPageLeaveService);
}
