import { CreateRoomResponse, JoinRoomResponse, RoomPresenceEvent, RoomSnapshot } from '@gx/go/contracts';
import request from 'supertest';
import { Socket } from 'socket.io-client';

import {
  closeNestTestApp,
  createNestTestApp,
  finishGomokuMatchOverSocket,
  once,
  onceWhere,
  openRoomSocket,
  waitForConnect,
  type NestTestAppContext,
} from './test-fixtures';

describe('rooms realtime contract', () => {
  let context: NestTestAppContext;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    context = await createNestTestApp();
  }, 30000);

  afterEach(async () => {
    await closeNestTestApp(context, sockets);
    sockets.length = 0;
  }, 30000);

  it(
    'creates, joins, auto-starts, plays, and chats through REST plus websocket',
    async () => {
      const createdResponse = await request(context.app.getHttpServer())
        .post('/api/rooms')
        .send({ displayName: 'Host' })
        .expect(201);
      const host = createdResponse.body as CreateRoomResponse;

      const joinedResponse = await request(context.app.getHttpServer())
        .post(`/api/rooms/${host.roomId}/join`)
        .send({ displayName: 'Guest' })
        .expect(201);
      const guest = joinedResponse.body as JoinRoomResponse;

      const hostSocket = openRoomSocket(context.baseUrl);
      const guestSocket = openRoomSocket(context.baseUrl);
      sockets.push(hostSocket, guestSocket);

      await waitForConnect(hostSocket);
      await waitForConnect(guestSocket);

      const hostJoined = once<RoomSnapshot>(hostSocket, 'room.snapshot');
      hostSocket.emit('room.join', {
        roomId: host.roomId,
        participantToken: host.participantToken,
      });
      await hostJoined;

      const guestJoined = once<RoomSnapshot>(guestSocket, 'room.snapshot');
      guestSocket.emit('room.join', {
        roomId: host.roomId,
        participantToken: guest.participantToken,
      });
      await guestJoined;

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
        snapshot =>
          snapshot.nextMatchSettings.mode === 'gomoku' &&
          snapshot.nextMatchSettings.boardSize === 15
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

      const started = once<{ match: { state: { phase: string; boardSize: number } } }>(
        guestSocket,
        'game.updated'
      );
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
        'game.updated'
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
        'chat.message'
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
    },
    30000
  );

  it(
    'waits for both seated players to accept a rematch before auto-starting again',
    async () => {
      const createdResponse = await request(context.app.getHttpServer())
        .post('/api/rooms')
        .send({ displayName: 'Host' })
        .expect(201);
      const host = createdResponse.body as CreateRoomResponse;

      const joinedResponse = await request(context.app.getHttpServer())
        .post(`/api/rooms/${host.roomId}/join`)
        .send({ displayName: 'Guest' })
        .expect(201);
      const guest = joinedResponse.body as JoinRoomResponse;

      const hostSocket = openRoomSocket(context.baseUrl);
      const guestSocket = openRoomSocket(context.baseUrl);
      sockets.push(hostSocket, guestSocket);

      await waitForConnect(hostSocket);
      await waitForConnect(guestSocket);

      const hostJoined = once<RoomSnapshot>(hostSocket, 'room.snapshot');
      hostSocket.emit('room.join', {
        roomId: host.roomId,
        participantToken: host.participantToken,
      });
      await hostJoined;

      const guestJoined = once<RoomSnapshot>(guestSocket, 'room.snapshot');
      guestSocket.emit('room.join', {
        roomId: host.roomId,
        participantToken: guest.participantToken,
      });
      await guestJoined;

      const settingsUpdated = onceWhere<RoomSnapshot>(
        hostSocket,
        'room.snapshot',
        snapshot =>
          snapshot.nextMatchSettings.mode === 'gomoku' &&
          snapshot.nextMatchSettings.boardSize === 15
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
        snapshot => snapshot.seatState.black === host.participantId
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
        event => event.match?.state.phase === 'playing'
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
        snapshot =>
          snapshot.rematch?.responses.black === 'pending' &&
          snapshot.rematch?.responses.white === 'pending' &&
          snapshot.match?.state.phase === 'finished'
      );
      await finishGomokuMatchOverSocket(hostSocket, guestSocket, host, guest);
      const rematchReady = await rematchReadyPromise;
      expect(rematchReady.rematch).not.toBeNull();

      const hostAccepted = onceWhere<RoomSnapshot>(
        guestSocket,
        'room.snapshot',
        snapshot => snapshot.rematch?.responses.black === 'accepted'
      );
      hostSocket.emit('game.rematch.respond', {
        roomId: host.roomId,
        participantToken: host.participantToken,
        accepted: true,
      });
      await hostAccepted;

      const restarted = onceWhere<{ match: { state: { phase: string; moveHistory: unknown[] } } }>(
        hostSocket,
        'game.updated',
        event =>
          event.match?.state.phase === 'playing' &&
          event.match.state.moveHistory.length === 0
      );
      guestSocket.emit('game.rematch.respond', {
        roomId: host.roomId,
        participantToken: guest.participantToken,
        accepted: true,
      });
      await restarted;
    },
    30000
  );

  it(
    'allows a polling guest to claim white after the host claims black',
    async () => {
      const createdResponse = await request(context.app.getHttpServer())
        .post('/api/rooms')
        .send({ displayName: 'Host' })
        .expect(201);
      const host = createdResponse.body as CreateRoomResponse;

      const joinedResponse = await request(context.app.getHttpServer())
        .post(`/api/rooms/${host.roomId}/join`)
        .send({ displayName: 'Guest' })
        .expect(201);
      const guest = joinedResponse.body as JoinRoomResponse;

      const hostSocket = openRoomSocket(context.baseUrl);
      const guestSocket = openRoomSocket(context.baseUrl, ['polling']);
      sockets.push(hostSocket, guestSocket);

      await waitForConnect(hostSocket);
      await waitForConnect(guestSocket);

      expect(guestSocket.io.engine.transport.name).toBe('polling');

      const hostJoined = onceWhere<RoomSnapshot>(
        hostSocket,
        'room.snapshot',
        snapshot => snapshot.roomId === host.roomId
      );
      hostSocket.emit('room.join', {
        roomId: host.roomId,
        participantToken: host.participantToken,
      });
      await hostJoined;

      const guestJoined = onceWhere<RoomSnapshot>(
        guestSocket,
        'room.snapshot',
        snapshot => snapshot.roomId === host.roomId
      );
      guestSocket.emit('room.join', {
        roomId: host.roomId,
        participantToken: guest.participantToken,
      });
      await guestJoined;

      const guestSawHostClaim = onceWhere<RoomPresenceEvent>(
        guestSocket,
        'room.presence',
        event => event.seatState.black === host.participantId
      );
      const hostClaimSnapshot = onceWhere<RoomSnapshot>(
        hostSocket,
        'room.snapshot',
        snapshot => snapshot.seatState.black === host.participantId
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
        event =>
          event.seatState.black === host.participantId &&
          event.seatState.white === guest.participantId
      );
      const guestClaimSnapshot = onceWhere<RoomSnapshot>(
        guestSocket,
        'room.snapshot',
        snapshot =>
          snapshot.seatState.black === host.participantId &&
          snapshot.seatState.white === guest.participantId
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
          participant => participant.participantId === guest.participantId
        )
      ).toMatchObject({
        online: true,
        seat: 'white',
      });
    },
    30000
  );
});
