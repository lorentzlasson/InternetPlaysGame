alter table "public"."move" drop column "player";

alter table "public"."move" add column "player_id" integer not null;

alter table "public"."move_candiate" drop column "player";

alter table "public"."move_candiate" add column "player_id" integer not null;

alter table "public"."move" add constraint "move_player_id_fkey" FOREIGN KEY (player_id) REFERENCES player(id) not valid;

alter table "public"."move" validate constraint "move_player_id_fkey";

alter table "public"."move_candiate" add constraint "move_candiate_player_id_fkey" FOREIGN KEY (player_id) REFERENCES player(id) not valid;

alter table "public"."move_candiate" validate constraint "move_candiate_player_id_fkey";

