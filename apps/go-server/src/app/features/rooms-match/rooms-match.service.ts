import {
  GameCommand,
  GameStartSettings,
  RoomSettingsUpdatePayload,
} from '@gx/go/contracts';
import { GoMessageDescriptor, PlayerColor } from '@gx/go/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { MutationResult, RoomRecord } from '../../contracts/rooms.types';
import { RoomsMatchClockCalculatorService } from './rooms-match-clock';
import { RoomsMatchNigiriService } from './rooms-match-nigiri.service';
import { RoomsMatchPolicyService } from './rooms-match-policy';
import { RoomsMatchSettingsService } from './rooms-match-settings';
import { RoomsMatchTransitionsService } from './rooms-match-transitions';
import { RoomsClockService } from './rooms-clock.service';

const NOOP_CLOCKS: Pick<RoomsClockService, 'refresh'> = {
  refresh() {
    // Tests that instantiate the service directly can ignore process timers.
  },
};

/**
 * Encapsulates seat management, hosted match defaults, and match state transitions.
 */
@Injectable()
export class RoomsMatchService {
  private readonly logger = new Logger(RoomsMatchService.name);

  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsSnapshotMapper)
    private readonly snapshotMapper: RoomsSnapshotMapper,
    @Inject(RoomsRulesEngineService)
    private readonly rulesEngines: RoomsRulesEngineService,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
    @Inject(RoomsMatchSettingsService)
    private readonly matchSettings: RoomsMatchSettingsService = new RoomsMatchSettingsService(
      roomsErrors,
    ),
    @Inject(RoomsMatchPolicyService)
    private readonly policy: RoomsMatchPolicyService = new RoomsMatchPolicyService(
      store,
    ),
    @Inject(RoomsMatchTransitionsService)
    private readonly transitions: RoomsMatchTransitionsService = new RoomsMatchTransitionsService(
      store,
      rulesEngines,
      roomsErrors,
      matchSettings,
      policy,
      new RoomsMatchClockCalculatorService(),
      new RoomsMatchNigiriService(store, roomsErrors),
    ),
    @Inject(RoomsClockService)
    private readonly clocks: Pick<RoomsClockService, 'refresh'> = NOOP_CLOCKS,
  ) {}

  claimSeat(
    roomId: string,
    participantToken: string,
    color: PlayerColor,
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(
      room,
      participantToken,
    );

    this.assertSeatChangeAllowed(room);

    const seatHolder = this.store.getSeatHolder(room, color);
    if (seatHolder && seatHolder.id !== participant.id) {
      throw this.roomsErrors.conflict('room.error.seat_already_claimed');
    }

    if (participant.seat === color) {
      return { snapshot: this.snapshotMapper.toSnapshot(room) };
    }

    const previousSeat = participant.seat;
    participant.seat = color;
    this.handleSeatChange(room);
    this.logger.log(
      `[seat.claim] ${participant.displayName} (${participant.id}) claimed ${color} in room ${room.id} (previous: ${previousSeat ?? 'none'})`,
    );

    return this.finalizeMutation(
      room,
      previousSeat
        ? this.roomsErrors.roomMessage('room.notice.seat_moved', {
            displayName: participant.displayName,
            seat: this.roomsErrors.roomMessage(`common.seat.${color}`),
          })
        : this.roomsErrors.roomMessage('room.notice.seat_claimed', {
            displayName: participant.displayName,
            seat: this.roomsErrors.roomMessage(`common.seat.${color}`),
          }),
    );
  }

  releaseSeat(roomId: string, participantToken: string): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(
      room,
      participantToken,
    );

    this.assertSeatChangeAllowed(room);

    if (!participant.seat) {
      throw this.roomsErrors.badRequest('room.error.no_player_seat');
    }

    const releasedSeat = participant.seat;
    participant.seat = null;
    this.handleSeatChange(room);

    return this.finalizeMutation(
      room,
      this.roomsErrors.roomMessage('room.notice.seat_released', {
        displayName: participant.displayName,
        seat: this.roomsErrors.roomMessage(`common.seat.${releasedSeat}`),
      }),
    );
  }

  updateNextMatchSettings(
    roomId: string,
    participantToken: string,
    settings: RoomSettingsUpdatePayload['settings'],
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);

    this.store.assertHostParticipant(room, participantToken);

    if (!this.canEditNextMatchSettings(room)) {
      throw this.roomsErrors.badRequest(
        'room.error.next_match_settings_locked',
      );
    }

    const normalizedSettings =
      this.matchSettings.normalizeHostedStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;

    return this.finalizeMutation(
      room,
      this.roomsErrors.roomMessage('room.notice.next_match_settings_updated', {
        mode: this.roomsErrors.roomMessage(
          `common.mode.${normalizedSettings.mode}`,
        ),
        size: normalizedSettings.boardSize,
      }),
    );
  }

  startMatch(
    roomId: string,
    participantToken: string,
    settings: GameStartSettings,
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);

    if (room.autoStartBlockedUntilSeatChange) {
      throw this.roomsErrors.badRequest(
        'room.error.rematch_declined_wait_for_seat_change',
      );
    }

    if (room.rematch) {
      throw this.roomsErrors.badRequest(
        'room.error.rematch_response_unavailable',
      );
    }

    if (room.match && room.match.state.phase !== 'finished') {
      throw this.roomsErrors.badRequest('room.error.match_must_finish');
    }

    if (room.nigiri?.status === 'pending') {
      return this.finalizeMutation(
        room,
        this.roomsErrors.roomMessage('room.notice.nigiri_started', {
          player: this.roomsErrors.roomMessage(
            `common.player.${room.nigiri.guesser}`,
          ),
        }),
      );
    }

    const normalizedSettings =
      this.matchSettings.normalizeHostedStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;

    const nigiriNotice = this.transitions.maybeBeginDigitalNigiri(room);

    if (nigiriNotice) {
      return this.finalizeMutation(room, nigiriNotice);
    }

    const matchSettings = this.transitions.startMatchWithCurrentSeats(
      room,
      normalizedSettings,
    );

    return this.finalizeMutation(
      room,
      this.roomsErrors.roomMessage('room.notice.match_started', {
        displayName: host.displayName,
        mode: this.roomsErrors.roomMessage(`common.mode.${matchSettings.mode}`),
      }),
    );
  }

  respondToRematch(
    roomId: string,
    participantToken: string,
    accepted: boolean,
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(
      room,
      participantToken,
    );
    const rematch = room.rematch;

    if (!rematch || room.match?.state.phase !== 'finished') {
      throw this.roomsErrors.badRequest(
        'room.error.rematch_response_unavailable',
      );
    }

    const color = this.policy.findRematchSeat(rematch, participant.id);
    if (!color) {
      throw this.roomsErrors.forbidden('room.error.rematch_players_only');
    }

    if (!accepted) {
      room.rematch = null;
      room.autoStartBlockedUntilSeatChange = true;

      return this.finalizeMutation(
        room,
        this.roomsErrors.roomMessage('room.notice.rematch_declined', {
          displayName: participant.displayName,
        }),
      );
    }

    room.rematch = {
      ...rematch,
      responses: {
        ...rematch.responses,
        [color]: 'accepted',
      },
    };

    return this.finalizeMutation(room);
  }

  applyGameCommand(
    roomId: string,
    participantToken: string,
    command: GameCommand,
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(
      room,
      participantToken,
    );
    this.transitions.applyHostedGameCommand(room, participant, command);

    return this.finalizeMutation(room);
  }

  private finalizeMutation(
    room: RoomRecord,
    noticeMessage: GoMessageDescriptor | null = null,
  ): MutationResult {
    const automaticNotice = this.transitions.maybeStartNextMatch(room);

    this.store.touchRoom(room);
    this.clocks.refresh(room);

    const notice = automaticNotice ?? noticeMessage;

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: notice ? this.store.createNotice(notice) : undefined,
    };
  }

  private handleSeatChange(room: RoomRecord): void {
    if (this.policy.resetSeatDependentState(room)) {
      this.logger.log(
        `[seat.change] reset rematch/auto-start block in room ${room.id}`,
      );
    }
  }

  private canEditNextMatchSettings(room: RoomRecord): boolean {
    return this.policy.canEditNextMatchSettings(room);
  }

  private assertSeatChangeAllowed(room: RoomRecord): void {
    if (room.match && room.match.state.phase !== 'finished') {
      throw this.roomsErrors.badRequest('room.error.seat_change_while_live');
    }
  }
}
