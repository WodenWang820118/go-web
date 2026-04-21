import { TestBed } from '@angular/core/testing';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  LobbyOnlineParticipantSummary,
  LobbyRoomSummary,
} from '@gx/go/contracts';
import { OnlineLobbyPresentationService } from './online-lobby-presentation.service';

describe('OnlineLobbyPresentationService', () => {
  let service: OnlineLobbyPresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OnlineLobbyPresentationService,
        {
          provide: GoI18nService,
          useValue: createI18n('en'),
        },
      ],
    });

    service = TestBed.inject(OnlineLobbyPresentationService);
  });

  it('orders sections as live, ready, then waiting', () => {
    const sections = service.buildLobbySections([
      createRoom('ROOM2', 'ready'),
      createRoom('ROOM3', 'waiting'),
      createRoom('ROOM1', 'live'),
    ]);

    expect(sections.map((section) => section.status)).toEqual([
      'live',
      'ready',
      'waiting',
    ]);
    expect(sections[0]?.rooms.map((room) => room.roomId)).toEqual(['ROOM1']);
  });

  it('aggregates lobby overview stats from all rooms', () => {
    const stats = service.buildLobbyOverviewStats([
      createRoom('LIVE1', 'live'),
      createRoom('READY1', 'ready'),
      {
        ...createRoom('WAIT1', 'waiting'),
        participantCount: 4,
        onlineCount: 3,
        spectatorCount: 2,
      },
    ]);

    expect(stats.roomCount).toBe(3);
    expect(stats.onlineCount).toBe(7);
    expect(stats.participantCount).toBe(8);
    expect(stats.spectatorCount).toBe(2);
    expect(stats.liveCount).toBe(1);
    expect(stats.readyCount).toBe(1);
    expect(stats.waitingCount).toBe(1);
  });

  it('builds compact table rows with seat and count values', () => {
    const [row] = service.buildLobbyTableRows([createRoom('ROOM9', 'waiting')]);

    expect(row).toEqual(
      expect.objectContaining({
        roomId: 'ROOM9',
        roomLabel: '#ROOM9',
        hostLabel: 'Host',
        blackSeat: 'Host',
        whiteSeat: 'Guest',
        peopleOnlineLabel: '2 / 2',
        statusLabel: 'lobby.status.waiting',
        actionLabel: 'Join',
      }),
    );
  });

  it('builds pending-mode rows and live-room actions', () => {
    const [row] = service.buildLobbyTableRows([
      {
        ...createRoom('LIVE10', 'live'),
        mode: null,
        boardSize: null,
        players: {
          black: null,
          white: null,
        },
      },
    ]);

    expect(row?.modeLabel).toBe('Pending setup');
    expect(row?.seatSummary).toEqual({
      black: 'Open Black',
      white: 'Open White',
    });
    expect(row?.actionLabel).toBe('Watch');
  });

  it('builds announcement cards for guide and ad slots', () => {
    const cards = service.buildLobbyAnnouncementCards();

    expect(cards).toEqual([
      {
        id: 'guide',
        title: 'Lobby notice slot',
        copy: 'Guide copy',
        tone: 'guide',
      },
      {
        id: 'ad',
        title: 'Ad slot reserved',
        copy: 'Ad copy',
        tone: 'ad',
      },
    ]);
  });

  it('groups online players by activity and renders host plus seat badges', () => {
    const groups = service.buildLobbyOnlinePlayerGroups([
      createOnlineParticipant({
        participantId: 'p1',
        roomId: 'LIVE1',
        displayName: 'Host Live',
        seat: 'black',
        isHost: true,
        activity: 'playing',
      }),
      createOnlineParticipant({
        participantId: 'p2',
        roomId: 'READY1',
        displayName: 'Guest Ready',
        seat: 'white',
        isHost: false,
        activity: 'seated',
      }),
      createOnlineParticipant({
        participantId: 'p3',
        roomId: 'WAIT1',
        displayName: 'Watcher',
        seat: null,
        isHost: false,
        activity: 'watching',
      }),
    ]);

    expect(groups.map((group) => group.activity)).toEqual([
      'playing',
      'seated',
      'watching',
    ]);
    expect(groups[0]?.players[0]).toEqual(
      expect.objectContaining({
        displayName: 'Host Live',
        roomLabel: '#LIVE1',
        roleBadges: ['Host', 'Black'],
      }),
    );
    expect(groups[2]?.players[0]).toEqual(
      expect.objectContaining({
        roleBadges: ['Watching'],
      }),
    );
  });

  it('returns an empty-section label for the requested status', () => {
    expect(service.emptySectionLabel('ready')).toContain('No ready rooms yet.');
  });

  it('pluralizes count labels through the injected i18n service', () => {
    expect(service.countLabel(1, 'room')).toBe('1 room');
    expect(service.countLabel(2, 'room')).toBe('2 rooms');
  });
});

function createI18n(locale: 'en' | 'zh-TW') {
  return {
    locale: () => locale,
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'lobby.room.card.label') {
        return `#${String(params?.roomId ?? '')}`;
      }

      if (key === 'lobby.room.mode_with_board') {
        return `${String(params?.mode ?? '')} ${String(params?.size ?? '')}x${String(params?.size ?? '')}`;
      }

      if (key === 'lobby.room.open_seat') {
        return `Open ${String(params?.seat ?? '')}`;
      }

      if (key === 'lobby.room.mode_pending') {
        return 'Pending setup';
      }

      if (key === 'lobby.room.action.live') {
        return 'Watch';
      }

      if (key === 'lobby.room.action.join') {
        return 'Join';
      }

      if (key === 'lobby.announcement.guide.title') {
        return 'Lobby notice slot';
      }

      if (key === 'lobby.announcement.guide.copy') {
        return 'Guide copy';
      }

      if (key === 'lobby.announcement.ad.title') {
        return 'Ad slot reserved';
      }

      if (key === 'lobby.announcement.ad.copy') {
        return 'Ad copy';
      }

      if (key === 'lobby.online.role.host') {
        return 'Host';
      }

      if (key === 'lobby.online.role.black') {
        return 'Black';
      }

      if (key === 'lobby.online.role.white') {
        return 'White';
      }

      if (key === 'lobby.online.role.watching') {
        return 'Watching';
      }

      if (key === 'common.mode.go') {
        return 'Go';
      }

      if (key === 'common.mode.gomoku') {
        return 'Gomoku';
      }

      if (key === 'common.seat.black') {
        return 'Black';
      }

      if (key === 'common.seat.white') {
        return 'White';
      }

      if (key === 'lobby.section.ready.title') {
        return 'Ready rooms';
      }

      if (key === 'lobby.section.empty') {
        return `No ${String(params?.section ?? '')} yet.`;
      }

      if (key === 'lobby.count.room.one') {
        return `${String(params?.count ?? 0)} room`;
      }

      if (key === 'lobby.count.room.other') {
        return `${String(params?.count ?? 0)} rooms`;
      }

      return key;
    },
  };
}

function createRoom(
  roomId: string,
  status: LobbyRoomSummary['status'],
): LobbyRoomSummary {
  return {
    roomId,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    hostDisplayName: 'Host',
    status,
    mode: 'go',
    boardSize: 19,
    players: {
      black: 'Host',
      white: 'Guest',
    },
    participantCount: 2,
    onlineCount: 2,
    spectatorCount: 0,
  };
}

function createOnlineParticipant(
  overrides: Partial<LobbyOnlineParticipantSummary> = {},
): LobbyOnlineParticipantSummary {
  return {
    participantId: 'participant-1',
    displayName: 'Host',
    roomId: 'ROOM1',
    seat: null,
    isHost: false,
    joinedAt: '2026-03-20T00:00:00.000Z',
    activity: 'watching',
    ...overrides,
  };
}
