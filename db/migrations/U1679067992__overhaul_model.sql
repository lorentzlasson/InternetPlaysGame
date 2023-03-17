alter table "public"."move" drop column "game_id";
alter table "public"."move" drop column "player_id";
alter table "public"."move" drop column "direction";
alter table "public"."move_candidate" drop column "game_id";
alter table "public"."game" drop column "last_move_at";

alter table "public"."move" add column "move_candidate_id" integer not null;
alter table "public"."move" add constraint "move_candidate_id_fkey" FOREIGN KEY (move_candidate_id) REFERENCES move_candidate(id) not valid;

alter table "public"."move_candidate" add column "time" timestamptz not null default now();
