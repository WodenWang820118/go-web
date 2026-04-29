import {
  CommandErrorEvent,
  RoomClosedEvent,
  RoomPresenceEvent,
  RoomSnapshot,
} from '@gx/go/contracts';

import { finishGomokuMatchOverSocket, once, onceWhere } from './test-fixtures';
import {
  createRoomsContractHarness,
  type RoomsContractHarness,
} from './rooms-contract-harness';

describe('rooms realtime contract', () => {
  let harness: RoomsContractHarness;

  beforeEach(async () => {
    harness = await createRoomsContractHarness();
  }, 30000);

  afterEach(async () => {
    await harness.dispose();
  }, 30000);

  it('creates, joins, auto-starts, plays, and chats through REST plus websocket', async () => {
    const host = await harness.createRoom('Host', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = await harness.joinRoom(host.roomId, 'Guest');
    const { socket: hostSocket } = await harness.joinParticipantSocket(host);
    const { socket: guestSocket } = await harness.joinParticipantSocket(guest);

    const hostSeatClaim = once<RoomSnapshot>(hostSocket, 'room.snapshot');
    hostSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      color: 'black',
    });
    await hostSeatClaim;

    const settingsUpdated = onceWhere<RoomSnapshot>(
      hostSocket,
      'room.snapshot',
      (snapshot) =>
        snapshot.nextMatchSettings.mode === 'gomoku' &&
        snapshot.nextMatchSettings.boardSize === 15,
    );
    hostSocket.emit('room.settings.update', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      settings: {
        mode: 'gomoku',
        boardSize: 15,
      },
    });
    await settingsUpdated;

    const started = once<{
      match: { state: { phase: string; boardSize: number } };
    }>(guestSocket, 'game.updated');
    guestSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: guest.participantToken,
      color: 'white',
    });
    await expect(started).resolves.toMatchObject({
      match: {
        state: {
          phase: 'playing',
          boardSize: 15,
        },
      },
    });

    const moveUpdate = once<{ match: { state: { moveHistory: unknown[] } } }>(
      guestSocket,
      'game.updated',
    );
    hostSocket.emit('game.command', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      command: {
        type: 'place',
        point: { x: 7, y: 7 },
      },
    });
    await expect(moveUpdate).resolves.toMatchObject({
      match: {
        state: {
          moveHistory: expect.arrayContaining([expect.anything()]),
        },
      },
    });

    const chatUpdate = once<{ message: { message: string } }>(
      guestSocket,
      'chat.message',
    );
    hostSocket.emit('chat.send', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      message: 'Good luck!',
    });
    await expect(chatUpdate).resolves.toMatchObject({
      message: {
        message: 'Good luck!',
      },
    });
  }, 30000);

  it('rejects non-host room settings updates over the socket', async () => {
    const host = await harness.createRoom('Host', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = await harness.joinRoom(host.roomId, 'Guest');
    const { socket: guestSocket } = await harness.joinParticipantSocket(guest);

    const rejected = once<CommandErrorEvent>(guestSocket, 'command.error');
    guestSocket.emit('room.settings.update', {
      roomId: host.roomId,
      participantToken: guest.participantToken,
      settings: {
        mode: 'go',
        boardSize: 9,
      },
    });

    await expect(rejected).resolves.toMatchObject({
      code: '403',
      message: {
        key: 'room.error.host_only_action',
      },
    });
    await expect(harness.getRoom(host.roomId)).resolves.toMatchObject({
      snapshot: {
        nextMatchSettings: {
          mode: 'gomoku',
          boardSize: 15,
        },
      },
    });
  }, 30000);

  it('waits for both seated players to accept a rematch before auto-starting again', async () => {
    const host = await harness.createRoom('Host', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = await harness.joinRoom(host.roomId, 'Guest');
    const { socket: hostSocket } = await harness.joinParticipantSocket(host);
    const { socket: guestSocket } = await harness.joinParticipantSocket(guest);

    const settingsUpdated = onceWhere<RoomSnapshot>(
      hostSocket,
      'room.snapshot',
      (snapshot) =>
        snapshot.nextMatchSettings.mode === 'gomoku' &&
        snapshot.nextMatchSettings.boardSize === 15,
    );
    hostSocket.emit('room.settings.update', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      settings: {
        mode: 'gomoku',
        boardSize: 15,
      },
    });
    await settingsUpdated;

    const hostClaimSnapshot = onceWhere<RoomSnapshot>(
      hostSocket,
      'room.snapshot',
      (snapshot) => snapshot.seatState.black === host.participantId,
    );
    hostSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      color: 'black',
    });
    await hostClaimSnapshot;

    const started = onceWhere<{ match: { state: { phase: string } } }>(
      guestSocket,
      'game.updated',
      (event) => event.match?.state.phase === 'playing',
    );
    guestSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: guest.participantToken,
      color: 'white',
    });
    await started;

    const rematchReadyPromise = onceWhere<RoomSnapshot>(
      hostSocket,
      'room.snapshot',
      (snapshot) =>
        snapshot.rematch?.responses.black === 'pending' &&
        snapshot.rematch?.responses.white === 'pending' &&
        snapshot.match?.state.phase === 'finished',
    );
    await finishGomokuMatchOverSocket(hostSocket, guestSocket, host, guest);
    const rematchReady = await rematchReadyPromise;
    expect(rematchReady.rematch).not.toBeNull();

    const hostAccepted = onceWhere<RoomSnapshot>(
      guestSocket,
      'room.snapshot',
      (snapshot) => snapshot.rematch?.responses.black === 'accepted',
    );
    hostSocket.emit('game.rematch.respond', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      accepted: true,
    });
    await hostAccepted;

    const restarted = onceWhere<{
      match: { state: { phase: string; moveHistory: unknown[] } };
    }>(
      hostSocket,
      'game.updated',
      (event) =>
        event.match?.state.phase === 'playing' &&
        event.match.state.moveHistory.length === 0,
    );
    guestSocket.emit('game.rematch.respond', {
      roomId: host.roomId,
      participantToken: guest.participantToken,
      accepted: true,
    });
    await restarted;
  }, 30000);

  it('allows a polling guest to claim white after the host claims black', async () => {
    const host = await harness.createRoom('Host', {
      mode: 'gomoku',
      boardSize: 15,
    });
    const guest = await harness.joinRoom(host.roomId, 'Guest');
    const { socket: hostSocket } = await harness.joinParticipantSocket(host);
    const { socket: guestSocket } = await harness.joinParticipantSocket(guest, [
      'polling',
    ]);

    expect(guestSocket.io.engine.transport.name).toBe('polling');

    const guestSawHostClaim = onceWhere<RoomPresenceEvent>(
      guestSocket,
      'room.presence',
      (event) => event.seatState.black === host.participantId,
    );
    const hostClaimSnapshot = onceWhere<RoomSnapshot>(
      hostSocket,
      'room.snapshot',
      (snapshot) => snapshot.seatState.black === host.participantId,
    );
    hostSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      color: 'black',
    });
    await Promise.all([guestSawHostClaim, hostClaimSnapshot]);

    const hostSawGuestClaim = onceWhere<RoomPresenceEvent>(
      hostSocket,
      'room.presence',
      (event) =>
        event.seatState.black === host.participantId &&
        event.seatState.white === guest.participantId,
    );
    const guestClaimSnapshot = onceWhere<RoomSnapshot>(
      guestSocket,
      'room.snapshot',
      (snapshot) =>
        snapshot.seatState.black === host.participantId &&
        snapshot.seatState.white === guest.participantId,
    );
    guestSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: guest.participantToken,
      color: 'white',
    });

    const [, finalSnapshot] = await Promise.all([
      hostSawGuestClaim,
      guestClaimSnapshot,
    ]);

    expect(finalSnapshot.seatState).toEqual({
      black: host.participantId,
      white: guest.participantId,
    });
    expect(
      finalSnapshot.participants.find(
        (participant) => participant.participantId === guest.participantId,
      ),
    ).toMatchObject({
      online: true,
      seat: 'white',
    });
  }, 30000);

  it('broadcasts room.closed and disconnects room sockets when the host closes the room', async () => {
    const host = await harness.createRoom('Host');
    const guest = await harness.joinRoom(host.roomId, 'Guest');
    await harness.joinParticipantSocket(host);
    const { socket: guestSocket } = await harness.joinParticipantSocket(guest);

    const roomClosed = onceWhere<RoomClosedEvent>(
      guestSocket,
      'room.closed',
      (event) => event.roomId === host.roomId,
    );
    const guestDisconnected = once(guestSocket, 'disconnect');

    await harness.closeRoom(host.roomId, host.participantToken);

    await expect(roomClosed).resolves.toMatchObject({
      roomId: host.roomId,
    });
    await guestDisconnected;
  }, 30000);
});
