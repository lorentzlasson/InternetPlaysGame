/** @jsx h */
import { h, renderSSR } from 'nano_jsx';

const ui = () => {
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
      </head>
      <body>
        <div>
          <a
            href='javascript:history.back()'
            style={{
              textDecoration: 'none',
            }}
          >
            🔙
          </a>
          <div>
            A game inspired by{' '}
            <a href='https://en.wikipedia.org/wiki/Wordle'>
              Wordle
            </a>
            {', '}
            <a href='https://en.wikipedia.org/wiki/Twitch_Plays_Pok%C3%A9mon'>
              Twitch Plays Pokémon
            </a>
            {' and '}
            <a href='https://en.wikipedia.org/wiki/Snake_(video_game_genre)'>
              Snake
            </a>. Vote on which direction to move. How high can the internet
            score?
          </div>
          <br />
          <div>
            🏃 The avatar controlled by the players
          </div>
          <div style={{ display: 'flex' }}>
            <div style={{ opacity: '0.2' }}>
              🏃&nbsp;
            </div>
            The previous position of the avatar
          </div>
          <div>
            🪙 Awards one point when stepped on
          </div>
          <div>
            💣 Resets the points to 0 when stepped on
          </div>
          <div>
            ⬜ Does nothing when stepped on
          </div>
          <div>
            ⬅️⬇️⬆️➡️ Voting buttons. Only one vote per player per day. Once voted,
            the opacity hints the total vote distribution
          </div>
          <div>
            ⌛Time until next move
          </div>
          <div>
            🪙🥇 Current score and high score
          </div>
          <div>
            🗳️ Your vote
          </div>
          <div>
            👤➡️🚪 Sign in
          </div>
          <div>
            🗣️ Share your vote
          </div>
        </div>

        <a
          href='https://github.com/lorentzlasson/internetplaysgame'
          style={{
            position: 'fixed',
            bottom: '10px',
            textDecoration: 'none',
          }}
        >
          🐙🐈
        </a>
      </body>
    </html>
  );
};

export default () => renderSSR(() => ui());
