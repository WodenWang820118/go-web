export type BootstrapState = 'idle' | 'loading' | 'ready' | 'missing';

export type OnlineRoomRealtimeEvent =
  | 'seat.claim'
  | 'seat.release'
  | 'room.settings.update'
  | 'game.command'
  | 'game.rematch.respond'
  | 'chat.send'
  | 'host.mute'
  | 'host.unmute'
  | 'host.kick';

export const JOIN_ROOM_REQUIRED_MESSAGE = 'room.client.join_required';
export const REALTIME_UNAVAILABLE_MESSAGE = 'room.client.realtime_unavailable';
