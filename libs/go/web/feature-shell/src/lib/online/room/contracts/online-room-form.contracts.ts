import { FormControl, FormGroup } from '@angular/forms';
import { GameMode } from '@gx/go/domain';

export type OnlineRoomJoinFormGroup = FormGroup<{
  displayName: FormControl<string>;
}>;

export type OnlineRoomChatFormGroup = FormGroup<{
  message: FormControl<string>;
}>;

export type OnlineRoomSettingsFormGroup = FormGroup<{
  mode: FormControl<GameMode>;
  boardSize: FormControl<number>;
}>;
