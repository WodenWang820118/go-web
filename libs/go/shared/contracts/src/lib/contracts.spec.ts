import {
  ROOM_SNAPSHOT_SCHEMA_VERSION,
  RoomSnapshot,
  cloneRoomSnapshot,
  normalizeGameStartTimeControl,
} from './contracts';
import {
  DEFAULT_GO_RULE_OPTIONS,
  DEFAULT_GO_TIME_CONTROL,
  DEFAULT_HOSTED_BYO_YOMI,
} from '@gx/go/domain';
import { createRoomSnapshot } from './testing/room-fixtures';
import {
  MAX_DISPLAY_NAME_LENGTH,
  createUniqueDisplayName,
} from './display-name.utils';

describe('go-contracts', () => {
  it('clones room snapshots defensively', () => {
    const snapshot: RoomSnapshot = {
      schemaVersion: ROOM_SNAPSHOT_SCHEMA_VERSION,
      roomId: 'room-1',
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
      hostParticipantId: 'host-1',
      participants: [
        {
          participantId: 'host-1',
          displayName: 'Host',
          seat: 'black',
          isHost: true,
          online: true,
          muted: false,
          joinedAt: '2026-03-20T00:00:00.000Z',
        },
      ],
      seatState: {
        black: 'host-1',
        white: null,
      },
      nextMatchSettings: {
        mode: 'go',
        boardSize: 19,
        komi: 6.5,
        goRules: DEFAULT_GO_RULE_OPTIONS,
      },
      rematch: {
        participants: {
          black: 'host-1',
          white: 'guest-1',
        },
        responses: {
          black: 'accepted',
          white: 'pending',
        },
      },
      autoStartBlockedUntilSeatChange: false,
      nigiri: null,
      rules: {
        ruleset: 'go-area-agreement',
        openingRule: 'digital-nigiri',
        goRules: DEFAULT_GO_RULE_OPTIONS,
        timeControl: DEFAULT_HOSTED_BYO_YOMI,
      },
      match: {
        settings: {
          mode: 'go',
          boardSize: 19,
          goRules: DEFAULT_GO_RULE_OPTIONS,
          players: {
            black: 'Host',
            white: 'Guest',
          },
          komi: 6.5,
        },
        state: {
          mode: 'go',
          phase: 'playing',
          boardSize: 19,
          board: Array.from({ length: 19 }, () => Array(19).fill(null)),
          nextPlayer: 'black',
          captures: {
            black: 0,
            white: 0,
          },
          moveHistory: [],
          message: {
            key: 'game.state.next_turn',
            params: {
              player: {
                key: 'common.player.black',
              },
            },
          },
        },
        startedAt: '2026-03-20T00:05:00.000Z',
      },
      chat: [
        {
          id: 'chat-1',
          participantId: 'host-1',
          displayName: 'Host',
          message: 'Hello',
          sentAt: '2026-03-20T00:10:00.000Z',
          system: false,
        },
      ],
    };

    const cloned = cloneRoomSnapshot(snapshot);
    const clonedMatch = cloned.match;
    const firstBoardRow = clonedMatch?.state.board[0];
    const clonedRematch = cloned.rematch;
    const firstChatEntry = cloned.chat[0];
    const clonedRules = cloned.rules;

    if (
      !clonedMatch ||
      !firstBoardRow ||
      !clonedRematch ||
      !firstChatEntry ||
      !clonedRules
    ) {
      throw new Error(
        'Expected snapshot clone to include nested match, rematch, rules, and chat data',
      );
    }

    cloned.participants[0].displayName = 'Changed';
    firstBoardRow[0] = 'black';
    clonedRematch.responses.black = 'declined';
    clonedRules.openingRule = 'free-opening';
    clonedRules.goRules = {
      koRule: 'positional-superko',
      scoringRule: 'japanese-territory',
    };
    if (clonedRules.timeControl?.type === 'byo-yomi') {
      clonedRules.timeControl.periods = 1;
    }
    firstChatEntry.message = 'Updated';

    expect(snapshot.participants[0].displayName).toBe('Host');
    expect(snapshot.match?.state.board[0]?.[0]).toBeNull();
    expect(snapshot.rematch?.responses.black).toBe('accepted');
    expect(snapshot.rules?.openingRule).toBe('digital-nigiri');
    expect(snapshot.rules?.goRules).toEqual(DEFAULT_GO_RULE_OPTIONS);
    expect(snapshot.rules?.timeControl).toEqual(DEFAULT_HOSTED_BYO_YOMI);
    expect(snapshot.chat[0]?.message).toBe('Hello');
  });

  it('normalizes legacy room snapshots that omit goRules', () => {
    const legacy = createRoomSnapshot({
      schemaVersion: 3 as never,
      nextMatchSettings: {
        mode: 'go',
        boardSize: 19,
        komi: 6.5,
      },
      rules: {
        ruleset: 'go-area-agreement',
        openingRule: 'digital-nigiri',
        timeControl: DEFAULT_GO_TIME_CONTROL,
      },
      match: {
        settings: {
          mode: 'go',
          boardSize: 19,
          players: {
            black: 'Host',
            white: 'Guest',
          },
          komi: 6.5,
        },
        state: {
          mode: 'go',
          phase: 'playing',
          boardSize: 19,
          board: Array.from({ length: 19 }, () => Array(19).fill(null)),
          nextPlayer: 'black',
          captures: {
            black: 0,
            white: 0,
          },
          moveHistory: [],
          message: {
            key: 'game.state.next_turn',
            params: {
              player: {
                key: 'common.player.black',
              },
            },
          },
        },
        startedAt: '2026-03-20T00:05:00.000Z',
      },
    });

    expect(cloneRoomSnapshot(legacy)).toMatchObject({
      schemaVersion: ROOM_SNAPSHOT_SCHEMA_VERSION,
      nextMatchSettings: {
        goRules: DEFAULT_GO_RULE_OPTIONS,
      },
      rules: {
        goRules: DEFAULT_GO_RULE_OPTIONS,
      },
      match: {
        settings: {
          goRules: DEFAULT_GO_RULE_OPTIONS,
        },
      },
    });
  });

  it('adds a numeric suffix when a display name is already taken', () => {
    expect(createUniqueDisplayName('Host', ['Host', 'Host (2)', 'Guest'])).toBe(
      'Host (3)',
    );
  });

  it('creates room snapshot fixtures with the current schema version defaults', () => {
    expect(createRoomSnapshot()).toMatchObject({
      schemaVersion: ROOM_SNAPSHOT_SCHEMA_VERSION,
      nextMatchSettings: {
        goRules: DEFAULT_GO_RULE_OPTIONS,
      },
      nigiri: null,
      rules: null,
    });
  });

  it('normalizes Go room time controls to official presets', () => {
    expect(normalizeGameStartTimeControl('go', null)).toEqual({
      ok: true,
      timeControl: DEFAULT_GO_TIME_CONTROL,
    });
    expect(
      normalizeGameStartTimeControl('go', {
        type: 'fischer',
        mainTimeMs: 60 * 60 * 1000,
        incrementMs: 20 * 1000,
      }),
    ).toEqual({
      ok: true,
      timeControl: {
        type: 'fischer',
        mainTimeMs: 60 * 60 * 1000,
        incrementMs: 20 * 1000,
      },
    });
  });

  it('rejects unofficial or non-Go room time controls', () => {
    expect(
      normalizeGameStartTimeControl('go', {
        type: 'byo-yomi',
        mainTimeMs: 10 * 60 * 1000,
        periodTimeMs: 30 * 1000,
        periods: 5,
      }),
    ).toEqual({
      ok: false,
      reason: 'invalid-time-control',
    });
    expect(
      normalizeGameStartTimeControl('gomoku', DEFAULT_GO_TIME_CONTROL),
    ).toEqual({
      ok: false,
      reason: 'time-control-not-supported',
    });
    expect(normalizeGameStartTimeControl('gomoku', null)).toEqual({
      ok: true,
      timeControl: null,
    });
  });

  it('trims the base name so suffixed duplicates still fit the max length', () => {
    expect(
      createUniqueDisplayName('A'.repeat(MAX_DISPLAY_NAME_LENGTH), [
        'A'.repeat(MAX_DISPLAY_NAME_LENGTH),
      ]),
    ).toBe(`${'A'.repeat(MAX_DISPLAY_NAME_LENGTH - 4)} (2)`);
  });
});
