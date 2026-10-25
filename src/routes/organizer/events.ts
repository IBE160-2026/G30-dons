import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Clock } from '../../clock.ts';
import type { Config } from '../../config.ts';
import type { Db } from '../../db/client.ts';
import type { MessageAction, Task, TaskStatus } from '../../db/schema.ts';
import { formatDateTimeNb } from '../../domain/dates.ts';
import { DomainError, errorText, type ErrorCode } from '../../domain/errors.ts';
import { MAX_TITLE_LENGTH } from '../../domain/plan.ts';
import { createEvent, getEvent, listEvents } from '../../services/events.ts';
import { listAndMarkSeen, type Reply } from '../../services/messages.ts';
import { loadEventSummary } from '../../services/summaries.ts';
import {
  addHelperToEvent,
  displayName,
  getHelper,
  listForEvent as listHelpersForEvent,
  MAX_HELPERS_PER_EVENT,
} from '../../services/helpers.ts';
import { addTask, apply, deleteTask, getTask, listForEvent, updateTask } from '../../services/tasks.ts';
import type { Templates } from '../../templates/index.ts';
import { organizerOf, requireLogin, setFlash } from '../middleware.ts';
import { absoluteUrl, paths } from '../paths.ts';
import { daysToEventText, newRepliesText, todoText } from './summaryText.ts';

// FR-3, FR-4, FR-7: create events from templates and edit their tasks.
// FR-8 to FR-11: add helpers, assign tasks and show each helper's link.
// FR-20: the four panels (Done, To do, Timeline, Messages); AD-15: ?panel=messages marks the listed replies seen.

const STATUS_LABELS = {
  unassigned: 'Ikke tildelt',
  open: 'Venter på svar',
  accepted: 'Akseptert',
  declined: 'Avslått',
  done: 'Ferdig',
  cant_do: 'Kan ikke gjøres',
} as const satisfies Record<TaskStatus, string>;

const ACTION_LABELS = {
  yes: 'Sa ja',
  no: 'Sa nei',
  done: 'Ferdig',
  cantDo: 'Kan ikke gjøres',
} as const satisfies Record<MessageAction, string>;

const optionalText = (max: number, message: string) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max, message).optional());

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
const idSchema = z.string().regex(/^[1-9]\d*$/).transform(Number);

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
    const [allEvents, eventTasks, eventHelpers, { summary, newReplies }] = await Promise.all([
      listEvents(db, organizer.id),
      listForEvent(db, organizer.id, eventId),
      listHelpersForEvent(db, organizer.id, eventId),
      loadEventSummary(db, organizer.id, eventId, today),
    ]);
    const helpers = eventHelpers.map((h) => ({
      id: h.id,
      name: displayName(h),
      link: absoluteUrl(config.appBaseUrl, paths.helperPage(h.linkToken)),
    }));
    const helperNames: Record<number, string> = Object.fromEntries(helpers.map((h) => [h.id, h.name]));
    const listed = (t: Task) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      statusLabel: STATUS_LABELS[t.status],
      helperName: t.helperId !== null ? (helperNames[t.helperId] ?? null) : null,
    });
    const { replies, ...formState } = state;
    const panels = {
      done: summary.done,
      total: summary.total,
      todoText: todoText(summary),
      todoOpen: summary.urgent.length + summary.needsHelper.length > 0,
      urgent: summary.urgent.map(listed),
      needsHelper: summary.needsHelper.map(listed),
      timelineText: daysToEventText(summary.daysToEvent),
      nextDeadline: summary.nextDeadline,
      newReplies,
      // On the panel page the header counts the replies that were new when listed (they are now marked seen).
      newRepliesText: newRepliesText(replies ? replies.filter((r) => r.isNew).length : newReplies),
      replies:
        replies?.map((r) => ({
          helperName: r.helperName,
          taskTitle: r.taskTitle,
          actionLabel: ACTION_LABELS[r.action],
          body: r.body,
          time: formatDateTimeNb(r.createdAt),
          isNew: r.isNew,
        })) ?? null,
    };
    res.status(status).render('event', {
      event,
      allEvents,
      tasks: eventTasks,
      helpers,
      helperNames,
      maxHelpers: MAX_HELPERS_PER_EVENT,
      statusLabels: STATUS_LABELS,
      today,
      panels,
      ...formState,
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
      const eventId = await createEvent(db, clock, templates, organizerOf(res).id, parsed.data);
      setFlash(req, 'Arrangementet er opprettet.');
      res.redirect(paths.event(eventId));
    } catch (err) {
      const field = fieldOf(err);
      if (field && err instanceof DomainError) return rerender({ [field]: err.message });
      throw err;
    }
  });

  router.get(paths.event(':eventId'), async (req, res) => {
    const eventId = idParam(req, 'eventId');
    if (req.query.panel !== 'messages') return renderEvent(res, eventId);
    // AD-15: the one organizer GET that writes. Another organizer's event is not_found and marks nothing.
    const replies = await listAndMarkSeen(db, organizerOf(res).id, eventId, clock.now());
    await renderEvent(res, eventId, { replies });
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
    const parsedHelper = idSchema.safeParse(req.body?.helperId);
    if (!parsedHelper.success) throw new DomainError('not_found');
    // Another organizer's helper is a 404; her own helper outside this event is refused by the rules.
    const helper = await getHelper(db, organizerId, parsedHelper.data);
    const action = task.status === 'unassigned' ? 'assign' : 'reassign';
    try {
      const result = await apply(db, { kind: 'organizer', organizerId }, task.id, { action, helperId: helper.id }, clock.now());
      setFlash(
        req,
        result === 'noop' ? `Oppgaven er allerede tildelt ${displayName(helper)}.` : `Oppgaven er tildelt ${displayName(helper)}.`,
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
