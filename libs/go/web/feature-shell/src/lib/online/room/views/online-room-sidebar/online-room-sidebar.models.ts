import { FormControl, FormGroup } from '@angular/forms';
import { PlayerColor } from '@gx/go/domain';

export type OnlineRoomJoinFormGroup = FormGroup<{
  displayName: FormControl<string>;
}>;

export type OnlineRoomChatFormGroup = FormGroup<{
  message: FormControl<string>;
}>;

export interface OnlineRoomSidebarMessageViewModel {
  readonly tone: 'error' | 'notice' | 'warning';
  readonly message: string;
  readonly testId: string;
}

export interface OnlineRoomSidebarRematchStatusViewModel {
  readonly color: PlayerColor;
  readonly name: string;
  readonly response: 'pending' | 'accepted' | 'declined';
  readonly isViewer: boolean;
}
