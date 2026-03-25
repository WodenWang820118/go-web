import { GameCommand, GameStartSettings } from '@gx/go/contracts';
import {
  DEFAULT_GO_KOMI,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  MatchSettings,
  PlayerColor,
  getRulesEngine,
} from '@gx/go/domain';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  badRequestMessage,
  conflictMessage,
  forbiddenMessage,
  roomMessage,
} from './rooms.errors';
import { RoomsSnapshotMapper } from './rooms.snapshot.mapper';
import { RoomsStore } from './rooms.store';
import { MutationResult, RoomRecord } from './rooms.types';

/**
 * Encapsulates seat management and match state transitions.
 */
@Injectable()
export class RoomsMatchService {
  constructor(
    private readonly store: RoomsStore = new RoomsStore(),
    private readonly snapshotMapper: RoomsSnapshotMapper = new RoomsSnapshotMapper(
      store
    )
  ) {}

  claimSeat(
    roomId: string,
    participantToken: string,
    color: PlayerColor
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);

    this.assertSeatChangeAllowed(room);

    const seatHolder = this.store.getSeatHolder(room, color);
    if (seatHolder && seatHolder.id !== participant.id) {
      throw conflictMessage('room.error.seat_already_claimed');
    }

    if (participant.seat === color) {
      return { snapshot: this.snapshotMapper.toSnapshot(room) };
    }

    const previousSeat = participant.seat;
    participant.seat = color;
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: this.store.createNotice(
        previousSeat
          ? roomMessage('room.notice.seat_moved', {
              displayName: participant.displayName,
              seat: roomMessage(`common.seat.${color}`),
            })
          : roomMessage('room.notice.seat_claimed', {
              displayName: participant.displayName,
              seat: roomMessage(`common.seat.${color}`),
            })
      ),
    };
  }

  releaseSeat(roomId: string, participantToken: string): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);

    this.assertSeatChangeAllowed(room);

    if (!participant.seat) {
      throw badRequestMessage('room.error.no_player_seat');
    }

    const releasedSeat = participant.seat;
    participant.seat = null;
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: this.store.createNotice(
        roomMessage('room.notice.seat_released', {
          displayName: participant.displayName,
          seat: roomMessage(`common.seat.${releasedSeat}`),
        })
      ),
    };
  }

  startMatch(
    roomId: string,
    participantToken: string,
    settings: GameStartSettings
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);

    if (room.match && room.match.state.phase !== 'finished') {
      throw badRequestMessage('room.error.match_must_finish');
    }

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw badRequestMessage('room.error.both_seats_required');
    }

    const normalizedSettings = this.normalizeSettings(
      settings,
      black.displayName,
      white.displayName
    );
    room.match = {
      settings: normalizedSettings,
      state: getRulesEngine(normalizedSettings.mode).createInitialState(
        normalizedSettings
      ),
      startedAt: this.store.timestamp(),
    };
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: this.store.createNotice(
        roomMessage('room.notice.match_started', {
          displayName: host.displayName,
          mode: roomMessage(`common.mode.${normalizedSettings.mode}`),
        })
      ),
    };
  }

  applyGameCommand(
    roomId: string,
    participantToken: string,
    command: GameCommand
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);
    const match = this.requireMatch(room);

    if (!participant.seat) {
      throw forbiddenMessage('room.error.spectators_cannot_play');
    }

    if (command.type === 'toggle-dead') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw badRequestMessage('room.error.dead_group_toggle_unavailable');
      }

      const nextState = getRulesEngine('go').toggleDeadGroup?.(
        match.state,
        match.settings,
        command.point
      );

      if (!nextState) {
        throw badRequestMessage('room.error.scoring_preview_unavailable');
      }

      room.match = {
        ...match,
        state: nextState,
      };
      this.store.touchRoom(room);

      return {
        snapshot: this.snapshotMapper.toSnapshot(room),
      };
    }

    if (command.type === 'finalize-scoring') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw badRequestMessage('room.error.score_finalization_unavailable');
      }

      const nextState = getRulesEngine('go').finalizeScoring?.(
        match.state,
        match.settings
      );

      if (!nextState) {
        throw badRequestMessage('room.error.finalize_scoring_failed');
      }

      room.match = {
        ...match,
        state: nextState,
      };
      this.store.touchRoom(room);

      return {
        snapshot: this.snapshotMapper.toSnapshot(room),
      };
    }

    if (match.state.phase !== 'playing') {
      throw badRequestMessage('room.error.match_not_accepting_moves');
    }

    if (command.type !== 'resign' && match.state.nextPlayer !== participant.seat) {
      throw forbiddenMessage('room.error.not_your_turn');
    }

    if (command.type === 'resign' && command.player && command.player !== participant.seat) {
      throw forbiddenMessage('room.error.resign_only_for_self');
    }

    const normalizedCommand =
      command.type === 'resign'
        ? {
            type: 'resign' as const,
            player: participant.seat,
          }
        : command;
    const result = getRulesEngine(match.settings.mode).applyMove(
      match.state,
      match.settings,
      normalizedCommand
    );

    if (!result.ok) {
      throw new BadRequestException({
        message: result.error ?? roomMessage('room.error.move_rejected'),
      });
    }

    room.match = {
      ...match,
      state: result.state,
    };
    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
    };
  }

  private assertSeatChangeAllowed(room: RoomRecord): void {
    if (room.match && room.match.state.phase !== 'finished') {
      throw badRequestMessage('room.error.seat_change_while_live');
    }
  }

  private requireMatch(room: RoomRecord) {
    if (!room.match) {
      throw badRequestMessage('room.error.no_match_started');
    }

    return room.match;
  }

  private normalizeSettings(
    settings: GameStartSettings,
    blackName: string,
    whiteName: string
  ): MatchSettings {
    if (settings.mode !== 'go' && settings.mode !== 'gomoku') {
      throw badRequestMessage('room.error.unsupported_mode');
    }

    if (settings.mode === 'go') {
      if (!GO_BOARD_SIZES.includes(settings.boardSize as 9 | 13 | 19)) {
        throw badRequestMessage('room.error.invalid_go_board_size');
      }

      return {
        mode: 'go',
        boardSize: settings.boardSize as 9 | 13 | 19,
        komi:
          typeof settings.komi === 'number' && Number.isFinite(settings.komi)
            ? settings.komi
            : DEFAULT_GO_KOMI,
        players: {
          black: blackName,
          white: whiteName,
        },
      };
    }

    if (settings.boardSize !== GOMOKU_BOARD_SIZE) {
      throw badRequestMessage('room.error.invalid_gomoku_board_size');
    }

    return {
      mode: 'gomoku',
      boardSize: GOMOKU_BOARD_SIZE,
      komi: 0,
      players: {
        black: blackName,
        white: whiteName,
      },
    };
  }
}
