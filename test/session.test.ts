import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBackgroundPoll } from '../src/middleware/session';

describe('background polls', () => {
  it('recognises the requests a page makes on a timer', () => {
    assert.ok(isBackgroundPoll('/admin/live'));
    assert.ok(isBackgroundPoll('/en/stats.json'));
    assert.ok(isBackgroundPoll('/rw/stats.json'));
  });

  it('counts everything a person does as activity', () => {
    for (const path of ['/admin', '/admin/status', '/admin/insights', '/en', '/en/track/lookup', '/login']) {
      assert.equal(isBackgroundPoll(path), false, path);
    }
  });
});
