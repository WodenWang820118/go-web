import {
  GameCommand,
  GameStartSettings,
  HostedRematchState,
  RoomSettingsUpdatePayload,
} from '@gx/go/contracts';
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
 * Encapsulates seat management, hosted match defaults, and match state transitions.
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
    this.handleSeatChange(room);

    return this.finalizeMutation(
      room,
      previousSeat
        ? roomMessage('room.notice.seat_moved', {
            displayName: participant.displayName,
            seat: roomMessage(`common.seat.${color}`),
          })
        : roomMessage('room.notice.seat_claimed', {
            displayName: participant.displayName,
            seat: roomMessage(`common.seat.${color}`),
          })
    );
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
    this.handleSeatChange(room);

    return this.finalizeMutation(
      room,
      roomMessage('room.notice.seat_released', {
        displayName: participant.displayName,
        seat: roomMessage(`common.seat.${releasedSeat}`),
      })
    );
  }

  updateNextMatchSettings(
    roomId: string,
    participantToken: string,
    settings: RoomSettingsUpdatePayload['settings']
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);

    this.store.assertHostParticipant(room, participantToken);

    if (!this.canEditNextMatchSettings(room)) {
      throw badRequestMessage('room.error.next_match_settings_locked');
    }

    const normalizedSettings = this.normalizeStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;

    return this.finalizeMutation(
      room,
      roomMessage('room.notice.next_match_settings_updated', {
        mode: roomMessage(`common.mode.${normalizedSettings.mode}`),
        size: normalizedSettings.boardSize,
      })
    );
  }

  startMatch(
    roomId: string,
    participantToken: string,
    settings: GameStartSettings
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const host = this.store.assertHostParticipant(room, participantToken);

    if (room.autoStartBlockedUntilSeatChange) {
      throw badRequestMessage('room.error.rematch_declined_wait_for_seat_change');
    }

    if (room.rematch) {
      throw badRequestMessage('room.error.rematch_response_unavailable');
    }

    if (room.match && room.match.state.phase !== 'finished') {
      throw badRequestMessage('room.error.match_must_finish');
    }

    const normalizedSettings = this.normalizeStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;
    const matchSettings = this.startMatchWithCurrentSeats(room, normalizedSettings);

    return this.finalizeMutation(
      room,
      roomMessage('room.notice.match_started', {
        displayName: host.displayName,
        mode: roomMessage(`common.mode.${matchSettings.mode}`),
      })
    );
  }

  respondToRematch(
    roomId: string,
    participantToken: string,
    accepted: boolean
  ): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);
    const rematch = room.rematch;

    if (!rematch || room.match?.state.phase !== 'finished') {
      throw badRequestMessage('room.error.rematch_response_unavailable');
    }

    const color = this.findRematchSeat(rematch, participant.id);
    if (!color) {
      throw forbiddenMessage('room.error.rematch_players_only');
    }

    if (!accepted) {
      room.rematch = null;
      room.autoStartBlockedUntilSeatChange = true;

      return this.finalizeMutation(
        room,
        roomMessage('room.notice.rematch_declined', {
          displayName: participant.displayName,
        })
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

      return this.finalizeMutation(room);
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

      this.updateFinishedMatchState(room, match, nextState);

      return this.finalizeMutation(room);
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

    this.updateFinishedMatchState(room, match, result.state);

    return this.finalizeMutation(room);
  }

  private finalizeMutation(
    room: RoomRecord,
    noticeMessage: ReturnType<typeof roomMessage> | null = null
  ): MutationResult {
    const automaticNotice = this.maybeStartNextMatch(room);

    this.store.touchRoom(room);

    return {
      snapshot: this.snapshotMapper.toSnapshot(room),
      notice: automaticNotice ?? noticeMessage
        ? this.store.createNotice(automaticNotice ?? noticeMessage!)
        : undefined,
    };
  }

  private maybeStartNextMatch(
    room: RoomRecord
  ): ReturnType<typeof roomMessage> | null {
    if (room.autoStartBlockedUntilSeatChange) {
      return null;
    }

    if (room.match && room.match.state.phase !== 'finished') {
      return null;
    }

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      return null;
    }

    if (
      room.rematch &&
      (room.rematch.responses.black !== 'accepted' ||
        room.rematch.responses.white !== 'accepted')
    ) {
      return null;
    }

    if (
      room.rematch &&
      (room.rematch.participants.black !== black.id ||
        room.rematch.participants.white !== white.id)
    ) {
        return null;
    }

    const matchSettings = this.startMatchWithCurrentSeats(room, room.nextMatchSettings);

    return roomMessage('room.notice.match_started_auto', {
      mode: roomMessage(`common.mode.${matchSettings.mode}`),
    });
  }

  private startMatchWithCurrentSeats(
    room: RoomRecord,
    settings: GameStartSettings
  ): MatchSettings {
    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw badRequestMessage('room.error.both_seats_required');
    }

    const normalizedSettings = this.normalizeStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;

    const matchSettings = this.buildMatchSettings(
      normalizedSettings,
      black.displayName,
      white.displayName
    );

    room.match = {
      settings: matchSettings,
      state: getRulesEngine(matchSettings.mode).createInitialState(matchSettings),
      startedAt: this.store.timestamp(),
    };
    room.rematch = null;
    room.autoStartBlockedUntilSeatChange = false;

    return matchSettings;
  }

  private updateFinishedMatchState(
    room: RoomRecord,
    match: NonNullable<RoomRecord['match']>,
    nextState: NonNullable<RoomRecord['match']>['state']
  ): void {
    room.match = {
      ...match,
      state: nextState,
    };

    if (match.state.phase === 'finished' || nextState.phase !== 'finished') {
      return;
    }

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    room.rematch =
      black && white
        ? this.createRematchState(black.id, white.id)
        : null;
    room.autoStartBlockedUntilSeatChange = false;
  }

  private createRematchState(
    blackParticipantId: string,
    whiteParticipantId: string
  ): HostedRematchState {
    return {
      participants: {
        black: blackParticipantId,
        white: whiteParticipantId,
      },
      responses: {
        black: 'pending',
        white: 'pending',
      },
    };
  }

  private handleSeatChange(room: RoomRecord): void {
    room.rematch = null;
    room.autoStartBlockedUntilSeatChange = false;
  }

  private findRematchSeat(
    rematch: HostedRematchState,
    participantId: string
  ): PlayerColor | null {
    if (rematch.participants.black === participantId) {
      return 'black';
    }

    if (rematch.participants.white === participantId) {
      return 'white';
    }

    return null;
  }

  private canEditNextMatchSettings(room: RoomRecord): boolean {
    if (room.rematch) {
      return false;
    }

    if (room.match && room.match.state.phase !== 'finished') {
      return false;
    }

    return !this.store.getSeatHolder(room, 'black') || !this.store.getSeatHolder(room, 'white');
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

  private normalizeStartSettings(settings: GameStartSettings): GameStartSettings {
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
      };
    }

    if (settings.boardSize !== GOMOKU_BOARD_SIZE) {
      throw badRequestMessage('room.error.invalid_gomoku_board_size');
    }

    return {
      mode: 'gomoku',
      boardSize: GOMOKU_BOARD_SIZE,
      komi: 0,
    };
  }

  private buildMatchSettings(
    settings: GameStartSettings,
    blackName: string,
    whiteName: string
  ): MatchSettings {
    return {
      mode: settings.mode,
      boardSize: settings.boardSize as MatchSettings['boardSize'],
      komi: settings.mode === 'go' ? settings.komi ?? DEFAULT_GO_KOMI : 0,
      players: {
        black: blackName,
        white: whiteName,
      },
    };
  }
}
