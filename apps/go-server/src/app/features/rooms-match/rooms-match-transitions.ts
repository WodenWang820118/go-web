import { BadRequestException, Logger } from '@nestjs/common';
import { type GameCommand, type GameStartSettings } from '@gx/go/contracts';
import { type GoMessageDescriptor, type MatchSettings } from '@gx/go/domain';
import type {
  ParticipantRecord,
  RoomRecord,
} from '../../contracts/rooms.types';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { buildHostedMatchSettings } from './rooms-match-settings';
import {
  createHostedRematchState,
  getAutoStartReadiness,
  isAutoStartReady,
} from './rooms-match-policy';

export interface RoomsMatchTransitionDependencies {
  logger: Logger;
  store: RoomsStore;
  rulesEngines: RoomsRulesEngineService;
  roomsErrors: RoomsErrorsService;
}

export function applyHostedGameCommand(
  room: RoomRecord,
  participant: ParticipantRecord,
  command: GameCommand,
  dependencies: RoomsMatchTransitionDependencies,
): void {
  const match = requireMatch(room, dependencies.roomsErrors);

  if (!participant.seat) {
    throw dependencies.roomsErrors.forbidden(
      'room.error.spectators_cannot_play',
    );
  }

  if (command.type === 'toggle-dead') {
    if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
      throw dependencies.roomsErrors.badRequest(
        'room.error.dead_group_toggle_unavailable',
      );
    }

    const nextState = dependencies.rulesEngines
      .get('go')
      .toggleDeadGroup?.(match.state, match.settings, command.point);

    if (!nextState) {
      throw dependencies.roomsErrors.badRequest(
        'room.error.scoring_preview_unavailable',
      );
    }

    room.match = {
      ...match,
      state: nextState,
    };
    return;
  }

  if (command.type === 'finalize-scoring') {
    if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
      throw dependencies.roomsErrors.badRequest(
        'room.error.score_finalization_unavailable',
      );
    }

    const nextState = dependencies.rulesEngines
      .get('go')
      .finalizeScoring?.(match.state, match.settings);

    if (!nextState) {
      throw dependencies.roomsErrors.badRequest(
        'room.error.finalize_scoring_failed',
      );
    }

    updateFinishedMatchState(room, match, nextState, dependencies.store);
    return;
  }

  if (match.state.phase !== 'playing') {
    throw dependencies.roomsErrors.badRequest(
      'room.error.match_not_accepting_moves',
    );
  }

  if (
    command.type !== 'resign' &&
    match.state.nextPlayer !== participant.seat
  ) {
    throw dependencies.roomsErrors.forbidden('room.error.not_your_turn');
  }

  if (
    command.type === 'resign' &&
    command.player &&
    command.player !== participant.seat
  ) {
    throw dependencies.roomsErrors.forbidden('room.error.resign_only_for_self');
  }

  const normalizedCommand =
    command.type === 'resign'
      ? {
          type: 'resign' as const,
          player: participant.seat,
        }
      : command;
  const result = dependencies.rulesEngines
    .get(match.settings.mode)
    .applyMove(match.state, match.settings, normalizedCommand);

  if (!result.ok) {
    throw new BadRequestException({
      message:
        result.error ??
        dependencies.roomsErrors.roomMessage('room.error.move_rejected'),
    });
  }

  updateFinishedMatchState(room, match, result.state, dependencies.store);
}

export function maybeStartNextMatch(
  room: RoomRecord,
  dependencies: RoomsMatchTransitionDependencies,
): GoMessageDescriptor | null {
  const readiness = getAutoStartReadiness(room, dependencies.store);

  if (isAutoStartReady(readiness)) {
    const matchSettings = startMatchWithCurrentSeats(
      room,
      room.nextMatchSettings,
      dependencies,
    );
    dependencies.logger.log(
      `[auto-start] started in room ${room.id} with ${matchSettings.mode} ${matchSettings.boardSize}x${matchSettings.boardSize} (black: ${matchSettings.players.black}, white: ${matchSettings.players.white})`,
    );

    return dependencies.roomsErrors.roomMessage(
      'room.notice.match_started_auto',
      {
        mode: dependencies.roomsErrors.roomMessage(
          `common.mode.${matchSettings.mode}`,
        ),
      },
    );
  }

  logAutoStartSkip(room, readiness.reason, dependencies, readiness.extra);

  return null;
}

export function startMatchWithCurrentSeats(
  room: RoomRecord,
  settings: GameStartSettings,
  dependencies: RoomsMatchTransitionDependencies,
): MatchSettings {
  const black = dependencies.store.getSeatHolder(room, 'black');
  const white = dependencies.store.getSeatHolder(room, 'white');

  if (!black || !white) {
    throw dependencies.roomsErrors.badRequest('room.error.both_seats_required');
  }

  room.nextMatchSettings = settings;

  const matchSettings = buildHostedMatchSettings(
    settings,
    black.displayName,
    white.displayName,
  );

  room.match = {
    settings: matchSettings,
    state: dependencies.rulesEngines
      .get(matchSettings.mode)
      .createInitialState(matchSettings),
    startedAt: dependencies.store.timestamp(),
  };
  room.rematch = null;
  room.autoStartBlockedUntilSeatChange = false;

  return matchSettings;
}

export function updateFinishedMatchState(
  room: RoomRecord,
  match: NonNullable<RoomRecord['match']>,
  nextState: NonNullable<RoomRecord['match']>['state'],
  store: RoomsStore,
): void {
  room.match = {
    ...match,
    state: nextState,
  };

  if (match.state.phase === 'finished' || nextState.phase !== 'finished') {
    return;
  }

  const black = store.getSeatHolder(room, 'black');
  const white = store.getSeatHolder(room, 'white');

  room.rematch =
    black && white ? createHostedRematchState(black.id, white.id) : null;
  room.autoStartBlockedUntilSeatChange = false;
}

function logAutoStartSkip(
  room: RoomRecord,
  reason: string,
  dependencies: RoomsMatchTransitionDependencies,
  extra: Record<string, unknown> = {},
): void {
  dependencies.logger.debug(
    `[auto-start.skip] room=${room.id} reason=${reason} context=${JSON.stringify(
      {
        matchPhase: room.match?.state.phase ?? null,
        autoStartBlockedUntilSeatChange: room.autoStartBlockedUntilSeatChange,
        hasRematch: room.rematch !== null,
        seatState: {
          black: dependencies.store.getSeatHolder(room, 'black')?.id ?? null,
          white: dependencies.store.getSeatHolder(room, 'white')?.id ?? null,
        },
        ...extra,
      },
    )}`,
  );
}

function requireMatch(room: RoomRecord, roomsErrors: RoomsErrorsService) {
  if (!room.match) {
    throw roomsErrors.badRequest('room.error.no_match_started');
  }

  return room.match;
}
