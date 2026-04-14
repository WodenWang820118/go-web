import { LobbyRoomStatus, LobbyRoomSummary } from '@gx/go/contracts';

type TranslationReader = {
  locale(): string;
  t(key: string, params?: Record<string, unknown>): string;
};

export interface LobbySectionViewModel {
  status: LobbyRoomStatus;
  title: string;
  caption: string;
  rooms: LobbyRoomSummary[];
}

const LOBBY_SECTION_ORDER: readonly LobbyRoomStatus[] = ['live', 'ready', 'waiting'];

/**
 * Builds the ordered lobby sections shown on the hosted-room landing page.
 */
export function buildLobbySections(
  i18n: TranslationReader,
  rooms: readonly LobbyRoomSummary[]
): LobbySectionViewModel[] {
  return LOBBY_SECTION_ORDER.map(status => ({
    status,
    title: i18n.t(`lobby.section.${status}.title`),
    caption: i18n.t(`lobby.section.${status}.caption`),
    rooms: rooms.filter(room => room.status === status),
  }));
}

/**
 * Returns the currently selected room, defaulting to the first available room.
 */
export function selectLobbyRoom(
  rooms: readonly LobbyRoomSummary[],
  selectedRoomId: string | null
): LobbyRoomSummary | null {
  if (rooms.length === 0) {
    return null;
  }

  return rooms.find(room => room.roomId === selectedRoomId) ?? rooms[0] ?? null;
}

export function roomStatusLabel(i18n: TranslationReader, status: LobbyRoomStatus): string {
  return i18n.t(`lobby.status.${status}`);
}

export function roomStatusHeadline(i18n: TranslationReader, room: LobbyRoomSummary): string {
  return i18n.t(`lobby.room.status.${room.status}.headline`);
}

export function roomStatusCopy(i18n: TranslationReader, room: LobbyRoomSummary): string {
  return i18n.t(`lobby.room.status.${room.status}.copy`);
}

export function roomModeLabel(i18n: TranslationReader, room: LobbyRoomSummary): string {
  if (!room.mode || !room.boardSize) {
    return i18n.t('lobby.room.mode_pending');
  }

  return i18n.t('lobby.room.mode_with_board', {
    mode: i18n.t(`common.mode.${room.mode}`),
    size: room.boardSize,
  });
}

export function roomActionLabel(i18n: TranslationReader, room: LobbyRoomSummary): string {
  return room.status === 'live'
    ? i18n.t('lobby.room.action.live')
    : i18n.t('lobby.room.action.join');
}

export function roomActionHint(i18n: TranslationReader, room: LobbyRoomSummary): string {
  return room.status === 'live'
    ? i18n.t('lobby.room.action_hint.live')
    : i18n.t('lobby.room.action_hint.join');
}

export function seatLabel(
  i18n: TranslationReader,
  name: string | null,
  color: 'black' | 'white'
): string {
  return (
    name ??
    i18n.t('lobby.room.open_seat', {
      seat: i18n.t(`common.seat.${color}`),
    })
  );
}

export function countLabel(
  i18n: TranslationReader,
  count: number,
  unit: 'room' | 'person' | 'online' | 'spectator'
): string {
  return i18n.t(`lobby.count.${unit}.${count === 1 ? 'one' : 'other'}`, {
    count,
  });
}

export function roomCardTitle(i18n: TranslationReader, host: string): string {
  return i18n.t('lobby.room.card.title', { host });
}

export function roomCardLabel(i18n: TranslationReader, roomId: string): string {
  return i18n.t('lobby.room.card.label', { roomId });
}

export function updatedLabel(i18n: TranslationReader, updatedAt: string): string {
  const formatted = new Intl.DateTimeFormat(i18n.locale() === 'zh-TW' ? 'zh-TW' : 'en', {
    timeStyle: 'short',
  }).format(new Date(updatedAt));

  return i18n.t('lobby.selected.updated', { time: formatted });
}

export function emptySectionLabel(i18n: TranslationReader, status: LobbyRoomStatus): string {
  return i18n.t('lobby.section.empty', {
    section: i18n.t(`lobby.section.${status}.title`).toLowerCase(),
  });
}
