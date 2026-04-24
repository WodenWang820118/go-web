import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Logger } from '@nestjs/common';
import {
  type GameCommand,
  type GameStartSettings,
  type HostedNigiriPendingSnapshot,
  type NigiriGuess,
} from '@gx/go/contracts';
import {
  GO_DIGITAL_NIGIRI_OPENING,
  otherPlayer,
  type GoMessageDescriptor,
  type MatchSettings,
  type PlayerColor,
} from '@gx/go/domain';
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
import {
  activateHostedClock,
  advanceHostedClock,
  completeHostedClockTurn,
  createHostedClock,
  createTimeoutState,
} from './rooms-match-clock';

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
  if (!participant.seat) {
    throw dependencies.roomsErrors.forbidden(
      'room.error.spectators_cannot_play',
    );
  }

  if (command.type === 'nigiri-guess') {
    resolvePendingNigiri(room, participant, command.guess, dependencies);
    return;
  }

  let match = requireMatch(room, dependencies.roomsErrors);

  if (match.clock && match.state.phase === 'playing') {
    const advanced = advanceHostedClock(
      match.clock,
      dependencies.store.timestamp(),
    );
    match = {
      ...match,
      clock: advanced.clock,
    };

    if (advanced.timedOutColor) {
      updateFinishedMatchState(
        room,
        match,
        createTimeoutState(match.state, advanced.timedOutColor),
        dependencies.store,
      );
      return;
    }

    room.match = match;
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

  if (
    command.type === 'confirm-scoring' ||
    command.type === 'finalize-scoring'
  ) {
    if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
      throw dependencies.roomsErrors.badRequest(
        'room.error.score_finalization_unavailable',
      );
    }

    const nextState = dependencies.rulesEngines
      .get('go')
      .confirmScoring?.(match.state, match.settings, participant.seat);

    if (!nextState) {
      throw dependencies.roomsErrors.badRequest(
        'room.error.confirm_scoring_failed',
      );
    }

    updateFinishedMatchState(room, match, nextState, dependencies.store);
    return;
  }

  if (command.type === 'dispute-scoring') {
    if (match.settings.mode !== 'go' || match.state.phase !== 'scoring') {
      throw dependencies.roomsErrors.badRequest(
        'room.error.score_dispute_unavailable',
      );
    }

    const nextState = dependencies.rulesEngines
      .get('go')
      .disputeScoring?.(match.state, match.settings, participant.seat);

    if (!nextState) {
      throw dependencies.roomsErrors.badRequest(
        'room.error.dispute_scoring_failed',
      );
    }

    const resumedClock =
      match.clock && nextState.phase === 'playing'
        ? activateHostedClock(
            match.clock,
            nextState.nextPlayer,
            dependencies.store.timestamp(),
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

  const nextClock = match.clock
    ? completeHostedClockTurn(
        match.clock,
        result.state.nextPlayer,
        result.state.phase,
        dependencies.store.timestamp(),
      )
    : null;

  updateFinishedMatchState(
    room,
    {
      ...match,
      clock: nextClock,
    },
    result.state,
    dependencies.store,
  );
}

export function maybeStartNextMatch(
  room: RoomRecord,
  dependencies: RoomsMatchTransitionDependencies,
): GoMessageDescriptor | null {
  const readiness = getAutoStartReadiness(room, dependencies.store);

  if (isAutoStartReady(readiness)) {
    const nigiriNotice = maybeBeginDigitalNigiri(room, dependencies);

    if (nigiriNotice) {
      return nigiriNotice;
    }

    if (room.nigiri?.status === 'pending') {
      logAutoStartSkip(room, 'waiting_for_nigiri_guess', dependencies, {
        nigiri: room.nigiri,
      });
      return null;
    }

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

export function maybeBeginDigitalNigiri(
  room: RoomRecord,
  dependencies: RoomsMatchTransitionDependencies,
): GoMessageDescriptor | null {
  if (!requiresDigitalNigiri(room.nextMatchSettings)) {
    return null;
  }

  if (room.nigiri) {
    return null;
  }

  const black = dependencies.store.getSeatHolder(room, 'black');
  const white = dependencies.store.getSeatHolder(room, 'white');

  if (!black || !white) {
    throw dependencies.roomsErrors.badRequest('room.error.both_seats_required');
  }

  const nigiri = createPendingNigiri('white');
  room.nigiri = nigiri.publicState;
  room.nigiriSecret = nigiri.secret;

  dependencies.logger.log(
    `[nigiri.start] pending digital nigiri in room ${room.id} (guesser: ${room.nigiri.guesser})`,
  );

  return dependencies.roomsErrors.roomMessage('room.notice.nigiri_started', {
    player: dependencies.roomsErrors.roomMessage(
      `common.player.${room.nigiri.guesser}`,
    ),
  });
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
  const resolvedNigiri =
    requiresDigitalNigiri(settings) && room.nigiri?.status === 'resolved'
      ? room.nigiri
      : null;

  const startedAt = dependencies.store.timestamp();
  room.match = {
    settings: matchSettings,
    state: dependencies.rulesEngines
      .get(matchSettings.mode)
      .createInitialState(matchSettings),
    startedAt,
    clock: createHostedClock(matchSettings, startedAt),
  };
  room.rematch = null;
  room.nigiri = resolvedNigiri;
  room.nigiriSecret = null;
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

  room.nigiri = null;
  room.nigiriSecret = null;

  const black = store.getSeatHolder(room, 'black');
  const white = store.getSeatHolder(room, 'white');

  room.rematch =
    black && white ? createHostedRematchState(black.id, white.id) : null;
  room.autoStartBlockedUntilSeatChange = false;
}

function resolvePendingNigiri(
  room: RoomRecord,
  participant: ParticipantRecord,
  guess: unknown,
  dependencies: RoomsMatchTransitionDependencies,
): void {
  const nigiri = room.nigiri;

  if (
    !requiresDigitalNigiri(room.nextMatchSettings) ||
    !nigiri ||
    nigiri.status !== 'pending'
  ) {
    throw dependencies.roomsErrors.badRequest('room.error.nigiri_unavailable');
  }

  if (participant.seat !== nigiri.guesser) {
    throw dependencies.roomsErrors.forbidden('room.error.nigiri_guesser_only');
  }

  if (!room.nigiriSecret) {
    throw dependencies.roomsErrors.badRequest('room.error.nigiri_unavailable');
  }

  if (!isNigiriGuess(guess)) {
    throw dependencies.roomsErrors.badRequest(
      'room.error.invalid_nigiri_guess',
    );
  }

  const assignedBlack: PlayerColor =
    guess === room.nigiriSecret.parity
      ? participant.seat
      : otherPlayer(participant.seat);

  assignCurrentSeatAsBlack(room, assignedBlack, dependencies);

  room.nigiri = {
    status: 'resolved',
    commitment: nigiri.commitment,
    guesser: nigiri.guesser,
    guess,
    parity: room.nigiriSecret.parity,
    nonce: room.nigiriSecret.nonce,
    assignedBlack,
  };
  room.nigiriSecret = null;
  room.rematch = null;
  room.autoStartBlockedUntilSeatChange = false;

  dependencies.logger.log(
    `[nigiri.resolve] resolved digital nigiri in room ${room.id} (guess=${guess}, parity=${room.nigiri.parity}, assignedBlack=${assignedBlack})`,
  );
}

function isNigiriGuess(value: unknown): value is NigiriGuess {
  return value === 'odd' || value === 'even';
}

function assignCurrentSeatAsBlack(
  room: RoomRecord,
  assignedBlack: PlayerColor,
  dependencies: RoomsMatchTransitionDependencies,
): void {
  if (assignedBlack === 'black') {
    return;
  }

  const black = dependencies.store.getSeatHolder(room, 'black');
  const white = dependencies.store.getSeatHolder(room, 'white');

  if (!black || !white) {
    throw dependencies.roomsErrors.badRequest('room.error.both_seats_required');
  }

  black.seat = 'white';
  white.seat = 'black';
}

function createPendingNigiri(guesser: PlayerColor): {
  publicState: HostedNigiriPendingSnapshot;
  secret: {
    parity: NigiriGuess;
    nonce: string;
  };
} {
  const parity: NigiriGuess = Math.random() < 0.5 ? 'odd' : 'even';
  const nonce = randomUUID();

  return {
    publicState: {
      status: 'pending',
      commitment: createNigiriCommitment(parity, nonce),
      guesser,
    },
    secret: {
      parity,
      nonce,
    },
  };
}

function createNigiriCommitment(parity: NigiriGuess, nonce: string): string {
  return createHash('sha256')
    .update(`gx.go:nigiri:${parity}:${nonce}`)
    .digest('hex');
}

function requiresDigitalNigiri(settings: GameStartSettings): boolean {
  return (
    settings.mode === 'go' &&
    (settings.openingRule ?? GO_DIGITAL_NIGIRI_OPENING) ===
      GO_DIGITAL_NIGIRI_OPENING
  );
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
