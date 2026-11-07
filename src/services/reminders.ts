import { asc, eq } from 'drizzle-orm';
import type { Config } from '../config.ts';
import type { Db } from '../db/client.ts';
import { events, helpers, organizers, remindersSent, tasks } from '../db/schema.ts';
import { isReminderDue } from '../domain/reminderDue.ts';
import type { send as sendMail } from '../mail/index.ts';
import { reminderEmail } from '../mail/texts.ts';
import { absoluteUrl, paths } from '../routes/paths.ts';

// FR-17, FR-18, AD-7: the reminder check. Due reminders are computed when it runs. Each one is
// claimed in reminders_sent (unique per task and yes) before the email is sent, and the claim is
// released if sending fails, so each yes gets at most one reminder and none is lost. The test-mode
// button calls run now; Story 3.2 adds the cron route that calls the same function.

export interface ReminderDeps {
  db: Db;
  config: Config;
  send: typeof sendMail;
}

export interface SentReminder {
  organizerId: number;
  taskId: number;
}

/** Sends every due reminder that has not been sent for the task's current yes. */
export async function run(deps: ReminderDeps, now: string, today: string): Promise<SentReminder[]> {
  const { db, config, send } = deps;
  // D4: with email disabled nothing goes out, so nothing is claimed; the reminders stay due.
  if (!config.testMode && config.mailTransport === 'disabled') {
    console.log('Påminnelser: ikke sendt, fordi MAIL_TRANSPORT=disabled.');
    return [];
  }

  const candidates = await db
    .select({
      taskId: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
      status: tasks.status,
      acceptedAt: tasks.acceptedAt,
      eventName: events.name,
      organizerId: events.organizerId,
      organizerName: organizers.name,
      helperName: helpers.name,
      helperEmail: helpers.email,
      linkToken: helpers.linkToken,
    })
    .from(tasks)
    .innerJoin(events, eq(tasks.eventId, events.id))
    .innerJoin(organizers, eq(events.organizerId, organizers.id))
    .innerJoin(helpers, eq(tasks.helperId, helpers.id))
    .where(eq(tasks.status, 'accepted'))
    .orderBy(asc(tasks.id));

  const sent: SentReminder[] = [];
  let failed = 0;
  for (const task of candidates) {
    if (task.acceptedAt === null || !isReminderDue(task, today)) continue;

    const [claim] = await db
      .insert(remindersSent)
      .values({ taskId: task.taskId, acceptedAt: task.acceptedAt, sentAt: now })
      .onConflictDoNothing()
      .returning({ id: remindersSent.id });
    // Already sent for this yes.
    if (!claim) continue;

    const link = absoluteUrl(config.appBaseUrl, paths.helperReminder(task.linkToken));
    const { subject, text } = reminderEmail({
      organizerName: task.organizerName,
      helperName: task.helperName,
      eventName: task.eventName,
      taskTitle: task.title,
      deadline: task.deadline,
      link,
    });
    try {
      await send(
        db,
        config,
        { organizerId: task.organizerId, to: task.helperEmail, subject, text, links: [link], kind: 'reminder' },
        now,
      );
      sent.push({ organizerId: task.organizerId, taskId: task.taskId });
    } catch (err) {
      // Release the claim so the next run retries this reminder.
      await db.delete(remindersSent).where(eq(remindersSent.id, claim.id));
      failed += 1;
      console.error(`Påminnelse for oppgave ${task.taskId} feilet:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Påminnelser: ${sent.length} sendt, ${failed} feilet.`);
  return sent;
}
