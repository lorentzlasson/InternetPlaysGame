import type { ColumnType } from 'kysely';
import { Direction, EntityType } from './common.ts';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Entity {
  id: Generated<number>;
  gameId: number;
  type: EntityType;
  position: string;
}

export interface Game {
  id: Generated<number>;
  score: Generated<string>;
  highScore: Generated<string>;
  startedAt: Generated<Timestamp>;
}

export interface Move {
  id: Generated<number>;
  moveCandidateId: number;
  time: Generated<Timestamp>;
}

export interface MoveCandidate {
  id: Generated<number>;
  direction: Direction;
  playerId: number;
  time: Generated<Timestamp>;
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
