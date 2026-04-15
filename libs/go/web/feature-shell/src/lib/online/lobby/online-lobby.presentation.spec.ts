import { LobbyRoomSummary } from '@gx/go/contracts';
import {
  buildLobbySections,
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
  });

  it('formats updated timestamps using the active locale', () => {
    const sample = '2026-03-24T13:05:00.000Z';
    const en = updatedLabel(createI18n('en'), sample);
    const zh = updatedLabel(createI18n('zh-TW'), sample);

    expect(en).toContain('Updated ');
    expect(zh).toContain('Updated ');
    expect(en).not.toBe(zh);
  });
});

function createI18n(locale: 'en' | 'zh-TW') {
  return {
    locale: () => locale,
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'lobby.selected.updated') {
        return `Updated ${String(params?.time ?? '')}`;
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
