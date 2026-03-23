import { HostedMatchSnapshot, ParticipantSummary, RoomSnapshot } from '@gx/go/contracts';
import { PlayerColor } from '@gx/go/domain';

/**
 * Returns the current participant list for a hosted room.
 */
export function selectRoomParticipants(
  snapshot: RoomSnapshot | null
): ParticipantSummary[] {
  return snapshot?.participants ?? [];
}

/**
 * Returns the current hosted match, if one is active.
 */
export function selectHostedMatch(
  snapshot: RoomSnapshot | null
): HostedMatchSnapshot | null {
  return snapshot?.match ?? null;
}

/**
 * Returns the room chat history.
 */
export function selectChatMessages(snapshot: RoomSnapshot | null) {
  return snapshot?.chat ?? [];
}

/**
 * Resolves the current viewer from the participant list and saved participant id.
 */
export function selectViewer(
  participants: readonly ParticipantSummary[],
  participantId: string | null
): ParticipantSummary | null {
  if (!participantId) {
    return null;
  }

  return (
    participants.find(participant => participant.participantId === participantId) ??
    null
  );
}

export function selectViewerSeat(
  viewer: ParticipantSummary | null
): PlayerColor | null {
  return viewer?.seat ?? null;
}

export function selectViewerIsHost(viewer: ParticipantSummary | null): boolean {
  return viewer?.isHost ?? false;
}

export function selectViewerIsMuted(viewer: ParticipantSummary | null): boolean {
  return viewer?.muted ?? false;
}

/**
 * Determines whether the current viewer is allowed to play the next move.
 */
export function selectIsActivePlayer(
  match: HostedMatchSnapshot | null,
  seat: PlayerColor | null
): boolean {
  return (
    !!match &&
    !!seat &&
    match.state.phase === 'playing' &&
    match.state.nextPlayer === seat
  );
}

/**
 * Determines whether the viewer may interact with the hosted board.
 */
export function selectCanInteractBoard(
  match: HostedMatchSnapshot | null,
  seat: PlayerColor | null
): boolean {
  if (!match || !seat || match.state.phase === 'finished') {
    return false;
  }

  if (match.state.phase === 'scoring') {
    return true;
  }

  return match.state.nextPlayer === seat;
}

/**
 * Seats stay mutable until a hosted match has started, then reopen once it finishes.
 */
export function selectCanChangeSeats(
  match: HostedMatchSnapshot | null
): boolean {
  return !match || match.state.phase === 'finished';
}
