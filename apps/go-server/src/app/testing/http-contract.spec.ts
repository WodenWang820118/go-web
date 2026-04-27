import {
  createRoomsContractHarness,
  type RoomsContractHarness,
} from './rooms-contract-harness';
import {
  DEFAULT_GO_KOMI,
  DEFAULT_HOSTED_BYO_YOMI,
  GOMOKU_FREE_OPENING,
  GOMOKU_STANDARD_EXACT_FIVE_RULESET,
  GO_AREA_AGREEMENT_RULESET,
  GO_DIGITAL_NIGIRI_OPENING,
} from '@gx/go/domain';
import { CREATE_ATTEMPTS_PER_WINDOW } from '../core/rooms-config/rooms.constants';

describe('rooms HTTP contract', () => {
  let harness: RoomsContractHarness;

  beforeEach(async () => {
    harness = await createRoomsContractHarness();
  }, 30000);

  afterEach(async () => {
    await harness.dispose();
  }, 30000);

  it('returns the public health payload at /api/health', async () => {
    const response = await harness.http().get('/api/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      time: expect.any(String),
    });
  });

  it('creates, joins, and fetches a room through the REST contract', async () => {
    const host = await harness.createRoom('Host');

    expect(host).toEqual({
      roomId: expect.any(String),
      participantToken: expect.any(String),
      participantId: expect.any(String),
      snapshot: expect.objectContaining({
        roomId: host.roomId,
        hostParticipantId: host.participantId,
      }),
    });

    const guest = await harness.joinRoom(host.roomId, 'Guest');

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

    const roomResponse = await harness.getRoom(host.roomId);

    expect(roomResponse).toEqual({
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
      await harness.createRoom(`Host ${index + 1}`);
    }

    const throttledResponse = await harness
      .http()
      .post('/api/rooms')
      .send({
        displayName: `Host ${CREATE_ATTEMPTS_PER_WINDOW + 1}`,
        mode: 'go',
        boardSize: 19,
      })
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
        harness
          .http()
          .post('/api/rooms')
          .send({
            displayName: `Host ${index + 1}`,
            mode: 'go',
            boardSize: 19,
          }),
      ),
    );

    const createdResponses = responses.filter(
      (response) => response.status === 201,
    );
    const throttledResponses = responses.filter(
      (response) => response.status === 429,
    );

    expect(createdResponses.length).toBeLessThanOrEqual(
      CREATE_ATTEMPTS_PER_WINDOW,
    );
    expect(throttledResponses.length).toBeGreaterThanOrEqual(1);
    expect(
      responses.every(
        (response) => response.status === 201 || response.status === 429,
      ),
    ).toBe(true);
    expect(throttledResponses[0]?.body).toMatchObject({
      message: {
        key: 'room.error.too_many_create_attempts',
      },
    });
  });

  it('lists only public online lobby rooms through the REST API', async () => {
    const waitingRoom = await harness.createRoom('Host Waiting');
    await harness.createRoom('Host Offline');

    await harness.joinParticipantSocket(waitingRoom);

    const body = await harness.listRooms();

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

  it('creates rooms with the requested hosted match settings', async () => {
    const goRoom = await harness.createRoom('Go Host', {
      mode: 'go',
      boardSize: 9,
    });
    const gomokuRoom = await harness.createRoom('Gomoku Host', {
      mode: 'gomoku',
      boardSize: 15,
    });

    expect(goRoom.snapshot.nextMatchSettings).toEqual({
      mode: 'go',
      boardSize: 9,
      komi: DEFAULT_GO_KOMI,
      ruleset: GO_AREA_AGREEMENT_RULESET,
      openingRule: GO_DIGITAL_NIGIRI_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
    expect(gomokuRoom.snapshot.nextMatchSettings).toEqual({
      mode: 'gomoku',
      boardSize: 15,
      komi: 0,
      ruleset: GOMOKU_STANDARD_EXACT_FIVE_RULESET,
      openingRule: GOMOKU_FREE_OPENING,
      timeControl: DEFAULT_HOSTED_BYO_YOMI,
    });
  });

  it('rejects missing or invalid create-room match settings', async () => {
    await harness
      .http()
      .post('/api/rooms')
      .send({ displayName: 'Missing Mode', boardSize: 19 })
      .expect(400);

    const badModeResponse = await harness
      .http()
      .post('/api/rooms')
      .send({ displayName: 'Bad Mode', mode: 'chess', boardSize: 19 })
      .expect(400);
    expect(JSON.stringify(badModeResponse.body)).toContain(
      'room.error.unsupported_mode',
    );

    await harness
      .http()
      .post('/api/rooms')
      .send({ displayName: 'Missing Board Size', mode: 'go' })
      .expect(400);

    await harness
      .http()
      .post('/api/rooms')
      .send({ displayName: 'Bad Go Size', mode: 'go', boardSize: 15 })
      .expect(400);

    await harness
      .http()
      .post('/api/rooms')
      .send({ displayName: 'Bad Gomoku Size', mode: 'gomoku', boardSize: 19 })
      .expect(400);
  });

  it('closes a room through the REST contract and removes it from the lobby immediately', async () => {
    const host = await harness.createRoom('Host');

    await harness.joinParticipantSocket(host);

    await harness.closeRoom(host.roomId, host.participantToken);

    await harness.http().get(`/api/rooms/${host.roomId}`).expect(404);

    const body = await harness.listRooms();

    expect(body.rooms).toEqual([]);
    expect(body.onlineParticipants).toEqual([]);
  });

  it('rejects close-room requests from non-host participants', async () => {
    const host = await harness.createRoom('Host');
    const guest = await harness.joinRoom(host.roomId, 'Guest');

    await harness
      .http()
      .post(`/api/rooms/${host.roomId}/close`)
      .send({ participantToken: guest.participantToken })
      .expect(403);
  });
});
