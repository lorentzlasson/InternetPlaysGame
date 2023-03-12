create domain entity_type as text check(value in (
  'avatar',
  'coin',
  'bomb'
));

create domain direction as text check(value in (
  'up',
  'down',
  'left',
  'right'
));

create domain positive_number as integer not null check (
  value >= 0
);

create domain x as integer not null check (
  value >= 0 and value <= 2
);

create domain y as integer not null check (
  value >= 0 and value <= 2
);

create domain movement_range as integer not null check (
  value >= -1 and value <= 1
);

create type position as (
  x x,
  y y
);

create type movement as (
  x movement_range,
  y movement_range
);

create table game (
  id serial primary key,
  score positive_number not null default 0,
  last_move_at timestamptz,
  high_score positive_number not null default 0 check (high_score >= score)
);

create table player (
  id serial primary key,
  game_id integer not null references game,
  name text not null
);

create table entity (
  id serial primary key,
  game_id integer not null references game,
  type entity_type not null,
  position "position" not null
);

create table move_candiate (
  id serial primary key,
  game_id integer not null references game,
  direction direction not null,
  player_id integer not null references player
);

create table move (
  id serial primary key,
  game_id integer not null references game,
  direction direction not null,
  player_id integer not null references player,
  time timestamptz not null default now()
);
