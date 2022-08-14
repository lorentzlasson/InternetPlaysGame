type Position = [number, number]
type Move = [number, number]
type State = {
  height: number
  width: number
  score: number
  avatar: Position
  coin: Position
}

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const

type Direction = typeof DIRECTIONS[number]

export const isDirection = (token: any): token is Direction =>
  DIRECTIONS.includes(token)

const MOVES: {
  [key in Direction]: Move
} = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

const state: State = {
  height: 3,
  width: 3,
  score: 0,
  avatar: [0, 2],
  coin: [2, 0],
}

const positionIsAllowed = ([x, y]: Position): boolean =>
  x >= 0 && x < state.width && y >= 0 && y < state.height

const positionIsCoin = ([x, y]: Position): boolean =>
  x === state.coin[0] && y === state.coin[1]

const respawnCoin = () => {
  const r = () => Math.round(Math.random() * 2)
  state.coin = [r(), r()]
}

const collectCoin = () => {
  state.score++
  respawnCoin()
}

export const move = (direction: Direction): State => {
  const [x, y] = state.avatar
  const [mX, mY] = MOVES[direction]
  const newPos: Position = [x + mX, y + mY]

  if (!positionIsAllowed(newPos)) {
    return state
  }

  state.avatar = newPos

  if (positionIsCoin(newPos)) {
    collectCoin()
  }

  return state
}
