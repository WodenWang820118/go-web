import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { LobbyRoomSummary } from '@org/go/contracts';
import { GO_SERVER_ORIGIN } from '@org/go/state';
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
    service.refresh();

    httpMock.expectOne('/api/rooms').flush(
      {
        message: 'Lobby unavailable',
      },
      {
        status: 503,
        statusText: 'Service Unavailable',
      }
    );

    expect(service.loading()).toBe(false);
    expect(service.rooms()).toEqual([]);
    expect(service.lastError()).toBe('Lobby unavailable');
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
