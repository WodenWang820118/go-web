import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { OnlineRoomPageStatusComponent } from '../../views/online-room-page-status/online-room-page-status.component';
import { OnlineRoomSidebarComponent } from '../../views/online-room-sidebar/online-room-sidebar.component';
import { OnlineRoomStageSectionComponent } from '../../views/online-room-stage-section/online-room-stage-section.component';
import { OnlineRoomPagePresenterService } from './online-room-page.presenter.service';
import { OnlineRoomPageDialogsService } from './services/online-room-page-dialogs/online-room-page-dialogs.service';
import { OnlineRoomPageInteractionsService } from './services/online-room-page-interactions/online-room-page-interactions.service';
import { OnlineRoomPageShareService } from './services/online-room-page-share/online-room-page-share.service';
import { OnlineRoomPageViewStateService } from './services/online-room-page-view-state/online-room-page-view-state.service';

@Component({
  selector: 'lib-go-online-room-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    OnlineRoomPageStatusComponent,
    OnlineRoomSidebarComponent,
    OnlineRoomStageSectionComponent,
    TagModule,
  ],
  templateUrl: './online-room-page.component.html',
  styleUrl: './online-room-page.component.css',
  host: {
    class: 'block min-h-dvh',
  },
  providers: [
    OnlineRoomPagePresenterService,
    OnlineRoomPageViewStateService,
    OnlineRoomPageInteractionsService,
    OnlineRoomPageShareService,
    OnlineRoomPageDialogsService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomPageComponent {
  protected readonly presenter = inject(OnlineRoomPagePresenterService);

  protected onRematchVisibleChange(visible: boolean): void {
    if (!visible) {
      this.presenter.dialogs.dismissRematchDialog();
    }
  }

  protected onResignVisibleChange(visible: boolean): void {
    if (!visible) {
      this.presenter.dialogs.dismissResignResultDialog();
    }
  }
}
