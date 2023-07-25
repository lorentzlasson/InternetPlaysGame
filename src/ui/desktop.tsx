/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

import { UiState } from '../common.ts';

import {
  board,
  buttons,
  moveCandidate,
  scores,
  script,
  share,
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
        <div
          style={{
            fontSize: '5vw',
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {timer(3)}
          {scores(state, 3)}
          {share(3)}
          {signIn(state, 3)}
          {moveCandidate(state, 3)}
        </div>
      </body>
    </html>
  );
};

export default (state: UiState) => renderSSR(() => ui(state));
