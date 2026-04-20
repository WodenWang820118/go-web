import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  createRoomServiceStub,
  createSnapshot,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > reconnect and recovery', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('does not re-bootstrap the room when later room-state signal changes occur', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    roomService.bootstrapRoom.mockImplementation(() => {
      roomService.snapshot();
      roomService.connectionState();
    });

    const harness = await renderOnlineRoomPage(roomService);

    expect(roomService.bootstrapRoom).toHaveBeenCalledTimes(1);

    roomService.snapshot.set(
      createSnapshot({
        updatedAt: '2026-03-20T00:01:00.000Z',
      }),
    );
    roomService.connectionState.set('disconnected');
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(roomService.bootstrapRoom).toHaveBeenCalledTimes(1);
  });

  it('returns guests to the lobby when the delayed room-closure probe sees 404 after reconnect churn', async () => {
    vi.useFakeTimers();

    try {
      const roomService = createRoomServiceStub({
        snapshot: createSnapshot({
          participants: [
            {
              participantId: 'host-1',
              displayName: 'Host',
              seat: null,
              isHost: true,
              online: true,
              muted: false,
              joinedAt: '2026-03-20T00:00:00.000Z',
            },
            {
              participantId: 'guest-1',
              displayName: 'Guest',
              seat: null,
              isHost: false,
              online: true,
              muted: false,
              joinedAt: '2026-03-20T00:01:00.000Z',
            },
          ],
        }),
        participantId: 'guest-1',
        participantToken: 'token-2',
      });
      const getRoom = vi.fn().mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }),
        ),
      );

      const harness = await renderOnlineRoomPage(roomService, {
        roomsApi: {
          getRoom,
        },
      });
      const router = TestBed.inject(Router);

      roomService.connectionState.set('disconnected');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      roomService.connectionState.set('connecting');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      await vi.advanceTimersByTimeAsync(249);
      await harness.fixture.whenStable();

      expect(getRoom).not.toHaveBeenCalled();
      expect(router.url).toBe('/online/room/ROOM42');

      await vi.advanceTimersByTimeAsync(300);
      await harness.fixture.whenStable();

      expect(getRoom).toHaveBeenCalledTimes(1);
      expect(getRoom).toHaveBeenCalledWith('ROOM42');
      expect(roomService.clearRoomClosedEvent).toHaveBeenCalledTimes(1);
      expect(router.url).toBe('/');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not redirect guests when the delayed room-closure probe survives reconnect churn and the room still exists', async () => {
    vi.useFakeTimers();

    try {
      const roomService = createRoomServiceStub({
        snapshot: createSnapshot({
          participants: [
            {
              participantId: 'host-1',
              displayName: 'Host',
              seat: null,
              isHost: true,
              online: true,
              muted: false,
              joinedAt: '2026-03-20T00:00:00.000Z',
            },
            {
              participantId: 'guest-1',
              displayName: 'Guest',
              seat: null,
              isHost: false,
              online: true,
              muted: false,
              joinedAt: '2026-03-20T00:01:00.000Z',
            },
          ],
        }),
        participantId: 'guest-1',
        participantToken: 'token-2',
      });
      const getRoom = vi.fn().mockReturnValue(
        of({
          snapshot: createSnapshot(),
        }),
      );

      const harness = await renderOnlineRoomPage(roomService, {
        roomsApi: {
          getRoom,
        },
      });
      const router = TestBed.inject(Router);

      roomService.connectionState.set('disconnected');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      roomService.connectionState.set('connecting');
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();

      await vi.advanceTimersByTimeAsync(249);
      await harness.fixture.whenStable();

      expect(getRoom).not.toHaveBeenCalled();
      expect(router.url).toBe('/online/room/ROOM42');

      await vi.advanceTimersByTimeAsync(1500);
      await harness.fixture.whenStable();

      expect(getRoom).toHaveBeenCalledTimes(1);
      expect(getRoom).toHaveBeenCalledWith('ROOM42');
      expect(roomService.clearRoomClosedEvent).not.toHaveBeenCalled();
      expect(router.url).toBe('/online/room/ROOM42');
    } finally {
      vi.useRealTimers();
    }
  });
});
