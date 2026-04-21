import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { GoI18nService } from '@gx/go/state/i18n';
import { LobbyAnnouncementCardViewModel } from '../../../online-lobby-presentation.service';

@Component({
  selector: 'lib-go-online-lobby-announcement-panel',
  standalone: true,
  imports: [NgClass],
  templateUrl: './online-lobby-announcement-panel.component.html',
  host: {
    class: 'block min-h-0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineLobbyAnnouncementPanelComponent {
  readonly i18n = inject(GoI18nService);
  readonly cards = input.required<readonly LobbyAnnouncementCardViewModel[]>();
}
