/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

import {
  Direction,
  EMOJI_MAP,
  HEIGHT,
  isSamePosition,
  range,
  State,
  WIDTH,
} from '../common.ts';

const DIRECTION_EMOJI_MAP: { [key in Direction]: string } = {
  left: '⬅️',
  down: '⬇️',
  up: '⬆️',
  right: '➡️',
};

const prettifyTime = (timeString: string) => {
  const time = new Date(timeString);
  return time.toISOString()
};

const ui = (state: State) => (
  <html>
    <head>
      <title>Internet Plays Game</title>
      <meta charSet='UTF-8'></meta>
    </head>
    <body style={{ display: 'flex', overflow: 'hidden' }}>
      <div>
        <table style={{ fontSize: '100px' }}>
          {range(HEIGHT).map((y) => (
            <tr>
              {range(WIDTH).map((x) => {
                const entity = state.entities.find((e) =>
                  isSamePosition(e.position, [x, y])
                );
                const emoji = entity
                  ? EMOJI_MAP[entity.type]
                  : EMOJI_MAP.blank;
                return (
                  <td>
                    {emoji}
                  </td>
                );
              })}
            </tr>
          ))}
        </table>
        <table>
          {state.moveHistory.reverse().map(
            ({ player: { name }, direction, time }) => (
              <tr>
                <td>{prettifyTime(time)}</td>
                <td>{name}</td>
                <td>{DIRECTION_EMOJI_MAP[direction]}</td>
              </tr>
            ),
          )}
        </table>
      </div>
      <div>
        <div style={{ fontSize: '20px' }}>
          <div id='lastMoveAt'>
            {state.lastMoveAt
              ? `Last move at ${prettifyTime(state.lastMoveAt)}`
              : ''}
          </div>
          <div style={{ display: 'flex' }}>
            🪙<div id='score'>{state.score}</div>
          </div>
          <div style={{ display: 'flex' }}>
            🥇<div id='highScore'>{state.highScore}</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
          }}
        >
          <form method='POST'>
            <input
              type='text'
              placeholder='player name'
              style={{ fontSize: 'inherit' }}
              name='playerName'
              required
              autoFocus
            >
            </input>

            <div
              style={{
                display: 'flex',
              }}
            >
              {Object.entries(DIRECTION_EMOJI_MAP).map(([direction, emoji]) => {
                return (
                  <button
                    value={direction}
                    type='submit'
                    style={{
                      flex: 1,
                      padding: 0,
                      background: 'none',
                      border: 'none',
                      fontSize: '43px',
                    }}
                    name='direction'
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </form>
        </div>
        <div style={{ borderTop: 'solid' }}>
          {state.moveCandidates.map(({ player: { name }, direction }) => (
            <div>
              {`${name} wants to move ${DIRECTION_EMOJI_MAP[direction]}`}
            </div>
          ))}
        </div>
      </div>
    </body>
  </html>
);

export default (state: State) => renderSSR(() => ui(state));
