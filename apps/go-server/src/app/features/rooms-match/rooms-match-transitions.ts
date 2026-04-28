import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { type GameCommand, type GameStartSettings } from '@gx/go/contracts';
import { type GoMessageDescriptor, type MatchSettings } from '@gx/go/domain';
import type {
  ParticipantRecord,
  RoomRecord,
} from '../../contracts/rooms.types';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { RoomsMatchClockCalculatorService } from './rooms-match-clock';
import { RoomsMatchNigiriService } from './rooms-match-nigiri.service';
import { RoomsMatchPolicyService } from './rooms-match-policy';
import { RoomsMatchSettingsService } from './rooms-match-settings';

@Injectable()
export class RoomsMatchTransitionsService {
  private readonly logger = new Logger(RoomsMatchTransitionsService.name);

  constructor(
    @Inject(RoomsStore) private readonly store: RoomsStore,
    @Inject(RoomsRulesEngineService)
    private readonly rulesEngines: RoomsRulesEngineService,
    @Inject(RoomsErrorsService)
    private readonly roomsErrors: RoomsErrorsService,
    @Inject(RoomsMatchSettingsService)
    private readonly settings: RoomsMatchSettingsService,
    @Inject(RoomsMatchPolicyService)
    private readonly policy: RoomsMatchPolicyService,
    @Inject(RoomsMatchClockCalculatorService)
    private readonly clockCalculator: RoomsMatchClockCalculatorService,
    @Inject(RoomsMatchNigiriService)
    private readonly nigiri: RoomsMatchNigiriService,
  ) {}

  applyHostedGameCommand(
    room: RoomRecord,
    participant: ParticipantRecord,
    command: GameCommand,
  ): void {
    if (!participant.seat) {
      throw this.roomsErrors.forbidden('room.error.spectators_cannot_play');
    }

    if (command.type === 'nigiri-guess') {
      this.nigiri.resolvePendingNigiri(room, participant, command.guess);
      return;
    }

    let match = this.requireMatch(room);

    if (match.clock && match.state.phase === 'playing') {
      const advanced = this.clockCalculator.advanceHostedClock(
        match.clock,
        this.store.timestamp(),
      );
      match = {
        ...match,
        clock: advanced.clock,
      };

      if (advanced.timedOutColor) {
        this.updateFinishedMatchState(
          room,
          match,
          this.clockCalculator.createTimeoutState(
            match.state,
            advanced.timedOutColor,
          ),
        );
        return;
      }

      room.match = match;
    }

    if (command.type === 'toggle-dead') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw this.roomsErrors.badRequest(
          'room.error.dead_group_toggle_unavailable',
        );
      }

      const nextState = this.rulesEngines
        .get('go')
        .toggleDeadGroup?.(match.state, match.settings, command.point);

      if (!nextState) {
        throw this.roomsErrors.badRequest(
          'room.error.scoring_preview_unavailable',
        );
      }

      room.match = {
        ...match,
        state: nextState,
      };
      return;
    }

    if (
      command.type === 'confirm-scoring' ||
      command.type === 'finalize-scoring'
    ) {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw this.roomsErrors.badRequest(
          'room.error.score_finalization_unavailable',
        );
      }

      const nextState = this.rulesEngines
        .get('go')
        .confirmScoring?.(match.state, match.settings, participant.seat);

      if (!nextState) {
        throw this.roomsErrors.badRequest('room.error.confirm_scoring_failed');
      }

      this.updateFinishedMatchState(room, match, nextState);
      return;
    }

    if (command.type === 'dispute-scoring') {
      if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
        throw this.roomsErrors.badRequest(
          'room.error.score_dispute_unavailable',
        );
      }

      const nextState = this.rulesEngines
        .get('go')
        .disputeScoring?.(match.state, match.settings, participant.seat);

      if (!nextState) {
        throw this.roomsErrors.badRequest('room.error.dispute_scoring_failed');
      }

      const resumedClock =
        match.clock && nextState.phase === 'playing'
          ? this.clockCalculator.activateHostedClock(
              match.clock,
              nextState.nextPlayer,
              this.store.timestamp(),
            )
          : match.clock;

      room.match = {
        ...match,
        clock: resumedClock,
        state: nextState,
      };
      return;
    }

    if (match.state.phase !== 'playing') {
      throw this.roomsErrors.badRequest('room.error.match_not_accepting_moves');
    }

    if (
      command.type !== 'resign' &&
      match.state.nextPlayer !== participant.seat
    ) {
      throw this.roomsErrors.forbidden('room.error.not_your_turn');
    }

    if (
      command.type === 'resign' &&
      command.player &&
      command.player !== participant.seat
    ) {
      throw this.roomsErrors.forbidden('room.error.resign_only_for_self');
    }

    const normalizedCommand =
      command.type === 'resign'
        ? {
            type: 'resign' as const,
            player: participant.seat,
          }
        : command;
    const result = this.rulesEngines
      .get(match.settings.mode)
      .applyMove(match.state, match.settings, normalizedCommand);

    if (!result.ok) {
      throw new BadRequestException({
        message:
          result.error ??
          this.roomsErrors.roomMessage('room.error.move_rejected'),
      });
    }

    const nextClock = match.clock
      ? this.clockCalculator.completeHostedClockTurn(
          match.clock,
          result.state.nextPlayer,
          result.state.phase,
          this.store.timestamp(),
        )
      : null;

    this.updateFinishedMatchState(
      room,
      {
        ...match,
        clock: nextClock,
      },
      result.state,
    );
  }

  maybeStartNextMatch(room: RoomRecord): GoMessageDescriptor | null {
    const readiness = this.policy.getAutoStartReadiness(room);

    if (this.policy.isAutoStartReady(readiness)) {
      const nigiriNotice = this.nigiri.maybeBeginDigitalNigiri(room);

      if (nigiriNotice) {
        return nigiriNotice;
      }

      if (room.nigiri?.status === 'pending') {
        this.logAutoStartSkip(room, 'waiting_for_nigiri_guess', {
          nigiri: room.nigiri,
        });
        return null;
      }

      const matchSettings = this.startMatchWithCurrentSeats(
        room,
        room.nextMatchSettings,
      );
      this.logger.log(
        `[auto-start] started in room ${room.id} with ${matchSettings.mode} ${matchSettings.boardSize}x${matchSettings.boardSize} (black: ${matchSettings.players.black}, white: ${matchSettings.players.white})`,
      );

      return this.roomsErrors.roomMessage('room.notice.match_started_auto', {
        mode: this.roomsErrors.roomMessage(`common.mode.${matchSettings.mode}`),
      });
    }

    this.logAutoStartSkip(room, readiness.reason, readiness.extra);

    return null;
  }

  maybeBeginDigitalNigiri(room: RoomRecord): GoMessageDescriptor | null {
    return this.nigiri.maybeBeginDigitalNigiri(room);
  }

  startMatchWithCurrentSeats(
    room: RoomRecord,
    settings: GameStartSettings,
  ): MatchSettings {
    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    if (!black || !white) {
      throw this.roomsErrors.badRequest('room.error.both_seats_required');
    }

    room.nextMatchSettings = settings;

    const matchSettings = this.settings.buildHostedMatchSettings(
      settings,
      black.displayName,
      white.displayName,
    );
    const resolvedNigiri =
      this.nigiri.requiresDigitalNigiri(settings) &&
      room.nigiri?.status === 'resolved'
        ? room.nigiri
        : null;

    const startedAt = this.store.timestamp();
    room.match = {
      settings: matchSettings,
      state: this.rulesEngines
        .get(matchSettings.mode)
        .createInitialState(matchSettings),
      startedAt,
      clock: this.clockCalculator.createHostedClock(matchSettings, startedAt),
    };
    room.rematch = null;
    room.nigiri = resolvedNigiri;
    room.nigiriSecret = null;
    room.autoStartBlockedUntilSeatChange = false;

    return matchSettings;
  }

  updateFinishedMatchState(
    room: RoomRecord,
    match: NonNullable<RoomRecord['match']>,
    nextState: NonNullable<RoomRecord['match']>['state'],
  ): void {
    room.match = {
      ...match,
      state: nextState,
    };

    if (match.state.phase === 'finished' || nextState.phase !== 'finished') {
      return;
    }

    room.nigiri = null;
    room.nigiriSecret = null;

    const black = this.store.getSeatHolder(room, 'black');
    const white = this.store.getSeatHolder(room, 'white');

    room.rematch =
      black && white
        ? this.policy.createHostedRematchState(black.id, white.id)
        : null;
    room.autoStartBlockedUntilSeatChange = false;
  }

  private logAutoStartSkip(
    room: RoomRecord,
    reason: string,
    extra: Record<string, unknown> = {},
  ): void {
    this.logger.debug(
      `[auto-start.skip] room=${room.id} reason=${reason} context=${JSON.stringify(
        {
          matchPhase: room.match?.state.phase ?? null,
          autoStartBlockedUntilSeatChange: room.autoStartBlockedUntilSeatChange,
          hasRematch: room.rematch !== null,
          seatState: {
            black: this.store.getSeatHolder(room, 'black')?.id ?? null,
            white: this.store.getSeatHolder(room, 'white')?.id ?? null,
          },
          ...extra,
        },
      )}`,
    );
  }

  private requireMatch(room: RoomRecord) {
    if (!room.match) {
      throw this.roomsErrors.badRequest('room.error.no_match_started');
    }

    return room.match;
  }
}
