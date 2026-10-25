import { mkdirSync, readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eventHelpers, events, helpers, messages, organizers, tasks } from '../src/db/schema.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { FIXED_NOW, setupTestApp, type TestContext } from './helpers.ts';

// FR-12 to FR-16 (story 1.4): Ola answers on his phone; the organizer marks Done and edits.
let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp({ APP_BASE_URL: 'https://masterplan.example.no' });
});

afterEach(() => {
  ctx.close();
});

async function loggedIn(email = 'kari@example.no', name = 'Kari') {
  const agent = request.agent(ctx.app);
  await agent.post('/registrer').type('form').send({ name, email, password: 'hemmelig123' });
  return agent;
}

type Agent = Awaited<ReturnType<typeof loggedIn>>;

async function createEvent(agent: Agent, templateKey: string, eventDate: string) {
  const res = await agent.post('/events').type('form').send({ templateKey, eventDate });
  const match = /^\/events\/(\d+)$/.exec(res.headers.location ?? '');
  if (!match) throw new Error('event not created');
  return Number(match[1]);
}

const addHelper = (agent: Agent, eventId: number, body: Record<string, string>) =>
  agent.post(`/events/${eventId}/helpers`).type('form').send(body);

const assign = (agent: Agent, eventId: number, taskId: number, helperId: number) =>
  agent
    .post(`/events/${eventId}/tasks/${taskId}/assign`)
    .type('form')
    .send({ helperId: String(helperId) });

const eventTasks = (eventId: number) => ctx.db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(tasks.id);
const taskById = async (id: number) => (await ctx.db.select().from(tasks).where(eq(tasks.id, id)))[0]!;
const helperByEmail = async (email: string) =>
  (await ctx.db.select().from(helpers).where(eq(helpers.email, email)))[0]!;
const allMessages = () => ctx.db.select().from(messages).orderBy(messages.id);

async function snapshot() {
  return {
    organizers: await ctx.db.select().from(organizers),
    events: await ctx.db.select().from(events),
    tasks: await ctx.db.select().from(tasks).orderBy(tasks.id),
    helpers: await ctx.db.select().from(helpers),
    eventHelpers: await ctx.db.select().from(eventHelpers),
    messages: await allMessages(),
  };
}

/** Kari with Bryllup (earlier) and Utdrikningslag, Ola and Kim on both, and one task assigned to Ola in each. */
async function scenario() {
  const kari = await loggedIn();
  const bryllup = await createEvent(kari, 'wedding', '2027-03-01');
  const utdrikning = await createEvent(kari, 'bachelorette', '2027-05-01');
  for (const eventId of [bryllup, utdrikning]) {
    await addHelper(kari, eventId, { email: 'ola@example.no', name: 'Ola' });
    await addHelper(kari, eventId, { email: 'kim@example.no', name: 'Kim' });
  }
  const ola = await helperByEmail('ola@example.no');
  const kim = await helperByEmail('kim@example.no');
  const [b1, b2, b3] = await eventTasks(bryllup);
  const [u1] = await eventTasks(utdrikning);
  await assign(kari, bryllup, b1!.id, ola.id);
  await assign(kari, utdrikning, u1!.id, ola.id);
  return { kari, bryllup, utdrikning, ola, kim, task: b1!, otherTask: u1!, b2: b2!, b3: b3! };
}

const helperPost = (token: string, taskId: number | string, body: Record<string, string>) =>
  request(ctx.app).post(`/h/${token}/tasks/${taskId}`).type('form').send(body);

const SAVED = 'Takk! Svaret ditt er lagret.';
const REFUSED = 'Oppgaven er endret siden du åpnet siden. Se oppdatert status under.';

function expectHelperHeaders(res: request.Response) {
  expect(res.headers['x-robots-tag']).toBe('noindex');
  expect(res.headers['referrer-policy']).toBe('no-referrer');
}

function expectGenericHead(html: string) {
  expect(html).toContain('<title>MasterPlan</title>');
  expect(html).toContain('<meta property="og:title" content="MasterPlan">');
  expect(html).toContain('<meta property="og:description" content="Du er invitert til å hjelpe til.">');
  expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  const head = html.slice(0, html.indexOf('</head>'));
  for (const word of ['Kari', 'Ola', 'Bryllup', 'Utdrikningslag']) expect(head).not.toContain(word);
}

describe('opening the helper page', () => {
  it('shows a header and only his non-Unassigned tasks, grouped by event and sorted by deadline', async () => {
    const { kari, bryllup, ola, kim, task, otherTask, b2, b3 } = await scenario();
    // A second Bryllup task with an earlier deadline, a task reassigned away and an Unassigned one.
    await ctx.db.update(tasks).set({ deadline: '2026-11-20' }).where(eq(tasks.id, b3.id));
    await ctx.db.update(tasks).set({ deadline: '2027-02-01' }).where(eq(tasks.id, task.id));
    await assign(kari, bryllup, b3.id, ola.id);
    await assign(kari, bryllup, b2.id, ola.id);
    await assign(kari, bryllup, b2.id, kim.id);

    const res = await request(ctx.app).get(`/h/${ola.linkToken}`);
    expect(res.status).toBe(200);
    expectHelperHeaders(res);
    expectGenericHead(res.text);
    expect(res.text).toContain('Kari har invitert deg til å organisere Bryllup og Utdrikningslag');
    expect(res.text).not.toContain('Logg ut');
    expect(res.text).not.toContain('site-header');

    const ids = [...res.text.matchAll(/action="\/h\/[^/]+\/tasks\/(\d+)"/g)].map((m) => Number(m[1]));
    expect(ids).toEqual([b3.id, task.id, otherTask.id]);
    expect(res.text.indexOf('<h2>Bryllup')).toBeLessThan(res.text.indexOf('<h2>Utdrikningslag'));
    expect(res.text).not.toContain(b2.title);
    const unassignedTitle = (await eventTasks(bryllup)).find((t) => t.status === 'unassigned')!.title;
    expect(res.text).not.toContain(`<strong>${unassignedTitle}</strong>`);
    expect(res.text).toContain(`Kari vil at du skal <strong>${task.title}</strong> innen`);
    expect(res.text).toContain('Venter på svaret ditt');
    expect(res.text).toContain('value="yes"');
    expect(res.text).toContain('value="no"');
    expect(res.text).toContain('maxlength="500"');
  });

  it('has no script tags and declares no fixed width above 360 px in the helper styles', async () => {
    const { ola } = await scenario();
    const res = await request(ctx.app).get(`/h/${ola.linkToken}`);
    expect(res.text).not.toMatch(/<script/i);
    expect(res.text).not.toMatch(/\son[a-z]+=/i);

    const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
    const start = css.indexOf('/* helper page');
    const end = css.indexOf('/* end helper page */');
    expect(start).toBeGreaterThan(-1);
    const helperCss = css.slice(start, end);
    for (const m of helperCss.matchAll(/(?:^|[;{\s])(width|min-width|flex-basis)\s*:\s*([\d.]+)(px|rem|em)/g)) {
      const px = Number(m[2]) * (m[3] === 'px' ? 1 : 16);
      expect(px, `${m[1]}: ${m[2]}${m[3]}`).toBeLessThanOrEqual(360);
    }
    for (const m of helperCss.matchAll(/flex\s*:\s*\d+\s+\d+\s+([\d.]+)(px|rem|em)/g)) {
      expect(Number(m[1]) * (m[2] === 'px' ? 1 : 16)).toBeLessThanOrEqual(360);
    }
    // Buttons are at least 44 px high.
    const button = /\.helper-button\s*\{[^}]*min-height:\s*(\d+)px/.exec(helperCss);
    expect(Number(button?.[1])).toBeGreaterThanOrEqual(44);
  });

  it('never writes on GET, whatever the query', async () => {
    const { ola, task } = await scenario();
    const before = await snapshot();
    for (const path of [
      `/h/${ola.linkToken}`,
      `/h/${ola.linkToken}?lagret=1`,
      `/h/${ola.linkToken}?feil=1`,
      `/h/${ola.linkToken}/tasks/${task.id}`,
    ]) {
      await request(ctx.app).get(path);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('sets no session cookie on helper responses', async () => {
    const { ola, task } = await scenario();
    const get = await request(ctx.app).get(`/h/${ola.linkToken}`);
    const post = await helperPost(ola.linkToken, task.id, { action: 'yes' });
    expect(get.headers['set-cookie']).toBeUndefined();
    expect(post.headers['set-cookie']).toBeUndefined();
  });
});

describe('the header', () => {
  it('names linked events with no tasks yet, and says there are no tasks', async () => {
    const kari = await loggedIn();
    const bryllup = await createEvent(kari, 'wedding', '2027-03-01');
    const utdrikning = await createEvent(kari, 'bachelorette', '2027-05-01');
    await addHelper(kari, utdrikning, { email: 'ola@example.no', name: 'Ola' });
    await addHelper(kari, bryllup, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const res = await request(ctx.app).get(`/h/${ola.linkToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Kari har invitert deg til å organisere Bryllup og Utdrikningslag');
    expect(res.text).toContain('Du har ingen oppgaver ennå.');
  });

  it('names both linked events when only one holds one of his tasks', async () => {
    const kari = await loggedIn();
    const bryllup = await createEvent(kari, 'wedding', '2027-03-01');
    const utdrikning = await createEvent(kari, 'bachelorette', '2027-05-01');
    await addHelper(kari, bryllup, { email: 'ola@example.no', name: 'Ola' });
    await addHelper(kari, utdrikning, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const [u1] = await eventTasks(utdrikning);
    await assign(kari, utdrikning, u1!.id, ola.id);
    const res = await request(ctx.app).get(`/h/${ola.linkToken}`);
    expect(res.text).toContain('Kari har invitert deg til å organisere Bryllup og Utdrikningslag');
    expect(res.text).not.toContain('<h2>Bryllup');
    expect(res.text).toContain('<h2>Utdrikningslag');
  });
});

describe('invalid links', () => {
  async function invalidTokens() {
    const { ola } = await scenario();
    const t = ola.linkToken;
    const changed = (t[0] === 'A' ? 'B' : 'A') + t.slice(1);
    return ['Q'.repeat(32), 'abc', changed, `${t}x`, `${t.slice(0, 31)}!`];
  }

  it('gives the generic invalid-link page with 404 for unknown and malformed tokens', async () => {
    for (const token of await invalidTokens()) {
      const res = await request(ctx.app).get(`/h/${encodeURIComponent(token)}`);
      expect(res.status, token).toBe(404);
      expectHelperHeaders(res);
      expectGenericHead(res.text);
      expect(res.text).toContain('Lenken virker ikke');
      for (const word of ['Kari', 'Ola', 'Kim', 'Bryllup', 'Utdrikningslag', 'Til oversikten'])
        expect(res.text).not.toContain(word);
    }
  });

  it('gives the invalid-link page on a POST with a bad token, and changes nothing', async () => {
    const { task } = await scenario();
    const before = await snapshot();
    const bodies: Record<string, string>[] = [
      { action: 'yes' },
      { action: 'nope' },
      { action: 'yes', message: 'x'.repeat(501) },
    ];
    for (const body of bodies) {
      const res = await helperPost('Q'.repeat(32), task.id, body);
      expect(res.status).toBe(404);
      expectHelperHeaders(res);
      expect(res.text).toContain('Lenken virker ikke');
    }
    expect(await snapshot()).toEqual(before);
  });

  it('sends the helper headers on a body-parser error (body over 50kb)', async () => {
    const { ola, task } = await scenario();
    const res = await helperPost(ola.linkToken, task.id, { action: 'yes', message: 'x'.repeat(60_000) });
    expect(res.status).toBe(413);
    expectHelperHeaders(res);
  });

  it('treats other paths under /h/ as invalid links', async () => {
    const res = await request(ctx.app).get('/h/');
    expect(res.status).toBe(404);
    expectHelperHeaders(res);
    expect(res.text).toContain('Lenken virker ikke');
  });
});

describe('answering', () => {
  it('Ja on an Open task: Accepted with accepted_at, one message with a null body', async () => {
    const { ola, task } = await scenario();
    const res = await helperPost(ola.linkToken, task.id, { action: 'yes', message: '' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/h/${ola.linkToken}?lagret=1`);
    expectHelperHeaders(res);
    expect(await taskById(task.id)).toMatchObject({ status: 'accepted', acceptedAt: FIXED_NOW, helperId: ola.id });
    expect(await allMessages()).toEqual([
      {
        id: 1,
        taskId: task.id,
        helperId: ola.id,
        action: 'yes',
        statusAfter: 'accepted',
        body: null,
        createdAt: FIXED_NOW,
        seenAt: null,
      },
    ]);
    const page = await request(ctx.app).get(res.headers.location!);
    expect(page.text).toContain(`<p class="flash" role="status">${SAVED}</p>`);
    expect(page.text).toContain('Du har sagt ja');
    expect(page.text).toContain('value="done"');
    expect(page.text).toContain('value="cantDo"');
  });

  it('Nei with a message: Declined, one message with the body, no buttons left', async () => {
    const { ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'no', message: '  Er bortreist  ' });
    expect(await taskById(task.id)).toMatchObject({ status: 'declined', acceptedAt: null });
    const rows = await allMessages();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'no', statusAfter: 'declined', body: 'Er bortreist', seenAt: null });
    const page = (await request(ctx.app).get(`/h/${ola.linkToken}`)).text;
    expect(page).toContain('Du har sagt nei');
    expect(page).not.toContain(`/tasks/${task.id}"`);
  });

  it('a repeat Ja without a message changes nothing and writes no message', async () => {
    const { ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    const before = await snapshot();
    const res = await helperPost(ola.linkToken, task.id, { action: 'yes', message: '   ' });
    expect(res.status).toBe(302);
    expect(await snapshot()).toEqual(before);
  });

  it('a repeat Ja with a message keeps the status and writes one message', async () => {
    const { ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    const before = await taskById(task.id);
    await helperPost(ola.linkToken, task.id, { action: 'yes', message: 'Kommer kl. 18' });
    expect(await taskById(task.id)).toEqual(before);
    const rows = await allMessages();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ action: 'yes', statusAfter: 'accepted', body: 'Kommer kl. 18' });
  });

  it.each([
    ['done', 'done', 'Ferdig'],
    ['cantDo', 'cant_do', 'Kan ikke gjøres'],
  ] as const)('%s on an Accepted task gives %s and one message', async (action, status, text) => {
    const { ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    await helperPost(ola.linkToken, task.id, { action, message: 'Ordnet' });
    expect(await taskById(task.id)).toMatchObject({ status, acceptedAt: FIXED_NOW });
    const rows = await allMessages();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ action, statusAfter: status, body: 'Ordnet' });
    const page = (await request(ctx.app).get(`/h/${ola.linkToken}`)).text;
    expect(page).toContain(`<p class="helper-status status-${status}">${text}</p>`);
    expect(page).not.toContain(`/tasks/${task.id}"`);
  });

  it.each([
    ['Open + done', [], 'done'],
    ['Declined + yes', ['no'], 'yes'],
    ['Accepted + no', ['yes'], 'no'],
    ['Done + cantDo', ['yes', 'done'], 'cantDo'],
  ])('refuses %s with the refused notice and changes nothing', async (_label, setup, action) => {
    const { ola, task } = await scenario();
    for (const a of setup) await helperPost(ola.linkToken, task.id, { action: a });
    const before = await snapshot();
    const res = await helperPost(ola.linkToken, task.id, { action, message: 'hei' });
    expect(res.headers.location).toBe(`/h/${ola.linkToken}?feil=1`);
    expect(await snapshot()).toEqual(before);
    expect((await request(ctx.app).get(res.headers.location!)).text).toContain(
      `<p class="flash form-error" role="alert">${REFUSED}</p>`,
    );
  });

  it('refuses another helper’s task, a task reassigned away, a missing task and a bad action', async () => {
    const { kari, bryllup, ola, kim, task, b2 } = await scenario();
    await assign(kari, bryllup, b2.id, kim.id);
    // Another organizer's task, even with a valid token of Kari's helper.
    const per = await loggedIn('per@example.no', 'Per');
    const perEvent = await createEvent(per, 'wedding', '2027-04-01');
    await addHelper(per, perEvent, { email: 'pal@example.no' });
    const pal = await helperByEmail('pal@example.no');
    const [perTask] = await eventTasks(perEvent);
    await assign(per, perEvent, perTask!.id, pal.id);
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    await assign(kari, bryllup, task.id, kim.id); // reassigned away from Ola

    const before = await snapshot();
    const attempts: [number | string, string][] = [
      [b2.id, 'yes'],
      [task.id, 'done'],
      [perTask!.id, 'yes'],
      [999999, 'yes'],
      ['abc', 'yes'],
      [task.id, 'markDone'],
      [task.id, 'assign'],
    ];
    for (const [taskId, action] of attempts) {
      const res = await helperPost(ola.linkToken, taskId, { action });
      expect(res.status, `${taskId} ${action}`).toBe(302);
      expect(res.headers.location).toBe(`/h/${ola.linkToken}?feil=1`);
    }
    expect(await snapshot()).toEqual(before);
    // The reassigned task is no longer on his page.
    expect((await request(ctx.app).get(`/h/${ola.linkToken}`)).text).not.toContain(`/tasks/${task.id}"`);
  });

  it('refuses a message over 500 characters with a Norwegian notice, and allows exactly 500', async () => {
    const { ola, task } = await scenario();
    const before = await snapshot();
    const res = await helperPost(ola.linkToken, task.id, { action: 'yes', message: 'x'.repeat(501) });
    expect(res.headers.location).toBe(`/h/${ola.linkToken}?feil=lang`);
    expect(await snapshot()).toEqual(before);
    expect((await request(ctx.app).get(res.headers.location!)).text).toContain(
      '<p class="flash form-error" role="alert">Meldingen kan ha maks 500 tegn.</p>',
    );

    await helperPost(ola.linkToken, task.id, { action: 'yes', message: 'x'.repeat(500) });
    expect((await allMessages())[0]!.body).toHaveLength(500);
  });

  it('counts a CRLF line break as one character, so a 500-character message with line breaks is accepted', async () => {
    const { ola, task } = await scenario();
    const crlf = String.fromCharCode(13, 10);
    // 5 * 96 + 4 line breaks + 16 = 500 characters as the browser counts them, 504 as sent with CRLF.
    const message = Array.from({ length: 5 }, () => 'x'.repeat(96)).join(crlf) + 'y'.repeat(16);
    expect(message.length).toBe(504);
    const res = await helperPost(ola.linkToken, task.id, { action: 'yes', message });
    expect(res.headers.location).toBe(`/h/${ola.linkToken}?lagret=1`);
    const body = (await allMessages())[0]!.body!;
    expect(body).toHaveLength(500);
    expect(body).not.toContain(String.fromCharCode(13));
  });

  it('ignores the session: an organizer cookie does not change what a helper POST may do', async () => {
    const { kari, kim, task } = await scenario();
    const res = await kari.post(`/h/${kim.linkToken}/tasks/${task.id}`).type('form').send({ action: 'yes' });
    expect(res.headers.location).toBe(`/h/${kim.linkToken}?feil=1`);
    expect(await allMessages()).toHaveLength(0);
  });
});

describe('organizer marks Done', () => {
  const markDone = (agent: Agent, eventId: number, taskId: number) =>
    agent.post(`/events/${eventId}/tasks/${taskId}/done`);

  it('shows the button on tasks that are not Done, marks them Done and writes no message', async () => {
    const { kari, bryllup, ola, task, b2 } = await scenario();
    const page = (await kari.get(`/events/${bryllup}`)).text;
    expect(page).toContain(`action="/events/${bryllup}/tasks/${task.id}/done"`);
    expect(page).toContain('Marker som ferdig');

    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    const messagesBefore = await allMessages();
    for (const id of [task.id, b2.id]) {
      const res = await markDone(kari, bryllup, id);
      expect(res.status).toBe(302);
      expect((await kari.get(res.headers.location!)).text).toContain('Oppgaven er markert som ferdig.');
      expect((await taskById(id)).status).toBe('done');
    }
    expect(await allMessages()).toEqual(messagesBefore);
    expect((await kari.get(`/events/${bryllup}`)).text).not.toContain(
      `action="/events/${bryllup}/tasks/${task.id}/done"`,
    );

    const before = await snapshot();
    const again = await markDone(kari, bryllup, task.id);
    expect((await kari.get(again.headers.location!)).text).toContain('Oppgaven er allerede ferdig.');
    expect(await snapshot()).toEqual(before);
  });

  it('gives 404 for another organizer’s task and changes nothing', async () => {
    const { bryllup, task } = await scenario();
    const per = await loggedIn('per@example.no', 'Per');
    const perEvent = await createEvent(per, 'wedding', '2027-04-01');
    const before = await snapshot();
    expect((await markDone(per, bryllup, task.id)).status).toBe(404);
    expect((await markDone(per, perEvent, task.id)).status).toBe(404);
    expect(await snapshot()).toEqual(before);
  });
});

describe('editing an Accepted task (AD-13)', () => {
  const edit = (agent: Agent, eventId: number, taskId: number, body: { title: string; deadline: string }) =>
    agent.post(`/events/${eventId}/tasks/${taskId}`).type('form').send(body);

  it('keeps the status, sets the flag, shows it to the helper, and the next helper command clears it', async () => {
    const { kari, bryllup, ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    expect((await taskById(task.id)).changedSinceAnswer).toBe(false);

    // Saving without a real change does not set the flag.
    await edit(kari, bryllup, task.id, { title: task.title, deadline: task.deadline });
    expect((await taskById(task.id)).changedSinceAnswer).toBe(false);

    await edit(kari, bryllup, task.id, { title: 'Ny tittel', deadline: task.deadline });
    expect(await taskById(task.id)).toMatchObject({
      status: 'accepted',
      acceptedAt: FIXED_NOW,
      changedSinceAnswer: true,
    });
    expect((await request(ctx.app).get(`/h/${ola.linkToken}`)).text).toContain('Endret etter at du svarte');

    await helperPost(ola.linkToken, task.id, { action: 'done' });
    expect(await taskById(task.id)).toMatchObject({ status: 'done', changedSinceAnswer: false });
    expect((await request(ctx.app).get(`/h/${ola.linkToken}`)).text).not.toContain('Endret etter at du svarte');
  });

  it('sets the flag on a deadline change, and a message-only repeat clears it', async () => {
    const { kari, bryllup, ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    await edit(kari, bryllup, task.id, { title: task.title, deadline: '2027-01-15' });
    expect((await taskById(task.id)).changedSinceAnswer).toBe(true);
    await helperPost(ola.linkToken, task.id, { action: 'yes', message: 'Ok, det går fint' });
    expect(await taskById(task.id)).toMatchObject({ status: 'accepted', changedSinceAnswer: false });
  });

  it('clears the flag on reassign, so the new helper sees no banner', async () => {
    const { kari, bryllup, ola, kim, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    await edit(kari, bryllup, task.id, { title: 'Ny tittel', deadline: task.deadline });
    await assign(kari, bryllup, task.id, kim.id);
    expect(await taskById(task.id)).toMatchObject({ status: 'open', helperId: kim.id, changedSinceAnswer: false });
    const page = (await request(ctx.app).get(`/h/${kim.linkToken}`)).text;
    expect(page).toContain('<strong>Ny tittel</strong>');
    expect(page).not.toContain('Endret etter at du svarte');
  });

  it('clears the flag when the organizer marks the task Done', async () => {
    const { kari, bryllup, ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes' });
    await edit(kari, bryllup, task.id, { title: 'Ny tittel', deadline: task.deadline });
    await kari.post(`/events/${bryllup}/tasks/${task.id}/done`);
    expect(await taskById(task.id)).toMatchObject({ status: 'done', changedSinceAnswer: false });
    expect((await request(ctx.app).get(`/h/${ola.linkToken}`)).text).not.toContain('Endret etter at du svarte');
  });

  it('does not set the flag on a task that is not Accepted', async () => {
    const { kari, bryllup, task } = await scenario();
    await edit(kari, bryllup, task.id, { title: 'Ny tittel', deadline: task.deadline });
    expect(await taskById(task.id)).toMatchObject({ status: 'open', changedSinceAnswer: false });
  });
});

describe('messages table', () => {
  it('cascades when the task is deleted', async () => {
    const { kari, bryllup, ola, task } = await scenario();
    await helperPost(ola.linkToken, task.id, { action: 'yes', message: 'hei' });
    expect(await allMessages()).toHaveLength(1);
    await kari.post(`/events/${bryllup}/tasks/${task.id}/delete`);
    expect(await allMessages()).toHaveLength(0);
  });
});
