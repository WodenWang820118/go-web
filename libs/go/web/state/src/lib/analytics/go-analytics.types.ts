import { BoardSize, GameMode, GameResultReason } from '@gx/go/domain';

export const GO_ANALYTICS_CONSENT_STORAGE_KEY = 'gx.analyticsConsent.v1';

export type GoAnalyticsConsentChoice = 'granted' | 'denied';
export type GoAnalyticsEventSchema = 'legacy' | 'ga4';

export type GoAnalyticsRouteGroup =
  | 'lobby'
  | 'setup'
  | 'local_play'
  | 'online_room'
  | 'unknown';

export type GoAnalyticsPlayContext = 'local' | 'hosted';

export type GoAnalyticsStartSource = 'setup' | 'room_create' | 'rematch';

export type GoAnalyticsJoinSource = 'lobby' | 'direct_room';
export type GoAnalyticsErrorType = 'network' | 'not_found' | 'unexpected';
export type GoAnalyticsRoomStatus = 'live' | 'ready' | 'waiting';
export type GoAnalyticsShareResult = 'manual_fallback';
export type GoAnalyticsLocale = 'zh-TW' | 'en';

export type GoAnalyticsInteractionType =
  | 'seat_claim'
  | 'seat_release'
  | 'rematch_accept'
  | 'rematch_decline'
  | 'chat_send';

export type GoAnalyticsMatchActionType =
  | 'place'
  | 'toggle_dead'
  | 'pass'
  | 'resign'
  | 'confirm_scoring'
  | 'dispute_scoring'
  | 'nigiri_guess'
  | 'restart'
  | 'new_setup';

export type GoAnalyticsContentType = 'local_mode' | 'online_room';
export type GoAnalyticsContentId = 'go' | 'gomoku' | 'room_open' | 'room_join';

export interface GoAnalyticsConfig {
  containerId: string;
  enabled: boolean;
  eventSchema?: GoAnalyticsEventSchema;
}

export interface GoAnalyticsPageViewEvent {
  event: 'page_view';
  route_group: GoAnalyticsRouteGroup;
  page_path_normalized: string;
  game_mode?: GameMode;
  play_context?: GoAnalyticsPlayContext;
}

export interface GoAnalyticsLevelStartEvent {
  event: 'level_start';
  game_mode: GameMode;
  play_context: GoAnalyticsPlayContext;
  board_size: BoardSize;
  level_name: string;
  start_source: GoAnalyticsStartSource;
}

export interface GoAnalyticsMatchFirstMoveEvent {
  event: 'gx_match_first_move';
  game_mode: GameMode;
  play_context: GoAnalyticsPlayContext;
  board_size: BoardSize;
}

export interface GoAnalyticsLevelEndEvent {
  event: 'level_end';
  game_mode: GameMode;
  play_context: GoAnalyticsPlayContext;
  board_size: BoardSize;
  level_name: string;
  success: true;
  result_reason: GameResultReason;
  winner: 'black' | 'white' | 'draw';
  move_count: number;
}

export interface GoAnalyticsMatchActionEvent {
  event: 'gx_match_action';
  action_type: GoAnalyticsMatchActionType;
  play_context: GoAnalyticsPlayContext;
  game_mode?: GameMode;
}

export interface GoAnalyticsRoomCreateIntentEvent {
  event: 'gx_room_create_intent';
  game_mode: GameMode;
  board_size: BoardSize;
}

export interface GoAnalyticsRoomCreateEvent {
  event: 'gx_room_create';
  game_mode: GameMode;
  board_size: BoardSize;
}

export interface GoAnalyticsRoomCreateErrorEvent {
  event: 'gx_room_create_error';
  error_type: GoAnalyticsErrorType;
  game_mode: GameMode;
  board_size: BoardSize;
}

export interface GoAnalyticsRoomJoinEvent {
  event: 'join_group';
  group_id: 'online_room';
  join_source: GoAnalyticsJoinSource;
}

export interface GoAnalyticsRoomJoinIntentEvent {
  event: 'gx_room_join_intent';
  join_source: GoAnalyticsJoinSource;
}

export interface GoAnalyticsRoomJoinErrorEvent {
  event: 'gx_room_join_error';
  error_type: GoAnalyticsErrorType;
  join_source: GoAnalyticsJoinSource;
}

export interface GoAnalyticsRoomInteractionEvent {
  event: 'gx_room_interaction';
  interaction_type: GoAnalyticsInteractionType;
  play_context: 'hosted';
  game_mode?: GameMode;
}

export interface GoAnalyticsShareEvent {
  event: 'share';
  method: 'copy_link';
  content_type: 'online_room';
  item_id: 'hosted_room_invite';
}

export interface GoAnalyticsRoomShareCopyEvent {
  event: 'gx_room_share_copy';
  method: 'copy_link';
  content_type: 'online_room';
  item_id: 'hosted_room_invite';
  share_result: GoAnalyticsShareResult;
}

export interface GoAnalyticsSelectContentEvent {
  event: 'select_content';
  content_type: GoAnalyticsContentType;
  content_id: GoAnalyticsContentId;
  game_mode?: GameMode;
  room_status?: GoAnalyticsRoomStatus;
}

export interface GoAnalyticsLobbyFilterChangeEvent {
  event: 'gx_lobby_filter_change';
  room_status: GoAnalyticsRoomStatus;
}

export interface GoAnalyticsLocaleChangeEvent {
  event: 'gx_locale_change';
  locale: GoAnalyticsLocale;
  target_locale: GoAnalyticsLocale;
}

export type GoAnalyticsEvent =
  | GoAnalyticsPageViewEvent
  | GoAnalyticsLevelStartEvent
  | GoAnalyticsMatchFirstMoveEvent
  | GoAnalyticsLevelEndEvent
  | GoAnalyticsMatchActionEvent
  | GoAnalyticsRoomCreateIntentEvent
  | GoAnalyticsRoomCreateEvent
  | GoAnalyticsRoomCreateErrorEvent
  | GoAnalyticsRoomJoinEvent
  | GoAnalyticsRoomJoinIntentEvent
  | GoAnalyticsRoomJoinErrorEvent
  | GoAnalyticsRoomInteractionEvent
  | GoAnalyticsShareEvent
  | GoAnalyticsRoomShareCopyEvent
  | GoAnalyticsSelectContentEvent
  | GoAnalyticsLobbyFilterChangeEvent
  | GoAnalyticsLocaleChangeEvent;

export interface GoAnalyticsLegacyPageViewEvent
  extends Omit<GoAnalyticsPageViewEvent, 'event'> {
  event: 'gx_page_view';
}

export interface GoAnalyticsLegacyMatchStartEvent
  extends Omit<GoAnalyticsLevelStartEvent, 'event' | 'level_name'> {
  event: 'gx_match_start';
}

export interface GoAnalyticsLegacyMatchEndEvent
  extends Omit<GoAnalyticsLevelEndEvent, 'event' | 'level_name' | 'success'> {
  event: 'gx_match_end';
}

export interface GoAnalyticsLegacyRoomJoinEvent
  extends Omit<GoAnalyticsRoomJoinEvent, 'event' | 'group_id'> {
  event: 'gx_room_join';
}

export type GoAnalyticsSerializedEvent =
  | GoAnalyticsEvent
  | GoAnalyticsLegacyPageViewEvent
  | GoAnalyticsLegacyMatchStartEvent
  | GoAnalyticsLegacyMatchEndEvent
  | GoAnalyticsLegacyRoomJoinEvent;

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
  | GoAnalyticsSerializedEvent
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
