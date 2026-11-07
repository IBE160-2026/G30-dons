import { eq } from 'drizzle-orm';
import type { Config } from '../config.ts';
import type { Db } from '../db/client.ts';
import { type MailKind, organizers } from '../db/schema.ts';
import { insertOutbox } from './outbox.ts';

// AD-9: the only way to send email. In test mode the email goes to the test inbox and never
// leaves the machine. With test mode off, MAIL_TRANSPORT decides; Story 3.2 adds Gmail.

export interface MailMessage {
  organizerId: number;
  to: string;
  subject: string;
  text: string;
  links: string[];
  kind: MailKind;
}

export class MailError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MailError';
  }
}

/** Sends one email on the organizer's behalf. Throws MailError when it cannot be sent or stored. */
export async function send(db: Db, config: Config, message: MailMessage, now: string): Promise<void> {
  const [organizer] = await db
    .select({ name: organizers.name, email: organizers.email })
    .from(organizers)
    .where(eq(organizers.id, message.organizerId));
  if (!organizer) throw new MailError(`Fant ikke arrangør ${message.organizerId}`);

  if (!config.testMode) {
    // MAIL_TRANSPORT=disabled (fallback D): nothing is sent.
    console.log(`E-post ikke sendt (MAIL_TRANSPORT=${config.mailTransport}): ${message.kind}`);
    return;
  }

  try {
    await insertOutbox(db, {
      organizerId: message.organizerId,
      to: message.to,
      fromName: `MasterPlan på vegne av ${organizer.name}`,
      replyTo: organizer.email,
      subject: message.subject,
      text: message.text,
      links: message.links,
      kind: message.kind,
      createdAt: now,
    });
  } catch (err) {
    throw new MailError('Kunne ikke lagre e-posten i testinnboksen', { cause: err });
  }
}
