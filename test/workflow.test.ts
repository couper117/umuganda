import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canTransition, describeDue, dueAt, feedbackOptions, isOpen, nextStatuses, priorityScore, slaState } from '../src/lib/workflow';

const H = 60 * 60 * 1000;
const t0 = new Date('2026-10-01T08:00:00Z');
const at = (hours: number): Date => new Date(t0.getTime() + hours * H);

describe('transitions', () => {
  it('lets staff work an open report', () => {
    assert.ok(canTransition('pending', 'in_progress', 'staff'));
    assert.ok(canTransition('in_progress', 'done', 'staff'));
    assert.ok(canTransition('reopened', 'done', 'staff'));
  });

  it('never lets staff set reopened, which is the reporter’s', () => {
    for (const from of ['pending', 'in_progress', 'done', 'notdone', 'reopened'] as const) {
      assert.equal(canTransition(from, 'reopened', 'staff'), false, from);
    }
  });

  it('lets staff undo a closure only by taking it back into progress', () => {
    assert.deepEqual(nextStatuses('done', 'staff'), ['in_progress']);
    assert.equal(canTransition('done', 'pending', 'staff'), false);
  });

  it('lets a resident do exactly one thing: dispute a closed report', () => {
    assert.ok(canTransition('done', 'reopened', 'resident'));
    assert.ok(canTransition('notdone', 'reopened', 'resident'));
    assert.equal(canTransition('pending', 'reopened', 'resident'), false);
    assert.equal(canTransition('done', 'in_progress', 'resident'), false);
  });

  it('rejects a move to the same status', () => {
    assert.equal(canTransition('pending', 'pending', 'staff'), false);
  });

  it('treats reopened as open', () => {
    assert.ok(isOpen('reopened'));
    assert.equal(isOpen('notdone'), false);
  });
});

describe('service targets', () => {
  it('sets deadlines by urgency', () => {
    assert.equal(dueAt(t0, 'high').getTime(), at(24).getTime());
    assert.equal(dueAt(t0, 'medium').getTime(), at(72).getTime());
    assert.equal(dueAt(t0, 'low').getTime(), at(168).getTime());
  });

  it('moves an open report from on track to at risk to overdue', () => {
    const due = at(24);
    assert.equal(slaState('pending', t0, due, null, at(1)), 'on_track');
    assert.equal(slaState('pending', t0, due, null, at(19)), 'at_risk');
    assert.equal(slaState('in_progress', t0, due, null, at(25)), 'overdue');
  });

  it('judges a closed report by when it was closed, not by now', () => {
    const due = at(24);
    assert.equal(slaState('done', t0, due, at(10), at(500)), 'met');
    assert.equal(slaState('done', t0, due, at(30), at(31)), 'missed');
  });

  it('says unknown rather than guessing for rows without a deadline', () => {
    assert.equal(slaState('pending', t0, null, null, at(1)), 'unknown');
    assert.equal(slaState('done', t0, at(24), null, at(1)), 'unknown');
  });

  it('describes deadlines compactly', () => {
    assert.equal(describeDue(at(5), t0), 'due in 5h');
    assert.equal(describeDue(t0, at(72)), '3d overdue');
    assert.equal(describeDue(at(0.2), t0), 'due in 1h');
  });
});

describe('reporter feedback', () => {
  const day = 24;

  it('offers confirm and dispute on a fresh fix', () => {
    assert.deepEqual(feedbackOptions('done', t0, null, at(1)), { canConfirm: true, canReopen: true });
  });

  it('offers only dispute on a closure without a fix', () => {
    assert.deepEqual(feedbackOptions('notdone', t0, null, at(1)), { canConfirm: false, canReopen: true });
  });

  it('closes the dispute window but still accepts thanks', () => {
    assert.deepEqual(feedbackOptions('done', t0, null, at(15 * day)), { canConfirm: true, canReopen: false });
  });

  it('offers nothing once confirmed, while open, or with no closure date', () => {
    assert.deepEqual(feedbackOptions('done', t0, at(2), at(3)), { canConfirm: false, canReopen: false });
    assert.deepEqual(feedbackOptions('in_progress', t0, null, at(3)), { canConfirm: false, canReopen: false });
    assert.deepEqual(feedbackOptions('done', null, null, at(3)), { canConfirm: false, canReopen: false });
  });
});

describe('priority', () => {
  const base = { status: 'pending', urgency: 'medium', sla: 'on_track', linkedReports: 0, reopened: false, ageHours: 0 } as const;

  it('puts an overdue medium above a fresh high', () => {
    const lateMedium = priorityScore({ ...base, sla: 'overdue', ageHours: 80 });
    const freshHigh = priorityScore({ ...base, urgency: 'high' });
    assert.ok(lateMedium > freshHigh, `${lateMedium} > ${freshHigh}`);
  });

  it('raises a report that several residents corroborate, with a cap', () => {
    const one = priorityScore(base);
    const three = priorityScore({ ...base, linkedReports: 3 });
    const fifty = priorityScore({ ...base, linkedReports: 50 });
    assert.ok(three > one);
    assert.equal(fifty, priorityScore({ ...base, linkedReports: 5 }));
  });

  it('raises a disputed fix', () => {
    assert.ok(priorityScore({ ...base, status: 'reopened', reopened: true }) > priorityScore(base));
  });

  it('sinks closed reports', () => {
    assert.equal(priorityScore({ ...base, status: 'done', urgency: 'high', sla: 'missed' }), 0);
  });
});
