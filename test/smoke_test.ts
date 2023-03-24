import { buildFor } from 'sinco';
import gameNavigation, {
  awaitNextMove,
  waitForMoveExecution,
} from './gameNavigation.ts';

Deno.test('smoke', async () => {
  const { browser, page } = await buildFor('chrome');
  const {
    loadPage,
    getLastMoveAt,
    recordMoves,
    assertScore,
    assertHighScoreWithin,
    assertEntityIsInPosition,
    assertEntityIsNotInPosition,
    assertHistoryCount,
  } = gameNavigation(page);
  await loadPage();

  // Verify initial state
  const [lastKnownMoveAt] = await Promise.all([
    getLastMoveAt(),
    assertEntityIsInPosition('🏃', [0, 2]),
    assertEntityIsInPosition('🪙', [2, 0]),
    assertEntityIsInPosition('💣', [0, 1]),
    assertScore(0),
  ]);

  await awaitNextMove(lastKnownMoveAt);

  await recordMoves([
    { direction: 'right', name: 'alice' },
    { direction: 'right', name: 'bob' },
  ]);
  await waitForMoveExecution();

  await recordMoves([
    { direction: 'right', name: 'alice' },
    { direction: 'right', name: 'bob' },
  ]);
  await waitForMoveExecution();

  await recordMoves([
    { direction: 'up', name: 'alice' },
    { direction: 'up', name: 'bob' },
  ]);
  await waitForMoveExecution();

  await recordMoves([
    { direction: 'up', name: 'alice' },
    { direction: 'up', name: 'bob' },
  ]);
  await waitForMoveExecution();

  await loadPage();
  await Promise.all([
    // Coin is collected
    assertScore(1),
    // Coin has respawned in new location location
    assertEntityIsNotInPosition('🪙', [2, 0]),
  ]);

  // tries to go out of bounds
  await recordMoves([
    { direction: 'up', name: 'alice' },
    { direction: 'up', name: 'chad' },
  ]);
  await waitForMoveExecution();

  await recordMoves([
    { direction: 'left', name: 'alice' },
    { direction: 'left', name: 'chad' },
  ]);
  await waitForMoveExecution();

  await recordMoves([
    { direction: 'down', name: 'alice' },
    { direction: 'down', name: 'chad' },
  ]);
  await waitForMoveExecution();

  await recordMoves([
    { direction: 'left', name: 'alice' },
    { direction: 'left', name: 'chad' },
  ]);
  await waitForMoveExecution();

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

    assertHistoryCount(8),
  ]);

  if (Deno.env.get('DEBUG')) await page.takeScreenshot('./test/screenshot');

  await browser.close();
});
