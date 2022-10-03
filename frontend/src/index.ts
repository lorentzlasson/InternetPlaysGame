import { State, isSamePosition, POSITIONS } from '../../common'

const ICONS = {
  bomb: '💣',
  coin: '🪙',
  avatar: '🏃',
  blank: '⬜',
}

const getState = async (): Promise<State> =>
  fetch('http://localhost:3000').then((x) => x.json())

const rerender = async () => {
  const { entities, score }: State = await getState()

  document.getElementById('score').textContent = score.toString()

  POSITIONS.forEach((position) => {
    const entity = entities.find((e) => isSamePosition(e.position, position))

    const emoji = entity ? ICONS[entity.__type] : ICONS.blank

    const elementID = position.toString()
    document.getElementById(elementID).textContent = emoji
  })
}

const f = async () => {
  try {
    await rerender()
  } catch (error) {
    console.error(error)
  }
  setTimeout(f, 1000)
}

f()
