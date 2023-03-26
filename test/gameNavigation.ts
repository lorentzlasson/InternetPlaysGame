import { assertArrayIncludes, assertEquals, assertNotEquals } from 'asserts';

import { Page } from 'sincoPage';
import {
  Direction,
  Emoji,
  MOVE_SELECTION_MILLIS,
  Position,
} from '../src/common.ts';

// Avg execution times in ms
const SERVER_IDLE = 5;
const SERVER_WITH_TWO_CANDIDATES = 30;
const TEST = 140;

const SERVER_AVG_MOVE_MILLIS_IDLE = MOVE_SELECTION_MILLIS + SERVER_IDLE;
const EXEC_COMPENSATION = SERVER_WITH_TWO_CANDIDATES - TEST;

type MoveAttempt = { name: string; direction: Direction };

const GAME_URL = Deno.env.get('GAME_URL') || 'http://localhost:8000';

const setName = async (page: Page, name: string) => {
  const inputName = await page.querySelector('input[type=text]');
  inputName.value(name);
};

const recordMove = async (page: Page, direction: string) => {
  const btnRight = await page.querySelector(`button[value=${direction}]`);
  await btnRight.click();
};

const loadPage = (page: Page) => () => page.location(GAME_URL);

const getLastMoveAt = (page: Page) => async () => {
  const lastMoveAtLabel: string | undefined = await page.evaluate(() => {
    return document.getElementById('lastMoveAt')?.innerHTML;
  });
  if (!lastMoveAtLabel) throw Error('could not find "lastMoveAt"');
  const lastMoveAtString = lastMoveAtLabel.split(' ').at(-1);
  if (!lastMoveAtString) throw Error('could not find "lastMoveAt"');
  return new Date(lastMoveAtString);
};

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
  getLastMoveAt: getLastMoveAt(page),
  recordMoves: recordMoves(page),
  assertScore: assertScore(page),
  assertHighScoreWithin: assertHighScoreWithin(page),
  assertEntityIsInPosition: assertEntityIsInPosition(page),
  assertEntityIsNotInPosition: assertEntityIsNotInPosition(page),
  assertHistoryCount: assertHistoryCount(page),
});

const nextUpdateIn = (lastKnownMoveAt: Date) => {
  const now = new Date();
  const msSinceFirst = now.getTime() - lastKnownMoveAt.getTime();
  const msSinceLast = msSinceFirst % SERVER_AVG_MOVE_MILLIS_IDLE;
  const nextIn = SERVER_AVG_MOVE_MILLIS_IDLE - msSinceLast;
  return nextIn;
};

export const awaitNextMove = (lastKnownMoveAt: Date) => {
  const nextIn = nextUpdateIn(lastKnownMoveAt);
  // To try to make first move right after a move execution
  const margin = MOVE_SELECTION_MILLIS / 10;
  const waitFor = nextIn + margin;

  return new Promise((resolve) => setTimeout(resolve, waitFor));
};

export const waitForMoveExecution = () =>
  new Promise((resolve) =>
    setTimeout(resolve, MOVE_SELECTION_MILLIS + EXEC_COMPENSATION)
  );
