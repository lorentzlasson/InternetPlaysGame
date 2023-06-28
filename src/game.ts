import {
  Direction,
  EntityType,
  isSamePosition,
  MOVE_MOVEMENT_MAP,
  MOVE_SELECTION_MILLIS,
  Position,
  positionIsAllowed,
  POSITIONS,
  StatsUiState,
  UiState,
} from './common.ts';
import { sql } from './db.ts';

// ---------- INIT  ----------
const ENTITIES_INIT = [
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

const findPlayer = async (gameId: number, playerName: string) => {
  const players = await sql<
    ({
      id: number;
      gameId: number;
      name: string;
    })[]
  >`
      select *
      from player
      where game_id = ${gameId}
      and name = ${playerName}
    `;
  return players.at(0);
};

const findAvatar = async (gameId: number) => {
  const [avatar] = await sql<
    {
      id: number;
      type: EntityType;
      position: Position;
    }[]
  >`
      select id, type, position
      from entity
      where game_id = ${gameId}
      and type = 'avatar'
    `;
  return avatar;
};

const positionHasEntity = async (
  gameId: number,
  pos: Position,
  entityType: EntityType,
) => {
  const [{ exists }] = await sql<
    {
      exists: boolean;
    }[]
  >`
    select exists(
      select 1
      from entity
      where type = ${entityType}
      and position = ${sql.typed.position(pos)}
      and game_id = ${gameId}
    )
  `;
  return exists;
};

const randomCapped = (cap: number) => Math.floor(Math.random() * cap);

const randomAvailablePosition = async (gameId: number): Promise<Position> => {
  const occupiedPositions = await sql<{ position: Position }[]>`
    select position
    from entity
    where game_id = ${gameId}
  `;

  const availablePositions = POSITIONS.filter(
    (pos) =>
      !occupiedPositions.some(({ position: occupiedPos }) =>
        isSamePosition(occupiedPos, pos)
      ),
  );
  const randomIndex = randomCapped(availablePositions.length - 1);
  return availablePositions[randomIndex];
};

const lastMovePerGameQuery = sql`
  select
    game.id,
    coalesce(max(move.time), game.started_at) as time
  from game
  left join player on player.game_id = game.id
  left join move_candidate on move_candidate.player_id = player.id
  left join move on move_candidate.id = move.move_candidate_id
  group by game.id
`;

const freshCandidatesQuery = sql`
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

const randomMoveCandidate = async (gameId: number) => {
  const moveCandidates = await sql<({
    moveCandidateId: number;
    direction: Direction;
    playerName: string;
  })[]>`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.id as move_candidate_id,
           direction,
           fresh_candidates.player_name
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    where game_id = ${gameId}
    order by random()
    limit 1
  `;
  return moveCandidates.at(0);
};

export const getUiState = async (
  gameId: number,
  playerName: string | undefined,
): Promise<UiState> => {
  const [dbGame] = await sql<{ score: number; highScore: number }[]>`
    select score, high_score
    from game
    where id = ${gameId}
  `;

  const [{ time }] = await sql<{ time: Date }[]>`
    with last_move_per_game as (${lastMovePerGameQuery})
    select time
    from last_move_per_game
    where last_move_per_game.id = ${gameId}
  `;

  const game = {
    ...dbGame,
    highScore: dbGame.highScore,
    score: dbGame.score,
    lastMoveAt: time.toISOString(),
  };

  const entities = await sql<{ type: EntityType; position: Position }[]>`
    select type, position
    from entity
    where game_id = ${gameId}
  `;

  const signedInMoveCandidates = playerName
    ? await getPlayerMoveCandidate(gameId, playerName)
    : [];

  const state = {
    ...game,
    entities,
    signedInMoveCandidates,
  };

  return state;
};

export const getStatsUiState = async (
  gameId: number,
): Promise<StatsUiState> => {
  const [dbGame] = await sql<{ score: number; highScore: number }[]>`
    select score, high_score
    from game
    where id = ${gameId}
  `;

  const [{ time }] = await sql<{ time: Date }[]>`
    with last_move_per_game as (${lastMovePerGameQuery})
    select time
    from last_move_per_game
    where last_move_per_game.id = ${gameId}
  `;

  const game = {
    ...dbGame,
    highScore: dbGame.highScore,
    score: dbGame.score,
    lastMoveAt: time.toISOString(),
  };

  const entities = await sql<{ type: EntityType; position: Position }[]>`
    select type, position
    from entity
    where game_id = ${gameId}
  `;
  const players = await sql<{ name: string }[]>`
    select name
    from player
    where game_id = ${gameId}
  `;

  const dbMoveHistory = await sql<
    { direction: Direction; time: Date; name: string }[]
  >`
    select mc.direction, m.time, p.name
    from move m
    inner join move_candidate mc on mc.id = m.move_candidate_id
    inner join player p on p.id = mc.player_id
    where p.game_id = ${gameId}
  `;

  const dbMoveCandidates = await sql<{ name: string; direction: Direction }[]>`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.direction,
           player.name
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    inner join player on player.id = move_candidate.player_id
    where fresh_candidates.game_id = ${gameId}
  `;

  const moveCandidates = dbMoveCandidates.map(({ direction, name }) => ({
    direction,
    player: {
      name,
    },
  }));

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

const hasFreshMoveCandidate = async (playerName: string) => {
  const [{ exists }] = await sql<{ exists: boolean }[]>`

    with fresh_candidates as (${freshCandidatesQuery})
    select exists(
      select 1
      from fresh_candidates
      where player_name = ${playerName}
    )
  `;
  return exists;
};

const getPlayerMoveCandidate = async (gameId: number, playerName: string) => {
  const dbMoveCandidates = await sql<{ name: string; direction: Direction }[]>`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.direction
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    inner join player on player.id = move_candidate.player_id
    where fresh_candidates.game_id = ${gameId}
    and player.name = ${playerName}
  `;

  const moveCandidates = dbMoveCandidates.map(({ direction, name }) => ({
    direction,
    player: {
      name,
    },
  }));
  return moveCandidates;
};

// ---------- MUTATIONS ----------

export const init = async () => {
  const [existingGame] = await sql<{ id: number }[]>`
    select id
    from game
  `;
  const existingGameId = existingGame?.id;

  if (existingGame) {
    await sql<{ id: number; startedAt: Date }[]>`
      update game
      set started_at = now()
      where id = ${existingGameId}
    `;

    console.log('game.resume', { existingGameId });

    return existingGameId;
  }

  const [{ id: newGameId }] = await sql<{ id: number }[]>`
    insert into game
    default values
    returning id
  `;

  console.log('game.new', { newGameId });

  await sql`
    delete from entity
    where game_id = ${newGameId}
  `;

  const entityValues = ENTITIES_INIT.map((entity_init) => ({
    ...entity_init,
    gameId: newGameId,
  }));

  await sql`
    insert into entity ${sql(entityValues)}
  `;

  return newGameId;
};

const respawn = async (gameId: number, entityType: EntityType) => {
  const newPos = await randomAvailablePosition(gameId);

  return sql`
    update entity
    set position = ${sql.typed.position(newPos)}
    where type = ${entityType}
    and game_id = ${gameId}
  `;
};

const collectCoin = async (gameId: number) => {
  const [scores] = await sql<{ score: number; highScore: number }[]>`
    select score, high_score
    from game
    where id = ${gameId}
  `;

  const score = scores.score;
  const highScore = scores.highScore;

  const newScore = score + 1;

  if (newScore > highScore) {
    await sql`
      update game
      set high_score = ${newScore}
      where id = ${gameId}
    `;
  }

  await sql`
    update game
    set score = ${newScore}
    where id = ${gameId}
  `;

  respawn(gameId, 'coin');
};

const blowUpBomb = async (gameId: number) => {
  await sql`
    update game
    set score = 0
    where id = ${gameId}
  `;

  respawn(gameId, 'bomb');
};

const registerMove = (moveCandidateId: number) =>
  sql`
    insert into move (move_candidate_id)
    values (${moveCandidateId})
  `;

const createPlayer = async (gameId: number, playerName: string) => {
  const [player] = await sql<{ id: number; gameId: number; name: string }[]>`
    insert into player (name, game_id)
    values (${playerName}, ${gameId})
    returning *
  `;
  return player;
};

const ensurePlayer = async (gameId: number, playerName: string) => {
  const player = await findPlayer(gameId, playerName);

  if (!player) {
    return createPlayer(gameId, playerName);
  }
  return player;
};

const insertMoveCandidate = (direction: Direction, playerId: number) =>
  sql`
    insert into move_candidate (direction, player_id)
    values (${direction}, ${playerId})
  `;

export const recordMove = async (
  gameId: number,
  direction: Direction,
  playerName: string,
) => {
  const player = await ensurePlayer(gameId, playerName);

  const hasFresh = await hasFreshMoveCandidate(playerName);

  if (hasFresh) {
    console.log('moveCandidate.exists', { playerName, direction });
  } else {
    await insertMoveCandidate(direction, player.id);
    console.log('moveCandidate.added', { playerName, direction });
  }
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
      await sql`
        update entity
        set position = ${sql.typed.position(newPosition)}
        where type = ${avatar.type}
      `;

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
