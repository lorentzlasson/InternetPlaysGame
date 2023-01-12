import { ColumnType, RawBuilder } from 'kysely';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<
  Date,
  Date | string | RawBuilder,
  Date | string | RawBuilder
>;

export interface Entity {
  game_id: number;
  id: Generated<number>;
  position: string;
  type: string;
}

export interface Game {
  high_score: Generated<string>;
  id: Generated<number>;
  last_move_at: Timestamp | null;
  score: Generated<string>;
}

export interface Move {
  direction: string;
  game_id: number;
  id: Generated<number>;
  player: string;
  time: Generated<Timestamp>;
}

export interface MoveCandiate {
  direction: string;
  game_id: number;
  id: Generated<number>;
  player: string;
}

export interface Player {
  game_id: number;
  id: Generated<number>;
  name: string;
}

export interface DB {
  entity: Entity;
  game: Game;
  move: Move;
  move_candiate: MoveCandiate;
  player: Player;
}
