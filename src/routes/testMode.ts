import { Router } from 'express';
import type { Clock } from '../clock.ts';
import type { Config } from '../config.ts';
import type { Db } from '../db/client.ts';
import type { OutboxEmail } from '../db/schema.ts';
import { formatDateTimeNb } from '../domain/dates.ts';
import { send } from '../mail/index.ts';
import { listOutbox } from '../mail/outbox.ts';
import { run } from '../services/reminders.ts';
import { organizerOf, requireLogin, setFlash } from './middleware.ts';
import { paths } from './paths.ts';

// FR-24, FR-26, AD-9, AD-10: the test inbox and «Send påminnelser nå». app.ts mounts these routes
// only when TEST_MODE is on, so with test mode off they do not exist (404).

/** The flash after a reminder run, counting only the organizer's own reminders (D3). */
export function remindersSentText(count: number): string {
  if (count === 0) return 'Ingen påminnelser har forfalt.';
  return count === 1 ? '1 påminnelse er sendt.' : `${count} påminnelser er sendt.`;
}

/**
 * One email as the test inbox shows it. A text line that is one of the email's links is shown as
 * that link, so each link appears once; links missing from the text are listed below it.
 */
function inboxCard(email: OutboxEmail) {
  const lines = email.text.split('\n').map((line) => ({ text: line, isLink: email.links.includes(line) }));
  const inText = new Set(lines.filter((l) => l.isLink).map((l) => l.text));
  return {
    ...email,
    sentAtText: formatDateTimeNb(email.createdAt),
    lines,
    extraLinks: email.links.filter((link) => !inText.has(link)),
  };
}

export function testModeRoutes(db: Db, clock: Clock, config: Config): Router {
  const router = Router();

  router.get(paths.testInbox(), requireLogin(db), async (_req, res) => {
    const emails = await listOutbox(db, organizerOf(res).id);
    res.render('test-inbox', { emails: emails.map(inboxCard) });
  });

  // D3: runs the whole check, the same as the cron route in Story 3.2 will.
  router.post(paths.runReminders(), requireLogin(db), async (req, res) => {
    const organizerId = organizerOf(res).id;
    const sent = await run({ db, config, send }, clock.now(), clock.today());
    setFlash(req, remindersSentText(sent.filter((s) => s.organizerId === organizerId).length));
    res.redirect(paths.testInbox());
  });

  return router;
}
