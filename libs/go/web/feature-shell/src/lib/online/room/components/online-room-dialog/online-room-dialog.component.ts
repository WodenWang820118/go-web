import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'lib-go-online-room-dialog',
  standalone: true,
  imports: [DialogModule],
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="dismissableMask()"
      [closable]="closable()"
      [appendTo]="'body'"
      [style]="{ width: width() }"
      [header]="title()"
      [closeAriaLabel]="closeAriaLabel()"
      styleClass="room-event-dialog"
      contentStyleClass="space-y-4"
      (visibleChange)="visibleChange.emit($event)"
    >
      <ng-content />

      <ng-template #footer>
        <ng-content select="[dialog-footer]" />
      </ng-template>
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomDialogComponent {
  readonly visible = input.required<boolean>();
  readonly title = input.required<string>();
  readonly width = input('min(32rem, calc(100vw - 2rem))');
  readonly dismissableMask = input(true);
  readonly closable = input(true);
  readonly closeAriaLabel = input.required<string>();

  readonly visibleChange = output<boolean>();
}
