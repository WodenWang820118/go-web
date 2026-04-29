import { resolveGoRuleOptions, type MatchSettings } from '@gx/go/domain';
import {
  ROOM_SNAPSHOT_SCHEMA_VERSION,
  type GameStartSettings,
  type HostedMatchSnapshot,
  type HostedRulesMetadata,
  type RoomSnapshot,
} from './snapshots';

/**
 * Deep-clones a room snapshot so callers can mutate their local copy safely.
 */
export function cloneRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return normalizeRoomSnapshot(structuredClone(snapshot));
}

export function normalizeRoomSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return {
    ...snapshot,
    schemaVersion: ROOM_SNAPSHOT_SCHEMA_VERSION,
    nextMatchSettings: normalizeGameStartSettings(snapshot.nextMatchSettings),
    match: snapshot.match ? normalizeHostedMatch(snapshot.match) : null,
    rules: normalizeHostedRulesMetadata(
      snapshot.rules ?? null,
      snapshot.match?.settings ?? snapshot.nextMatchSettings,
    ),
  };
}

export function normalizeGameStartSettings(
  settings: GameStartSettings,
): GameStartSettings {
  if (settings.mode !== 'go') {
    const { goRules: _goRules, ...rest } = settings;
    return rest;
  }

  return {
    ...settings,
    goRules: resolveGoRuleOptions(settings),
  };
}

function normalizeHostedMatch(match: HostedMatchSnapshot): HostedMatchSnapshot {
  return {
    ...match,
    settings: normalizeMatchSettings(match.settings),
  };
}

function normalizeMatchSettings(settings: MatchSettings): MatchSettings {
  if (settings.mode !== 'go') {
    const { goRules: _goRules, ...rest } = settings;
    return rest;
  }

  return {
    ...settings,
    goRules: resolveGoRuleOptions(settings),
  };
}

function normalizeHostedRulesMetadata(
  rules: HostedRulesMetadata | null,
  settings: GameStartSettings | MatchSettings,
): HostedRulesMetadata | null {
  if (!rules) {
    return null;
  }

  if (settings.mode !== 'go') {
    const { goRules: _goRules, ...rest } = rules;
    return rest;
  }

  return {
    ...rules,
    goRules: resolveGoRuleOptions(settings),
  };
}
