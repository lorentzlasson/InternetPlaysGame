/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

import { UiState } from '../common.ts';

import {
  board,
  buttons,
  moveCandidate,
  scores,
  script,
  signIn,
  timer,
} from './components.tsx';

const ui = (state: UiState) => {
  return (
    <html>
      <head>
        <title>Internet Plays Game</title>
        <meta charSet='UTF-8'></meta>
        {script(state)}
      </head>
      <body style={{ display: 'flex' }}>
        <div>
          {board(state, 10)}
          {buttons(state, 7.3)}
        </div>
        <div style={{ fontSize: '5vw', paddingLeft: '20px' }}>
          {timer(5)}
          {scores(state, 5)}
          {signIn(state, 5)}
          {moveCandidate(state, 5)}
        </div>
      </body>
    </html>
  );
};

export default (state: UiState) => renderSSR(() => ui(state));
