import { formatDateNb } from '../domain/dates.ts';

// AD-9, NFR-7: every email text in one place. Fixed Norwegian text, respectful and direct, the way a
// good manager speaks to a team member: no humour, no guilt (decision D1 in spec 3.1).

export interface ReminderTextInput {
  organizerName: string;
  /** null: the helper has no name, and the greeting is just «Hei,». */
  helperName: string | null;
  eventName: string;
  taskTitle: string;
  /** YYYY-MM-DD */
  deadline: string;
  /** Absolute reminder link (`paths.helperReminder`). */
  link: string;
}

export interface EmailText {
  subject: string;
  text: string;
}

/** FR-18: one reminder covers one task and carries the reminder link. */
export function reminderEmail(input: ReminderTextInput): EmailText {
  return {
    subject: `Påminnelse om oppgaven fra ${input.organizerName}`,
    text: [
      input.helperName ? `Hei ${input.helperName},` : 'Hei,',
      '',
      `Du har sagt ja til å ta deg av «${input.taskTitle}» for ${input.eventName}, med frist ${formatDateNb(input.deadline)}.`,
      '',
      'Når oppgaven er gjort, eller hvis den ikke lar seg gjøre, kan du gi beskjed her:',
      input.link,
      '',
      `Hilsen ${input.organizerName}, via MasterPlan`,
    ].join('\n'),
  };
}
