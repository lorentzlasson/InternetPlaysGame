import { sql } from 'npm:slonik';
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
import { db, encodePosition, returning } from './db.ts';

// ---------- INIT  ----------
const _ENTITY_INIT = [
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
  db.maybeOne(returning(['id', 'gameId', 'name'])`
      select *
      from player
      where game_id = ${gameId}
      and name = ${playerName}
    `);

const findAvatar = (gameId: number) =>
  db.one(returning(['id', 'type', 'position'])`
      select id, type, position
      from entity
      where game_id = ${gameId}
      and type = 'avatar'
    `);

const positionHasEntity = (
  gameId: number,
  pos: Position,
  entityType: EntityType,
) =>
  db.oneFirst(returning(['exists'])`
    select exists(
      select 1
      from entity
      where type = ${entityType}
      and position = ${encodePosition(pos)}::"position"
      and game_id = ${gameId}
    )
  `);

const randomCapped = (cap: number) => Math.floor(Math.random() * cap);

const randomAvailablePosition = async (gameId: number): Promise<Position> => {
  const occupiedPositions = await db.manyFirst(returning(['position'])`
    select position
    from entity
    where game_id = ${gameId}
  `);

  const availablePositions = POSITIONS.filter(
    (pos) =>
      !occupiedPositions.some((occupiedPos) =>
        isSamePosition(occupiedPos, pos)
      ),
  );
  const randomIndex = randomCapped(availablePositions.length - 1);
  return availablePositions[randomIndex];
};

const lastMovePerGameQuery = sql.fragment`
  select
    game.id,
    coalesce(max(move.time), game.started_at) as time
  from game
  left join player on player.game_id = game.id
  left join move_candidate on move_candidate.player_id = player.id
  left join move on move_candidate.id = move.move_candidate_id
  group by game.id
`;

const freshCandidatesQuery = sql.fragment`
  with last_move_per_game as (${lastMovePerGameQuery})
  select
    move_candidate.id,
    game.id as game_id,
    player.name as player_name
  from move_candidate
  inner join player on player.id = move_candidate.player_id
  inner join game on game.id = player.game_id
  inner join last_move_per_game on last_move_per_game.id = game.id
  where move_candidate.time > last_move_per_game.time
`;

const randomMoveCandidate = (gameId: number) =>
  db.maybeOne(returning(['direction', 'playerName', 'moveCandidateId'])`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.id as move_candidate_id,
           direction,
           fresh_candidates.player_name
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    where game_id = ${gameId}
    order by random()
    limit 1
`);

export const getUiState = async (gameId: number): Promise<State> => {
  const dbGame = await db.one(returning(['score', 'highScore'])`
    select score, high_score
    from game
    where id = ${gameId}
  `);

  const time = await db.oneFirst(returning(['time'])`
    with last_move_per_game as (${lastMovePerGameQuery})
    select time
    from last_move_per_game
    where last_move_per_game.id = ${gameId}
  `);

  const game = {
    ...dbGame,
    highScore: dbGame.highScore,
    score: dbGame.score,
    lastMoveAt: time.toISOString(),
  };

  const entities = await db.many(returning(['type', 'position'])`
    select type, position
    from entity
    where game_id = ${gameId}
  `);

  const players = await db.any(returning(['name'])`
    select name
    from player
    where game_id = ${gameId}
  `);

  const dbMoveCandidates = await db.any(returning(['name', 'direction'])`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.direction,
           player.name
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    inner join player on player.id = move_candidate.player_id
    where fresh_candidates.game_id = ${gameId}
  `);

  const moveCandidates = dbMoveCandidates.map(({ direction, name }) => ({
    direction,
    player: {
      name,
    },
  }));

  const dbMoveHistory = await db.any(returning(['direction', 'time', 'name'])`
    select mc.direction, m.time, p.name
    from move m
    inner join move_candidate mc on mc.id = m.move_candidate_id
    inner join player p on p.id = mc.player_id
    where p.game_id = ${gameId}
  `);

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
  const existingGameId = await db.maybeOneFirst(returning(['id'])`
    select id
    from game
  `);

  if (existingGameId) {
    const existingGame = await db.one(returning(['id'])`
      update game
      set started_at = now()
      returning id
    `);

    console.log('game.resume', { existingGame });

    return existingGameId;
  }

  const newGameId = await db.oneFirst(returning(['id'])`
    insert into game
    default values
    returning id
  `);

  console.log('game.new', { newGameId });

  await db.any(returning([])`
    delete from entity
    where game_id = ${newGameId}
  `);

  // TODO: Base on ENTITY_INIT instead
  await db.any(returning([])`
    insert into entity (type, position, game_id)
    values
      ('avatar', '(0,2)', ${newGameId}),
      ('coin', '(2,0)', ${newGameId}),
      ('bomb', '(0,1)', ${newGameId})
  `);

  return newGameId;
};

const respawn = async (gameId: number, entityType: EntityType) => {
  const newPos = await randomAvailablePosition(gameId);

  return db.any(returning([])`
    update entity
    set position = ${encodePosition(newPos)}
    where type = ${entityType}
    and game_id = ${gameId}
  `);
};

const collectCoin = async (gameId: number) => {
  const scores = await db.one(returning(['score', 'highScore'])`
    select score, high_score
    from game
    where id = ${gameId}
  `);

  const score = scores.score;
  const highScore = scores.highScore;

  const newScore = score + 1;

  if (newScore > highScore) {
    await db.any(returning([])`
      update game
      set high_score = ${newScore}
      where id = ${gameId}
    `);
  }

  await db.any(returning([])`
    update game
    set score = ${newScore}
    where id = ${gameId}
  `);

  respawn(gameId, 'coin');
};

const blowUpBomb = async (gameId: number) => {
  await db.any(returning([])`
    update game
    set score = 0
    where id = ${gameId}
  `);

  respawn(gameId, 'bomb');
};

const registerMove = (moveCandidateId: number) =>
  db.any(returning([])`
    insert into move (move_candidate_id)
    values (${moveCandidateId})
  `);

const createPlayer = (gameId: number, playerName: string) => {
  return db.one(
    returning(['id', 'gameId', 'name'])`
    insert into player (name, game_id)
    values (${playerName}, ${gameId})
    returning *
  `,
  );
};

const ensurePlayer = async (gameId: number, playerName: string) => {
  const player = await findPlayer(gameId, playerName);

  if (!player) {
    return createPlayer(gameId, playerName);
  }
  return player;
};

const insertMoveCandidate = (direction: Direction, playerId: number) =>
  db.any(returning([])`
    insert into move_candidate (direction, player_id)
    values (${direction}, ${playerId})
  `);

export const recordMove = async (
  gameId: number,
  direction: Direction,
  playerName: string,
) => {
  const player = await ensurePlayer(gameId, playerName);

  await insertMoveCandidate(direction, player.id);

  console.log('moveCandidate.added', { playerName, direction });
};

export const executeNextMove = async (gameId: number) => {
  const nextMove = await randomMoveCandidate(gameId);

  if (nextMove) {
    const avatar = await findAvatar(gameId);

    const { direction, playerName, moveCandidateId } = nextMove;

    const [x, y] = avatar.position;
    const [mX, mY] = MOVE_MOVEMENT_MAP[direction];
    const newPosition: Position = [x + mX, y + mY];

    await registerMove(moveCandidateId);

    if (positionIsAllowed(newPosition)) {
      await db.any(
        returning([])`
          update entity
          set position = ${encodePosition(newPosition)}
          where type = ${avatar.type}
          `,
      );

      if (await positionHasEntity(gameId, newPosition, 'coin')) {
        await collectCoin(gameId);
      }

      if (await positionHasEntity(gameId, newPosition, 'bomb')) {
        await blowUpBomb(gameId);
      }

      console.log('move.executed', { playerName, direction, newPosition });
    } else {
      console.log('move.notAllowed', { playerName, direction, newPosition });
    }
  } else {
    console.log('noMove.noCandidates');
  }

  setTimeout(() => executeNextMove(gameId), MOVE_SELECTION_MILLIS);
};
