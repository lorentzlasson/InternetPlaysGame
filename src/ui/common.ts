import {
  Direction,
  DirectionPercentage,
  DIRECTIONS,
  EMOJI_MAP,
  Entity,
  HEIGHT,
  isSamePosition,
  range,
  WIDTH,
} from '../common.ts';

export const DIRECTION_EMOJI_MAP: { [key in Direction]: string } = {
  left: '⬅️',
  down: '⬇️',
  up: '⬆️',
  right: '➡️',
};

const nextMidnight = new Date();
nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
nextMidnight.setUTCHours(0, 0, 0, 0);
export const getTimeUntilNextMove = () => {
  const now = new Date();
  const diffMs = nextMidnight.getTime() - now.getTime();

  return {
    hours: Math.floor((diffMs % 86400000) / 3600000),
    minutes: Math.round(((diffMs % 86400000) % 3600000) / 60000),
  };
};

export const getCompletedDirectionPercentages = (
  dirPercentages: readonly DirectionPercentage[],
): readonly DirectionPercentage[] =>
  DIRECTIONS.map((dir) => {
    const dirPercent = dirPercentages.find(({ direction }) =>
      direction === dir
    );
    return {
      direction: dir,
      percent: dirPercent?.percent || 0,
    };
  });

const minimumOpacity = 0.2;
const opacityVariance = 1 - minimumOpacity;
export const transformPercentagesToOpacity = (
  dirPercentages: readonly DirectionPercentage[],
) => {
  const completedList = getCompletedDirectionPercentages(dirPercentages);
  const percentages = completedList.map((x) => x.percent);
  const min = Math.min(...percentages);
  const max = Math.max(...percentages);

  const scale = min === max ? Infinity : opacityVariance / (max - min);

  return completedList.map(({ direction, percent }) => ({
    direction,
    opacity: Math.min(1, minimumOpacity + (percent - min) * scale),
  }));
};

export const getOpacityForDirection = (
  direction: Direction,
  directionPercentages: { direction: Direction; opacity: number }[],
) => {
  const opacity = directionPercentages.find((x) => x.direction === direction)
    ?.opacity;

  if (opacity === undefined) throw new Error();

  return opacity;
};

export const getShareableBoard = (entities: readonly Entity[]) => {
  const rows = range(HEIGHT).map((y) => {
    const cells = range(WIDTH).map((x) => {
      const entity = entities.find((e) => isSamePosition(e.position, [x, y]));
      const emoji = entity ? EMOJI_MAP[entity.type] : EMOJI_MAP.blank;
      return emoji;
    });
    return cells.join('') + '\\n';
  });
  return rows.join('');
};
