import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { LobbyRoomSummary } from '@gx/go/contracts';
import { createMessage } from '@gx/go/domain';
import { GO_SERVER_ORIGIN, GoI18nService } from '@gx/go/state';
import { OnlineLobbyService } from './online-lobby.service';

describe('OnlineLobbyService', () => {
  let service: OnlineLobbyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OnlineLobbyService,
        {
          provide: GO_SERVER_ORIGIN,
          useValue: '',
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(OnlineLobbyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads public room summaries from the REST endpoint', () => {
    service.refresh();

    httpMock.expectOne('/api/rooms').flush({
      rooms: [
        createRoomSummary({
          roomId: 'ROOM42',
          status: 'waiting',
        }),
      ],
    });

    expect(service.loading()).toBe(false);
    expect(service.hasRooms()).toBe(true);
    expect(service.rooms()).toEqual([
      expect.objectContaining({
        roomId: 'ROOM42',
        status: 'waiting',
      }),
    ]);
  });

  it('keeps a readable error when the lobby request fails', () => {
    const i18n = TestBed.inject(GoI18nService);

    service.refresh();

    httpMock.expectOne('/api/rooms').flush(
      {
        message: createMessage('lobby.error.load_failed'),
      },
      {
        status: 503,
        statusText: 'Service Unavailable',
      }
    );

    expect(service.loading()).toBe(false);
    expect(service.rooms()).toEqual([]);
    expect(service.lastError()).toBe(i18n.t('lobby.error.load_failed'));
  });

  it('treats a missing lobby endpoint as an empty lobby', () => {
    service.refresh();

    httpMock.expectOne('/api/rooms').flush('Cannot GET /api/rooms', {
      status: 404,
      statusText: 'Not Found',
    });

    expect(service.loading()).toBe(false);
    expect(service.rooms()).toEqual([]);
    expect(service.hasRooms()).toBe(false);
    expect(service.lastError()).toBeNull();
  });
});

function createRoomSummary(
  overrides: Partial<LobbyRoomSummary> = {}
): LobbyRoomSummary {
  return {
    roomId: 'ROOM01',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostDisplayName: 'Host',
    status: 'waiting',
    mode: null,
    boardSize: null,
    players: {
      black: null,
      white: null,
    },
    participantCount: 1,
    onlineCount: 1,
    spectatorCount: 1,
    ...overrides,
  };
}
