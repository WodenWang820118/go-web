import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { OnlineRoomSidebarMessageViewModel } from '../../online-room-sidebar.models';

@Component({
  selector: 'lib-go-online-room-sidebar-messages',
  standalone: true,
  imports: [MessageModule],
  template: `
    <div class="grid gap-2" data-testid="room-sidebar-messages">
      @for (item of messages(); track item.testId) {
        <p-message
          [severity]="messageSeverity(item.tone)"
          [styleClass]="'go-hosted-message ' + messageToneClass(item.tone)"
          [attr.data-testid]="item.testId"
        >
          {{ item.message }}
        </p-message>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarMessagesComponent {
  readonly messages =
    input.required<readonly OnlineRoomSidebarMessageViewModel[]>();

  protected messageSeverity(
    tone: OnlineRoomSidebarMessageViewModel['tone'],
  ): 'error' | 'secondary' | 'warn' {
    switch (tone) {
      case 'error':
        return 'error';
      case 'notice':
        return 'secondary';
      default:
        return 'warn';
    }
  }

  protected messageToneClass(
    tone: OnlineRoomSidebarMessageViewModel['tone'],
  ): string {
    switch (tone) {
      case 'error':
        return 'go-hosted-message--error';
      case 'notice':
        return 'go-hosted-message--notice';
      default:
        return 'go-hosted-message--warning';
    }
  }
}
