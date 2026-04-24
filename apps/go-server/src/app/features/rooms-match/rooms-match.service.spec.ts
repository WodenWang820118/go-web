import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_HOSTED_BYO_YOMI,
  GOMOKU_FREE_OPENING,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
} from '@gx/go/domain';
import { RoomsErrorsService } from '../../core/rooms-errors/rooms-errors.service';
import { RoomsMatchService } from './rooms-match.service';
import { RoomsRulesEngineService } from '../../core/rooms-rules-engine/rooms-rules-engine.service';
import { RoomsSnapshotMapper } from '../../core/rooms-snapshot/rooms-snapshot-mapper.service';
import { RoomsStore } from '../../core/rooms-store/rooms-store.service';
import { RoomsLifecycleService } from '../rooms-lifecycle/rooms-lifecycle.service';

describe('RoomsMatchService', () => {
  let lifecycle: RoomsLifecycleService;
  let match: RoomsMatchService;

  beforeEach(() => {
    const roomsErrors = new RoomsErrorsService();
    const store = new RoomsStore(roomsErrors);
    const snapshotMapper = new RoomsSnapshotMapper(store);
    const rulesEngines = new RoomsRulesEngineService();

    lifecycle = new RoomsLifecycleService(store, snapshotMapper, roomsErrors);
    match = new RoomsMatchService(
      store,
      snapshotMapper,
      rulesEngines,
      roomsErrors,
    );
  });

  afterEach(() => {
    lifecycle.onModuleDestroy();
  });

  it('auto-starts with the saved next-match settings after the second seat is claimed', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    match.claimSeat(host.roomId, host.participantToken, 'black');
    const started = match.claimSeat(
      host.roomId,
      guest.participantToken,
      'white',
    );

    expect(started.snapshot.nextMatchSettings).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
    expect(started.snapshot.match?.settings.mode).toBe('gomoku');
    expect(started.snapshot.match?.settings.players.black).toBe('Host');
    expect(started.snapshot.match?.settings.players.white).toBe('Guest');
  });

  it('creates a rematch gate when a hosted match finishes and starts again after both players accept', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    match.claimSeat(host.roomId, host.participantToken, 'black');
    match.claimSeat(host.roomId, guest.participantToken, 'white');
    finishGomokuMatch(
      match,
      host.roomId,
      host.participantToken,
      guest.participantToken,
    );

    const finishedSnapshot = lifecycle.getRoom(host.roomId).snapshot;

    expect(finishedSnapshot.match?.state.phase).toBe('finished');
    expect(finishedSnapshot.rematch).toEqual({
      participants: {
        black: host.participantId,
        white: guest.participantId,
      },
      responses: {
        black: 'pending',
        white: 'pending',
      },
    });

    const waiting = match.respondToRematch(
      host.roomId,
      host.participantToken,
      true,
    );
    expect(waiting.snapshot.rematch?.responses.black).toBe('accepted');
    expect(waiting.snapshot.match?.state.phase).toBe('finished');

    const restarted = match.respondToRematch(
      host.roomId,
      guest.participantToken,
      true,
    );
    expect(restarted.snapshot.rematch).toBeNull();
    expect(restarted.snapshot.match?.state.phase).toBe('playing');
    expect(restarted.snapshot.match?.state.moveHistory).toHaveLength(0);
  });

  it('blocks a new game after a rematch decline until a seat changes', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    match.claimSeat(host.roomId, host.participantToken, 'black');
    match.claimSeat(host.roomId, guest.participantToken, 'white');
    finishGomokuMatch(
      match,
      host.roomId,
      host.participantToken,
      guest.participantToken,
    );

    const declined = match.respondToRematch(
      host.roomId,
      host.participantToken,
      false,
    );
    expect(declined.snapshot.rematch).toBeNull();
    expect(declined.snapshot.autoStartBlockedUntilSeatChange).toBe(true);
    expect(declined.snapshot.match?.state.phase).toBe('finished');

    expect(() =>
      match.startMatch(host.roomId, host.participantToken, {
        mode: 'gomoku',
        boardSize: 15,
      }),
    ).toThrow(BadRequestException);

    const released = match.releaseSeat(host.roomId, host.participantToken);
    expect(released.snapshot.autoStartBlockedUntilSeatChange).toBe(false);
    expect(released.snapshot.seatState.black).toBeNull();

    const restarted = match.claimSeat(
      host.roomId,
      host.participantToken,
      'black',
    );
    expect(restarted.snapshot.match?.state.phase).toBe('playing');
    expect(restarted.snapshot.rematch).toBeNull();
  });

  it('cancels a pending rematch if one of the seated players leaves a seat', () => {
    const host = lifecycle.createRoom('Host', 'create:test');
    const guest = lifecycle.joinRoom(
      host.roomId,
      'Guest',
      undefined,
      'join:test',
    );

    match.updateNextMatchSettings(host.roomId, host.participantToken, {
      mode: 'gomoku',
      boardSize: 15,
    });

    match.claimSeat(host.roomId, host.participantToken, 'black');
    match.claimSeat(host.roomId, guest.participantToken, 'white');
    finishGomokuMatch(
      match,
      host.roomId,
      host.participantToken,
      guest.participantToken,
    );
    match.respondToRematch(host.roomId, host.participantToken, true);

    const released = match.releaseSeat(host.roomId, host.participantToken);
    expect(released.snapshot.rematch).toBeNull();
    expect(released.snapshot.autoStartBlockedUntilSeatChange).toBe(false);

    const restarted = match.claimSeat(
      host.roomId,
      host.participantToken,
      'black',
    );
    expect(restarted.snapshot.match?.state.phase).toBe('playing');
  });
});

function finishGomokuMatch(
  match: RoomsMatchService,
  roomId: string,
  hostToken: string,
  guestToken: string,
): void {
  const sequence = [
    { token: hostToken, point: { x: 0, y: 0 } },
    { token: guestToken, point: { x: 0, y: 1 } },
    { token: hostToken, point: { x: 1, y: 0 } },
    { token: guestToken, point: { x: 1, y: 1 } },
    { token: hostToken, point: { x: 2, y: 0 } },
    { token: guestToken, point: { x: 2, y: 1 } },
    { token: hostToken, point: { x: 3, y: 0 } },
    { token: guestToken, point: { x: 3, y: 1 } },
    { token: hostToken, point: { x: 4, y: 0 } },
  ];

  for (const move of sequence) {
    match.applyGameCommand(roomId, move.token, {
      type: 'place',
      point: move.point,
    });
  }
}
