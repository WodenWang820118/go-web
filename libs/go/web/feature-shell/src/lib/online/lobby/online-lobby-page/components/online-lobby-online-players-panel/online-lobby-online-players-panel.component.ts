import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  LobbyOnlinePlayerGroupViewModel,
  OnlineLobbyPresentationService,
} from '../../../online-lobby-presentation.service';

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
  readonly presentation = inject(OnlineLobbyPresentationService);

  readonly loading = input.required<boolean>();
  readonly groups =
    input.required<readonly LobbyOnlinePlayerGroupViewModel[]>();
  readonly totalOnlinePlayers = input.required<number>();

  protected readonly countLabel = (
    count: number,
    unit: 'room' | 'person' | 'online' | 'spectator',
  ) => this.presentation.countLabel(count, unit);
}
