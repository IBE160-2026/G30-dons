import { mkdirSync } from 'node:fs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { send } from '../src/mail/index.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';
import { type Agent, acceptedScenario, registerOrganizer, setTiming } from './reminderScenario.ts';

// FR-24, FR-26, AD-9 (story 3.1, decisions D2 and D3): the test inbox at /test/innboks and the
// «Send påminnelser nå» button. The app clock is fixed at 2026-11-01; a yes on 2026-10-01 makes a
// reminder due today.

let ctx: TestContext;

const DUE_YES = '2026-10-01T10:00:00.000Z';

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  ctx.close();
});

/** Kari (or another organizer) with `due` tasks whose reminders are due today. */
async function withDueReminders(due: number, organizer?: { name: string; email: string }, helperEmail?: string) {
  const scenario = await acceptedScenario(ctx, {
    accepted: due,
    ...(organizer ? { organizer } : {}),
    ...(helperEmail ? { helper: { name: 'Lars', email: helperEmail } } : {}),
  });
  for (const task of scenario.accepted) await setTiming(ctx, task.id, { acceptedAt: DUE_YES });
  return scenario;
}

async function pressSendReminders(agent: Agent) {
  const res = await agent.post('/test/paminnelser').type('form').send({});
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe('/test/innboks');
  return agent.get('/test/innboks');
}

describe('access', () => {
  it('redirects to login without a session', async () => {
    const res = await request(ctx.app).get('/test/innboks');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/logg-inn');
    const post = await request(ctx.app).post('/test/paminnelser').type('form').send({});
    expect(post.status).toBe(302);
    expect(post.headers.location).toBe('/logg-inn');
  });

  it('does not exist with test mode off: the page, the button route and the header link', async () => {
    ctx.close();
    ctx = await setupTestApp({
      TEST_MODE: 'false',
      SESSION_SECRET: 'a-random-secret-that-is-long-enough-1234',
      APP_BASE_URL: 'https://masterplan.example.no',
      MAIL_TRANSPORT: 'disabled',
    });
    expect((await request(ctx.app).get('/test/innboks')).status).toBe(404);
    expect((await request(ctx.app).post('/test/paminnelser').type('form').send({})).status).toBe(404);
    const login = await request(ctx.app).get('/logg-inn');
    expect(login.text).not.toContain('Testinnboks');
  });

  it('shows the «Testinnboks» link in the header for a logged-in organizer in test mode', async () => {
    const kari = await registerOrganizer(ctx, 'Kari', 'kari@example.no');
    const overview = await kari.get('/');
    expect(overview.text).toContain('href="/test/innboks"');
    expect(overview.text).toContain('Testinnboks');
  });
});

describe('the test inbox page', () => {
  it('shows the button and an empty state when there are no emails', async () => {
    const kari = await registerOrganizer(ctx, 'Kari', 'kari@example.no');
    const res = await kari.get('/test/innboks');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<h1>Testinnboks</h1>');
    expect(res.text).toContain('Ingen e-post forlater maskinen.');
    expect(res.text).toMatch(/<form method="post" action="\/test\/paminnelser"[^>]*>/);
    expect(res.text).toContain('Send påminnelser nå');
    expect(res.text).toContain('Ingen e-poster ennå.');
  });

  it('lists recipient, time, subject, text and the link as a real link', async () => {
    const { agent, helper } = await withDueReminders(1);
    const res = await pressSendReminders(agent);
    expect(res.text).toContain('ola@example.no');
    expect(res.text).toContain('1. november 2026 kl. 11:00');
    expect(res.text).toContain('Påminnelse om oppgaven fra Kari');
    expect(res.text).toContain('Hei Ola,');
    expect(res.text).toContain(`href="http://localhost:3000/h/${helper.linkToken}?view=accepted"`);
    expect(res.text).not.toContain('Ingen e-poster ennå.');
  });

  it('lists the newest email first', async () => {
    const { agent, organizerId } = await withDueReminders(0);
    const message = (subject: string) => ({
      organizerId,
      to: 'ola@example.no',
      subject,
      text: 'Tekst',
      links: [],
      kind: 'reminder' as const,
    });
    await send(ctx.db, ctx.config, message('Eldste e-post'), '2026-10-30T10:00:00.000Z');
    await send(ctx.db, ctx.config, message('Nyeste e-post'), '2026-10-31T10:00:00.000Z');
    const res = await agent.get('/test/innboks');
    expect(res.text.indexOf('Nyeste e-post')).toBeGreaterThan(-1);
    expect(res.text.indexOf('Nyeste e-post')).toBeLessThan(res.text.indexOf('Eldste e-post'));
  });
});

describe('«Send påminnelser nå»', () => {
  it('says so when no reminders are due', async () => {
    const kari = await registerOrganizer(ctx, 'Kari', 'kari@example.no');
    const res = await pressSendReminders(kari);
    expect(res.text).toContain('Ingen påminnelser har forfalt.');
  });

  it('uses the singular for one reminder', async () => {
    const { agent } = await withDueReminders(1);
    const res = await pressSendReminders(agent);
    expect(res.text).toContain('1 påminnelse er sendt.');
  });

  it('uses the plural for several, and a second press sends none', async () => {
    const { agent } = await withDueReminders(2);
    expect((await pressSendReminders(agent)).text).toContain('2 påminnelser er sendt.');
    expect((await pressSendReminders(agent)).text).toContain('Ingen påminnelser har forfalt.');
  });

  it('runs the whole check, but counts and shows only the organizer’s own reminders (D3)', async () => {
    const kari = await withDueReminders(1);
    const eva = await withDueReminders(2, { name: 'Eva', email: 'eva@example.no' }, 'lars@example.no');

    const kariInbox = await pressSendReminders(kari.agent);
    expect(kariInbox.text).toContain('1 påminnelse er sendt.');
    expect(kariInbox.text).toContain('ola@example.no');
    expect(kariInbox.text).not.toContain('lars@example.no');
    expect(kariInbox.text).not.toContain('Eva');

    // Kari's press also sent Eva's reminders, into Eva's own inbox.
    const evaInbox = await eva.agent.get('/test/innboks');
    expect(evaInbox.text.match(/Påminnelse om oppgaven fra Eva/g)).toHaveLength(2);
    expect(evaInbox.text).not.toContain('ola@example.no');
  });
});
