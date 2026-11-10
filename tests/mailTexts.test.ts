import { describe, expect, it } from 'vitest';
import { reminderEmail } from '../src/mail/texts.ts';
import { absoluteUrl, paths } from '../src/routes/paths.ts';

// FR-18, NFR-7, AD-9 (story 3.1): the reminder uses one fixed, respectful and direct Norwegian text
// (decision D1). The expected text is written out in full here, from D1, instead of a recorded
// snapshot: a snapshot would be recorded from the code itself, so it could not be written first.

const LINK = absoluteUrl('http://localhost:3000', paths.helperReminder('abc123'));

const input = {
  organizerName: 'Kari',
  helperName: 'Ola' as string | null,
  eventName: 'Bryllup',
  taskTitle: 'Bestille kake',
  deadline: '2026-11-23',
  link: LINK,
};

describe('the reminder link', () => {
  it('opens the helper page with only his Accepted tasks', () => {
    expect(paths.helperReminder('abc123')).toBe('/h/abc123?view=accepted');
    expect(LINK).toBe('http://localhost:3000/h/abc123?view=accepted');
  });
});

describe('reminderEmail', () => {
  it('has the fixed subject and text from D1, with the date in Norwegian', () => {
    const email = reminderEmail(input);
    expect(email.subject).toBe('Påminnelse om oppgaven fra Kari');
    expect(email.text).toBe(
      [
        'Hei Ola,',
        '',
        'Du har sagt ja til å ta deg av «Bestille kake» for Bryllup, med frist 23. november 2026.',
        '',
        'Når oppgaven er gjort, eller hvis den ikke lar seg gjøre, kan du gi beskjed her:',
        'http://localhost:3000/h/abc123?view=accepted',
        '',
        'Hilsen Kari, via MasterPlan',
      ].join('\n'),
    );
  });

  it('greets a helper with no name without a name', () => {
    const email = reminderEmail({ ...input, helperName: null });
    expect(email.text.startsWith('Hei,\n\n')).toBe(true);
  });

  it('names only the one task it covers', () => {
    const email = reminderEmail({ ...input, taskTitle: 'Planlegge bordplassering', deadline: '2027-01-05' });
    expect(email.text).toContain('«Planlegge bordplassering»');
    expect(email.text).toContain('5. januar 2027');
    expect(email.text).not.toContain('Bestille kake');
  });

  it('keeps a respectful tone: no exclamation marks, no humour markers', () => {
    const { subject, text } = reminderEmail(input);
    for (const part of [subject, text]) {
      expect(part).not.toContain('!');
      expect(part).not.toMatch(/😀|😉|haha|husk nå/i);
    }
  });
});
