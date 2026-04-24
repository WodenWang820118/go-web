import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  HostedClockPlayerSnapshot,
  HostedMatchSnapshot,
} from '@gx/go/contracts';
import { PlayerColor, TimeControlSettings } from '@gx/go/domain';
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
  private readonly clockTimer = setInterval(() => {
    this.now.set(Date.now());
  }, 1000);

  readonly seats = input.required<readonly OnlineRoomSeatViewModel[]>();
  readonly match = input<HostedMatchSnapshot | null>(null);
  readonly canChangeSeats = input.required<boolean>();
  readonly realtimeConnected = input.required<boolean>();

  readonly claimSeatRequested = output<PlayerColor>();
  readonly releaseSeatRequested = output<void>();

  ngOnDestroy(): void {
    clearInterval(this.clockTimer);
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
    const player = this.clockPlayer(color);

    if (!player) {
      return null;
    }

    return this.formatClockMs(
      player.mainTimeMs > 0 ? player.mainTimeMs : player.periodTimeMs,
    );
  }

  protected clockDetailLabel(color: PlayerColor): string | null {
    const player = this.clockPlayer(color);

    if (!player) {
      return null;
    }

    if (player.mainTimeMs > 0) {
      return this.i18n.t('room.clock.main');
    }

    return this.i18n.t('room.clock.byo_yomi_periods', {
      count: player.periodsRemaining,
    });
  }

  private clockPlayer(color: PlayerColor): HostedClockPlayerSnapshot | null {
    const match = this.match();
    const clock = match?.clock;

    if (!clock) {
      return null;
    }

    const player = clock.players[color];

    if (match.state.phase !== 'playing' || clock.activeColor !== color) {
      return player;
    }

    return this.consumePlayerTime(
      player,
      clock.config,
      Math.max(0, this.now() - Date.parse(clock.lastStartedAt)),
    );
  }

  private consumePlayerTime(
    player: HostedClockPlayerSnapshot,
    config: TimeControlSettings,
    elapsedMs: number,
  ): HostedClockPlayerSnapshot {
    let remainingElapsedMs = elapsedMs;
    let mainTimeMs = player.mainTimeMs;

    if (mainTimeMs > 0) {
      const mainConsumed = Math.min(mainTimeMs, remainingElapsedMs);
      mainTimeMs -= mainConsumed;
      remainingElapsedMs -= mainConsumed;
    }

    if (remainingElapsedMs <= 0) {
      return {
        ...player,
        mainTimeMs,
      };
    }

    const totalByoYomiMs =
      (player.periodsRemaining - 1) * config.periodTimeMs + player.periodTimeMs;
    const remainingByoYomiMs = totalByoYomiMs - remainingElapsedMs;

    if (remainingByoYomiMs <= 0) {
      return {
        mainTimeMs: 0,
        periodTimeMs: 0,
        periodsRemaining: 0,
      };
    }

    const periodsRemaining = Math.ceil(
      remainingByoYomiMs / config.periodTimeMs,
    );

    return {
      mainTimeMs: 0,
      periodTimeMs:
        remainingByoYomiMs - (periodsRemaining - 1) * config.periodTimeMs,
      periodsRemaining,
    };
  }

  private formatClockMs(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
