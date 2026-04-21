export type GameMode = 'go' | 'gomoku';

export type GoBoardSize = 9 | 13 | 19;

export type GomokuBoardSize = 15;

export type BoardSize = GoBoardSize | GomokuBoardSize;

export type PlayerColor = 'black' | 'white';

export type MatchPhase = 'playing' | 'scoring' | 'finished';

export type ResultReason = 'score' | 'five-in-row' | 'resign' | 'draw';

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
}

export interface ResultSummary {
  winner: PlayerColor | 'draw';
  reason: ResultReason;
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

export function createMessage(
  key: string,
  params?: GoMessageParams,
): GoMessageDescriptor {
  return params ? { key, params } : { key };
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
