import { Router, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import type { Clock } from '../clock.ts';
import type { Db } from '../db/client.ts';
import type { TaskStatus } from '../db/schema.ts';
import { DomainError, errorText } from '../domain/errors.ts';
import { HELPER_ACTIONS, type HelperAction } from '../domain/taskRules.ts';
import { findByToken, helperPage } from '../services/helpers.ts';
import { applyAsHelper } from '../services/tasks.ts';
import { paths } from './paths.ts';

// FR-12 to FR-16, AD-6: the helper page. Requests are scoped only by the link token, never the
// session, and GET never writes. No requireLogin here.

export const MAX_MESSAGE_LENGTH = 500;

const HELPER_STATUS_TEXTS = {
  unassigned: '',
  open: 'Venter på svaret ditt',
  accepted: 'Du har sagt ja',
  declined: 'Du har sagt nei',
  done: 'Ferdig',
  cant_do: 'Kan ikke gjøres',
} as const satisfies Record<TaskStatus, string>;

const ACTION_LABELS = {
  yes: 'Ja',
  no: 'Nei',
  done: 'Ferdig',
  cantDo: 'Kan ikke gjøres',
} as const satisfies Record<HelperAction, string>;

const NOTICES = {
  lagret: { text: 'Takk! Svaret ditt er lagret.', error: false },
  feil: { text: errorText('helper_command_refused'), error: true },
  lang: { text: errorText('message_too_long'), error: true },
} as const;

const commandSchema = z.object({
  taskId: z.string().regex(/^[1-9]\d*$/).transform(Number),
  action: z.enum(HELPER_ACTIONS),
  // Browsers send textarea line breaks as CRLF, which maxlength counts as one character.
  message: z.string().transform((v) => v.replace(/\r\n/g, '\n').trim()).pipe(z.string().max(MAX_MESSAGE_LENGTH)).optional(),
});

/** "A", "A og B", "A, B og C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} og ${names.at(-1)}`;
}

function noticeOf(query: Record<string, unknown>): { text: string; error: boolean } | undefined {
  if (query.lagret === '1') return NOTICES.lagret;
  if (query.feil === '1') return NOTICES.feil;
  if (query.feil === 'lang') return NOTICES.lang;
  return undefined;
}

function renderInvalid(res: Response): void {
  res.status(404).render('helper-invalid');
}

/**
 * AD-6: headers for every /h/ response, the invalid-link page, redirects and body-parser errors
 * included. app.ts mounts it on /h before the body parser.
 */
export const helperHeaders: RequestHandler = (_req, res, next) => {
  res.set('X-Robots-Tag', 'noindex');
  res.set('Referrer-Policy', 'no-referrer');
  next();
};

export function helperRoutes(db: Db, clock: Clock): Router {
  const router = Router();

  router.get(paths.helperPage(':token'), async (req, res) => {
    const page = await helperPage(db, req.params.token as string);
    if (!page) return renderInvalid(res);
    res.render('helper', {
      page,
      header:
        page.eventNames.length > 0
          ? `${page.organizerName} har invitert deg til å organisere ${joinNames(page.eventNames)}`
          : `${page.organizerName} har invitert deg som hjelper`,
      notice: noticeOf(req.query as Record<string, unknown>),
      statusTexts: HELPER_STATUS_TEXTS,
      actionLabels: ACTION_LABELS,
      maxMessageLength: MAX_MESSAGE_LENGTH,
    });
  });

  router.post(paths.helperTask(':token', ':taskId'), async (req, res) => {
    const token = req.params.token as string;
    const parsed = commandSchema.safeParse({
      taskId: req.params.taskId,
      action: req.body?.action,
      message: typeof req.body?.message === 'string' ? req.body.message : undefined,
    });
    if (!parsed.success) {
      if (!(await findByToken(db, token))) return renderInvalid(res);
      const tooLong = parsed.error.issues.some((i) => i.path[0] === 'message');
      return res.redirect(paths.helperNotice(token, tooLong ? 'lang' : 'feil'));
    }

    const { taskId, action, message } = parsed.data;
    try {
      const result = await applyAsHelper(db, token, taskId, { action, message }, clock.now());
      if (result === 'invalidLink') return renderInvalid(res);
      res.redirect(paths.helperNotice(token, 'lagret'));
    } catch (err) {
      // Not his task, a task that does not exist, or a move that is no longer allowed.
      if (!(err instanceof DomainError)) throw err;
      res.redirect(paths.helperNotice(token, 'feil'));
    }
  });

  // Anything else under /h/ is an invalid link too, and reveals nothing.
  router.use('/h', (_req, res) => renderInvalid(res));

  return router;
}
