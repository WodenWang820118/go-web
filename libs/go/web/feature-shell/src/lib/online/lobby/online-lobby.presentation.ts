import {
  LobbyOnlineParticipantActivity,
  LobbyOnlineParticipantSummary,
  LobbyRoomStatus,
  LobbyRoomSummary,
} from '@gx/go/contracts';

type TranslationReader = {
  locale(): string;
  t(key: string, params?: Record<string, unknown>): string;
};

export interface LobbySectionViewModel {
  status: LobbyRoomStatus;
  title: string;
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

export interface LobbyRoomSeatSummaryViewModel {
  black: string;
  white: string;
}

export interface LobbyRoomTableRowViewModel {
  room: LobbyRoomSummary;
  roomId: string;
  roomLabel: string;
  hostLabel: string;
  modeLabel: string;
  blackSeat: string;
  whiteSeat: string;
  seatSummary: LobbyRoomSeatSummaryViewModel;
  peopleOnlineLabel: string;
  statusLabel: string;
  actionLabel: string;
}

export interface LobbyAnnouncementCardViewModel {
  id: string;
  title: string;
  copy: string;
  tone: 'guide' | 'ad';
}

export interface LobbyOnlinePlayerViewModel {
  participantId: string;
  displayName: string;
  roomId: string;
  roomLabel: string;
  roleBadges: string[];
}

export interface LobbyOnlinePlayerGroupViewModel {
  activity: LobbyOnlineParticipantActivity;
  title: string;
  count: number;
  players: LobbyOnlinePlayerViewModel[];
}

const LOBBY_SECTION_ORDER: readonly LobbyRoomStatus[] = ['live', 'ready', 'waiting'];
const ONLINE_PLAYER_ORDER: readonly LobbyOnlineParticipantActivity[] = [
  'playing',
  'seated',
  'watching',
];

export function buildLobbySections(
  i18n: TranslationReader,
  rooms: readonly LobbyRoomSummary[]
): LobbySectionViewModel[] {
  return LOBBY_SECTION_ORDER.map(status => ({
    status,
    title: i18n.t(`lobby.section.${status}.title`),
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
      hostLabel: room.hostDisplayName,
      modeLabel: roomModeLabel(i18n, room),
      blackSeat,
      whiteSeat,
      seatSummary: {
        black: blackSeat,
        white: whiteSeat,
      },
      peopleOnlineLabel: `${room.participantCount} / ${room.onlineCount}`,
      statusLabel: roomStatusLabel(i18n, room.status),
      actionLabel: roomActionLabel(i18n, room),
    };
  });
}

export function buildLobbyAnnouncementCards(
  i18n: TranslationReader
): LobbyAnnouncementCardViewModel[] {
  return [
    {
      id: 'guide',
      title: i18n.t('lobby.announcement.guide.title'),
      copy: i18n.t('lobby.announcement.guide.copy'),
      tone: 'guide',
    },
    {
      id: 'ad',
      title: i18n.t('lobby.announcement.ad.title'),
      copy: i18n.t('lobby.announcement.ad.copy'),
      tone: 'ad',
    },
  ];
}

export function buildLobbyOnlinePlayerGroups(
  i18n: TranslationReader,
  participants: readonly LobbyOnlineParticipantSummary[]
): LobbyOnlinePlayerGroupViewModel[] {
  return ONLINE_PLAYER_ORDER.map(activity => {
    const players = participants
      .filter(participant => participant.activity === activity)
      .map<LobbyOnlinePlayerViewModel>(participant => ({
        participantId: participant.participantId,
        displayName: participant.displayName,
        roomId: participant.roomId,
        roomLabel: roomCardLabel(i18n, participant.roomId),
        roleBadges: playerRoleBadges(i18n, participant),
      }));

    return {
      activity,
      title: i18n.t(`lobby.online.activity.${activity}`),
      count: players.length,
      players,
    };
  }).filter(group => group.count > 0);
}

export function roomStatusLabel(
  i18n: TranslationReader,
  status: LobbyRoomStatus
): string {
  return i18n.t(`lobby.status.${status}`);
}

export function roomModeLabel(
  i18n: TranslationReader,
  room: LobbyRoomSummary
): string {
  if (!room.mode || !room.boardSize) {
    return i18n.t('lobby.room.mode_pending');
  }

  return i18n.t('lobby.room.mode_with_board', {
    mode: i18n.t(`common.mode.${room.mode}`),
    size: room.boardSize,
  });
}

export function roomActionLabel(
  i18n: TranslationReader,
  room: LobbyRoomSummary
): string {
  return room.status === 'live'
    ? i18n.t('lobby.room.action.live')
    : i18n.t('lobby.room.action.join');
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

export function roomCardLabel(i18n: TranslationReader, roomId: string): string {
  return i18n.t('lobby.room.card.label', { roomId });
}

export function emptySectionLabel(
  i18n: TranslationReader,
  status: LobbyRoomStatus
): string {
  return i18n.t('lobby.section.empty', {
    section: i18n.t(`lobby.section.${status}.title`).toLowerCase(),
  });
}

function playerRoleBadges(
  i18n: TranslationReader,
  participant: LobbyOnlineParticipantSummary
): string[] {
  const badges: string[] = [];

  if (participant.isHost) {
    badges.push(i18n.t('lobby.online.role.host'));
  }

  if (participant.seat === 'black') {
    badges.push(i18n.t('lobby.online.role.black'));
  } else if (participant.seat === 'white') {
    badges.push(i18n.t('lobby.online.role.white'));
  } else {
    badges.push(i18n.t('lobby.online.role.watching'));
  }

  return badges;
}
