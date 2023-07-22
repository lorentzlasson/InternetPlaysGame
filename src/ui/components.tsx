/** @jsx h */
import { h } from 'nano_jsx';

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
  getShareableText,
  getTimeUntilNextMove,
  transformPercentagesToOpacity,
} from './common.ts';

const clientSideScript = (text: string) => {
  window.onload = () =>
    document.getElementById('share')?.addEventListener(
      'click',
      () => {
        if (navigator.share) {
          navigator.share({
            text,
          });
        } else {
          navigator.clipboard.writeText(text);
          alert(`Copied to clipboard:\n ${text}`);
        }
      },
    );
};

export const script = (state: UiState) => {
  const text = getShareableText(state);
  return (
    <script>
      {`(${clientSideScript.toString()})(${JSON.stringify(text)})`}
    </script>
  );
};

export const board = (state: UiState, vw: number) => (
  <a
    id='board'
    href='/info'
    style={{
      fontSize: `${vw}vw`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textDecoration: 'none',
      cursor: 'default',
    }}
  >
    {range(HEIGHT).map((y) => (
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
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
  </a>
);

export const buttons = (state: UiState, vw: number) => {
  const opacities = transformPercentagesToOpacity(state.directionPercentages);
  return (
    <form method='POST' action='/move'>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                  fontSize: `${vw}vw`,
                  textAlign: 'center',
                  opacity: `${opacity}`,
                  cursor: state.signedInMoveCandidate ? 'default' : 'pointer',
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
  );
};

export const scores = (state: UiState, vw: number) => (
  <div style={{ display: 'flex', fontSize: `${vw}vw` }}>
    <div style={{ display: 'flex' }}>
      🪙<div>{state.score}</div>
    </div>
    <div style={{ display: 'flex' }}>
      🥇<div>{state.highScore}</div>
    </div>
  </div>
);

export const timer = (vw: number) => {
  const timeUntilNextMove = getTimeUntilNextMove();
  return (
    <div style={{ fontSize: `${vw}vw` }}>
      ⌛{timeUntilNextMove.hours}h {timeUntilNextMove.minutes}m
    </div>
  );
};

export const moveCandidate = (state: UiState, vw: number) => (
  state.signedInMoveCandidate &&
  (
    <div style={{ fontSize: `${vw}vw` }}>
      🗳️ {DIRECTION_EMOJI_MAP[state.signedInMoveCandidate.direction]}
    </div>
  )
);

export const signInOrShare = (state: UiState, vw: number) => (
  state.signedInPlayer ? share(vw) : signIn(state, vw)
);

export const signIn = (state: UiState, vw: number) => (
  !state.signedInPlayer &&
  (
    <a
      href='/auth'
      style={{
        fontSize: `${vw}vw`,
        cursor: 'pointer',
        textDecoration: 'none',
      }}
    >
      👤➡️🚪
    </a>
  )
);

export const share = (vw: number) => (
  (
    <div
      id='share'
      style={{
        fontSize: `${vw}vw`,
        cursor: 'pointer',
        textDecoration: 'none',
      }}
    >
      🗣️
    </div>
  )
);
