import {
  GameCommand,
  GameStartSettings,
  HostedRematchState,
  RoomSettingsUpdatePayload,
} from '@gx/go/contracts';
import {
  DEFAULT_GO_KOMI,
  GoMessageDescriptor,
  GOMOKU_BOARD_SIZE,
  GO_BOARD_SIZES,
  MatchSettings,
  PlayerColor,
} from '@gx/go/domain';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { MutationResult, RoomRecord } from '../../contracts/rooms.types';

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
    private readonly roomsErrors: RoomsErrorsService
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
      throw this.roomsErrors.conflict('room.error.seat_already_claimed');
    }

    if (participant.seat === color) {
      return { snapshot: this.snapshotMapper.toSnapshot(room) };
    }

    const previousSeat = participant.seat;
    participant.seat = color;
    this.handleSeatChange(room);
    this.logger.log(
      `[seat.claim] ${participant.displayName} (${participant.id}) claimed ${color} in room ${room.id} (previous: ${previousSeat ?? 'none'})`
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
          })
    );
  }

  releaseSeat(roomId: string, participantToken: string): MutationResult {
    const room = this.store.getRoomRecord(roomId);
    const participant = this.store.getParticipantByToken(room, participantToken);

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
      throw this.roomsErrors.badRequest('room.error.next_match_settings_locked');
    }

    const normalizedSettings = this.normalizeStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;

    return this.finalizeMutation(
      room,
      this.roomsErrors.roomMessage('room.notice.next_match_settings_updated', {
        mode: this.roomsErrors.roomMessage(`common.mode.${normalizedSettings.mode}`),
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
      throw this.roomsErrors.badRequest(
        'room.error.rematch_declined_wait_for_seat_change'
      );
    }

    if (room.rematch) {
      throw this.roomsErrors.badRequest('room.error.rematch_response_unavailable');
    }

    if (room.match && room.match.state.phase !== 'finished') {
      throw this.roomsErrors.badRequest('room.error.match_must_finish');
    }

    const normalizedSettings = this.normalizeStartSettings(settings);
    room.nextMatchSettings = normalizedSettings;
    const matchSettings = this.startMatchWithCurrentSeats(room, normalizedSettings);

    return this.finalizeMutation(
      room,
      this.roomsErrors.roomMessage('room.notice.match_started', {
        displayName: host.displayName,
        mode: this.roomsErrors.roomMessage(`common.mode.${matchSettings.mode}`),
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
      throw this.roomsErrors.badRequest('room.error.rematch_response_unavailable');
    }

    const color = this.findRematchSeat(rematch, participant.id);
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
      throw this.roomsErrors.forbidden('room.error.spectators_cannot_play');
    }

    if (command.type === 'toggle-dead') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw this.roomsErrors.badRequest('room.error.dead_group_toggle_unavailable');
      }

      const nextState = this.rulesEngines.get('go').toggleDeadGroup?.(
        match.state,
        match.settings,
        command.point
      );

      if (!nextState) {
        throw this.roomsErrors.badRequest('room.error.scoring_preview_unavailable');
      }

      room.match = {
        ...match,
        state: nextState,
      };

      return this.finalizeMutation(room);
    }

    if (command.type === 'finalize-scoring') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw this.roomsErrors.badRequest(
          'room.error.score_finalization_unavailable'
        );
      }

      const nextState = this.rulesEngines.get('go').finalizeScoring?.(
        match.state,
        match.settings
      );

      if (!nextState) {
        throw this.roomsErrors.badRequest('room.error.finalize_scoring_failed');
      }

      this.updateFinishedMatchState(room, match, nextState);

      return this.finalizeMutation(room);
    }

    if (match.state.phase !== 'playing') {
      throw this.roomsErrors.badRequest('room.error.match_not_accepting_moves');
    }

    if (command.type !== 'resign' && match.state.nextPlayer !== participant.seat) {
      throw this.roomsErrors.forbidden('room.error.not_your_turn');
    }

    if (command.type === 'resign' && command.player && command.player !== participant.seat) {
      throw this.roomsErrors.forbidden('room.error.resign_only_for_self');
    }

    const normalizedCommand =
      command.type === 'resign'
        ? {
            type: 'resign' as const,
            player: participant.seat,
          }
        : command;
    const result = this.rulesEngines.get(match.settings.mode).applyMove(
      match.state,
      match.settings,
      normalizedCommand
    );

    if (!result.ok) {
      throw new BadRequestException({
        message:
          result.error ?? this.roomsErrors.roomMessage('room.error.move_rejected'),
      });
    }

    this.updateFinishedMatchState(room, match, result.state);

    return this.finalizeMutation(room);
  }

  private finalizeMutation(
    room: RoomRecord,
    noticeMessage: GoMessageDescriptor | null = null
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
  ): GoMessageDescriptor | null {
    if (room.autoStartBlockedUntilSeatChange) {
      this.logAutoStartSkip(room, 'auto_start_blocked_until_seat_change');
      return null;
    }

    if (room.match && room.match.state.phase !== 'finished') {
      this.logAutoStartSkip(room, 'match_still_live');
      return null;
    }

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      this.logAutoStartSkip(room, 'both_seats_not_filled', {
        blackSeat: black?.id ?? null,
        whiteSeat: white?.id ?? null,
      });
      return null;
    }

    if (
      room.rematch &&
      (room.rematch.responses.black !== 'accepted' ||
        room.rematch.responses.white !== 'accepted')
    ) {
      this.logAutoStartSkip(room, 'waiting_for_rematch_responses', {
        rematchResponses: room.rematch.responses,
      });
      return null;
    }

    if (
      room.rematch &&
      (room.rematch.participants.black !== black.id ||
        room.rematch.participants.white !== white.id)
    ) {
      this.logAutoStartSkip(room, 'rematch_participants_mismatch', {
        rematchParticipants: room.rematch.participants,
        currentSeats: {
          black: black.id,
          white: white.id,
        },
      });
      return null;
    }

    const matchSettings = this.startMatchWithCurrentSeats(room, room.nextMatchSettings);
    this.logger.log(
      `[auto-start] started in room ${room.id} with ${matchSettings.mode} ${matchSettings.boardSize}x${matchSettings.boardSize} (black: ${matchSettings.players.black}, white: ${matchSettings.players.white})`
    );

    return this.roomsErrors.roomMessage('room.notice.match_started_auto', {
      mode: this.roomsErrors.roomMessage(`common.mode.${matchSettings.mode}`),
    });
  }

  private startMatchWithCurrentSeats(
    room: RoomRecord,
    settings: GameStartSettings
  ): MatchSettings {
    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw this.roomsErrors.badRequest('room.error.both_seats_required');
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
      state: this.rulesEngines.get(matchSettings.mode).createInitialState(matchSettings),
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
    if (room.rematch || room.autoStartBlockedUntilSeatChange) {
      this.logger.log(
        `[seat.change] reset rematch/auto-start block in room ${room.id}`
      );
    }
    room.rematch = null;
    room.autoStartBlockedUntilSeatChange = false;
  }

  private logAutoStartSkip(
    room: RoomRecord,
    reason: string,
    extra: Record<string, unknown> = {}
  ): void {
    this.logger.debug(
      `[auto-start.skip] room=${room.id} reason=${reason} context=${JSON.stringify({
        matchPhase: room.match?.state.phase ?? null,
        autoStartBlockedUntilSeatChange: room.autoStartBlockedUntilSeatChange,
        hasRematch: room.rematch !== null,
        seatState: {
          black: this.store.getSeatHolder(room, 'black')?.id ?? null,
          white: this.store.getSeatHolder(room, 'white')?.id ?? null,
        },
        ...extra,
      })}`
    );
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
      throw this.roomsErrors.badRequest('room.error.seat_change_while_live');
    }
  }

  private requireMatch(room: RoomRecord) {
    if (!room.match) {
      throw this.roomsErrors.badRequest('room.error.no_match_started');
    }

    return room.match;
  }

  private normalizeStartSettings(settings: GameStartSettings): GameStartSettings {
    if (settings.mode !== 'go' && settings.mode !== 'gomoku') {
      throw this.roomsErrors.badRequest('room.error.unsupported_mode');
    }

    if (settings.mode === 'go') {
      if (!GO_BOARD_SIZES.includes(settings.boardSize as 9 | 13 | 19)) {
        throw this.roomsErrors.badRequest('room.error.invalid_go_board_size');
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
      throw this.roomsErrors.badRequest('room.error.invalid_gomoku_board_size');
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
