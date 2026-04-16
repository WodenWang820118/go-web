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

export interface LobbyOverviewStatsViewModel {
  roomCount: number;
  onlineCount: number;
  participantCount: number;
  spectatorCount: number;
  liveCount: number;
  readyCount: number;
  waitingCount: number;
}

export interface LobbyRoomTableRowViewModel {
  room: LobbyRoomSummary;
  roomId: string;
  roomLabel: string;
  title: string;
  modeLabel: string;
  blackSeat: string;
  whiteSeat: string;
  seatSummary: LobbyRoomSeatSummaryViewModel;
  participantLabel: string;
  onlineLabel: string;
  spectatorLabel: string;
  statusLabel: string;
  headline: string;
  actionLabel: string;
  updatedLabel: string;
}

export interface LobbyRoomSeatSummaryViewModel {
  black: string;
  white: string;
}

export interface LobbyRoomDetailViewModel {
  room: LobbyRoomSummary;
  roomId: string;
  roomLabel: string;
  title: string;
  statusLabel: string;
  headline: string;
  copy: string;
  modeLabel: string;
  blackSeat: string;
  whiteSeat: string;
  seatSummary: LobbyRoomSeatSummaryViewModel;
  participantLabel: string;
  onlineLabel: string;
  spectatorLabel: string;
  updatedLabel: string;
  actionLabel: string;
  actionHint: string;
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

export function buildLobbyOverviewStats(
  rooms: readonly LobbyRoomSummary[]
): LobbyOverviewStatsViewModel {
  return rooms.reduce<LobbyOverviewStatsViewModel>(
    (stats, room) => {
      stats.roomCount += 1;
      stats.onlineCount += room.onlineCount;
      stats.participantCount += room.participantCount;
      stats.spectatorCount += room.spectatorCount;
      const statusCountKey = `${room.status}Count` as
        | 'liveCount'
        | 'readyCount'
        | 'waitingCount';
      stats[statusCountKey] += 1;
      return stats;
    },
    {
      roomCount: 0,
      onlineCount: 0,
      participantCount: 0,
      spectatorCount: 0,
      liveCount: 0,
      readyCount: 0,
      waitingCount: 0,
    }
  );
}

export function buildLobbyTableRows(
  i18n: TranslationReader,
  rooms: readonly LobbyRoomSummary[]
): LobbyRoomTableRowViewModel[] {
  return rooms.map(room => {
    const blackSeat = seatLabel(i18n, room.players.black, 'black');
    const whiteSeat = seatLabel(i18n, room.players.white, 'white');

    return {
      room,
      roomId: room.roomId,
      roomLabel: roomCardLabel(i18n, room.roomId),
      title: roomCardTitle(i18n, room.hostDisplayName),
      modeLabel: roomModeLabel(i18n, room),
      blackSeat,
      whiteSeat,
      seatSummary: buildSeatSummary(i18n, blackSeat, whiteSeat),
      participantLabel: countLabel(i18n, room.participantCount, 'person'),
      onlineLabel: countLabel(i18n, room.onlineCount, 'online'),
      spectatorLabel: countLabel(i18n, room.spectatorCount, 'spectator'),
      statusLabel: roomStatusLabel(i18n, room.status),
      headline: roomStatusHeadline(i18n, room),
      actionLabel: roomActionLabel(i18n, room),
      updatedLabel: updatedLabel(i18n, room.updatedAt),
    };
  });
}

export function buildLobbyRoomDetail(
  i18n: TranslationReader,
  room: LobbyRoomSummary | null
): LobbyRoomDetailViewModel | null {
  if (!room) {
    return null;
  }

  const blackSeat = seatLabel(i18n, room.players.black, 'black');
  const whiteSeat = seatLabel(i18n, room.players.white, 'white');

  return {
    room,
    roomId: room.roomId,
    roomLabel: roomCardLabel(i18n, room.roomId),
    title: roomCardTitle(i18n, room.hostDisplayName),
    statusLabel: roomStatusLabel(i18n, room.status),
    headline: roomStatusHeadline(i18n, room),
    copy: roomStatusCopy(i18n, room),
    modeLabel: roomModeLabel(i18n, room),
    blackSeat,
    whiteSeat,
    seatSummary: buildSeatSummary(i18n, blackSeat, whiteSeat),
    participantLabel: countLabel(i18n, room.participantCount, 'person'),
    onlineLabel: countLabel(i18n, room.onlineCount, 'online'),
    spectatorLabel: countLabel(i18n, room.spectatorCount, 'spectator'),
    updatedLabel: updatedLabel(i18n, room.updatedAt),
    actionLabel: roomActionLabel(i18n, room),
    actionHint: roomActionHint(i18n, room),
  };
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

function buildSeatSummary(
  i18n: TranslationReader,
  blackSeat: string,
  whiteSeat: string
): LobbyRoomSeatSummaryViewModel {
  return {
    black: `${i18n.t('lobby.table.black')}: ${blackSeat}`,
    white: `${i18n.t('lobby.table.white')}: ${whiteSeat}`,
  };
}
