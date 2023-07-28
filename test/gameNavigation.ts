import { assertArrayIncludes, assertEquals, assertNotEquals } from 'asserts';

import { Page } from 'sincoPage';
import { Direction, Emoji, Position } from '../src/common.ts';

import { jwtSecret as rawJwtSecret, tickerApiKey } from '../src/config.ts';
import * as jwtUtil from '../src/jwt.ts';

type MoveAttempt = { name: string; direction: Direction };

const GAME_URL = Deno.env.get('GAME_URL') || 'http://localhost:8000';

const jwtSecret = await jwtUtil.encodeSecret(rawJwtSecret);

const fakeSignIn = async (page: Page, name: string) => {
  const jwt = await jwtUtil.create(name, jwtSecret);

  await page.cookie({
    name: 'auth',
    value: jwt,
    url: GAME_URL,
  });

  await page.location(GAME_URL);

  // Delay to wait for page to fully reload, or else getting error:
  // `The selector "button[value=<DIRECTION>]" does not exist inside the DOM`
  await new Promise((resolve) => setTimeout(resolve, 10));
};

const recordMove = async (page: Page, direction: string) => {
  page.expectWaitForRequest();
  const btn = await page.querySelector(`button[value=${direction}]`);
  await btn.click();
  await page.waitForRequest();
};

const loadPage = (page: Page) => () => page.location(GAME_URL);

const recordMoves = (page: Page) => async (moveAttempts: MoveAttempt[]) => {
  for await (const { name, direction } of moveAttempts) {
    await fakeSignIn(page, name);
    await recordMove(page, direction);
  }
};

const assertScore = (page: Page) => async (expectedScore: number) => {
  const score = await page.evaluate(() => {
    const el = document.getElementById('score');
    return parseInt(el?.textContent || '');
  });
  assertEquals(
    score,
    expectedScore,
    `scores was ${score} but expected ${expectedScore}`,
  );
};

const assertHighScoreWithin =
  (page: Page) => async (expectedHighScores: number[]) => {
    const highScore = await page.evaluate(() => {
      const el = document.getElementById('highScore');
      return parseInt(el?.innerHTML || '');
    });
    assertArrayIncludes(expectedHighScores, [highScore]);
  };

// Meant to run in page.evaluate
const findPositionOfEmoji = (emoji: Emoji): [number, number] | null => {
  const board = document.getElementById('board');

  if (!board) return null;

  const rows = Array.from(board.children);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const columns = Array.from(rows[rowIndex].children);
    const columnIndex = columns.findIndex((column) =>
      column.textContent === emoji
    );

    if (columnIndex !== -1) {
      return [columnIndex, rowIndex];
    }
  }

  return null;
};

const assertEntityIsInPosition =
  (page: Page) => async (expectedEmoji: Emoji, expectedPosition: Position) => {
    const position = await page.evaluate(findPositionOfEmoji, expectedEmoji);

    assertEquals(
      position,
      expectedPosition,
      `expected: ${expectedEmoji}, ${expectedPosition}\ngot: ${position}`,
    );
  };

const assertEntityIsNotInPosition =
  (page: Page) => async (expectedEmoji: Emoji, expectedPosition: Position) => {
    const position = await page.evaluate(findPositionOfEmoji, expectedEmoji);

    assertNotEquals(position, expectedPosition);
  };

export default (page: Page) => ({
  loadPage: loadPage(page),
  recordMoves: recordMoves(page),
  assertScore: assertScore(page),
  assertHighScoreWithin: assertHighScoreWithin(page),
  assertEntityIsInPosition: assertEntityIsInPosition(page),
  assertEntityIsNotInPosition: assertEntityIsNotInPosition(page),
});

export const executeMove = async () => {
  const x = await fetch(`${GAME_URL}/tick`, {
    method: 'POST',
    headers: {
      'x-api-key': tickerApiKey,
    },
  });
  x.body?.cancel();
};
