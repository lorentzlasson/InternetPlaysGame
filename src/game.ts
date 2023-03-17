import { sql } from 'kysely';
import {
  Direction,
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

// ---------- READS ----------

const findPlayer = (gameId: number, playerName: string) =>
  db
    .selectFrom('player')
    .where('gameId', '=', gameId)
    .where('name', '=', playerName)
    .selectAll()
    .executeTakeFirst();

const findAvatar = (gameId: number) =>
  db
    .selectFrom('entity')
    .where('gameId', '=', gameId)
    .where('type', '=', 'avatar')
    .selectAll()
    .executeTakeFirstOrThrow();

const positionHasEntity = async (
  gameId: number,
  pos: Position,
  entityType: EntityType,
): Promise<boolean> => {
  const { count } = await db
    .selectFrom('entity')
    .where('type', '=', entityType)
    .where('position', '=', sql`${encodePosition(pos)}::"position"`)
    .where('gameId', '=', gameId)
    .select(db.fn.countAll<bigint>().as('count'))
    .executeTakeFirstOrThrow();

  return count === BigInt(1);
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

const lastMoveAtQuery = db
  .with('lastMovePerGame', (d) =>
    d
      .selectFrom('game')
      .leftJoin('player', 'player.gameId', 'game.id')
      .leftJoin('moveCandidate', 'moveCandidate.playerId', 'player.id')
      .leftJoin('move', 'moveCandidate.id', 'move.moveCandidateId')
      .groupBy('game.id')
      .select([
        'game.id',
        db.fn.coalesce(
          db.fn.max('move.time'),
          sql`'-infinity'::timestamp`,
        ).as('time'),
      ]));

const freshCandidatesQuery = lastMoveAtQuery
  .with('freshCandidates', (d) =>
    d
      .selectFrom('moveCandidate')
      .innerJoin('player', 'player.id', 'moveCandidate.playerId')
      .innerJoin('game', 'game.id', 'player.gameId')
      .innerJoin('lastMovePerGame', 'lastMovePerGame.id', 'game.id')
      .whereRef('moveCandidate.time', '>', 'lastMovePerGame.time')
      .select(['moveCandidate.id', 'game.id as gameId']));

const randomMoveCandidate = (gameId: number) =>
  freshCandidatesQuery
    .selectFrom('moveCandidate')
    .innerJoin('freshCandidates', 'freshCandidates.id', 'moveCandidate.id')
    .orderBy(sql`random()`)
    .select([
      'moveCandidate.id as moveCandidateId',
      'gameId',
      'playerId',
      'direction',
    ])
    .where('gameId', '=', gameId)
    .executeTakeFirst();

export const getUiState = async (gameId: number): Promise<State> => {
  const dbGame = await db
    .selectFrom('game')
    .where('id', '=', gameId)
    .select(['score', 'highScore'])
    .executeTakeFirstOrThrow();

  const { time } = await lastMoveAtQuery
    .selectFrom('lastMovePerGame')
    .where('lastMovePerGame.id', '=', gameId)
    .select('time')
    .executeTakeFirstOrThrow();

  // time is -Infinity if no move has been made
  const lastMoveAt = typeof time === 'number' ? null : time.toISOString();

  const game = {
    ...dbGame,
    highScore: parseInt(dbGame.highScore),
    score: parseInt(dbGame.score),
    lastMoveAt,
  };

  const dbEntities = await db
    .selectFrom('entity')
    .where('gameId', '=', gameId)
    .select(['type', 'position'])
    .execute();

  const entities = dbEntities.map(({ type, position }) => ({
    type,
    position: decodePosition(position),
  }));

  const players = await db
    .selectFrom('player')
    .where('gameId', '=', gameId)
    .select(['name'])
    .execute();

  const dbMoveCandidates = await freshCandidatesQuery
    .selectFrom('moveCandidate')
    .innerJoin('freshCandidates', 'freshCandidates.id', 'moveCandidate.id')
    .innerJoin('player', 'player.id', 'moveCandidate.playerId')
    .where('player.gameId', '=', gameId)
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
    .innerJoin('moveCandidate', 'moveCandidate.id', 'move.moveCandidateId')
    .innerJoin('player', 'player.id', 'moveCandidate.playerId')
    .where('player.gameId', '=', gameId)
    .select(['moveCandidate.direction', 'move.time', 'player.name'])
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
  // but `default values` is not supported by kysely
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
  const scores = await db
    .selectFrom('game')
    .where('id', '=', gameId)
    .select(['score', 'highScore'])
    .executeTakeFirstOrThrow();

  const score = parseInt(scores.score);
  const highScore = parseInt(scores.highScore);

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

const registerMove = (moveCandidateId: number) =>
  db
    .insertInto('move')
    .values({
      moveCandidateId,
    })
    .returningAll()
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

const insertMoveCandidate = (direction: Direction, playerId: number) =>
  db
    .insertInto('moveCandidate')
    .values({
      direction,
      playerId,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

export const recordMove = async (
  gameId: number,
  direction: Direction,
  playerName: string,
) => {
  const player = await ensurePlayer(gameId, playerName);

  insertMoveCandidate(direction, player.id);

  console.log(`player ${player.name} move ${direction} is added to candidates`);
};

export const executeNextMove = async (gameId: number) => {
  const nextMove = await randomMoveCandidate(gameId);

  if (nextMove) {
    const avatar = await findAvatar(gameId);

    const { direction, playerId, moveCandidateId } = nextMove;

    const [x, y] = decodePosition(avatar.position);
    const [mX, mY] = MOVE_MOVEMENT_MAP[direction];
    const newPosition: Position = [x + mX, y + mY];

    await registerMove(moveCandidateId);

    if (positionIsAllowed(newPosition)) {
      await db
        .updateTable('entity')
        .set({ position: encodePosition(newPosition) })
        .where('type', '=', avatar.type)
        .execute();

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
  } else {
    console.log('no move candidates');
  }

  setTimeout(() => executeNextMove(gameId), MOVE_SELECTION_MILLIS);
};
