import { BoardSize, GameMode, ResultReason } from '@gx/go/domain';

export const GO_ANALYTICS_CONSENT_STORAGE_KEY = 'gx.analyticsConsent.v1';

export type GoAnalyticsConsentChoice = 'granted' | 'denied';

export type GoAnalyticsRouteGroup =
  | 'lobby'
  | 'setup'
  | 'local_play'
  | 'online_room'
  | 'unknown';

export type GoAnalyticsPlayContext = 'local' | 'hosted';

export type GoAnalyticsStartSource = 'setup' | 'room_create' | 'rematch';

export type GoAnalyticsJoinSource = 'lobby' | 'direct_room';

export type GoAnalyticsInteractionType =
  | 'seat_claim'
  | 'seat_release'
  | 'rematch_accept'
  | 'rematch_decline'
  | 'chat_send';

export interface GoAnalyticsConfig {
  containerId: string;
  enabled: boolean;
}

export interface GoAnalyticsPageViewEvent {
  event: 'gx_page_view';
  route_group: GoAnalyticsRouteGroup;
  page_path_normalized: string;
  game_mode?: GameMode;
  play_context?: GoAnalyticsPlayContext;
}

export interface GoAnalyticsMatchStartEvent {
  event: 'gx_match_start';
  game_mode: GameMode;
  play_context: GoAnalyticsPlayContext;
  board_size: BoardSize;
  start_source: GoAnalyticsStartSource;
}

export interface GoAnalyticsMatchFirstMoveEvent {
  event: 'gx_match_first_move';
  game_mode: GameMode;
  play_context: GoAnalyticsPlayContext;
  board_size: BoardSize;
}

export interface GoAnalyticsMatchEndEvent {
  event: 'gx_match_end';
  game_mode: GameMode;
  play_context: GoAnalyticsPlayContext;
  board_size: BoardSize;
  result_reason: ResultReason;
  winner: 'black' | 'white' | 'draw';
  move_count: number;
}

export interface GoAnalyticsRoomCreateEvent {
  event: 'gx_room_create';
  game_mode: GameMode;
  board_size: BoardSize;
}

export interface GoAnalyticsRoomJoinEvent {
  event: 'gx_room_join';
  join_source: GoAnalyticsJoinSource;
}

export interface GoAnalyticsRoomInteractionEvent {
  event: 'gx_room_interaction';
  interaction_type: GoAnalyticsInteractionType;
  play_context: 'hosted';
  game_mode?: GameMode;
}

export type GoAnalyticsEvent =
  | GoAnalyticsPageViewEvent
  | GoAnalyticsMatchStartEvent
  | GoAnalyticsMatchFirstMoveEvent
  | GoAnalyticsMatchEndEvent
  | GoAnalyticsRoomCreateEvent
  | GoAnalyticsRoomJoinEvent
  | GoAnalyticsRoomInteractionEvent;

export type GoDataLayerConsentCommand = [
  'consent',
  'default' | 'update',
  {
    ad_storage: 'denied';
    ad_user_data: 'denied';
    ad_personalization: 'denied';
    analytics_storage: 'denied' | 'granted';
  },
];

export type GoDataLayerEntry =
  | GoAnalyticsEvent
  | GoDataLayerConsentCommand
  | {
      event: 'gtm.js';
      'gtm.start': number;
    };

declare global {
  interface Window {
    dataLayer?: GoDataLayerEntry[];
  }
}
