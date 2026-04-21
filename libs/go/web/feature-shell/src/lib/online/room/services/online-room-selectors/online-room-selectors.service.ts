import { Injectable } from '@angular/core';
import {
  HostedMatchSnapshot,
  ParticipantSummary,
  RoomSnapshot,
} from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';

@Injectable({ providedIn: 'root' })
export class OnlineRoomSelectorsService {
  selectRoomParticipants(snapshot: RoomSnapshot | null): ParticipantSummary[] {
    return snapshot?.participants ?? [];
  }

  selectHostedMatch(snapshot: RoomSnapshot | null): HostedMatchSnapshot | null {
    return snapshot?.match ?? null;
  }

  selectChatMessages(snapshot: RoomSnapshot | null): RoomSnapshot['chat'] {
    return snapshot?.chat ?? [];
  }

  selectViewer(
    participants: readonly ParticipantSummary[],
    participantId: string | null,
  ): ParticipantSummary | null {
    if (!participantId) {
      return null;
    }

    return (
      participants.find(
        (participant) => participant.participantId === participantId,
      ) ?? null
    );
  }

  selectViewerSeat(viewer: ParticipantSummary | null): PlayerColor | null {
    return viewer?.seat ?? null;
  }

  selectViewerIsHost(viewer: ParticipantSummary | null): boolean {
    return viewer?.isHost ?? false;
  }

  selectViewerIsMuted(viewer: ParticipantSummary | null): boolean {
    return viewer?.muted ?? false;
  }

  selectIsActivePlayer(
    match: HostedMatchSnapshot | null,
    seat: PlayerColor | null,
  ): boolean {
    return (
      !!match &&
      !!seat &&
      match.state.phase === 'playing' &&
      match.state.nextPlayer === seat
    );
  }

  selectCanInteractBoard(
    match: HostedMatchSnapshot | null,
    seat: PlayerColor | null,
  ): boolean {
    if (!match || !seat || match.state.phase === 'finished') {
      return false;
    }

    if (match.state.phase === 'scoring') {
      return true;
    }

    return match.state.nextPlayer === seat;
  }

  selectCanChangeSeats(match: HostedMatchSnapshot | null): boolean {
    return !match || match.state.phase === 'finished';
  }
}
