import { CamelCasePlugin, Kysely } from 'kysely';
import { PostgresDialect } from 'kysely_postgres';
import { DB } from './db.types.ts';

export const db = new Kysely<DB>({
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

export const decodePosition = (p: string): [number, number] => {
  const match = /\(([^)]+)\)/.exec(p);
  if (!match) throw Error('fail to parse position');
  const match2 = match[1];
  const [x, y] = match2.split(',');
  return [
    parseInt(x),
    parseInt(y),
  ];
};

export const encodePosition = (p: [number, number]): string =>
  `(${p.toString()})`;
