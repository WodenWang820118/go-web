import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  countLabel,
  LobbyOnlinePlayerGroupViewModel,
} from '../../../online-lobby.presentation';

@Component({
  selector: 'lib-go-online-lobby-online-players-panel',
  standalone: true,
  templateUrl: './online-lobby-online-players-panel.component.html',
  host: {
    class: 'block min-h-0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyOnlinePlayersPanelComponent {
  readonly i18n = inject(GoI18nService);

  readonly loading = input.required<boolean>();
  readonly groups = input.required<readonly LobbyOnlinePlayerGroupViewModel[]>();
  readonly totalOnlinePlayers = input.required<number>();

  protected readonly countLabel = (
    count: number,
    unit: 'room' | 'person' | 'online' | 'spectator'
  ) => countLabel(this.i18n, count, unit);
}
