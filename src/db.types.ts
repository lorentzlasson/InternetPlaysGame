import type { ColumnType } from 'kysely';
import { EntityType } from './common.ts';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export type Direction = typeof DIRECTIONS[number];

export interface Entity {
  id: Generated<number>;
  gameId: number;
  type: EntityType;
  position: string;
}

export interface Game {
  id: Generated<number>;
  score: Generated<string>;
  lastMoveAt: Timestamp | null;
  highScore: Generated<string>;
}

export interface Move {
  id: Generated<number>;
  gameId: number;
  direction: Direction;
  time: Generated<Timestamp>;
  playerId: number;
}

export interface MoveCandidate {
  id: Generated<number>;
  gameId: number;
  direction: Direction;
  playerId: number;
}

export interface Player {
  id: Generated<number>;
  gameId: number;
  name: string;
}

export interface DB {
  entity: Entity;
  game: Game;
  move: Move;
  moveCandidate: MoveCandidate;
  player: Player;
}
