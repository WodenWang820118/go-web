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
import { CREATE_ATTEMPTS_PER_WINDOW } from '../core/rooms-config/rooms.constants';

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

  it('deterministically throttles room creation after the per-requester limit', async () => {
    for (let index = 0; index < CREATE_ATTEMPTS_PER_WINDOW; index += 1) {
      await request(context.app.getHttpServer())
        .post('/api/rooms')
        .send({ displayName: `Host ${index + 1}` })
        .expect(201);
    }

    const throttledResponse = await request(context.app.getHttpServer())
      .post('/api/rooms')
      .send({ displayName: `Host ${CREATE_ATTEMPTS_PER_WINDOW + 1}` })
      .expect(429);

    expect(throttledResponse.body).toMatchObject({
      message: {
        key: 'room.error.too_many_create_attempts',
      },
    });
  });

  it('never creates more rooms than the per-requester limit during a parallel burst', async () => {
    const responses = await Promise.all(
      Array.from({ length: CREATE_ATTEMPTS_PER_WINDOW + 5 }, (_, index) =>
        request(context.app.getHttpServer())
          .post('/api/rooms')
          .send({ displayName: `Host ${index + 1}` })
      )
    );

    const createdResponses = responses.filter(response => response.status === 201);
    const throttledResponses = responses.filter(response => response.status === 429);

    expect(createdResponses.length).toBeLessThanOrEqual(CREATE_ATTEMPTS_PER_WINDOW);
    expect(throttledResponses.length).toBeGreaterThanOrEqual(1);
    expect(
      responses.every(response => response.status === 201 || response.status === 429)
    ).toBe(true);
    expect(throttledResponses[0]?.body).toMatchObject({
      message: {
        key: 'room.error.too_many_create_attempts',
      },
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
    expect(body.onlineParticipants).toEqual([
      expect.objectContaining({
        roomId: waitingRoom.roomId,
        displayName: 'Host Waiting',
        isHost: true,
        seat: null,
        activity: 'watching',
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
    expect(body.onlineParticipants).toEqual([]);
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
