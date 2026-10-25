import { describe, expect, it } from 'vitest';
import { type Actor, allowedHelperActions, type TaskState, transition } from '../src/domain/taskRules.ts';

// AD-2: the organizer's assign, reassign and markDone moves, and the helper's answers.
const NOW = '2026-11-01T10:00:00.000Z';
const organizer: Actor = { kind: 'organizer', organizerId: 1 };

const unassigned: TaskState = { status: 'unassigned', helperId: null, assignedAt: null, acceptedAt: null };
const openForA: TaskState = { status: 'open', helperId: 10, assignedAt: '2026-10-20T08:00:00.000Z', acceptedAt: null };
const acceptedByA: TaskState = {
  status: 'accepted',
  helperId: 10,
  assignedAt: '2026-10-20T08:00:00.000Z',
  acceptedAt: '2026-10-21T08:00:00.000Z',
};

describe('assign', () => {
  it('moves an Unassigned task to Open for a linked helper', () => {
    expect(transition(unassigned, { action: 'assign', helperId: 10 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'open', helperId: 10, assignedAt: NOW, changedSinceAnswer: false },
    });
  });

  it('refuses a helper who is not linked to the event', () => {
    expect(transition(unassigned, { action: 'assign', helperId: 12 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'refused',
      code: 'helper_not_in_event',
    });
  });

  it('refuses assign on a task that already has a helper', () => {
    expect(transition(openForA, { action: 'assign', helperId: 11 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'refused',
      code: 'action_not_allowed',
    });
  });

  it('refuses a command with no helper', () => {
    expect(transition(unassigned, { action: 'assign' }, organizer, [10], NOW)).toMatchObject({ kind: 'refused' });
  });

  it('refuses a helper actor', () => {
    const helper: Actor = { kind: 'helper', helperId: 10, organizerId: 1 };
    expect(transition(unassigned, { action: 'assign', helperId: 10 }, helper, [10], NOW)).toMatchObject({
      kind: 'refused',
    });
  });
});

describe('reassign', () => {
  it('moves an Open task to another linked helper with a new assigned_at', () => {
    expect(transition(openForA, { action: 'reassign', helperId: 11 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'open', helperId: 11, assignedAt: NOW, acceptedAt: null, changedSinceAnswer: false },
    });
  });

  it('clears accepted_at and reopens an Accepted task', () => {
    expect(transition(acceptedByA, { action: 'reassign', helperId: 11 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'open', helperId: 11, assignedAt: NOW, acceptedAt: null, changedSinceAnswer: false },
    });
  });

  it('is a no-op when the same helper is chosen, even for a task that is not Open', () => {
    expect(transition(openForA, { action: 'reassign', helperId: 10 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'noop',
    });
    expect(transition(acceptedByA, { action: 'reassign', helperId: 10 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'noop',
    });
  });

  it('clears the changed-task flag, since the new helper has not answered', () => {
    const flagged: TaskState = { ...acceptedByA, changedSinceAnswer: true };
    expect(transition(flagged, { action: 'reassign', helperId: 11 }, organizer, [10, 11], NOW)).toMatchObject({
      kind: 'change',
      changes: { changedSinceAnswer: false },
    });
  });

  it('refuses a helper who is not linked to the event', () => {
    expect(transition(openForA, { action: 'reassign', helperId: 12 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'refused',
      code: 'helper_not_in_event',
    });
  });

  it('refuses reassign on an Unassigned task', () => {
    expect(transition(unassigned, { action: 'reassign', helperId: 10 }, organizer, [10], NOW)).toEqual({
      kind: 'refused',
      code: 'action_not_allowed',
    });
  });
});

const ola: Actor = { kind: 'helper', helperId: 10, organizerId: 1 };
const kim: Actor = { kind: 'helper', helperId: 11, organizerId: 1 };
const withStatus = (status: TaskState['status']): TaskState => ({
  ...acceptedByA,
  status,
  acceptedAt: status === 'accepted' ? acceptedByA.acceptedAt : null,
});

describe('helper answers', () => {
  it('Open + yes: Accepted with accepted_at = now, and a message', () => {
    expect(transition(openForA, { action: 'yes' }, ola, [], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'accepted', acceptedAt: NOW },
      message: { action: 'yes', statusAfter: 'accepted', body: null },
    });
  });

  it('Open + no: Declined, with the trimmed message body', () => {
    expect(transition(openForA, { action: 'no', message: '  Er bortreist  ' }, ola, [], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'declined' },
      message: { action: 'no', statusAfter: 'declined', body: 'Er bortreist' },
    });
  });

  it('Accepted + done / cantDo: Done / Can’t be done', () => {
    expect(transition(acceptedByA, { action: 'done' }, ola, [], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'done' },
      message: { action: 'done', statusAfter: 'done', body: null },
    });
    expect(transition(acceptedByA, { action: 'cantDo', message: 'Syk' }, ola, [], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'cant_do' },
      message: { action: 'cantDo', statusAfter: 'cant_do', body: 'Syk' },
    });
  });

  it('a repeat answer without a message is a no-op; with one it writes only the message', () => {
    expect(transition(acceptedByA, { action: 'yes' }, ola, [], NOW)).toEqual({ kind: 'noop' });
    expect(transition(acceptedByA, { action: 'yes', message: '   ' }, ola, [], NOW)).toEqual({ kind: 'noop' });
    expect(transition(acceptedByA, { action: 'yes', message: 'Kommer kl. 18' }, ola, [], NOW)).toEqual({
      kind: 'messageOnly',
      message: { action: 'yes', statusAfter: 'accepted', body: 'Kommer kl. 18' },
    });
  });

  it.each([
    ['Open + done', 'open', 'done'],
    ['Open + cantDo', 'open', 'cantDo'],
    ['Declined + yes', 'declined', 'yes'],
    ['Accepted + no', 'accepted', 'no'],
    ['Done + cantDo', 'done', 'cantDo'],
    ['Can’t be done + done', 'cant_do', 'done'],
    ['Done + yes', 'done', 'yes'],
  ] as const)('refuses %s', (_label, status, action) => {
    expect(transition(withStatus(status), { action, message: 'hei' }, ola, [], NOW)).toEqual({
      kind: 'refused',
      code: 'helper_command_refused',
    });
  });

  it('refuses a helper who is not the task’s current helper, and an Unassigned task', () => {
    expect(transition(openForA, { action: 'yes' }, kim, [10, 11], NOW)).toEqual({
      kind: 'refused',
      code: 'helper_command_refused',
    });
    expect(transition(unassigned, { action: 'yes' }, ola, [10], NOW)).toEqual({
      kind: 'refused',
      code: 'helper_command_refused',
    });
  });

  it('refuses organizer actions from a helper and helper actions from the organizer', () => {
    expect(transition(openForA, { action: 'markDone' }, ola, [], NOW)).toMatchObject({ kind: 'refused' });
    expect(transition(openForA, { action: 'reassign', helperId: 10 }, ola, [10], NOW)).toMatchObject({
      kind: 'refused',
    });
    expect(transition(openForA, { action: 'yes' }, organizer, [10], NOW)).toMatchObject({ kind: 'refused' });
  });
});

describe('markDone (organizer)', () => {
  it.each(['unassigned', 'open', 'accepted', 'declined', 'cant_do'] as const)(
    'moves %s to Done with no message',
    (status) => {
      const task = status === 'unassigned' ? unassigned : withStatus(status);
      expect(transition(task, { action: 'markDone' }, organizer, [], NOW)).toEqual({
        kind: 'change',
        changes: { status: 'done', changedSinceAnswer: false },
      });
    },
  );

  it('clears the changed-task flag on a flagged Accepted task', () => {
    const flagged: TaskState = { ...acceptedByA, changedSinceAnswer: true };
    expect(transition(flagged, { action: 'markDone' }, organizer, [], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'done', changedSinceAnswer: false },
    });
  });

  it('is a no-op on a Done task', () => {
    expect(transition(withStatus('done'), { action: 'markDone' }, organizer, [], NOW)).toEqual({ kind: 'noop' });
  });
});

describe('allowedHelperActions', () => {
  it('gives yes/no for Open, done/cantDo for Accepted and nothing otherwise', () => {
    expect(allowedHelperActions({ status: 'open' })).toEqual(['yes', 'no']);
    expect(allowedHelperActions({ status: 'accepted' })).toEqual(['done', 'cantDo']);
    for (const status of ['unassigned', 'declined', 'done', 'cant_do'] as const) {
      expect(allowedHelperActions({ status })).toEqual([]);
    }
  });
});
