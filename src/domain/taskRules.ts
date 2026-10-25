import type { ErrorCode } from './errors.ts';

// AD-2: the one task state machine. Pure: it takes the task, the command, the actor, the
// event's helper ids and "now", and decides which fields change. It never touches the database.

export type TaskStatus = 'unassigned' | 'open' | 'accepted' | 'declined' | 'done' | 'cant_do';

export interface TaskState {
  status: TaskStatus;
  helperId: number | null;
  assignedAt: string | null;
  acceptedAt: string | null;
}

export type Actor = { kind: 'organizer'; organizerId: number } | { kind: 'helper'; helperId: number; organizerId: number };

export type TaskAction = 'assign' | 'reassign';

export interface TaskCommand {
  action: TaskAction;
  helperId?: number;
  message?: string;
}

export type TaskChanges = Partial<TaskState>;

export type Transition =
  | { kind: 'change'; changes: TaskChanges }
  | { kind: 'noop' }
  | { kind: 'refused'; code: ErrorCode };

const refused = (code: ErrorCode): Transition => ({ kind: 'refused', code });

export function transition(
  task: TaskState,
  command: TaskCommand,
  actor: Actor,
  eventHelperIds: readonly number[],
  now: string,
): Transition {
  if (actor.kind !== 'organizer') return refused('action_not_allowed');
  const target = command.helperId;
  if (target === undefined) return refused('helper_not_in_event');

  // No double taps: choosing the helper the task already has changes nothing, whatever its status.
  if (task.status !== 'unassigned' && task.helperId === target) return { kind: 'noop' };
  if (!eventHelperIds.includes(target)) return refused('helper_not_in_event');

  switch (command.action) {
    case 'assign':
      if (task.status !== 'unassigned') return refused('action_not_allowed');
      return { kind: 'change', changes: { status: 'open', helperId: target, assignedAt: now } };
    case 'reassign':
      if (task.status === 'unassigned') return refused('action_not_allowed');
      return { kind: 'change', changes: { status: 'open', helperId: target, assignedAt: now, acceptedAt: null } };
  }
}
