import { sql } from 'kysely';
import {
  EntityType,
  isSamePosition,
  MOVE_MOVEMENT_MAP,
  MOVE_SELECTION_MILLIS,
  Position,
  positionIsAllowed,
  POSITIONS,
  State,
} from './common.ts';
import { db, decodePosition, encodePosition } from './db.ts';
import { Direction } from './db.types.ts';

// ---------- INIT  ----------
const ENTITY_INIT = [
  {
    type: 'avatar',
    position: [0, 2],
  },
  {
    type: 'coin',
    position: [2, 0],
  },
  {
    type: 'bomb',
    position: [0, 1],
  },
] as const;

// ---------- STATE ----------

// const state: State = {
//   score: 0,
//   entities: [
//     {
//       __type: 'avatar',
//       position: [0, 2],
//     },
//     {
//       __type: 'coin',
//       position: [2, 0],
//     },
//     {
//       __type: 'bomb',
//       position: [0, 1],
//     },
//   ],
//   players: [],
//   moveCandidates: [],
//   moveHistory: [],
//   lastMoveAt: null,
//   highScore: 0,
// };

// ---------- READS ----------

const findPlayer = (gameId: number, playerName: string) =>
  db
    .selectFrom('player')
    .where('gameId', '=', gameId)
    .where('name', '=', playerName)
    .selectAll()
    .executeTakeFirst();

const findMoveCandidate = (gameId: number, playerId: number) =>
  db
    .selectFrom('moveCandidate')
    .where('gameId', '=', gameId)
    .where('playerId', '=', playerId)
    .selectAll()
    .executeTakeFirst();

const findAvatar = (gameId: number) => {
  return db
    .selectFrom('entity')
    .where('gameId', '=', gameId)
    .where('type', '=', 'avatar')
    .selectAll()
    .executeTakeFirstOrThrow();
};

const positionHasEntity = async (
  gameId: number,
  pos: Position,
  entityType: EntityType,
): Promise<boolean> => {
  const count = await db
    .selectFrom('entity')
    .where('type', '=', entityType)
    .where('position', '=', sql`${encodePosition(pos)}::"position"`)
    .where('gameId', '=', gameId)
    .select(db.fn.countAll().as('count'))
    .executeTakeFirstOrThrow();

  return count.count === BigInt(1);
};

const randomCapped = (cap: number) => Math.floor(Math.random() * cap);

const randomAvailablePosition = async (gameId: number): Promise<Position> => {
  const occupiedPositions = (await db
    .selectFrom('entity')
    .where('gameId', '=', gameId)
    .select('position')
    .execute()).map(({ position }) => decodePosition(position));

  const availablePositions = POSITIONS.filter(
    (pos) =>
      !occupiedPositions.some((occupiedPos) =>
        isSamePosition(occupiedPos, pos)
      ),
  );
  const randomIndex = randomCapped(availablePositions.length - 1);
  return availablePositions[randomIndex];
};

const randomMoveCandidate = (gameId: number) =>
  db
    .selectFrom('moveCandidate')
    .orderBy(sql`random()`)
    .select(['gameId', 'playerId', 'direction'])
    .where('gameId', '=', gameId)
    .executeTakeFirstOrThrow();

export const getState = async (gameId: number): Promise<State> => {
  const dbGame = await db
    .selectFrom('game')
    .where('id', '=', gameId)
    .select(['score', 'highScore', 'lastMoveAt'])
    .executeTakeFirstOrThrow();

  const game = {
    ...dbGame,
    highScore: parseInt(dbGame.highScore),
    score: parseInt(dbGame.score),
    lastMoveAt: dbGame.lastMoveAt ? dbGame.lastMoveAt.toISOString() : null,
  };

  const dbEntities = await db
    .selectFrom('entity')
    .where('gameId', '=', gameId)
    .select(['type', 'position'])
    .execute();

  const entities = dbEntities.map(({ type, position }) => ({
    __type: type,
    position: decodePosition(position),
  }));

  const players = await db
    .selectFrom('player')
    .where('gameId', '=', gameId)
    .select(['name'])
    .execute();

  const dbMoveCandidates = await db
    .selectFrom('moveCandidate')
    .where('moveCandidate.gameId', '=', gameId)
    .innerJoin('player', 'player.id', 'moveCandidate.playerId')
    .select(['moveCandidate.direction', 'player.name'])
    .execute();

  const moveCandidates = dbMoveCandidates.map(({ direction, name }) => ({
    direction,
    player: {
      name,
    },
  }));

  const dbMoveHistory = await db
    .selectFrom('move')
    .where('move.gameId', '=', gameId)
    .innerJoin('player', 'player.id', 'move.playerId')
    .select(['move.direction', 'move.time', 'player.name'])
    .execute();

  const moveHistory = dbMoveHistory.map(({ direction, time, name }) => ({
    direction,
    time: time.toISOString(),
    player: {
      name,
    },
  }));

  const state = {
    ...game,
    entities,
    players,
    moveCandidates,
    moveHistory,
  };

  return state;
};

// ---------- MUTATIONS ----------

export const init = async () => {
  const existingGame = await db.selectFrom('game').selectAll()
    .executeTakeFirst();

  if (existingGame) {
    console.log('Resuming game', existingGame);
    return existingGame.id;
  }

  // Setting score to 0 should not be necessary as it's the default value.
  // Would ideally like to execute `insert into game default values`
  // but haven't found a good way to do that
  const newGame = await db.insertInto('game').values({ score: '0' })
    .returningAll()
    .executeTakeFirstOrThrow();

  console.log('Stating new game', newGame);

  const dbEntities = ENTITY_INIT.map((x) => ({
    ...x,
    gameId: newGame.id,
    position: `(${x.position.toString()})`,
  }));

  await db
    .deleteFrom('entity')
    .where('gameId', '=', newGame.id)
    .execute();

  await db
    .insertInto('entity')
    .values(dbEntities)
    .returningAll()
    .execute();
  return newGame.id;
};

const respawn = async (gameId: number, entityType: EntityType) => {
  const newPos = await randomAvailablePosition(gameId);

  return db
    .updateTable('entity')
    .set({ position: encodePosition(newPos) })
    .where('gameId', '=', gameId)
    .where('type', '=', entityType)
    .executeTakeFirstOrThrow();
};

const collectCoin = async (gameId: number) => {
  const x = await db
    .selectFrom('game')
    .where('id', '=', gameId)
    .select(['score', 'highScore'])
    .executeTakeFirstOrThrow();

  const score = parseInt(x.score);
  const highScore = parseInt(x.highScore);

  const newScore = score + 1;

  if (newScore > highScore) {
    await db
      .updateTable('game')
      .set({ highScore: newScore.toString() })
      .executeTakeFirstOrThrow();
  }

  await db
    .updateTable('game')
    .set({ score: newScore.toString() })
    .executeTakeFirstOrThrow();

  respawn(gameId, 'coin');
};

const blowUpBomb = async (gameId: number) => {
  await db
    .updateTable('game')
    .set({ score: '0' })
    .executeTakeFirstOrThrow();

  respawn(gameId, 'bomb');
};

const clearMoveCandiates = (gameId: number) =>
  db
    .deleteFrom('moveCandidate')
    .where('gameId', '=', gameId)
    .executeTakeFirstOrThrow();

const registerMove = (
  move: { gameId: number; direction: Direction; playerId: number },
) =>
  db
    .insertInto('move')
    .values({
      ...move,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

const timestampLastMove = (gameId: number) =>
  db
    .updateTable('game')
    .set({ lastMoveAt: sql`now()` })
    .where('id', '=', gameId)
    .executeTakeFirstOrThrow();

const createPlayer = (gameId: number, playerName: string) => {
  return db
    .insertInto('player')
    .values({
      name: playerName,
      gameId,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};

const ensurePlayer = async (gameId: number, playerName: string) => {
  const player = await findPlayer(gameId, playerName);
  if (!player) {
    return createPlayer(gameId, playerName);
  }
  return player;
};

const ensureMoveCandidate = async (
  { gameId, direction, playerId }: {
    gameId: number;
    direction: Direction;
    playerId: number;
  },
) => {
  const moveCandidate = await findMoveCandidate(gameId, playerId);

  if (!moveCandidate) {
    return db
      .insertInto('moveCandidate')
      .values({
        gameId,
        direction,
        playerId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  return db
    .updateTable('moveCandidate')
    .set({ direction })
    .where('gameId', '=', gameId)
    .where('playerId', '=', playerId)
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const recordMove = async (
  gameId: number,
  direction: Direction,
  playerName: string,
) => {
  const player = await ensurePlayer(gameId, playerName);

  ensureMoveCandidate({
    gameId,
    direction,
    playerId: player.id,
  });

  console.log(`player ${player.name} move ${direction} is added to candidates`);

  return getState(gameId);
};

export const executeNextMove = async (gameId: number) => {
  const moveCandidates = await db
    .selectFrom('moveCandidate')
    .selectAll()
    .where('gameId', '=', gameId)
    .execute();

  console.log(`move candidates: ${moveCandidates.length}`);

  if (moveCandidates.length !== 0) {
    const nextMove = await randomMoveCandidate(gameId);

    const avatar = await findAvatar(gameId);

    const { direction, playerId } = nextMove;

    const [x, y] = decodePosition(avatar.position);
    const [mX, mY] = MOVE_MOVEMENT_MAP[direction];
    const newPosition: Position = [x + mX, y + mY];

    if (positionIsAllowed(newPosition)) {
      await db
        .updateTable('entity')
        .set({ position: encodePosition(newPosition) })
        .where('type', '=', avatar.type)
        .execute();

      await registerMove(nextMove);

      if (await positionHasEntity(gameId, newPosition, 'coin')) {
        await collectCoin(gameId);
      }

      if (await positionHasEntity(gameId, newPosition, 'bomb')) {
        await blowUpBomb(gameId);
      }

      console.log(
        `player ${playerId} move ${direction} to ${newPosition} was executed`,
      );
    } else {
      console.log(
        `player ${playerId} move ${direction} to ${newPosition} is not allowed`,
      );
    }

    await clearMoveCandiates(gameId);
  }

  await timestampLastMove(gameId);
  setTimeout(() => executeNextMove(gameId), MOVE_SELECTION_MILLIS);
};
