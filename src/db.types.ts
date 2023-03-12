import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Entity {
  id: Generated<number>;
  game_id: number;
  type: string;
  position: string;
}

export interface Game {
  id: Generated<number>;
  score: Generated<string>;
  last_move_at: Timestamp | null;
  high_score: Generated<string>;
}

export interface Move {
  id: Generated<number>;
  game_id: number;
  direction: string;
  time: Generated<Timestamp>;
  player_id: number;
}

export interface MoveCandiate {
  id: Generated<number>;
  game_id: number;
  direction: string;
  player_id: number;
}

export interface Player {
  id: Generated<number>;
  game_id: number;
  name: string;
}

export interface DB {
  entity: Entity;
  game: Game;
  move: Move;
  move_candiate: MoveCandiate;
  player: Player;
}
