/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

import { UiState } from '../common.ts';

import {
  board,
  buttons,
  moveCandidate,
  scores,
  script,
  timer,
} from './components.tsx';

const ui = (state: UiState) => {
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
        {script(state)}
      </head>
      <body>
        {board(state, 25)}
        {buttons(state, 18.75)}
        {moveCandidate(state, 5)}
        <div
          style={{
            paddingTop: '15px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {scores(state, 5)}
          {timer(5)}
        </div>
      </body>
    </html>
  );
};

export default (state: UiState) => renderSSR(() => ui(state));
