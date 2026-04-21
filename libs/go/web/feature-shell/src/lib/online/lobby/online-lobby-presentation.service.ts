import { Injectable, inject } from '@angular/core';
import {
  LobbyOnlineParticipantActivity,
  LobbyOnlineParticipantSummary,
  LobbyRoomStatus,
  LobbyRoomSummary,
} from '@gx/go/contracts';
import { GoI18nService } from '@gx/go/state/i18n';

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

const LOBBY_SECTION_ORDER: readonly LobbyRoomStatus[] = [
  'live',
  'ready',
  'waiting',
];
const ONLINE_PLAYER_ORDER: readonly LobbyOnlineParticipantActivity[] = [
  'playing',
  'seated',
  'watching',
];

@Injectable({ providedIn: 'root' })
export class OnlineLobbyPresentationService {
  private readonly i18n = inject(GoI18nService);

  buildLobbySections(
    rooms: readonly LobbyRoomSummary[],
  ): LobbySectionViewModel[] {
    return LOBBY_SECTION_ORDER.map((status) => ({
      status,
      title: this.i18n.t(`lobby.section.${status}.title`),
      rooms: rooms.filter((room) => room.status === status),
    }));
  }

  buildLobbyOverviewStats(
    rooms: readonly LobbyRoomSummary[],
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
      },
    );
  }

  buildLobbyTableRows(
    rooms: readonly LobbyRoomSummary[],
  ): LobbyRoomTableRowViewModel[] {
    return rooms.map((room) => {
      const blackSeat = this.seatLabel(room.players.black, 'black');
      const whiteSeat = this.seatLabel(room.players.white, 'white');

      return {
        room,
        roomId: room.roomId,
        roomLabel: this.roomCardLabel(room.roomId),
        hostLabel: room.hostDisplayName,
        modeLabel: this.roomModeLabel(room),
        blackSeat,
        whiteSeat,
        seatSummary: {
          black: blackSeat,
          white: whiteSeat,
        },
        peopleOnlineLabel: `${room.participantCount} / ${room.onlineCount}`,
        statusLabel: this.roomStatusLabel(room.status),
        actionLabel: this.roomActionLabel(room),
      };
    });
  }

  buildLobbyAnnouncementCards(): LobbyAnnouncementCardViewModel[] {
    return [
      {
        id: 'guide',
        title: this.i18n.t('lobby.announcement.guide.title'),
        copy: this.i18n.t('lobby.announcement.guide.copy'),
        tone: 'guide',
      },
      {
        id: 'ad',
        title: this.i18n.t('lobby.announcement.ad.title'),
        copy: this.i18n.t('lobby.announcement.ad.copy'),
        tone: 'ad',
      },
    ];
  }

  buildLobbyOnlinePlayerGroups(
    participants: readonly LobbyOnlineParticipantSummary[],
  ): LobbyOnlinePlayerGroupViewModel[] {
    return ONLINE_PLAYER_ORDER.map((activity) => {
      const players = participants
        .filter((participant) => participant.activity === activity)
        .map<LobbyOnlinePlayerViewModel>((participant) => ({
          participantId: participant.participantId,
          displayName: participant.displayName,
          roomId: participant.roomId,
          roomLabel: this.roomCardLabel(participant.roomId),
          roleBadges: this.playerRoleBadges(participant),
        }));

      return {
        activity,
        title: this.i18n.t(`lobby.online.activity.${activity}`),
        count: players.length,
        players,
      };
    }).filter((group) => group.count > 0);
  }

  roomStatusLabel(status: LobbyRoomStatus): string {
    return this.i18n.t(`lobby.status.${status}`);
  }

  roomModeLabel(room: LobbyRoomSummary): string {
    if (!room.mode || !room.boardSize) {
      return this.i18n.t('lobby.room.mode_pending');
    }

    return this.i18n.t('lobby.room.mode_with_board', {
      mode: this.i18n.t(`common.mode.${room.mode}`),
      size: room.boardSize,
    });
  }

  roomActionLabel(room: LobbyRoomSummary): string {
    return room.status === 'live'
      ? this.i18n.t('lobby.room.action.live')
      : this.i18n.t('lobby.room.action.join');
  }

  seatLabel(name: string | null, color: 'black' | 'white'): string {
    return (
      name ??
      this.i18n.t('lobby.room.open_seat', {
        seat: this.i18n.t(`common.seat.${color}`),
      })
    );
  }

  countLabel(
    count: number,
    unit: 'room' | 'person' | 'online' | 'spectator',
  ): string {
    return this.i18n.t(`lobby.count.${unit}.${count === 1 ? 'one' : 'other'}`, {
      count,
    });
  }

  roomCardLabel(roomId: string): string {
    return this.i18n.t('lobby.room.card.label', { roomId });
  }

  emptySectionLabel(status: LobbyRoomStatus): string {
    return this.i18n.t('lobby.section.empty', {
      section: this.i18n.t(`lobby.section.${status}.title`).toLowerCase(),
    });
  }

  private playerRoleBadges(
    participant: LobbyOnlineParticipantSummary,
  ): string[] {
    const badges: string[] = [];

    if (participant.isHost) {
      badges.push(this.i18n.t('lobby.online.role.host'));
    }

    if (participant.seat === 'black') {
      badges.push(this.i18n.t('lobby.online.role.black'));
    } else if (participant.seat === 'white') {
      badges.push(this.i18n.t('lobby.online.role.white'));
    } else {
      badges.push(this.i18n.t('lobby.online.role.watching'));
    }

    return badges;
  }
}
