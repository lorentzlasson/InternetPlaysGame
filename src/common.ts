// ---------- TYPES ----------
export type Position = [number, number]; // numbers should be constrained to width and height of game board
export type Movement = [number, number]; // numbers should be constrained to -1, 0, 1

type BaseEntity = {
  position: Position;
};

export type Avatar = BaseEntity & {
  type: 'avatar';
};

type Coin = BaseEntity & {
  type: 'coin';
};

type Bomb = BaseEntity & {
  type: 'bomb';
};

export type Entity = Avatar | Coin | Bomb;

export type EntityType = Extract<Entity, { type: unknown }>['type'];

type Player = {
  name: string;
};

export type MoveCandidate = {
  direction: Direction;
  player: Player;
};

export type DirectionPercentage = {
  direction: Direction;
  percent: number;
};

export type Move = {
  direction: Direction;
  player: Player;
  time: string;
};

export type UiState = {
  score: number;
  highScore: number;
  lastMoveAt: string;
  entities: readonly Entity[];
  lastAvatarPosition: Position | null;
  directionPercentages: readonly DirectionPercentage[];
  signedInPlayer: string | null;
  signedInMoveCandidate: MoveCandidate | null;
};

export type StatsUiState = {
  score: number;
  highScore: number;
  lastMoveAt: string;
  entities: readonly Entity[];

  moveCandidates: readonly MoveCandidate[];
  moveHistory: readonly Move[];
  players: readonly Player[];
};

export const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export type Direction = typeof DIRECTIONS[number];

// ---------- CONSTANTS ----------

// deno-lint-ignore no-explicit-any
const cartesian = (...a: any[][]) =>
  a.reduce((a2, b) => a2.flatMap((d) => b.map((e) => [d, e].flat())));
export const range = (max: number) => Array.from(Array(max).keys());

export const MOVE_MOVEMENT_MAP: {
  [key in Direction]: Movement;
} = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const EMOJI_MAP = {
  bomb: '💣',
  coin: '🪙',
  avatar: '🏃',
  blank: '⬜',
  timerBar: '🟩',
} as const;

export type Emoji = typeof EMOJI_MAP[keyof typeof EMOJI_MAP];

export const HEIGHT = 3;
export const WIDTH = 3;

export const POSITIONS: Position[] = cartesian(range(WIDTH), range(HEIGHT));

export const DEFAULT_MOVE_SELECTION_MILLIS = 5000;

export const MOVE_SELECTION_MILLIS =
  parseInt(Deno.env.get('MOVE_SELECTION_MILLIS') || '') ||
  DEFAULT_MOVE_SELECTION_MILLIS;

// ---------- PURE ----------

// deno-lint-ignore no-explicit-any
export const isDirection = (token: any): token is Direction =>
  DIRECTIONS.includes(token);

export const positionIsAllowed = ([x, y]: Position): boolean =>
  x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;

export const isSamePosition = (
  [x1, y1]: Position,
  [x2, y2]: Position,
): boolean => x1 === x2 && y1 === y2;

export const calcDirectionPercentages = (
  moveCandidateCounts: { direction: Direction; count: number }[],
) => {
  const totalCandidateCount = moveCandidateCounts.reduce(
    (acc, val) => acc + val.count,
    0,
  );

  return moveCandidateCounts.map(({ direction, count }) => ({
    direction,
    percent: count / totalCandidateCount,
  }));
};
