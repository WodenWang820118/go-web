import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createMessage } from '@gx/go/domain';
import { RoomsRealtimeBroadcasterService } from '../../core/rooms-realtime/rooms-realtime-broadcaster.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { RoomRecord } from '../../contracts/rooms.types';
import { RoomsMatchClockCalculatorService } from './rooms-match-clock';
import { RoomsMatchTransitionsService } from './rooms-match-transitions';

@Injectable()
export class RoomsClockService implements OnModuleDestroy {
  private readonly logger = new Logger(RoomsClockService.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper,
    @Inject(RoomsRealtimeBroadcasterService)
    private readonly realtime: RoomsRealtimeBroadcasterService,
    @Inject(RoomsMatchClockCalculatorService)
    private readonly clockCalculator: RoomsMatchClockCalculatorService,
    @Inject(RoomsMatchTransitionsService)
    private readonly transitions: RoomsMatchTransitionsService,
  ) {}

  refresh(room: RoomRecord): void {
    this.clear(room.id);

    const match = room.match;
    if (!match?.clock || match.state.phase !== 'playing') {
      return;
    }

    const remainingMs = this.clockCalculator.getActiveClockRemainingMs(
      match.clock,
    );
    const timer = setTimeout(
      () => this.resolveScheduledTimeout(room.id),
      Math.max(0, remainingMs) + 25,
    );
    timer.unref?.();
    this.timers.set(room.id, timer);
  }

  clear(roomId: string): void {
    const timer = this.timers.get(roomId);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
  }

  sweepStaleRooms(): void {
    for (const roomId of this.timers.keys()) {
      if (!this.store.rooms.has(roomId)) {
        this.clear(roomId);
      }
    }
  }

  onModuleDestroy(): void {
    for (const roomId of this.timers.keys()) {
      this.clear(roomId);
    }
  }

  private resolveScheduledTimeout(roomId: string): void {
    this.timers.delete(roomId);

    const room = this.store.rooms.get(roomId);
    const match = room?.match ?? null;

    if (!room || !match?.clock || match.state.phase !== 'playing') {
      return;
    }

    const now = this.store.timestamp();
    const advanced = this.clockCalculator.advanceHostedClock(match.clock, now);

    if (!advanced.timedOutColor) {
      room.match = {
        ...match,
        clock: advanced.clock,
      };
      this.refresh(room);
      return;
    }

    const timedOutColor = advanced.timedOutColor;
    const timeoutState = this.clockCalculator.createTimeoutState(
      match.state,
      timedOutColor,
    );
    this.transitions.updateFinishedMatchState(
      room,
      {
        ...match,
        clock: advanced.clock,
      },
      timeoutState,
    );
    this.store.touchRoom(room);
    this.logger.log(
      `[clock.timeout] room=${room.id} timedOut=${timedOutColor}`,
    );

    this.realtime.broadcastMutationResult(
      {
        snapshot: this.snapshotMapper.toSnapshot(room),
        notice: this.store.createNotice(
          createMessage('room.notice.timeout', {
            player: createMessage(`common.player.${timedOutColor}`),
          }),
        ),
      },
      {
        publishGameState: true,
      },
    );
  }
}
