import {
  Avatar,
  calcDirectionPercentages,
  Direction,
  EntityType,
  isSamePosition,
  MOVE_MOVEMENT_MAP,
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

const findPlayer = async (playerName: string) => {
  const players = await sql<
    ({
      id: number;
      name: string;
    })[]
  >`
      select *
      from player
      where name = ${playerName}
    `;
  return players.at(0);
};

const findAvatar = async (): Promise<Avatar> => {
  const [avatar] = await sql<
    {
      type: 'avatar';
      position: Position;
    }[]
  >`
      select type, position
      from entity
      where type = 'avatar'
    `;
  return avatar;
};

const positionHasEntity = async (
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
    )
  `;
  return exists;
};

const randomCapped = (cap: number) => Math.floor(Math.random() * cap);

const randomAvailablePosition = async (): Promise<Position> => {
  const occupiedPositions = await sql<{ position: Position }[]>`
    select position
    from entity
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
  select coalesce(max(move.time), now()) as time
  from player
  left join move_candidate on move_candidate.player_id = player.id
  left join move on move_candidate.id = move.move_candidate_id
`;

const freshCandidatesQuery = sql`
  with last_tick as (
    select id
    from tick
    order by id desc
    limit 1
  )
  select
    move_candidate.id,
    player.name as player_name
  from move_candidate
  inner join player on player.id = move_candidate.player_id
  inner join last_tick on last_tick.id = move_candidate.tick_id
`;

const randomMoveCandidate = async () => {
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
    order by random()
    limit 1
  `;
  return moveCandidates.at(0);
};

export const getUiState = async (
  playerName: string | undefined,
): Promise<UiState> => {
  const [dbGame] = await sql<{ score: number; highScore: number }[]>`
    select score, high_score
    from game
  `;

  const [{ time }] = await sql<{ time: Date }[]>`
    with last_move_per_game as (${lastMovePerGameQuery})
    select time
    from last_move_per_game
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
  `;

  const signedInMoveCandidate = playerName
    ? await getPlayerMoveCandidate(playerName)
    : null;

  const directionPercentages = signedInMoveCandidate
    ? await getDirectionPercentages()
    : [];

  const lastAvatarPosition = await getLastAvatarPosition();

  const state = {
    ...game,
    entities,
    directionPercentages,
    signedInMoveCandidate,
    lastAvatarPosition,
  };

  return state;
};

export const getStatsUiState = async (): Promise<StatsUiState> => {
  const [dbGame] = await sql<{ score: number; highScore: number }[]>`
    select score, high_score
    from game
  `;

  const [{ time }] = await sql<{ time: Date }[]>`
    with last_move_per_game as (${lastMovePerGameQuery})
    select time
    from last_move_per_game
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
  `;
  const players = await sql<{ name: string }[]>`
    select name
    from player
  `;

  const dbMoveHistory = await sql<
    { direction: Direction; time: Date; name: string }[]
  >`
    select mc.direction, m.time, p.name
    from move m
    inner join move_candidate mc on mc.id = m.move_candidate_id
    inner join player p on p.id = mc.player_id
  `;

  const dbMoveCandidates = await sql<{ name: string; direction: Direction }[]>`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.direction,
           player.name
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    inner join player on player.id = move_candidate.player_id
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

const getPlayerMoveCandidate = async (playerName: string) => {
  const moveCandidates = await sql<{ name: string; direction: Direction }[]>`
    with fresh_candidates as (${freshCandidatesQuery})
    select move_candidate.direction
    from move_candidate
    inner join fresh_candidates on fresh_candidates.id = move_candidate.id
    inner join player on player.id = move_candidate.player_id
    and player.name = ${playerName}
  `;
  const x = moveCandidates.at(0);

  if (!x) return null;

  return {
    direction: x.direction,
    player: {
      name: x.name,
    },
  };
};

const getLastAvatarPosition = async (): Promise<Position | null> => {
  const lastMoveDirectionRows = await sql<
    { direction: Direction }[]
  >`
    select mc.direction
    from move m
    inner join move_candidate mc on mc.id = m.move_candidate_id
    order by m.time desc
    limit 1
  `;
  const lastMoveDirection = lastMoveDirectionRows.at(0);
  if (!lastMoveDirection) return null;

  const avatar = await findAvatar();

  const [x, y] = avatar.position;

  const [mX, mY] = MOVE_MOVEMENT_MAP[lastMoveDirection.direction];
  return [x - mX, y - mY];
};

const getDirectionPercentages = async () => {
  const moveCandidateCounts = await sql<
    { direction: Direction; count: number }[]
  >`
    with last_tick as (
      select id
      from tick
      order by id desc
      limit 1
    )
    select move_candidate.direction, count(*)::integer
    from move_candidate
    inner join last_tick on last_tick.id = move_candidate.tick_id
    group by 1
  `;

  return calcDirectionPercentages(moveCandidateCounts);
};

// ---------- MUTATIONS ----------

export const init = async () => {
  const [existingGame] = await sql<{ id: number }[]>`
    select id
    from game
    limit 1
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

  await sql`
    insert into tick
    default values
  `;

  console.log('game.new', { newGameId });

  await sql`
    insert into entity ${sql(ENTITIES_INIT)}
  `;

  return newGameId;
};

const respawn = async (entityType: EntityType) => {
  const newPos = await randomAvailablePosition();

  return sql`
    update entity
    set position = ${sql.typed.position(newPos)}
    where type = ${entityType}
  `;
};

const collectCoin = async () => {
  const [scores] = await sql<{ score: number; highScore: number }[]>`
    select score, high_score
    from game
  `;

  const score = scores.score;
  const highScore = scores.highScore;

  const newScore = score + 1;

  if (newScore > highScore) {
    await sql`
      update game
      set high_score = ${newScore}
    `;
  }

  await sql`
    update game
    set score = ${newScore}
  `;

  respawn('coin');
};

const blowUpBomb = async () => {
  await sql`
    update game
    set score = 0
  `;

  respawn('bomb');
};

const registerMove = (moveCandidateId: number) =>
  Promise.all([
    sql`
  insert into move (move_candidate_id)
  values (${moveCandidateId})
  `,
    sql`
  insert into tick
  default values
  `,
  ]);

const createPlayer = async (playerName: string) => {
  const [player] = await sql<{ id: number; name: string }[]>`
    insert into player (name)
    values (${playerName})
    returning *
  `;
  return player;
};

const ensurePlayer = async (playerName: string) => {
  const player = await findPlayer(playerName);

  if (!player) {
    return createPlayer(playerName);
  }
  return player;
};

const insertMoveCandidate = (direction: Direction, playerId: number) =>
  sql`
    with last_tick as (
      select id
      from tick
      order by id desc
      limit 1
    )
    insert into move_candidate (direction, player_id, tick_id)
    select ${direction}, ${playerId}, last_tick.id
    from last_tick
  `;

export const recordMove = async (
  direction: Direction,
  playerName: string,
) => {
  const player = await ensurePlayer(playerName);

  const hasFresh = await hasFreshMoveCandidate(playerName);

  if (hasFresh) {
    console.log('moveCandidate.exists', { playerName, direction });
  } else {
    await insertMoveCandidate(direction, player.id);
    console.log('moveCandidate.added', { playerName, direction });
  }
};

export const tick = async () => {
  const nextMove = await randomMoveCandidate();

  if (nextMove) {
    const avatar = await findAvatar();

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

      if (await positionHasEntity(newPosition, 'coin')) {
        await collectCoin();
      }

      if (await positionHasEntity(newPosition, 'bomb')) {
        await blowUpBomb();
      }

      console.log('move.executed', { playerName, direction, newPosition });
    } else {
      console.log('move.notAllowed', { playerName, direction, newPosition });
    }
  } else {
    console.log('noMove.noCandidates');
  }
};
