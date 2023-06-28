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

create type position as (
  x x,
  y y
);

create table game (
  id serial primary key,
  score positive_number not null default 0,
  high_score positive_number not null default 0 check (high_score >= score),
  started_at timestamptz not null default now()
);

create table player (
  id serial primary key,
  game_id integer not null references game,
  name text not null unique
);

create table entity (
  id serial primary key,
  game_id integer not null references game,
  type entity_type not null,
  position "position" not null
);

create table tick (
  id serial primary key
);

create table move_candidate (
  id serial primary key,
  direction direction not null,
  player_id integer not null references player,
  tick_id integer not null references tick,
  time timestamptz not null default now(),
  unique (player_id, tick_id)
);

create table move (
  id serial primary key,
  move_candidate_id integer not null references move_candidate unique,
  time timestamptz not null default now()
);

-- migration tool schema --

create schema atlas_schema_revisions;

create table atlas_schema_revisions.atlas_schema_revisions (
  version character varying not null,
  description character varying not null,
  type bigint not null default 2,
  applied bigint not null default 0,
  total bigint not null default 0,
  executed_at timestamp with time zone not null,
  execution_time bigint not null,
  error text,
  error_stmt text,
  hash character varying not null,
  partial_hashes jsonb,
  operator_version character varying not null
);

create unique index atlas_schema_revisions_pkey on atlas_schema_revisions.atlas_schema_revisions using btree (version);

alter table atlas_schema_revisions.atlas_schema_revisions
add constraint atlas_schema_revisions_pkey primary key using index atlas_schema_revisions_pkey;
