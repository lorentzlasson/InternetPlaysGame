import {
  Direction,
  Entity,
  isAvatar,
  isBomb,
  isCoin,
  isSamePosition,
  Move,
  MOVE_MOVEMENT_MAP,
  MOVE_SELECTION_MILLIS,
  MoveCandidate,
  Position,
  positionIsAllowed,
  POSITIONS,
  State,
} from './common.ts';

// ---------- STATE ----------

const state: State = {
  score: 0,
  entities: [
    {
      __type: 'avatar',
      position: [0, 2],
    },
    {
      __type: 'coin',
      position: [2, 0],
    },
    {
      __type: 'bomb',
      position: [0, 1],
    },
  ],
  players: [],
  moveCandidates: [],
  moveHistory: [],
  lastMoveAt: null,
  highScore: 0,
};

// ---------- READS ----------

const findPlayer = (playerName: string) =>
  state.players.find((p) => p.name === playerName);

const findMoveCandidate = (playerName: string) =>
  state.moveCandidates.find(({ player: p }) => p.name === playerName);

const findAvatar = () => {
  const avatar = state.entities.find(isAvatar);
  if (!avatar) throw new Error('avatar not found');
  return avatar;
};

const positionHasEntity = (
  pos: Position,
  entityGuard: (entity: Entity) => boolean,
): boolean =>
  state.entities.some((e) => entityGuard(e) && isSamePosition(e.position, pos));

const randomCapped = (cap: number) => Math.floor(Math.random() * cap);

const randomAvailablePosition = (): Position => {
  const occupiedPositions = state.entities.map((e) => e.position);
  const availablePositions = POSITIONS.filter(
    (pos) =>
      !occupiedPositions.some((occupiedPos) =>
        isSamePosition(occupiedPos, pos)
      ),
  );
  const randomIndex = randomCapped(availablePositions.length - 1);
  return availablePositions[randomIndex];
};

const randomMoveCandidate = () => {
  const randomIndex = randomCapped(state.moveCandidates.length);
  return state.moveCandidates[randomIndex];
};

export const getState = () => state;

// ---------- MUTATIONS ----------

const respawn = (entityGuard: (entity: Entity) => boolean) => {
  const entity = state.entities.find(entityGuard);
  if (!entity) throw new Error('entity not found');
  entity.position = randomAvailablePosition();
};

const updateHighScore = (score: number) => {
  if (score > state.highScore) {
    state.highScore = score;
  }
};

const collectCoin = () => {
  state.score++;
  updateHighScore(state.score);
  respawn(isCoin);
};

const blowUpBomb = () => {
  state.score = 0;
  respawn(isBomb);
};

const clearMoveCandiates = () => {
  state.moveCandidates = [];
};

const registerMove = (move: Move) => {
  state.moveHistory.push(move);
};

const timestampLastMove = () => {
  state.lastMoveAt = new Date().toJSON();
};

const createPlayer = (playerName: string) => {
  const player = {
    name: playerName,
    moves: [],
  };
  state.players.push(player);
  return player;
};

const ensurePlayer = (playerName: string) => {
  const player = findPlayer(playerName);
  if (!player) {
    return createPlayer(playerName);
  }
  return player;
};

const ensureMoveCandidate = (move: MoveCandidate) => {
  const moveCandidate = findMoveCandidate(move.player.name);
  if (!moveCandidate) {
    return state.moveCandidates.push(move);
  }
  moveCandidate.direction = move.direction;
  return moveCandidate;
};

export const recordMove = (direction: Direction, playerName: string): State => {
  const player = ensurePlayer(playerName);

  ensureMoveCandidate({
    player,
    direction,
  });

  console.log(`player ${player.name} move ${direction} is added to candidates`);

  return state;
};

export const executeNextMove = (broadcast: (state: State) => void) => {
  const moveCandidates = state.moveCandidates;
  console.log(`move candidates: ${moveCandidates.length}`);

  if (moveCandidates.length !== 0) {
    const nextMove = randomMoveCandidate();

    const avatar = findAvatar();

    const { direction, player } = nextMove;

    const [x, y] = avatar.position;
    const [mX, mY] = MOVE_MOVEMENT_MAP[direction];
    const newPosition: Position = [x + mX, y + mY];

    if (positionIsAllowed(newPosition)) {
      avatar.position = newPosition;

      registerMove({
        ...nextMove,
        time: new Date().toJSON(),
      });

      if (positionHasEntity(newPosition, isCoin)) {
        collectCoin();
      }

      if (positionHasEntity(newPosition, isBomb)) {
        blowUpBomb();
      }

      console.log(
        `player ${player.name} move ${direction} to ${newPosition} was executed`,
      );
    } else {
      console.log(
        `player ${player.name} move ${direction} to ${newPosition} is not allowed`,
      );
    }

    clearMoveCandiates();
  }

  timestampLastMove();
  broadcast(state);
  setTimeout(() => executeNextMove(broadcast), MOVE_SELECTION_MILLIS);
};
