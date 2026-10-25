import { describe, expect, it } from 'vitest';
import { transition, type Actor, type TaskState } from '../src/domain/taskRules.ts';

// AD-2: the organizer's assign and reassign moves.
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
      changes: { status: 'open', helperId: 10, assignedAt: NOW },
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
    expect(transition(unassigned, { action: 'assign', helperId: 10 }, helper, [10], NOW)).toMatchObject({ kind: 'refused' });
  });
});

describe('reassign', () => {
  it('moves an Open task to another linked helper with a new assigned_at', () => {
    expect(transition(openForA, { action: 'reassign', helperId: 11 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'open', helperId: 11, assignedAt: NOW, acceptedAt: null },
    });
  });

  it('clears accepted_at and reopens an Accepted task', () => {
    expect(transition(acceptedByA, { action: 'reassign', helperId: 11 }, organizer, [10, 11], NOW)).toEqual({
      kind: 'change',
      changes: { status: 'open', helperId: 11, assignedAt: NOW, acceptedAt: null },
    });
  });

  it('is a no-op when the same helper is chosen, even for a task that is not Open', () => {
    expect(transition(openForA, { action: 'reassign', helperId: 10 }, organizer, [10, 11], NOW)).toEqual({ kind: 'noop' });
    expect(transition(acceptedByA, { action: 'reassign', helperId: 10 }, organizer, [10, 11], NOW)).toEqual({ kind: 'noop' });
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
