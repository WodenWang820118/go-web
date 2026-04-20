import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createMessage } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { OnlineRoomSnapshotService } from '../online-room-snapshot/online-room-snapshot.service';
import { OnlineRoomSocketService } from '../online-room-socket/online-room-socket.service';
import { OnlineRoomRealtimeSyncService } from './online-room-realtime-sync.service';
import { OnlineRoomSessionStateService } from './online-room-session-state.service';
import { OnlineRoomSessionWorkflowService } from './online-room-session-workflow.service';

describe('OnlineRoomRealtimeSyncService', () => {
  let service: OnlineRoomRealtimeSyncService;
  let mockSocket: ReturnType<typeof createSocketMock>;
  let mockState: ReturnType<typeof createStateMock>;
  let mockWorkflow: { markRoomClosed: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSocket = createSocketMock();
    mockState = createStateMock();
    mockWorkflow = {
      markRoomClosed: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OnlineRoomRealtimeSyncService,
        {
          provide: GoI18nService,
          useValue: {
            t: vi.fn((key: string) => key),
            translateMessage: vi.fn(
              (message: { key: string }) => `translated:${message.key}`
            ),
          },
        },
        {
          provide: OnlineRoomSnapshotService,
          useValue: {
            applyChatMessage: vi.fn((snapshot: unknown) => snapshot),
            applyGameUpdated: vi.fn((snapshot: unknown) => snapshot),
            applyRoomPresence: vi.fn((snapshot: unknown) => snapshot),
          },
        },
        {
          provide: OnlineRoomSocketService,
          useValue: mockSocket,
        },
        {
          provide: OnlineRoomSessionStateService,
          useValue: mockState,
        },
        {
          provide: OnlineRoomSessionWorkflowService,
          useValue: mockWorkflow,
        },
      ],
    });

    service = TestBed.inject(OnlineRoomRealtimeSyncService);
  });

  it('surfaces a join-required error when emitting without room credentials', () => {
    mockState.getSessionCredentials.mockReturnValue(null);

    service.emit('seat.claim', {
      color: 'black',
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(mockState.setLastError).toHaveBeenCalledWith('room.client.join_required');
  });

  it('surfaces a realtime-unavailable error when the socket emit fails', () => {
    mockSocket.emit.mockReturnValue(false);

    service.emit('seat.release');

    expect(mockSocket.emit).toHaveBeenCalledWith('seat.release', {
      roomId: 'ROOM42',
      participantToken: 'token-1',
    });
    expect(mockState.setLastError).toHaveBeenCalledWith(
      'room.client.realtime_unavailable'
    );
  });

  it('routes active room-closed events to the workflow cleanup path', () => {
    mockSocket.roomClosedSubject.next({
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });

    expect(mockWorkflow.markRoomClosed).toHaveBeenCalledWith({
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });
  });

  it('ignores room-closed events while the room is already closing', () => {
    mockState.closingRoomSignal.set(true);

    mockSocket.roomClosedSubject.next({
      roomId: 'ROOM42',
      message: createMessage('room.notice.closed_by_host'),
    });

    expect(mockWorkflow.markRoomClosed).not.toHaveBeenCalled();
  });
});

function createSocketMock() {
  const roomSnapshotSubject = new Subject<unknown>();
  const roomPresenceSubject = new Subject<unknown>();
  const gameUpdatedSubject = new Subject<unknown>();
  const chatMessageSubject = new Subject<unknown>();
  const noticeSubject = new Subject<unknown>();
  const commandErrorSubject = new Subject<unknown>();
  const roomClosedSubject = new Subject<{
    roomId: string;
    message: ReturnType<typeof createMessage>;
  }>();

  return {
    chatMessage$: chatMessageSubject.asObservable(),
    chatMessageSubject,
    commandError$: commandErrorSubject.asObservable(),
    commandErrorSubject,
    connectionState: signal<'idle' | 'connecting' | 'connected' | 'disconnected'>(
      'idle'
    ).asReadonly(),
    emit: vi.fn(() => true),
    gameUpdated$: gameUpdatedSubject.asObservable(),
    gameUpdatedSubject,
    notice$: noticeSubject.asObservable(),
    noticeSubject,
    roomClosed$: roomClosedSubject.asObservable(),
    roomClosedSubject,
    roomPresence$: roomPresenceSubject.asObservable(),
    roomPresenceSubject,
    roomSnapshot$: roomSnapshotSubject.asObservable(),
    roomSnapshotSubject,
  };
}

function createStateMock() {
  const closingRoomSignal = signal(false);
  const roomIdSignal = signal<string | null>('ROOM42');

  return {
    closingRoom: closingRoomSignal.asReadonly(),
    closingRoomSignal,
    getSessionCredentials: vi.fn(() => ({
      roomId: 'ROOM42',
      participantToken: 'token-1',
    })),
    roomId: roomIdSignal.asReadonly(),
    setLastError: vi.fn(),
    setLastNotice: vi.fn(),
    setLastSystemNotice: vi.fn(),
    setSnapshot: vi.fn(),
    updateSnapshot: vi.fn(),
  };
}
