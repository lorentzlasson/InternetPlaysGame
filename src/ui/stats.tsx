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

const prettifyDate = (timeString: string) => {
  const date = new Date(timeString);
  const day = ('0' + date.getDate()).slice(-2);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear().toString().substring(2);
  return `${year}-${month}-${day}`;
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

    <body style={{ display: 'flex' }}>
      <div>
        <div
          id='board'
          style={{
            fontSize: '7vw',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {range(HEIGHT).map((y) => (
            <div
              style={{
                width: '100%',
                display: 'flex',
              }}
            >
              {range(WIDTH).map((x) => {
                const entity = state.entities.find((e) =>
                  isSamePosition(e.position, [x, y])
                );
                const emoji = entity ? EMOJI_MAP[entity.type] : EMOJI_MAP.blank;
                return (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '0 5px',
                      position: 'relative',
                    }}
                  >
                    {emoji}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          {Object.entries(DIRECTION_EMOJI_MAP).map(
            ([direction, emoji]) => {
              return (
                <button
                  value={direction}
                  style={{
                    padding: '0 5px',
                    background: 'none',
                    border: 'none',
                    fontSize: '5vw',
                    textAlign: 'center',
                  }}
                >
                  {emoji}
                </button>
              );
            },
          )}
        </div>

        <div style={{ fontSize: '2vw' }}>
          <div id='lastMoveAt'>
            {state.lastMoveAt
              ? `Last move at ${prettifyTime(state.lastMoveAt)}`
              : ''}
          </div>
          <div
            style={{
              paddingTop: '15px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex' }}>
                🪙<div>{state.score}</div>
              </div>
              <div style={{ display: 'flex' }}>
                🥇<div>{state.highScore}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: '1vw' }}>
        <div style={{ paddingBottom: '10px' }}>
          Move condidates:
          {state.moveCandidates.map(({ player: { name }, direction }) => (
            <div>
              {`${prettifyName(name)} wants to move ${
                DIRECTION_EMOJI_MAP[direction]
              }`}
            </div>
          ))}
        </div>

        <div style={{ paddingBottom: '10px' }}>
          Players:
          <ul>
            {state.players
              .map(({ name }) => <li>{prettifyName(name)}</li>)}
          </ul>
        </div>

        <div style={{ paddingBottom: '10px' }}>
          Moves:
          <table>
            {state.moveHistory
              .slice(0)
              .reverse()
              .map(({ player: { name }, direction, time }) => (
                <tr>
                  <td>{prettifyDate(time)}</td>
                  <td>{prettifyName(name)}</td>
                  <td>{DIRECTION_EMOJI_MAP[direction]}</td>
                </tr>
              ))}
          </table>
        </div>
      </div>
    </body>
  </html>
);

export default (state: StatsUiState) => renderSSR(() => ui(state));
