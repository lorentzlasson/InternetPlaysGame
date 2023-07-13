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

import {
  DIRECTION_EMOJI_MAP,
  getOpacityForDirection,
  getShareableBoard,
  getTimeUntilNextMove,
  script,
  transformPercentagesToOpacity,
} from './common.tsx';

import { script } from './components.tsx';

const ui = (state: UiState) => {
  const opacities = transformPercentagesToOpacity(state.directionPercentages);
  const timeUntilNextMove = getTimeUntilNextMove();
  const sharableBoard = getShareableBoard(state.entities);

  return (
    <html>
      <head>
        <title>Internet Plays Game</title>
        <meta charSet='UTF-8'></meta>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0'
        >
        </meta>
        {script(sharableBoard)}
      </head>
      <body style={{ display: 'flex' }}>
        <div>
          <div
            id='board'
            style={{
              fontSize: '10vw',
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
                  const emoji = entity
                    ? EMOJI_MAP[entity.type]
                    : EMOJI_MAP.blank;
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
                            style={{
                              position: 'absolute',
                              top: 0,
                              opacity: '0.2',
                            }}
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
            <div style={{ display: 'flex' }}>
              {Object.entries(DIRECTION_EMOJI_MAP).map(
                ([direction, emoji]) => {
                  const opacity = getOpacityForDirection(
                    direction as Direction,
                    opacities,
                  );
                  return (
                    <button
                      value={direction}
                      type='submit'
                      disabled={state.signedInMoveCandidate ? true : undefined}
                      style={{
                        padding: '0 5px',
                        background: 'none',
                        border: 'none',
                        fontSize: '7.3vw',
                        textAlign: 'center',
                        opacity: `${opacity}`,
                        cursor: state.signedInMoveCandidate
                          ? 'default'
                          : 'pointer',
                        color: 'inherit',
                      }}
                      name='direction'
                    >
                      {emoji}
                    </button>
                  );
                },
              )}
            </div>
          </form>
        </div>
        <div style={{ fontSize: '5vw', paddingLeft: '20px' }}>
          <div>
            ⌛{timeUntilNextMove.hours}h {timeUntilNextMove.minutes}m
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
          <div>
            {state.signedInMoveCandidate &&
              (
                <div>
                  🗳️ {DIRECTION_EMOJI_MAP[state.signedInMoveCandidate.direction]}
                </div>
              )}
          </div>
        </div>
      </body>
    </html>
  );
};

export default (state: UiState) => renderSSR(() => ui(state));
