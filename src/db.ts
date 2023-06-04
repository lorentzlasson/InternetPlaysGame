import { createPool, Interceptor, SchemaValidationError } from 'npm:slonik';
import { z } from 'npm:zod';
import { sql } from 'npm:slonik';
import { createFieldNameTransformationInterceptor } from 'npm:slonik-interceptor-field-name-transformation';
import { dbUrl } from './config.ts';

const createResultParserInterceptor = (): Interceptor => ({
  transformRow: (executionContext, actualQuery, row) => {
    const { resultParser } = executionContext;

    if (!resultParser) {
      return row;
    }

    const validationResult = resultParser.safeParse(row);

    if (!validationResult.success) {
      throw new SchemaValidationError(
        actualQuery,
        row,
        validationResult.error.issues,
      );
    }

    return validationResult.data;
  },
});

const interceptors = [
  createFieldNameTransformationInterceptor({
    format: 'CAMEL_CASE',
  }),
  createResultParserInterceptor(),
];

const positionParser = {
  name: 'position',
  parse: (value: string): [number, number] => {
    const match = /\(([^)]+)\)/.exec(value);
    if (!match) throw Error('fail to parse position');
    const match2 = match[1];
    const [x, y] = match2.split(',');
    return [parseInt(x), parseInt(y)];
  },
};

const typeParsers = [positionParser];

export const encodePosition = (p: [number, number]): string =>
  `(${p.toString()})`;

export const db = await createPool(dbUrl, {
  interceptors,
  typeParsers,
});

// Parser convenience

const columns = {
  direction: z.enum(['up', 'down', 'left', 'right']),
  exists: z.boolean(),
  gameId: z.number(),
  highScore: z.number(),
  id: z.number(),
  moveCandidateId: z.number(),
  time: z.date(),
  name: z.string(),
  playerName: z.string(),
  position: z.tuple([z.number(), z.number()]),
  score: z.number(),
  type: z.enum(['avatar', 'bomb', 'coin']),
};

type Columns = typeof columns;
type ColumnNames = keyof Columns;

type Subset<T extends ColumnNames[]> = {
  [K in T[number]]: Columns[K];
};

export const returning = <T extends ColumnNames[]>(columnNames: T) => {
  const columnsSubset = columnNames.reduce(
    (acc, columnName) => ({ ...acc, [columnName]: columns[columnName] }),
    {} as Subset<T>,
  );
  return sql.type(z.object(columnsSubset).strict());
};
