// ---------- TYPES ----------
export type Position = [number, number]; // numbers should be constrained to width and height of game board
export type Movement = [number, number]; // numbers should be constrained to -1, 0, 1

type BaseEntity = {
  position: Position;
};

type Avatar = BaseEntity & {
  __type: 'avatar';
};

type Coin = BaseEntity & {
  __type: 'coin';
};

type Bomb = BaseEntity & {
  __type: 'bomb';
};

export type Entity = Avatar | Coin | Bomb;

type Player = {
  name: string;
};

export type MoveCandidate = {
  direction: Direction;
  player: Player;
};

export type Move = {
  direction: Direction;
  player: Player;
  time: string;
};

export type State = {
  score: number;
  entities: Entity[];
  players: Player[];
  moveCandidates: MoveCandidate[];
  moveHistory: Move[];
  lastMoveAt: string | null;
  highScore: number;
};

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

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

// ---------- PURE ----------

// deno-lint-ignore no-explicit-any
export const isDirection = (token: any): token is Direction =>
  DIRECTIONS.includes(token);

export const isCoin = (entity: Entity): entity is Coin =>
  entity.__type === 'coin';

export const isAvatar = (entity: Entity): entity is Avatar =>
  entity.__type === 'avatar';

export const isBomb = (entity: Entity): entity is Bomb =>
  entity.__type === 'bomb';

export const positionIsAllowed = ([x, y]: Position): boolean =>
  x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;

export const isSamePosition = (
  [x1, y1]: Position,
  [x2, y2]: Position,
): boolean => x1 === x2 && y1 === y2;
