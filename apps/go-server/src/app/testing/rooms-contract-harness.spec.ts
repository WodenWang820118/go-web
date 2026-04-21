import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createRoomsContractHarness,
  type RoomsContractHarness,
} from './rooms-contract-harness';

describe('RoomsContractHarness', () => {
  let harness: RoomsContractHarness;

  beforeEach(async () => {
    harness = await createRoomsContractHarness();
  }, 30000);

  afterEach(async () => {
    await harness.dispose();
  }, 30000);

  it('creates rooms, joins guests, and opens participant sockets through the reusable API', async () => {
    const host = await harness.createRoom('Host');
    const guest = await harness.joinRoom(host.roomId, 'Guest');
    const joinedHost = await harness.joinParticipantSocket(host);
    const joinedGuest = await harness.joinParticipantSocket(guest);
    const listed = await harness.listRooms();

    expect(joinedHost.snapshot.roomId).toBe(host.roomId);
    expect(joinedGuest.snapshot.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          participantId: host.participantId,
          displayName: 'Host',
        }),
        expect.objectContaining({
          participantId: guest.participantId,
          displayName: 'Guest',
        }),
      ]),
    );
    expect(listed.rooms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roomId: host.roomId,
        }),
      ]),
    );
  }, 30000);
});
