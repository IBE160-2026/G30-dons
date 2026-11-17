import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { Clock } from '../../clock.ts';
import type { Config } from '../../config.ts';
import type { Db } from '../../db/client.ts';
import type { MessageAction, Task, TaskStatus } from '../../db/schema.ts';
import { formatDateTimeNb, formatDayNb } from '../../domain/dates.ts';
import { DomainError, type ErrorCode, errorText } from '../../domain/errors.ts';
import { byDay, weekGroups } from '../../domain/overviewText.ts';
import { MAX_TITLE_LENGTH } from '../../domain/plan.ts';
import { createEvent, getEvent, listEvents } from '../../services/events.ts';
import {
  addHelperToEvent,
  displayName,
  getHelper,
  listForEvent as listHelpersForEvent,
  MAX_HELPERS_PER_EVENT,
} from '../../services/helpers.ts';
import { listAndMarkSeen, type Reply, recentReplies } from '../../services/messages.ts';
import { loadEventSummary } from '../../services/summaries.ts';
import { addTask, apply, deleteTask, getTask, listForEvent, updateTask } from '../../services/tasks.ts';
import type { Templates } from '../../templates/index.ts';
import { organizerOf, requireLogin, setFlash } from '../middleware.ts';
import { absoluteUrl, paths } from '../paths.ts';
import { attentionText, daysToEventText, newRepliesText } from './summaryText.ts';

// FR-3, FR-4, FR-7: create events from templates and edit their tasks.
// FR-8 to FR-11: add helpers, assign tasks and show each helper's link.
// FR-20 (story 5.1): «Trenger deg nå», Fremdrift with the week groups (D3), Hjelpere, Meldinger and
// «Alle oppgaver» with one edit box at a time (D2, D8, D9). AD-15: only ?panel=messages marks replies seen.

/** The status words on organizer pages (EXPERIENCE.md → Status vocabulary), shown with the helper's name. */
const STATUS_LABELS = {
  unassigned: 'Ingen hjelper',
  open: 'Venter på svar',
  accepted: 'I gang',
  declined: 'Avslått',
  done: 'Ferdig',
  cant_do: 'Kan ikke gjøres',
} as const satisfies Record<TaskStatus, string>;

const PILL_CLASSES = {
  unassigned: 'pill-urgent',
  open: 'pill-waiting',
  accepted: 'pill-in-progress',
  declined: 'pill-urgent',
  done: 'pill-on-track',
  cant_do: 'pill-urgent',
} as const satisfies Record<TaskStatus, string>;

/** The groups of «Alle oppgaver», in order; «Ferdig» comes last (D9). */
const TASK_GROUPS = [
  { key: 'needsHelper', label: 'Trenger hjelper', pill: 'pill-urgent' },
  { key: 'waiting', label: 'Venter på svar', pill: 'pill-waiting' },
  { key: 'inProgress', label: 'I gang', pill: 'pill-in-progress' },
  { key: 'done', label: 'Ferdig', pill: 'pill-on-track' },
] as const;
type TaskGroup = (typeof TASK_GROUPS)[number]['key'];

const CHOOSE_HELPER = 'Velg en hjelper.';

const countText = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ACTION_LABELS = {
  yes: 'Sa ja',
  no: 'Sa nei',
  done: 'Ferdig',
  cantDo: 'Kan ikke gjøres',
} as const satisfies Record<MessageAction, string>;

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max, message).optional(),
  );

const eventSchema = z.object({
  templateKey: z.string().min(1, errorText('unknown_template')),
  name: optionalText(100, 'Navnet kan ha maks 100 tegn.'),
  occasion: optionalText(200, 'Feltet kan ha maks 200 tegn.'),
  location: optionalText(200, 'Feltet kan ha maks 200 tegn.'),
  eventDate: z.string().trim().min(1, 'Velg en dato.'),
  guestCount: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^\d+$/, 'Skriv inn et helt tall.')
      .transform(Number)
      .pipe(z.number().max(10000, 'Antallet kan være maks 10 000.'))
      .optional(),
  ),
  todo: optionalText(2000, 'Feltet kan ha maks 2000 tegn.'),
  otherInfo: optionalText(2000, 'Feltet kan ha maks 2000 tegn.'),
});

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Skriv inn en oppgave.')
    .max(MAX_TITLE_LENGTH, `Oppgaven kan ha maks ${MAX_TITLE_LENGTH} tegn.`),
  deadline: z.string().trim().min(1, 'Velg en frist.'),
});

const helperSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'E-postadressen kan ha maks 254 tegn.')
    .pipe(z.email(errorText('email_invalid'))),
  name: optionalText(100, 'Navnet kan ha maks 100 tegn.'),
});

// Only canonical ids like "12": "1e0", "0x1" or "012" are not found rather than aliases of another URL.
const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number);

type Errors = Record<string, string>;

function fieldErrors(error: z.ZodError): Errors {
  const errors: Errors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** Maps a domain error from the services to the form field it belongs to. */
const FIELD_OF: Partial<Record<ErrorCode, string>> = {
  unknown_template: 'templateKey',
  event_date_invalid: 'eventDate',
  event_date_in_past: 'eventDate',
  deadline_invalid: 'deadline',
  deadline_in_past: 'deadline',
};

function fieldOf(err: unknown): string | undefined {
  return err instanceof DomainError ? FIELD_OF[err.code] : undefined;
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** Parses a route id; an id that is not a positive integer is simply not found. */
function idParam(req: Request, name: string): number {
  const parsed = idSchema.safeParse(req.params[name]);
  if (!parsed.success) throw new DomainError('not_found');
  return parsed.data;
}

interface TaskFormState {
  add?: { values: Record<string, string>; errors: Errors };
  edit?: { taskId: number; values: Record<string, string>; errors: Errors };
  helperForm?: { values: Record<string, string>; errors: Errors };
  /** D7: «Gi oppgaven» without a helper, from the edit box or from a «Trenger deg nå» row. */
  assignError?: { taskId: number; from: 'edit' | 'needs' };
  /** D2: the task named by ?endre, already checked to be a positive id. */
  editTaskId?: number;
  /** The replies listed by GET /events/:id?panel=messages (already marked seen). */
  replies?: Reply[];
}

export function eventRoutes(db: Db, clock: Clock, templates: Templates, config: Config): Router {
  const router = Router();
  router.use(paths.events(), requireLogin(db));

  const templateOptions = [...templates.values()].map((t) => ({ key: t.key, name: t.name }));

  async function renderEvent(res: Response, eventId: number, state: TaskFormState = {}, status = 200) {
    const organizer = organizerOf(res);
    const event = await getEvent(db, organizer.id, eventId);
    const today = clock.today();
    const [allEvents, eventTasks, eventHelpers, { summary, newReplies }, recent] = await Promise.all([
      listEvents(db, organizer.id),
      listForEvent(db, organizer.id, eventId),
      listHelpersForEvent(db, organizer.id, eventId),
      loadEventSummary(db, organizer.id, eventId, today),
      recentReplies(db, organizer.id, eventId),
    ]);
    const { replies, assignError, add, helperForm } = state;
    const helperNames = new Map(eventHelpers.map((h) => [h.id, displayName(h)]));
    const urgentIds = new Set(summary.urgent.map((t) => t.id));
    const needsHelperIds = new Set(summary.needsHelper.map((t) => t.id));
    const needsYouIds = new Set([...needsHelperIds, ...urgentIds]);

    const pill = (t: Task) => {
      const helperName = t.helperId !== null ? helperNames.get(t.helperId) : undefined;
      const label = urgentIds.has(t.id) ? 'Haster' : STATUS_LABELS[t.status];
      return {
        text: helperName ? `${label} · ${helperName}` : label,
        className: urgentIds.has(t.id) ? 'pill-urgent' : PILL_CLASSES[t.status],
      };
    };
    const groupOf = (t: Task): TaskGroup => {
      if (t.status === 'done') return 'done';
      if (t.status === 'accepted') return 'inProgress';
      if (t.status === 'open' && !needsHelperIds.has(t.id)) return 'waiting';
      return 'needsHelper';
    };

    // D2: the edit box is open for ?endre of a task in this event, a validation error, or D7 from the box.
    const needsAssignError = assignError?.from === 'needs' && needsYouIds.has(assignError.taskId);
    const openTaskId =
      state.edit?.taskId ?? (assignError && !needsAssignError ? assignError.taskId : undefined) ?? state.editTaskId;
    const editTask = eventTasks.find((t) => t.id === openTaskId);
    const editBox = editTask && {
      taskId: editTask.id,
      values: state.edit?.values ?? { title: editTask.title, deadline: editTask.deadline },
      errors: {
        ...state.edit?.errors,
        ...(assignError && !needsAssignError ? { helperId: CHOOSE_HELPER } : {}),
      } as Errors,
    };

    const row = (t: Task) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      done: t.status === 'done',
      helperId: t.helperId,
      pill: pill(t),
    });
    const needsYou = [...summary.needsHelper, ...summary.urgent].map((t) => ({
      ...row(t),
      delegate: needsHelperIds.has(t.id),
      message: t.status === 'declined' || t.status === 'cant_do' ? (recent.lastBodyByTask.get(t.id) ?? null) : null,
      error: needsAssignError && assignError?.taskId === t.id ? CHOOSE_HELPER : null,
    }));

    const weeks = weekGroups(eventTasks, today, needsYouIds);
    const days = (list: Task[]) => byDay(list).map((d) => ({ label: formatDayNb(d.date), tasks: d.tasks.map(row) }));
    const groupCounts = TASK_GROUPS.map((g) => ({
      label: g.label.toLowerCase(),
      count: eventTasks.filter((t) => groupOf(t) === g.key).length,
      className: g.pill,
    })).filter((g) => g.count > 0);

    const helperErrors = Object.keys(helperForm?.errors ?? {}).length > 0;
    const helpers = eventHelpers.map((h) => {
      const own = eventTasks.filter((t) => t.helperId === h.id && t.status !== 'done');
      const urgentCount = own.filter((t) => urgentIds.has(t.id)).length;
      const name = displayName(h);
      return {
        id: h.id,
        name,
        initial: name.charAt(0).toUpperCase(),
        summary: [
          own.length === 0 ? 'Ingen oppgaver nå' : countText(own.length, 'oppgave', 'oppgaver'),
          ...(urgentCount > 0 ? [`${urgentCount} haster`] : []),
        ].join(' · '),
        link: absoluteUrl(config.appBaseUrl, paths.helperPage(h.linkToken)),
      };
    });

    const reply = (r: Reply) => ({
      helperName: r.helperName,
      taskTitle: r.taskTitle,
      actionLabel: ACTION_LABELS[r.action],
      body: r.body,
      time: formatDateTimeNb(r.createdAt),
      isNew: r.isNew,
    });

    res.status(status).render('event', {
      event,
      allEvents,
      today,
      daysText: daysToEventText(summary.daysToEvent),
      needsYou,
      attentionText: attentionText(summary),
      progress: {
        done: summary.done,
        total: summary.total,
        groupCounts,
        thisWeek: days(weeks.thisWeek),
        nextWeek: days(weeks.nextWeek),
      },
      helpers,
      helperOptions: eventHelpers.map((h) => ({ id: h.id, name: displayName(h) })),
      maxHelpers: MAX_HELPERS_PER_EVENT,
      helpersOpen: helpers.length === 0 || helperErrors,
      helperForm: helperForm ?? { values: {}, errors: {} },
      messages: {
        // On the panel page the header counts the replies that were new when listed (they are now marked seen).
        newRepliesText: newRepliesText(replies ? replies.filter((r) => r.isNew).length : newReplies),
        all: replies?.map(reply) ?? null,
        preview: recent.preview.map(reply),
      },
      taskCount: countText(eventTasks.length, 'oppgave', 'oppgaver'),
      doneCount: summary.done,
      taskGroups: TASK_GROUPS.map((g) => ({
        label: g.label,
        tasks: eventTasks.filter((t) => groupOf(t) === g.key).map(row),
      })).filter((g) => g.tasks.length > 0),
      tasksOpen: editBox !== undefined || eventTasks.length === 0,
      editBox,
      add: add ?? { values: {}, errors: {} },
    });
  }

  router.get(paths.newEvent(), (_req, res) => {
    res.render('event-new', {
      templates: templateOptions,
      values: {},
      errors: {},
      today: clock.today(),
    });
  });

  router.post(paths.events(), async (req, res) => {
    const values: Record<string, string> = {};
    for (const key of Object.keys(eventSchema.shape)) values[key] = text(req.body?.[key]);
    const rerender = (errors: Errors) =>
      res.status(422).render('event-new', { templates: templateOptions, values, errors, today: clock.today() });

    const parsed = eventSchema.safeParse(values);
    if (!parsed.success) return rerender(fieldErrors(parsed.error));
    try {
      // No AI provider until Story 2.2, and the Simulate AI failure toggle comes with Story 4.2.
      const { eventId, notice } = await createEvent(db, clock, templates, organizerOf(res).id, parsed.data, {
        testMode: config.testMode,
        forceFailure: false,
      });
      setFlash(req, ['Arrangementet er opprettet.', notice].filter(Boolean).join('\n'));
      res.redirect(paths.event(eventId));
    } catch (err) {
      const field = fieldOf(err);
      if (field && err instanceof DomainError) return rerender({ [field]: err.message });
      throw err;
    }
  });

  router.get(paths.event(':eventId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    // D2: ?endre names the task whose edit box is open; anything else, or another event's task, opens none.
    const endre = idSchema.safeParse(req.query.endre);
    const editTaskId = endre.success ? endre.data : undefined;
    if (req.query.panel !== 'messages') return renderEvent(res, eventId, { editTaskId });
    // AD-15: the one organizer GET that writes. Another organizer's event is not_found and marks nothing.
    const replies = await listAndMarkSeen(db, organizerOf(res).id, eventId, clock.now());
    await renderEvent(res, eventId, { replies, editTaskId });
  });

  router.post(paths.tasks(':eventId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    const values = { title: text(req.body?.title), deadline: text(req.body?.deadline) };
    const parsed = taskSchema.safeParse(values);
    if (!parsed.success) return renderEvent(res, eventId, { add: { values, errors: fieldErrors(parsed.error) } }, 422);
    try {
      await addTask(db, clock, organizerOf(res).id, eventId, parsed.data);
      setFlash(req, 'Oppgaven er lagt til.');
      res.redirect(paths.event(eventId));
    } catch (err) {
      const field = fieldOf(err);
      if (field && err instanceof DomainError) {
        return renderEvent(res, eventId, { add: { values, errors: { [field]: err.message } } }, 422);
      }
      throw err;
    }
  });

  router.post(paths.task(':eventId', ':taskId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    const taskId = idParam(req, 'taskId');
    const values = { title: text(req.body?.title), deadline: text(req.body?.deadline) };
    const parsed = taskSchema.safeParse(values);
    if (!parsed.success) {
      // Check the task first, so a task outside this event is a 404, not a form error.
      await getTask(db, organizerOf(res).id, eventId, taskId);
      return renderEvent(res, eventId, { edit: { taskId, values, errors: fieldErrors(parsed.error) } }, 422);
    }
    try {
      await updateTask(db, clock, organizerOf(res).id, eventId, taskId, parsed.data);
      setFlash(req, 'Oppgaven er lagret.');
      res.redirect(paths.event(eventId));
    } catch (err) {
      const field = fieldOf(err);
      if (field && err instanceof DomainError) {
        return renderEvent(res, eventId, { edit: { taskId, values, errors: { [field]: err.message } } }, 422);
      }
      throw err;
    }
  });

  router.post(paths.deleteTask(':eventId', ':taskId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    await deleteTask(db, organizerOf(res).id, eventId, idParam(req, 'taskId'));
    setFlash(req, 'Oppgaven er slettet.');
    res.redirect(paths.event(eventId));
  });

  router.post(paths.helpers(':eventId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    const values = { email: text(req.body?.email), name: text(req.body?.name) };
    const parsed = helperSchema.safeParse(values);
    if (!parsed.success) {
      return renderEvent(res, eventId, { helperForm: { values, errors: fieldErrors(parsed.error) } }, 422);
    }
    try {
      const helper = await addHelperToEvent(db, clock, organizerOf(res).id, eventId, parsed.data);
      setFlash(req, `${displayName(helper)} er lagt til som hjelper.`);
    } catch (err) {
      if (!(err instanceof DomainError) || err.code === 'not_found') throw err;
      setFlash(req, err.message);
    }
    res.redirect(paths.event(eventId));
  });

  router.post(paths.assignTask(':eventId', ':taskId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    const organizerId = organizerOf(res).id;
    const task = await getTask(db, organizerId, eventId, idParam(req, 'taskId'));
    // D7: no helper chosen is a form error under that select, not a 404.
    if (req.body?.helperId === undefined || req.body.helperId === '') {
      const from = req.body?.fra === 'trenger' ? 'needs' : 'edit';
      return renderEvent(res, eventId, { assignError: { taskId: task.id, from } }, 422);
    }
    const parsedHelper = idSchema.safeParse(req.body.helperId);
    if (!parsedHelper.success) throw new DomainError('not_found');
    // Another organizer's helper is a 404; her own helper outside this event is refused by the rules.
    const helper = await getHelper(db, organizerId, parsedHelper.data);
    const action = task.status === 'unassigned' ? 'assign' : 'reassign';
    try {
      const result = await apply(
        db,
        { kind: 'organizer', organizerId },
        task.id,
        { action, helperId: helper.id },
        clock.now(),
      );
      setFlash(
        req,
        result === 'noop'
          ? `Oppgaven er allerede tildelt ${displayName(helper)}.`
          : `Oppgaven er tildelt ${displayName(helper)}.`,
      );
    } catch (err) {
      if (!(err instanceof DomainError) || err.code === 'not_found') throw err;
      setFlash(req, err.message);
    }
    res.redirect(paths.event(eventId));
  });

  // FR-16: the organizer marks a task Done herself, from any status. No message is written.
  router.post(paths.markDone(':eventId', ':taskId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    const organizerId = organizerOf(res).id;
    const task = await getTask(db, organizerId, eventId, idParam(req, 'taskId'));
    const result = await apply(db, { kind: 'organizer', organizerId }, task.id, { action: 'markDone' }, clock.now());
    setFlash(req, result === 'noop' ? 'Oppgaven er allerede ferdig.' : 'Oppgaven er markert som ferdig.');
    res.redirect(paths.event(eventId));
  });

  return router;
}
