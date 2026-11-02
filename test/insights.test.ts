import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chartModel, fillDays, formatDuration, median, percent } from '../src/lib/insights';

describe('insight arithmetic', () => {
  it('takes medians honestly', () => {
    assert.equal(median([]), null);
    assert.equal(median([5]), 5);
    assert.equal(median([9, 1, 5]), 5);
    assert.equal(median([1, 2, 3, 10]), 2.5);
  });

  it('formats durations and missing data', () => {
    assert.equal(formatDuration(null), '—');
    assert.equal(formatDuration(45), '45 min');
    assert.equal(formatDuration(6 * 60), '6 h');
    assert.equal(formatDuration(84 * 60), '3.5 days');
    assert.equal(formatDuration(72 * 60), '3 days');
  });

  it('never divides by zero', () => {
    assert.equal(percent(0, 0), '—');
    assert.equal(percent(1, 3), '33%');
  });
});

describe('daily series', () => {
  const now = new Date(2026, 9, 10, 15, 0, 0);

  it('fills the days nothing happened on and ends today', () => {
    const points = fillDays([{ day: '2026-10-08', count: 3 }], [{ day: '2026-10-10', count: 1 }], 4, now);
    assert.deepEqual(points, [
      { day: '2026-10-07', created: 0, resolved: 0 },
      { day: '2026-10-08', created: 3, resolved: 0 },
      { day: '2026-10-09', created: 0, resolved: 0 },
      { day: '2026-10-10', created: 0, resolved: 1 },
    ]);
  });

  it('crosses a month boundary', () => {
    const points = fillDays([], [], 3, new Date(2026, 10, 1, 12));
    assert.deepEqual(points.map((p) => p.day), ['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});

describe('chart geometry', () => {
  it('scales to a round maximum and always labels the last day', () => {
    const points = fillDays([{ day: '2026-10-10', count: 17 }], [], 30, new Date(2026, 9, 10));
    const model = chartModel(points);
    assert.equal(model.max, 20);
    assert.equal(model.bars.length, 30);
    const last = model.bars[29];
    assert.ok(last !== undefined);
    assert.equal(last.createdHeight, 170);
    assert.equal(last.showLabel, true);
    assert.ok(model.bars.filter((b) => b.showLabel).length <= 7);
  });

  it('only ever labels the axis with whole numbers, in at most five lines', () => {
    for (const peak of [0, 1, 3, 5, 6, 7, 9, 11, 17, 23, 48, 99, 101, 137, 512, 1999, 25000]) {
      const model = chartModel(fillDays([{ day: '2026-10-10', count: peak }], [], 5, new Date(2026, 9, 10)));
      assert.ok(model.max >= peak, `max ${model.max} covers ${peak}`);
      assert.ok(model.gridlines.length <= 5 && model.gridlines.length >= 1, `${peak}: ${model.gridlines.length} lines`);
      for (const line of model.gridlines) assert.ok(Number.isInteger(line.value), `${peak}: ${line.value}`);
      assert.equal(model.gridlines.at(-1)?.value, model.max);
    }
  });

  it('handles an entirely empty period', () => {
    const model = chartModel(fillDays([], [], 7, new Date(2026, 9, 10)));
    assert.equal(model.max, 5);
    assert.ok(model.bars.every((b) => b.createdHeight === 0));
  });
});
