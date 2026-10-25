import type { ErrorCode } from './errors.ts';

// AD-2: the one task state machine. Pure: it takes the task, the command, the actor, the
// event's helper ids and "now", and decides which fields change and which message to write.
// It never touches the database.

export type TaskStatus = 'unassigned' | 'open' | 'accepted' | 'declined' | 'done' | 'cant_do';

export interface TaskState {
  status: TaskStatus;
  helperId: number | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  /** AD-13: the organizer changed an Accepted task after the helper's answer. */
  changedSinceAnswer?: boolean;
}

export type Actor = { kind: 'organizer'; organizerId: number } | { kind: 'helper'; helperId: number; organizerId: number };

export const HELPER_ACTIONS = ['yes', 'no', 'done', 'cantDo'] as const;
export type HelperAction = (typeof HELPER_ACTIONS)[number];
export type OrganizerAction = 'assign' | 'reassign' | 'markDone';
export type TaskAction = OrganizerAction | HelperAction;

export interface TaskCommand {
  action: TaskAction;
  helperId?: number;
  message?: string;
}

export type TaskChanges = Partial<TaskState>;

/** The messages row a helper command writes (AD-2). */
export interface MessageWrite {
  action: HelperAction;
  statusAfter: TaskStatus;
  body: string | null;
}

export type Transition =
  | { kind: 'change'; changes: TaskChanges; message?: MessageWrite }
  | { kind: 'messageOnly'; message: MessageWrite }
  | { kind: 'noop' }
  | { kind: 'refused'; code: ErrorCode };

const refused = (code: ErrorCode): Transition => ({ kind: 'refused', code });

const HELPER_TARGET = {
  yes: 'accepted',
  no: 'declined',
  done: 'done',
  cantDo: 'cant_do',
} as const satisfies Record<HelperAction, TaskStatus>;

/** The helper moves allowed in this story, by the task's current status. */
const HELPER_MOVES: Partial<Record<TaskStatus, readonly HelperAction[]>> = {
  open: ['yes', 'no'],
  accepted: ['done', 'cantDo'],
};

/** The buttons the helper page shows for a task. */
export function allowedHelperActions(task: Pick<TaskState, 'status'>): readonly HelperAction[] {
  return HELPER_MOVES[task.status] ?? [];
}

export function isHelperAction(action: string): action is HelperAction {
  return (HELPER_ACTIONS as readonly string[]).includes(action);
}

export function transition(
  task: TaskState,
  command: TaskCommand,
  actor: Actor,
  eventHelperIds: readonly number[],
  now: string,
): Transition {
  if (actor.kind === 'helper') return helperTransition(task, command, actor.helperId, now);
  if (isHelperAction(command.action)) return refused('action_not_allowed');

  if (command.action === 'markDone') {
    if (task.status === 'done') return { kind: 'noop' };
    // A Done task has no helper buttons, so the changed-task banner would never clear otherwise.
    return { kind: 'change', changes: { status: 'done', changedSinceAnswer: false } };
  }

  const target = command.helperId;
  if (target === undefined) return refused('helper_not_in_event');

  // No double taps: choosing the helper the task already has changes nothing, whatever its status.
  if (task.status !== 'unassigned' && task.helperId === target) return { kind: 'noop' };
  if (!eventHelperIds.includes(target)) return refused('helper_not_in_event');

  switch (command.action) {
    case 'assign':
      if (task.status !== 'unassigned') return refused('action_not_allowed');
      return { kind: 'change', changes: { status: 'open', helperId: target, assignedAt: now, changedSinceAnswer: false } };
    case 'reassign':
      if (task.status === 'unassigned') return refused('action_not_allowed');
      // The new helper has not answered anything, so the changed-task flag goes too.
      return {
        kind: 'change',
        changes: { status: 'open', helperId: target, assignedAt: now, acceptedAt: null, changedSinceAnswer: false },
      };
  }
}

function helperTransition(task: TaskState, command: TaskCommand, helperId: number, now: string): Transition {
  const action = command.action;
  if (!isHelperAction(action)) return refused('helper_command_refused');
  // Only the task's current helper may act on it.
  if (task.helperId === null || task.helperId !== helperId) return refused('helper_command_refused');

  const body = command.message?.trim() ? command.message.trim() : null;
  const target = HELPER_TARGET[action];

  // Same status: nothing to change. A message is still delivered, on its own.
  if (task.status === target) {
    return body === null ? { kind: 'noop' } : { kind: 'messageOnly', message: { action, statusAfter: target, body } };
  }
  if (!allowedHelperActions(task).includes(action)) return refused('helper_command_refused');

  const changes: TaskChanges = action === 'yes' ? { status: target, acceptedAt: now } : { status: target };
  return { kind: 'change', changes, message: { action, statusAfter: target, body } };
}

/**
 * AD-11: the fields every stored task must agree with its status. Accepted needs `acceptedAt`, and
 * Unassigned, Open and Declined have none; every status except Unassigned needs `helperId` and
 * `assignedAt`; Unassigned has neither.
 * Done tasks may keep their helper. Throws an Error naming the broken rule.
 */
export function assertFieldInvariant(task: TaskState & { id?: number }): void {
  const which = task.id === undefined ? 'Task' : `Task ${task.id}`;
  if ((task.status === 'unassigned' || task.status === 'open' || task.status === 'declined') && task.acceptedAt !== null) {
    throw new Error(`${which}: a ${task.status} task has no accepted_at`);
  }
  if (task.status === 'unassigned') {
    if (task.helperId !== null || task.assignedAt !== null) {
      throw new Error(`${which}: an Unassigned task has no helper_id and no assigned_at`);
    }
    return;
  }
  if (task.helperId === null || task.assignedAt === null) {
    throw new Error(`${which}: a ${task.status} task needs helper_id and assigned_at`);
  }
  if (task.status === 'accepted' && task.acceptedAt === null) {
    throw new Error(`${which}: an Accepted task needs accepted_at`);
  }
}
