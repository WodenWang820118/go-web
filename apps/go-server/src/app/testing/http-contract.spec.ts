import { CreateRoomResponse, JoinRoomResponse, ListRoomsResponse } from '@gx/go/contracts';
import request from 'supertest';
import { Socket } from 'socket.io-client';

import {
  closeNestTestApp,
  createNestTestApp,
  once,
  openRoomSocket,
  waitForConnect,
  type NestTestAppContext,
} from './test-fixtures';

describe('rooms HTTP contract', () => {
  let context: NestTestAppContext;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    context = await createNestTestApp();
  }, 30000);

  afterEach(async () => {
    await closeNestTestApp(context, sockets);
    sockets.length = 0;
  }, 30000);

  it('returns the public health payload at /api/health', async () => {
    const response = await request(context.app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      time: expect.any(String),
    });
  });

  it('creates, joins, and fetches a room through the REST contract', async () => {
    const createResponse = await request(context.app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host' })
      .expect(201);
    const host = createResponse.body as CreateRoomResponse;

    expect(host).toEqual({
      roomId: expect.any(String),
      participantToken: expect.any(String),
      participantId: expect.any(String),
      snapshot: expect.objectContaining({
        roomId: host.roomId,
        hostParticipantId: host.participantId,
      }),
    });

    const joinResponse = await request(context.app.getHttpServer())
      .post(`/api/rooms/${host.roomId}/join`)
      .send({ displayName: 'Guest' })
      .expect(201);
    const guest = joinResponse.body as JoinRoomResponse;

    expect(guest).toEqual({
      roomId: host.roomId,
      participantToken: expect.any(String),
      participantId: expect.any(String),
      resumed: false,
      snapshot: expect.objectContaining({
        roomId: host.roomId,
        participants: expect.arrayContaining([
          expect.objectContaining({ participantId: host.participantId }),
          expect.objectContaining({ participantId: guest.participantId }),
        ]),
      }),
    });

    const roomResponse = await request(context.app.getHttpServer())
      .get(`/api/rooms/${host.roomId}`)
      .expect(200);

    expect(roomResponse.body).toEqual({
      snapshot: expect.objectContaining({
        roomId: host.roomId,
        participants: expect.arrayContaining([
          expect.objectContaining({
            participantId: host.participantId,
            displayName: 'Host',
          }),
          expect.objectContaining({
            participantId: guest.participantId,
            displayName: 'Guest',
          }),
        ]),
      }),
    });
  });

  it('lists only public online lobby rooms through the REST API', async () => {
    const waitingResponse = await request(context.app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host Waiting' })
      .expect(201);
    const waitingRoom = waitingResponse.body as CreateRoomResponse;

    await request(context.app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host Offline' })
      .expect(201);

    const waitingSocket = openRoomSocket(context.baseUrl);
    sockets.push(waitingSocket);
    await waitForConnect(waitingSocket);

    const waitingJoined = once(waitingSocket, 'room.snapshot');
    waitingSocket.emit('room.join', {
      roomId: waitingRoom.roomId,
      participantToken: waitingRoom.participantToken,
    });
    await waitingJoined;

    const listResponse = await request(context.app.getHttpServer())
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

  it('closes a room through the REST contract and removes it from the lobby immediately', async () => {
    const createResponse = await request(context.app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host' })
      .expect(201);
    const host = createResponse.body as CreateRoomResponse;

    const waitingSocket = openRoomSocket(context.baseUrl);
    sockets.push(waitingSocket);
    await waitForConnect(waitingSocket);

    const waitingJoined = once(waitingSocket, 'room.snapshot');
    waitingSocket.emit('room.join', {
      roomId: host.roomId,
      participantToken: host.participantToken,
    });
    await waitingJoined;

    await request(context.app.getHttpServer())
      .post(`/api/rooms/${host.roomId}/close`)
      .send({ participantToken: host.participantToken })
      .expect(204);

    await request(context.app.getHttpServer())
      .get(`/api/rooms/${host.roomId}`)
      .expect(404);

    const listResponse = await request(context.app.getHttpServer())
      .get('/api/rooms')
      .expect(200);
    const body = listResponse.body as ListRoomsResponse;

    expect(body.rooms).toEqual([]);
  });

  it('rejects close-room requests from non-host participants', async () => {
    const createResponse = await request(context.app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: 'Host' })
      .expect(201);
    const host = createResponse.body as CreateRoomResponse;

    const joinResponse = await request(context.app.getHttpServer())
      .post(`/api/rooms/${host.roomId}/join`)
      .send({ displayName: 'Guest' })
      .expect(201);
    const guest = joinResponse.body as JoinRoomResponse;

    await request(context.app.getHttpServer())
      .post(`/api/rooms/${host.roomId}/close`)
      .send({ participantToken: guest.participantToken })
      .expect(403);
  });
});
