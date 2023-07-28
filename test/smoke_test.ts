import { buildFor } from 'sinco';
import gameNavigation, { executeMove } from './gameNavigation.ts';

Deno.test('smoke', async () => {
  const { browser, page } = await buildFor('chrome');
  const {
    loadPage,
    recordMoves,
    assertScore,
    assertHighScoreWithin,
    assertEntityIsInPosition,
    assertEntityIsNotInPosition,
  } = gameNavigation(page);
  await loadPage();

  // Verify initial state
  await Promise.all([
    assertEntityIsInPosition('🏃', [0, 2]),
    assertEntityIsInPosition('🪙', [2, 0]),
    assertEntityIsInPosition('💣', [0, 1]),
    assertScore(0),
  ]);

  await recordMoves([['alice', 'right'], ['bob', 'right']]);
  await executeMove();

  await recordMoves([['alice', 'right'], ['bob', 'right']]);
  await executeMove();

  await recordMoves([['alice', 'up'], ['bob', 'up']]);
  await executeMove();

  await recordMoves([['alice', 'up'], ['bob', 'up']]);
  await executeMove();

  await loadPage();
  await Promise.all([
    // Coin is collected
    assertScore(1),
    // Coin has respawned in new location location
    assertEntityIsNotInPosition('🪙', [2, 0]),
  ]);

  // tries to go out of bounds
  await recordMoves([['alice', 'up'], ['chad', 'up']]);
  await executeMove();

  await recordMoves([['alice', 'left'], ['chad', 'left']]);
  await executeMove();

  await recordMoves([['alice', 'down'], ['chad', 'down']]);
  await executeMove();

  await recordMoves([['alice', 'left'], ['chad', 'left']]);
  await executeMove();

  await loadPage();
  await Promise.all([
    // Bomb is blown up, reseting score to 0
    // (Score might have gone up over 1 before bomb explosion depending on randomized respawn location on coin)
    assertScore(0),

    // Avatar is in position where bomb was previously
    assertEntityIsInPosition('🏃', [0, 1]),
    // Bomb has respawned in new location location
    assertEntityIsNotInPosition('💣', [0, 1]),

    // High score can vary between 1 and 3 due to randomness
    assertHighScoreWithin([1, 2, 3]),
  ]);

  if (Deno.env.get('DEBUG')) await page.takeScreenshot('./test/screenshot');

  await browser.close();
});
