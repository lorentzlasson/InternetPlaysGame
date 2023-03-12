import type { ColumnType } from 'kysely';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Entity {
  id: Generated<number>;
  gameId: number;
  type: string;
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
  direction: string;
  time: Generated<Timestamp>;
  playerId: number;
}

export interface MoveCandiate {
  id: Generated<number>;
  gameId: number;
  direction: string;
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
  moveCandiate: MoveCandiate;
  player: Player;
}
