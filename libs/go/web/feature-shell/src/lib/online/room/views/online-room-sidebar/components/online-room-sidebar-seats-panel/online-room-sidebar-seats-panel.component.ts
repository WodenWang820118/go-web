import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { HostedMatchSnapshot } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { OnlineRoomSeatViewModel } from '../../../../contracts/online-room-view.contracts';
import { OnlineRoomSidebarSeatCardComponent } from '../online-room-sidebar-seat-card/online-room-sidebar-seat-card.component';

@Component({
  selector: 'lib-go-online-room-sidebar-seats-panel',
  standalone: true,
  imports: [OnlineRoomSidebarSeatCardComponent],
  template: `
    <section
      class="grid gap-3 xl:grid-cols-2"
      data-testid="room-sidebar-players"
    >
      @for (seat of seats(); track seat.color) {
        <lib-go-online-room-sidebar-seat-card
          [seat]="seat"
          [isActive]="isActiveSeat(seat.color)"
          [canChangeSeats]="canChangeSeats()"
          [realtimeConnected]="realtimeConnected()"
          [captureCountLabel]="captureLabel(seat.color)"
          (claimSeatRequested)="claimSeatRequested.emit($event)"
          (releaseSeatRequested)="releaseSeatRequested.emit()"
        />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarSeatsPanelComponent {
  protected readonly i18n = inject(GoI18nService);

  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly canChangeSeats = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();

  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();

  protected isActiveSeat(color: PlayerColor): boolean {
    return (
      this.match()?.state.phase === 'playing' &&
      this.match()?.state.nextPlayer === color
    );
  }

  protected captureLabel(color: PlayerColor): string | null {
    const match = this.match();

    if (!match || match.settings.mode !== 'go') {
      return null;
    }

    return this.i18n.t('ui.match_sidebar.captures', {
      count: match.state.captures[color],
    });
  }
}
