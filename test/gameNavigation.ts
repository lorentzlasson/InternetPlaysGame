import { assertArrayIncludes, assertEquals, assertNotEquals } from 'asserts';

import { Page } from 'sincoPage';
import { MOVE_SELECTION_MILLIS } from '../src/game.ts';
import { Direction, Emoji, Position } from '../src/common.ts';

type MoveAttempt = { name: string; direction: Direction };

const setName = async (page: Page, name: string) => {
  const inputName = await page.querySelector('input[type=text]');
  inputName.value(name);
};

const recordMove = async (page: Page, direction: string) => {
  const btnRight = await page.querySelector(`button[value=${direction}]`);
  await btnRight.click();
};

const loadPage = (page: Page) => () => page.location('http://localhost:8000');

const recordMoves = (page: Page) => async (moveAttempts: MoveAttempt[]) => {
  for await (const { name, direction } of moveAttempts) {
    await setName(page, name);
    page.expectWaitForRequest();
    await recordMove(page, direction);
    await page.waitForRequest();
  }
};

const assertScore = (page: Page) => async (expectedScore: number) => {
  const score = await page.evaluate(() => {
    const el = document.getElementById('score');
    return parseInt(el?.innerHTML || '');
  });
  assertEquals(score, expectedScore, 'scores are not equal');
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
const findPositionOfEmoji = (emoji: Emoji) => {
  const table = document.querySelector('table');
  if (!table) return;
  const cells = Array.from(table.getElementsByTagName('td'));
  const cell = cells.find(({ innerHTML }) => innerHTML === emoji);

  if (!cell?.parentNode) return;
  const row = <HTMLTableRowElement> cell.parentNode;
  return [cell.cellIndex, row.rowIndex];
};

const assertEntityIsInPosition =
  (page: Page) => async (expectedEmoji: Emoji, expectedPosition: Position) => {
    const position = await page.evaluate(findPositionOfEmoji, expectedEmoji);

    assertEquals(position, expectedPosition);
  };

const assertEntityIsNotInPosition =
  (page: Page) => async (expectedEmoji: Emoji, expectedPosition: Position) => {
    const position = await page.evaluate(findPositionOfEmoji, expectedEmoji);

    assertNotEquals(position, expectedPosition);
  };

const assertHistoryCount = (page: Page) => async (expectedCount: number) => {
  const count = await page.evaluate(() => {
    const el = document.querySelector('table:nth-child(2) > tbody');
    return el?.childElementCount;
  });
  assertEquals(count, expectedCount);
};

export default (page: Page) => ({
  loadPage: loadPage(page),
  recordMoves: recordMoves(page),
  assertScore: assertScore(page),
  assertHighScoreWithin: assertHighScoreWithin(page),
  assertEntityIsInPosition: assertEntityIsInPosition(page),
  assertEntityIsNotInPosition: assertEntityIsNotInPosition(page),
  assertHistoryCount: assertHistoryCount(page),
});

export const waitForMoveExecution = () =>
  new Promise((resolve) => setTimeout(resolve, MOVE_SELECTION_MILLIS * 1.5));
