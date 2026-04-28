import { Injectable, inject } from '@angular/core';
import {
  HostedNigiriSnapshot,
  HostedRematchState,
  ParticipantSummary,
  RoomSnapshot,
} from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';
import { GoI18nService } from '@gx/go/state/i18n';
import {
  OnlineRoomNigiriViewModel,
  OnlineRoomSeatViewModel,
  OnlineRoomSidebarRematchStatusViewModel,
} from '../../../contracts/online-room-view.contracts';

export interface RoomSeatViewOptions {
  participantId: string | null;
  viewerSeat: PlayerColor | null;
  canChangeSeats: boolean;
}

export interface RoomNigiriViewState {
  nigiri: HostedNigiriSnapshot | null;
  participants: readonly ParticipantSummary[];
  viewerSeat: PlayerColor | null;
  realtimeConnected: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnlineRoomPageParticipantsPresentationService {
  private readonly i18n = inject(GoI18nService);

  buildRoomSeatViewModels(
    snapshot: RoomSnapshot | null,
    options: RoomSeatViewOptions,
  ): OnlineRoomSeatViewModel[] {
    if (!snapshot) {
      return [];
    }

    return (['black', 'white'] as const).map((color) => ({
      color,
      occupant:
        snapshot.participants.find(
          (participant) =>
            participant.participantId === snapshot.seatState[color],
        ) ?? null,
      canClaim:
        !!options.participantId &&
        options.canChangeSeats &&
        !snapshot.seatState[color],
      isViewerSeat: options.viewerSeat === color,
    }));
  }

  buildRoomNigiriViewModel(
    state: RoomNigiriViewState,
  ): OnlineRoomNigiriViewModel | null {
    const nigiri = state.nigiri;

    if (!nigiri) {
      return null;
    }

    const guesser = this.findParticipantBySeat(
      state.participants,
      nigiri.guesser,
    );
    const guesserName =
      guesser?.displayName ?? this.i18n.playerLabel(nigiri.guesser);

    if (nigiri.status === 'pending') {
      return {
        status: 'pending',
        title: this.i18n.t('room.nigiri.pending.title'),
        description: this.i18n.t('room.nigiri.pending.description', {
          player: guesserName,
        }),
        commitmentLabel: this.i18n.t('room.nigiri.commitment'),
        commitment: nigiri.commitment,
        canGuess:
          state.realtimeConnected && state.viewerSeat === nigiri.guesser,
        oddLabel: this.i18n.t('room.nigiri.guess.odd'),
        evenLabel: this.i18n.t('room.nigiri.guess.even'),
        resultLabel: null,
        assignedBlackLabel: null,
      };
    }

    const assignedBlackName =
      this.findParticipantBySeat(state.participants, 'black')?.displayName ??
      this.i18n.playerLabel('black');

    return {
      status: 'resolved',
      title: this.i18n.t('room.nigiri.resolved.title'),
      description: this.i18n.t('room.nigiri.resolved.description', {
        player: assignedBlackName,
      }),
      commitmentLabel: this.i18n.t('room.nigiri.commitment'),
      commitment: nigiri.commitment,
      canGuess: false,
      oddLabel: this.i18n.t('room.nigiri.guess.odd'),
      evenLabel: this.i18n.t('room.nigiri.guess.even'),
      resultLabel: this.i18n.t('room.nigiri.resolved.result', {
        guess: this.i18n.t(`room.nigiri.guess.${nigiri.guess}`),
        parity: this.i18n.t(`room.nigiri.guess.${nigiri.parity}`),
      }),
      assignedBlackLabel: this.i18n.t('room.nigiri.resolved.assigned_black', {
        player: assignedBlackName,
      }),
      guess: nigiri.guess,
      parity: nigiri.parity,
    };
  }

  findRoomRematchViewerSeat(
    participantId: string | null,
    rematch: HostedRematchState | null,
  ): PlayerColor | null {
    if (!participantId || !rematch) {
      return null;
    }

    if (rematch.participants.black === participantId) {
      return 'black';
    }

    if (rematch.participants.white === participantId) {
      return 'white';
    }

    return null;
  }

  buildRoomRematchStatuses(
    participants: readonly ParticipantSummary[],
    rematch: HostedRematchState | null,
    viewerParticipantId: string | null,
  ): OnlineRoomSidebarRematchStatusViewModel[] {
    if (!rematch) {
      return [];
    }

    return (['black', 'white'] as const).map((color) => {
      const participantId = rematch.participants[color];
      const participant = participants.find(
        (currentParticipant) =>
          currentParticipant.participantId === participantId,
      );

      return {
        color,
        name: participant?.displayName ?? this.i18n.playerLabel(color),
        response: rematch.responses[color],
        isViewer: viewerParticipantId === participantId,
      };
    });
  }

  private findParticipantBySeat(
    participants: readonly ParticipantSummary[],
    seat: PlayerColor,
  ): ParticipantSummary | null {
    return (
      participants.find((participant) => participant.seat === seat) ?? null
    );
  }
}
