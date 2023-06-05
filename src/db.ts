import postgres from 'postgres';

import { dbUrl } from './config.ts';

// Hack to get oid for custom type before initating real connection
const tempSql = postgres(dbUrl);
const [{ oid }] = await tempSql<{ oid: number }[]>`
  select oid
  from pg_type
  where typname = 'position'
`;
tempSql.end();

export const sql = postgres(dbUrl, {
  transform: postgres.camel,
  types: {
    position: {
      to: oid,
      from: [oid],
      // Cannot typ argument as [number,number] for unknown reason
      serialize: (position: number[]) => `(${position.toString()})`,
      parse: (
        [_startParen, x, _comma, y, _endParen]: string,
      ) => [
        parseInt(x),
        parseInt(y),
      ],
    },
  },
});
