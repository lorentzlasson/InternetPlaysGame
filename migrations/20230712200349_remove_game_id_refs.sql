
alter table "public"."entity" drop constraint "entity_game_id_fkey";

alter table "public"."player" drop constraint "player_game_id_fkey";

alter table "public"."entity" drop column "game_id";

alter table "public"."player" drop column "game_id";
