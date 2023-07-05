/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

import {
  Direction,
  EMOJI_MAP,
  HEIGHT,
  isSamePosition,
  range,
  UiState,
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

const ui = (state: UiState) => (
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
      <div
        style={{
          fontSize: '25vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {range(HEIGHT).map((y) => (
          <div
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
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
                  {state.lastAvatarPosition &&
                      isSamePosition(state.lastAvatarPosition, [x, y])
                    ? (
                      <div
                        style={{ position: 'absolute', top: 0, opacity: '0.2' }}
                      >
                        {EMOJI_MAP['avatar']}
                      </div>
                    )
                    : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <form method='POST' action='/move'>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {Object.entries(DIRECTION_EMOJI_MAP).map(([direction, emoji]) => {
            return (
              <button
                value={direction}
                type='submit'
                style={{
                  padding: '0 5px',
                  background: 'none',
                  border: 'none',
                  fontSize: '18.75vw',
                  textAlign: 'center',
                }}
                name='direction'
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </form>
      <div style={{ fontSize: '5vw' }}>
        {state.signedInMoveCandidates.map(({ direction }) => (
          <div>
            {`You want to move ${DIRECTION_EMOJI_MAP[direction]}`}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        {state.directionPercentages.map(({ direction, percent }) => (
          <div
            style={{
              fontSize: `${percent * 80}vw`,
            }}
          >
            {DIRECTION_EMOJI_MAP[direction]}
          </div>
        ))}
      </div>
    </body>
  </html>
);

export default (state: UiState) => renderSSR(() => ui(state));
