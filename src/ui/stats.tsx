/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

import {
  Direction,
  EMOJI_MAP,
  HEIGHT,
  isSamePosition,
  range,
  StatsUiState,
  WIDTH,
} from '../common.ts';

const DIRECTION_EMOJI_MAP: { [key in Direction]: string } = {
  left: '⬅️',
  down: '⬇️',
  up: '⬆️',
  right: '➡️',
};

const prettifyTime = (timeString: string) => {
  const date = new Date(timeString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const prettifyName = (name: string) => {
  return name.slice(-4);
};

const ui = (state: StatsUiState) => (
  <html>
    <head>
      <title>Internet Plays Game</title>
      <meta charSet='UTF-8'></meta>
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1.0'
      >
      </meta>
    </head>
    <body>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '5vw',
        }}
      >
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex' }}>
            🪙<div id='score'>{state.score}</div>
          </div>
          <div style={{ display: 'flex' }}>
            🥇<div id='highScore'>{state.highScore}</div>
          </div>
        </div>
        <div id='lastMoveAt'>
          {state.lastMoveAt
            ? `Last move at ${prettifyTime(state.lastMoveAt)}`
            : ''}
        </div>
      </div>
      <table style={{ fontSize: '25vw' }}>
        {range(HEIGHT).map((y) => (
          <tr>
            {range(WIDTH).map((x) => {
              const entity = state.entities.find((e) =>
                isSamePosition(e.position, [x, y])
              );
              const emoji = entity ? EMOJI_MAP[entity.type] : EMOJI_MAP.blank;
              return <td>{emoji}</td>;
            })}
          </tr>
        ))}
      </table>
      Move condidates:
      <div style={{ fontSize: '5vw' }}>
        {state.moveCandidates.map(({ player: { name }, direction }) => (
          <div>
            {`${prettifyName(name)} wants to move ${
              DIRECTION_EMOJI_MAP[direction]
            }`}
          </div>
        ))}
      </div>

      Players:
      <ul style={{ fontSize: '5vw' }}>
        {state.players
          .map(({ name }) => <li>{prettifyName(name)}</li>)}
      </ul>

      Moves:
      <table style={{ fontSize: '5vw' }}>
        {state.moveHistory
          .slice(0)
          .reverse()
          .map(({ player: { name }, direction, time }) => (
            <tr>
              <td>{prettifyTime(time)}</td>
              <td>{prettifyName(name)}</td>
              <td>{DIRECTION_EMOJI_MAP[direction]}</td>
            </tr>
          ))}
      </table>
    </body>
  </html>
);

export default (state: StatsUiState) => renderSSR(() => ui(state));
