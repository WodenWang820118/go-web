import { LobbyRoomSummary } from '@gx/go/contracts';
import {
  buildLobbyRoomDetail,
  buildLobbyOverviewStats,
  buildLobbySections,
  buildLobbyTableRows,
  emptySectionLabel,
  selectLobbyRoom,
  updatedLabel,
} from './online-lobby.presentation';

describe('online-lobby.presentation', () => {
  it('orders sections as live, ready, then waiting', () => {
    const sections = buildLobbySections(createI18n('en'), [
      createRoom('ROOM2', 'ready'),
      createRoom('ROOM3', 'waiting'),
      createRoom('ROOM1', 'live'),
    ]);

    expect(sections.map(section => section.status)).toEqual([
      'live',
      'ready',
      'waiting',
    ]);
    expect(sections[0]?.rooms.map(room => room.roomId)).toEqual(['ROOM1']);
  });

  it('falls back to the first available room when nothing is selected', () => {
    const rooms = [createRoom('ROOM1', 'live'), createRoom('ROOM2', 'ready')];

    expect(selectLobbyRoom(rooms, null)?.roomId).toBe('ROOM1');
    expect(selectLobbyRoom(rooms, 'ROOM2')?.roomId).toBe('ROOM2');
    expect(selectLobbyRoom(rooms, 'MISSING')?.roomId).toBe('ROOM1');
  });

  it('formats updated timestamps using the active locale', () => {
    const sample = '2026-03-24T13:05:00.000Z';
    const en = updatedLabel(createI18n('en'), sample);
    const zh = updatedLabel(createI18n('zh-TW'), sample);

    expect(en).toContain('Updated ');
    expect(zh).toContain('Updated ');
    expect(en).not.toBe(zh);
  });

  it('aggregates lobby overview stats from all rooms', () => {
    const stats = buildLobbyOverviewStats([
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

  it('builds table rows with seat and count labels', () => {
    const [row] = buildLobbyTableRows(createI18n('en'), [
      createRoom('ROOM9', 'waiting'),
    ]);

    expect(row?.roomId).toBe('ROOM9');
    expect(row?.blackSeat).toBe('Host');
    expect(row?.whiteSeat).toBe('Guest');
    expect(row?.seatSummary).toEqual({
      black: 'Black: Host',
      white: 'White: Guest',
    });
    expect(row?.participantLabel).toBe('lobby.count.person.other');
  });

  it('builds pending-mode rows and singular count labels', () => {
    const [row] = buildLobbyTableRows(createI18n('en'), [
      {
        ...createRoom('ROOM10', 'waiting'),
        mode: null,
        boardSize: null,
        participantCount: 1,
        onlineCount: 1,
        spectatorCount: 1,
        players: {
          black: null,
          white: null,
        },
      },
    ]);

    expect(row?.modeLabel).toBe('lobby.room.mode_pending');
    expect(row?.participantLabel).toBe('lobby.count.person.one');
    expect(row?.onlineLabel).toBe('lobby.count.online.one');
    expect(row?.spectatorLabel).toBe('lobby.count.spectator.one');
  });

  it('builds detail view models for the selected room', () => {
    const detail = buildLobbyRoomDetail(
      createI18n('en'),
      createRoom('READY9', 'ready')
    );

    expect(detail).toEqual(
      expect.objectContaining({
        roomId: 'READY9',
        roomLabel: 'Room READY9',
        title: "Host's room",
        statusLabel: 'lobby.status.ready',
        headline: 'lobby.room.status.ready.headline',
        copy: 'lobby.room.status.ready.copy',
        actionLabel: 'lobby.room.action.join',
        actionHint: 'lobby.room.action_hint.join',
      })
    );
  });

  it('builds live-room detail copy for spectator entry points', () => {
    const detail = buildLobbyRoomDetail(
      createI18n('en'),
      createRoom('LIVE9', 'live')
    );

    expect(detail).toEqual(
      expect.objectContaining({
        statusLabel: 'lobby.status.live',
        actionLabel: 'lobby.room.action.live',
        actionHint: 'lobby.room.action_hint.live',
      })
    );
  });

  it('returns null when no selected room is available for detail copy', () => {
    expect(buildLobbyRoomDetail(createI18n('en'), null)).toBeNull();
  });

  it('returns an empty-section label for the requested status', () => {
    expect(emptySectionLabel(createI18n('en'), 'ready')).toContain('lobby.section.empty');
  });
});

function createI18n(locale: 'en' | 'zh-TW') {
  return {
    locale: () => locale,
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'lobby.selected.updated') {
        return `Updated ${String(params?.time ?? '')}`;
      }

      if (key === 'lobby.room.card.label') {
        return `Room ${String(params?.roomId ?? '')}`;
      }

      if (key === 'lobby.room.card.title') {
        return `${String(params?.host ?? '')}'s room`;
      }

      if (key === 'lobby.table.black') {
        return 'Black';
      }

      if (key === 'lobby.table.white') {
        return 'White';
      }

      return key;
    },
  };
}

function createRoom(roomId: string, status: LobbyRoomSummary['status']): LobbyRoomSummary {
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
