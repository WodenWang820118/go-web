export type GameMode = 'go' | 'gomoku';

export type GoBoardSize = 9 | 13 | 19;

export type GomokuBoardSize = 15;

export type BoardSize = GoBoardSize | GomokuBoardSize;

export type PlayerColor = 'black' | 'white';

export type MatchPhase = 'playing' | 'scoring' | 'finished';

export type ResultReason = 'score' | 'five-in-row' | 'resign' | 'draw';

export type TimeoutResultReason = 'timeout';

export type GameResultReason = ResultReason | TimeoutResultReason;

export type GameRuleset = 'go-area-agreement' | 'gomoku-standard-exact-five';

export type GameOpeningRule = 'digital-nigiri' | 'free-opening';

export type GoKoRule = 'basic-ko' | 'positional-superko';

export type GoScoringRule = 'area' | 'japanese-territory';

export interface GoRuleOptions {
  koRule: GoKoRule;
  scoringRule: GoScoringRule;
}

export interface ByoYomiTimeControl {
  type: 'byo-yomi';
  mainTimeMs: number;
  periodTimeMs: number;
  periods: number;
}

export interface FischerTimeControl {
  type: 'fischer';
  mainTimeMs: number;
  incrementMs: number;
}

export interface CanadianTimeControl {
  type: 'canadian';
  mainTimeMs: number;
  periodTimeMs: number;
  stonesPerPeriod: number;
}

export interface AbsoluteTimeControl {
  type: 'absolute';
  mainTimeMs: number;
}

export type TimeControlSettings =
  | ByoYomiTimeControl
  | FischerTimeControl
  | CanadianTimeControl
  | AbsoluteTimeControl;

export interface GoMessageDescriptor {
  key: string;
  params?: GoMessageParams;
}

export type GoMessageParamValue = string | number | GoMessageDescriptor;

export type GoMessageParams = Record<string, GoMessageParamValue>;

export type CellValue = PlayerColor | null;

export type BoardMatrix = CellValue[][];

export interface BoardPoint {
  x: number;
  y: number;
}

export interface MatchSettings {
  mode: GameMode;
  boardSize: BoardSize;
  players: Record<PlayerColor, string>;
  komi: number;
  ruleset?: GameRuleset;
  openingRule?: GameOpeningRule;
  goRules?: GoRuleOptions;
  timeControl?: TimeControlSettings | null;
}

export type MoveCommand =
  | {
      type: 'place';
      point: BoardPoint;
    }
  | {
      type: 'pass';
    }
  | {
      type: 'resign';
      player?: PlayerColor;
    };

export interface TerritoryRegion {
  owner: PlayerColor | null;
  points: BoardPoint[];
}

export interface ScoreBreakdown {
  black: number;
  white: number;
  blackStones: number;
  whiteStones: number;
  blackTerritory: number;
  whiteTerritory: number;
  komi: number;
}

export interface ScoringState {
  deadStones: string[];
  territory: TerritoryRegion[];
  score: ScoreBreakdown;
  confirmedBy?: PlayerColor[];
  revision?: number;
}

export interface ResultSummary {
  winner: PlayerColor | 'draw';
  reason: GameResultReason;
  summary: GoMessageDescriptor;
  margin?: number;
  resignedBy?: PlayerColor;
  winningLine?: BoardPoint[];
  score?: ScoreBreakdown;
}

export interface MoveRecord {
  id: string;
  moveNumber: number;
  player: PlayerColor;
  command: MoveCommand;
  notation: string;
  boardHashAfterMove: string;
  phaseAfterMove: MatchPhase;
  capturedPoints: BoardPoint[];
  capturesAfterMove: Record<PlayerColor, number>;
}

export interface MatchState {
  mode: GameMode;
  boardSize: BoardSize;
  board: BoardMatrix;
  phase: MatchPhase;
  nextPlayer: PlayerColor;
  captures: Record<PlayerColor, number>;
  moveHistory: MoveRecord[];
  previousBoardHashes: string[];
  lastMove: MoveRecord | null;
  consecutivePasses: number;
  winnerLine: BoardPoint[];
  message: GoMessageDescriptor;
  scoring: ScoringState | null;
  result: ResultSummary | null;
}

export interface RuleResult {
  ok: boolean;
  state: MatchState;
  error?: GoMessageDescriptor;
}

export const GO_BOARD_SIZES: readonly GoBoardSize[] = [9, 13, 19];

export const GOMOKU_BOARD_SIZE: GomokuBoardSize = 15;

export const DEFAULT_GO_KOMI = 6.5;

export const GO_AREA_AGREEMENT_RULESET: GameRuleset = 'go-area-agreement';

export const GOMOKU_STANDARD_EXACT_FIVE_RULESET: GameRuleset =
  'gomoku-standard-exact-five';

export const GO_DIGITAL_NIGIRI_OPENING: GameOpeningRule = 'digital-nigiri';

export const GOMOKU_FREE_OPENING: GameOpeningRule = 'free-opening';

export const GO_KO_RULES: readonly GoKoRule[] = [
  'basic-ko',
  'positional-superko',
];

export const GO_SCORING_RULES: readonly GoScoringRule[] = [
  'area',
  'japanese-territory',
];

export const DEFAULT_GO_RULE_OPTIONS: GoRuleOptions = {
  koRule: 'basic-ko',
  scoringRule: 'area',
};

export const DEFAULT_GO_TIME_CONTROL: ByoYomiTimeControl = {
  type: 'byo-yomi',
  mainTimeMs: 30 * 60 * 1000,
  periodTimeMs: 30 * 1000,
  periods: 3,
};

export const DEFAULT_HOSTED_BYO_YOMI: ByoYomiTimeControl =
  DEFAULT_GO_TIME_CONTROL;

export function createMessage(
  key: string,
  params?: GoMessageParams,
): GoMessageDescriptor {
  return params ? { key, params } : { key };
}

export function isGoKoRule(value: unknown): value is GoKoRule {
  return GO_KO_RULES.includes(value as GoKoRule);
}

export function isGoScoringRule(value: unknown): value is GoScoringRule {
  return GO_SCORING_RULES.includes(value as GoScoringRule);
}

export function resolveGoRuleOptions(
  settings?: { goRules?: Partial<GoRuleOptions> | null } | null,
): GoRuleOptions {
  const options = settings?.goRules;

  return {
    koRule: isGoKoRule(options?.koRule)
      ? options.koRule
      : DEFAULT_GO_RULE_OPTIONS.koRule,
    scoringRule: isGoScoringRule(options?.scoringRule)
      ? options.scoringRule
      : DEFAULT_GO_RULE_OPTIONS.scoringRule,
  };
}

export function isMessageDescriptor(
  value: unknown,
): value is GoMessageDescriptor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof (value as { key?: unknown }).key === 'string'
  );
}
