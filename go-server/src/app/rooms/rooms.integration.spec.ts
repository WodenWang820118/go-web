import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CreateRoomResponse,
  JoinRoomResponse,
  RoomSnapshot,
} from '@org/go/contracts';
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
    'creates, joins, starts, plays, and chats through REST plus websocket',
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

    const guestSeatClaim = once<RoomSnapshot>(guestSocket, 'room.snapshot');
    guestSocket.emit('seat.claim', {
      roomId: host.roomId,
      participantToken: guest.participantToken,
      color: 'white',
    });
    await guestSeatClaim;

    const started = once<{ match: { state: { phase: string } } }>(
      guestSocket,
      'game.updated'
    );
    hostSocket.emit('game.start', {
      roomId: host.roomId,
      participantToken: host.participantToken,
      settings: {
        mode: 'gomoku',
        boardSize: 15,
      },
    });
    await expect(started).resolves.toMatchObject({
      match: {
        state: {
          phase: 'playing',
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
