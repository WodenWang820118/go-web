import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { createMessage } from '@gx/go/domain';
import {
  createRoomServiceStub,
  createSnapshot,
  queryDialog,
  renderOnlineRoomPage,
  resetOnlineRoomPageTestEnvironment,
} from './online-room-page.test-support';

describe('OnlineRoomPageComponent > leave and close', () => {
  afterEach(() => {
    resetOnlineRoomPageTestEnvironment();
  });

  it('prompts the host before leaving the room and closes the room after confirmation', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const backButton = root.querySelector(
      '[data-testid="room-back-to-lobby"]',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await harness.fixture.whenStable();

    const leaveDialog = queryDialog('room-leave-dialog');
    const acceptButton = document.body.querySelector(
      '[data-testid="room-leave-dialog-accept"]',
    ) as HTMLButtonElement | null;

    expect(leaveDialog).not.toBeNull();
    expect(router.url).toBe('/online/room/ROOM42');

    acceptButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.closeRoom).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');
  });

  it('lets the host cancel the leave prompt and stay in the room', async () => {
    const roomService = createRoomServiceStub({
      snapshot: createSnapshot(),
      participantId: 'host-1',
      participantToken: 'token-1',
    });

    const harness = await renderOnlineRoomPage(roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const backButton = root.querySelector(
      '[data-testid="room-back-to-lobby"]',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await harness.fixture.whenStable();

    const rejectButton = document.body.querySelector(
      '[data-testid="room-leave-dialog-reject"]',
    ) as HTMLButtonElement | null;

    rejectButton?.click();
    await harness.fixture.whenStable();

    expect(roomService.closeRoom).not.toHaveBeenCalled();
    expect(router.url).toBe('/online/room/ROOM42');
    expect(queryDialog('room-leave-dialog')).toBeNull();
  });

  it('lets non-host viewers leave immediately without showing the leave prompt', async () => {
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

    const harness = await renderOnlineRoomPage(roomService);
    const router = TestBed.inject(Router);
    const root = harness.routeNativeElement as HTMLElement;
    const backButton = root.querySelector(
      '[data-testid="room-back-to-lobby"]',
    ) as HTMLButtonElement | null;

    backButton?.click();
    await harness.fixture.whenStable();

    expect(queryDialog('room-leave-dialog')).toBeNull();
    expect(roomService.closeRoom).not.toHaveBeenCalled();
    expect(router.url).toBe('/');
  });

  it('returns guests to the lobby when the host closes the room remotely', async () => {
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

    const harness = await renderOnlineRoomPage(roomService);
    const router = TestBed.inject(Router);

    roomService.roomClosed.set({
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(roomService.clearRoomClosedEvent).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');
  });
});
