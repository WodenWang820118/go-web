import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  HostedClockSnapshot,
  HostedClockPlayerSnapshot,
  HostedMatchSnapshot,
} from '@gx/go/contracts';
import { consumeTimeControlElapsed, type PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { formatTimeControlClockPlayer } from '../../../../../../shared/time-control/time-control-presentation';
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
          [clockLabel]="clockLabel(seat.color)"
          [clockDetailLabel]="clockDetailLabel(seat.color)"
          (claimSeatRequested)="claimSeatRequested.emit($event)"
          (releaseSeatRequested)="releaseSeatRequested.emit()"
        />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineRoomSidebarSeatsPanelComponent implements OnDestroy {
  protected readonly i18n = inject(GoI18nService);
  private readonly now = signal(Date.now());
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private readonly clockTickerEffect = effect(() => {
    if (this.hasTickingClock()) {
      this.startClockTimer();
      return;
    }

    this.stopClockTimer();
  });

  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly canChangeSeats = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();

  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();

  ngOnDestroy(): void {
    this.stopClockTimer();
  }

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

  protected clockLabel(color: PlayerColor): string | null {
    const clock = this.clockView(color);

    if (!clock) {
      return null;
    }

    return formatTimeControlClockPlayer(clock.player, clock.config, this.i18n)
      .label;
  }

  protected clockDetailLabel(color: PlayerColor): string | null {
    const clock = this.clockView(color);

    if (!clock) {
      return null;
    }

    return formatTimeControlClockPlayer(clock.player, clock.config, this.i18n)
      .detail;
  }

  private clockView(color: PlayerColor): {
    player: HostedClockPlayerSnapshot;
    config: HostedClockSnapshot['config'];
  } | null {
    const match = this.match();
    const clock = match?.clock;

    if (!clock) {
      return null;
    }

    const player = clock.players[color];

    if (match.state.phase !== 'playing' || clock.activeColor !== color) {
      return {
        player,
        config: clock.config,
      };
    }

    return {
      player: consumeTimeControlElapsed(
        player,
        clock.config,
        Math.max(0, this.now() - Date.parse(clock.lastStartedAt)),
      ),
      config: clock.config,
    };
  }

  private hasTickingClock(): boolean {
    const match = this.match();

    return !!match?.clock && match.state.phase === 'playing';
  }

  private startClockTimer(): void {
    if (this.clockTimer) {
      return;
    }

    this.clockTimer = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  private stopClockTimer(): void {
    if (!this.clockTimer) {
      return;
    }

    clearInterval(this.clockTimer);
    this.clockTimer = null;
  }
}
