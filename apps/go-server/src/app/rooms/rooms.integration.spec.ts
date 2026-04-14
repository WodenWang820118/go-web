import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CreateRoomResponse,
  JoinRoomResponse,
  ListRoomsResponse,
  RoomPresenceEvent,
  RoomSnapshot,
} from '@gx/go/contracts';
import request from 'supertest';
import { Socket, io } from 'socket.io-client';
import { AppModule } from '../app.module';
import { configureApp } from '../app.bootstrap';

describe('rooms integration', () => {
  let app: INestApplication;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  }, 30000);

  afterEach(async () => {
    for (const socket of sockets) {
      socket.disconnect();
    }

    sockets.length = 0;
    await app.close();
  }, 30000);

  it(
    'creates, joins, auto-starts, plays, and chats through REST plus websocket',
    async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host' })
      .expect(201);
    const host = createdResponse.body as CreateRoomResponse;

    const joinedResponse = await request(app.getHttpServer())
      .post(`/api/rooms/${host.roomId}/join`)
      .send({ displayName: 'Guest' })
      .expect(201);
    const guest = joinedResponse.body as JoinRoomResponse;

    const hostSocket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
    });
    const guestSocket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
    });

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
      const createdResponse = await request(app.getHttpServer())
        .post('/api/rooms')
        .send({ displayName: 'Host' })
        .expect(201);
      const host = createdResponse.body as CreateRoomResponse;

      const joinedResponse = await request(app.getHttpServer())
        .post(`/api/rooms/${host.roomId}/join`)
        .send({ displayName: 'Guest' })
        .expect(201);
      const guest = joinedResponse.body as JoinRoomResponse;

      const hostSocket = io(baseUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        forceNew: true,
      });
      const guestSocket = io(baseUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        forceNew: true,
      });

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
      const createdResponse = await request(app.getHttpServer())
        .post('/api/rooms')
        .send({ displayName: 'Host' })
        .expect(201);
      const host = createdResponse.body as CreateRoomResponse;

      const joinedResponse = await request(app.getHttpServer())
        .post(`/api/rooms/${host.roomId}/join`)
        .send({ displayName: 'Guest' })
        .expect(201);
      const guest = joinedResponse.body as JoinRoomResponse;

      const hostSocket = io(baseUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        forceNew: true,
      });
      const guestSocket = io(baseUrl, {
        path: '/socket.io',
        transports: ['polling'],
        forceNew: true,
      });

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

  it('lists public lobby rooms through the REST API', async () => {
    const waitingResponse = await request(app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host Waiting' })
      .expect(201);
    const waitingRoom = waitingResponse.body as CreateRoomResponse;

    await request(app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host Offline' })
      .expect(201);

    const waitingSocket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
    });

    sockets.push(waitingSocket);
    await waitForConnect(waitingSocket);

    const waitingJoined = once<RoomSnapshot>(waitingSocket, 'room.snapshot');
    waitingSocket.emit('room.join', {
      roomId: waitingRoom.roomId,
      participantToken: waitingRoom.participantToken,
    });
    await waitingJoined;

    const listResponse = await request(app.getHttpServer())
      .get('/api/rooms')
      .expect(200);
    const body = listResponse.body as ListRoomsResponse;

    expect(body.rooms).toEqual([
      expect.objectContaining({
        roomId: waitingRoom.roomId,
        hostDisplayName: 'Host Waiting',
        status: 'waiting',
        participantCount: 1,
        onlineCount: 1,
        spectatorCount: 1,
      }),
    ]);
  });
});

function waitForConnect(socket: Socket): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

  return once(socket, 'connect');
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise(resolve => {
    socket.once(event, resolve);
  });
}

function onceWhere<T>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean,
  timeoutMs = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    const handler = (payload: T) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);
  });
}

async function finishGomokuMatchOverSocket(
  hostSocket: Socket,
  guestSocket: Socket,
  host: CreateRoomResponse,
  guest: JoinRoomResponse
): Promise<void> {
  const sequence = [
    {
      socket: hostSocket,
      token: host.participantToken,
      point: { x: 0, y: 0 },
    },
    {
      socket: guestSocket,
      token: guest.participantToken,
      point: { x: 0, y: 1 },
    },
    {
      socket: hostSocket,
      token: host.participantToken,
      point: { x: 1, y: 0 },
    },
    {
      socket: guestSocket,
      token: guest.participantToken,
      point: { x: 1, y: 1 },
    },
    {
      socket: hostSocket,
      token: host.participantToken,
      point: { x: 2, y: 0 },
    },
    {
      socket: guestSocket,
      token: guest.participantToken,
      point: { x: 2, y: 1 },
    },
    {
      socket: hostSocket,
      token: host.participantToken,
      point: { x: 3, y: 0 },
    },
    {
      socket: guestSocket,
      token: guest.participantToken,
      point: { x: 3, y: 1 },
    },
    {
      socket: hostSocket,
      token: host.participantToken,
      point: { x: 4, y: 0 },
    },
  ];

  for (const [index, move] of sequence.entries()) {
    const finishedMove = index === sequence.length - 1;
    const nextUpdate = onceWhere<{ match: { state: { phase: string } } }>(
      move.socket === hostSocket ? guestSocket : hostSocket,
      'game.updated',
      event => event.match.state.phase === (finishedMove ? 'finished' : 'playing')
    );

    move.socket.emit('game.command', {
      roomId: host.roomId,
      participantToken: move.token,
      command: {
        type: 'place',
        point: move.point,
      },
    });

    await nextUpdate;
  }
}
