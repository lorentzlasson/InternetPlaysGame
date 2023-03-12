import { CamelCasePlugin, Kysely } from 'kysely';
import { PostgresDialect } from 'kysely_postgres';
import { DB } from './db.types.ts';

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    user: Deno.env.get('POSTGRES_USER'),
    database: Deno.env.get('POSTGRES_DB'),
    hostname: Deno.env.get('POSTGRES_HOST'),
    port: Deno.env.get('POSTGRES_PORT'),
    password: Deno.env.get('POSTGRES_PASSWORD'),
  }),
  plugins: [
    new CamelCasePlugin(),
  ],
});

export const init = async () => {
  const existingGame = await db.selectFrom('game').select(['id'])
    .executeTakeFirst();

  if (existingGame) return existingGame;

  // Setting score to 0 should not be necessary as it's the default value.
  // Would ideally like to execute `insert into game default values`
  // but haven't found a good way to do that
  const newGame = await db.insertInto('game').values({ score: '0' })
    .returning(['id']).executeTakeFirstOrThrow();
  console.log('New game created');

  return newGame;
};
