export interface RoomLeaveConfirmationState {
  targetUrl: string;
  header: string;
  message: string;
  acceptLabel: string;
  rejectLabel: string;
}

type TranslationReader = {
  t(key: string, params?: Record<string, unknown>): string;
};

type RoomBootstrapState = 'idle' | 'loading' | 'ready' | 'missing';
type RoomConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected';

export interface RoomLeaveGuardState {
  isHost: boolean;
  roomId: string | null;
  participantToken: string | null;
  bootstrapState: RoomBootstrapState;
}

export interface RoomUnloadProtectionState extends RoomLeaveGuardState {
  leaving: boolean;
  closingRoom: boolean;
  allowNextNavigation: boolean;
}

export interface RoomClosureProbeState {
  currentRoomId: string | null;
  activeProbeRoomId: string | null;
  connectionState: RoomConnectionState;
  hasRoomIdentity: boolean;
  roomClosed: boolean;
  leaving: boolean;
  closingRoom: boolean;
  allowNextNavigation: boolean;
  probeArmed: boolean;
  probePending: boolean;
  probeInFlight: boolean;
}

export interface RoomMissingBootstrapState {
  roomId: string | null;
  bootstrapState: RoomBootstrapState;
  hasRoomIdentity: boolean;
  leaving: boolean;
  closingRoom: boolean;
  allowNextNavigation: boolean;
}

export function buildRoomLeaveConfirmationState(
  i18n: TranslationReader,
  targetUrl: string
): RoomLeaveConfirmationState {
  return {
    targetUrl,
    header: i18n.t('room.leave.confirm.header'),
    message: i18n.t('room.leave.confirm.message'),
    acceptLabel: i18n.t('room.leave.confirm.accept'),
    rejectLabel: i18n.t('room.leave.confirm.reject'),
  };
}

export function shouldInterceptHostLeave(
  state: RoomLeaveGuardState
): boolean {
  return (
    state.isHost &&
    !!state.roomId &&
    !!state.participantToken &&
    state.bootstrapState === 'ready'
  );
}

export function shouldProtectWindowUnload(
  state: RoomUnloadProtectionState
): boolean {
  return (
    shouldInterceptHostLeave(state) &&
    !state.leaving &&
    !state.closingRoom &&
    !state.allowNextNavigation
  );
}

export function shouldResetRoomClosureProbe(
  state: RoomClosureProbeState
): boolean {
  return (
    !state.currentRoomId ||
    state.roomClosed ||
    state.leaving ||
    state.closingRoom ||
    state.allowNextNavigation ||
    state.connectionState === 'connected' ||
    (state.activeProbeRoomId !== null &&
      state.activeProbeRoomId !== state.currentRoomId)
  );
}

export function shouldScheduleRoomClosureProbe(
  state: RoomClosureProbeState
): boolean {
  return (
    !shouldResetRoomClosureProbe(state) &&
    state.hasRoomIdentity &&
    !state.probeArmed &&
    !state.probePending &&
    !state.probeInFlight
  );
}

export function canHandleRoomClosureProbe(
  state: Pick<
    RoomClosureProbeState,
    | 'activeProbeRoomId'
    | 'currentRoomId'
    | 'roomClosed'
    | 'leaving'
    | 'closingRoom'
    | 'allowNextNavigation'
  >
): boolean {
  return (
    state.activeProbeRoomId === state.currentRoomId &&
    !!state.currentRoomId &&
    !state.roomClosed &&
    !state.leaving &&
    !state.closingRoom &&
    !state.allowNextNavigation
  );
}

export function shouldMarkClosedRoomFromMissingBootstrap(
  state: RoomMissingBootstrapState
): boolean {
  return (
    !!state.roomId &&
    state.bootstrapState === 'missing' &&
    state.hasRoomIdentity &&
    !state.leaving &&
    !state.closingRoom &&
    !state.allowNextNavigation
  );
}
