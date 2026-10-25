import { mkdirSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eventHelpers, helpers, tasks } from '../src/db/schema.ts';
import { addHelperToEvent, displayName } from '../src/services/helpers.ts';
import { listForHelper } from '../src/services/tasks.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { FIXED_NOW, setupTestApp, type TestContext } from './helpers.ts';

// FR-8 to FR-11 (story 1.3): helpers, assignment and links.
let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp({ APP_BASE_URL: 'https://masterplan.example.no' });
});

afterEach(() => {
  ctx.close();
});

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

async function loggedIn(email = 'kari@example.no') {
  const agent = request.agent(ctx.app);
  await agent.post('/registrer').type('form').send({ name: 'Kari', email, password: 'hemmelig123' });
  return agent;
}

type Agent = Awaited<ReturnType<typeof loggedIn>>;

async function createEvent(agent: Agent, templateKey = 'bachelorette', eventDate = '2027-03-01') {
  const res = await agent.post('/events').type('form').send({ templateKey, eventDate });
  const match = /^\/events\/(\d+)$/.exec(res.headers.location ?? '');
  if (!match) throw new Error('event not created');
  return Number(match[1]);
}

const addHelper = (agent: Agent, eventId: number, body: Record<string, string>) =>
  agent.post(`/events/${eventId}/helpers`).type('form').send(body);

const allHelpers = () => ctx.db.select().from(helpers).orderBy(helpers.id);
const linksOf = (eventId: number) => ctx.db.select().from(eventHelpers).where(eq(eventHelpers.eventId, eventId));
const eventTasks = (eventId: number) => ctx.db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(tasks.id);
const taskById = async (id: number) => (await ctx.db.select().from(tasks).where(eq(tasks.id, id)))[0]!;
const helperByEmail = async (email: string) => (await ctx.db.select().from(helpers).where(eq(helpers.email, email)))[0]!;

async function followFlash(agent: Agent, res: request.Response) {
  expect(res.status).toBe(302);
  return (await agent.get(res.headers.location!)).text;
}

describe('adding helpers', () => {
  it('trims and lowercases the email, makes a 32-character token and links the helper', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    const res = await addHelper(agent, eventId, { email: ' Ola@Example.no ', name: 'Ola' });
    const page = await followFlash(agent, res);
    expect(page).toContain('Ola er lagt til som hjelper.');

    const [ola] = await allHelpers();
    expect(ola).toMatchObject({ email: 'ola@example.no', name: 'Ola', createdAt: FIXED_NOW });
    expect(ola!.linkToken).toMatch(TOKEN_FORMAT);
    expect(await linksOf(eventId)).toEqual([{ eventId, helperId: ola!.id, createdAt: FIXED_NOW }]);
  });

  it('reuses the same helper and token when the email is added to another event', async () => {
    const agent = await loggedIn();
    const first = await createEvent(agent);
    const second = await createEvent(agent, 'wedding', '2027-06-12');
    await addHelper(agent, first, { email: 'ola@example.no', name: 'Ola' });
    await addHelper(agent, second, { email: 'OLA@example.no', name: 'Annet navn' });
    const rows = await allHelpers();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Ola');
    expect(await linksOf(first)).toHaveLength(1);
    expect(await linksOf(second)).toHaveLength(1);

    const page1 = await agent.get(`/events/${first}`);
    const page2 = await agent.get(`/events/${second}`);
    const link = `https://masterplan.example.no/h/${rows[0]!.linkToken}`;
    expect(page1.text).toContain(`value="${link}"`);
    expect(page2.text).toContain(`value="${link}"`);
  });

  it('fills an empty name when the helper is added again with one', async () => {
    const agent = await loggedIn();
    const first = await createEvent(agent);
    const second = await createEvent(agent, 'wedding', '2027-06-12');
    await addHelper(agent, first, { email: 'ola@example.no', name: '' });
    expect((await allHelpers())[0]!.name).toBeNull();
    await addHelper(agent, second, { email: 'ola@example.no', name: 'Ola' });
    expect((await allHelpers())[0]!.name).toBe('Ola');
  });

  it('changes nothing when the helper is already on the event', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    await addHelper(agent, eventId, { email: 'ola@example.no' });
    const before = { helpers: await allHelpers(), links: await linksOf(eventId) };
    const res = await addHelper(agent, eventId, { email: ' Ola@example.no', name: 'Ola' });
    expect(await followFlash(agent, res)).toContain('Hjelperen er allerede lagt til.');
    expect(await allHelpers()).toEqual(before.helpers);
    expect(await linksOf(eventId)).toEqual(before.links);
  });

  it('allows five helpers, refuses a sixth and hides the form at five', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    for (let i = 1; i <= 4; i++) await addHelper(agent, eventId, { email: `h${i}@example.no` });
    expect((await agent.get(`/events/${eventId}`)).text).toContain('Legg til hjelper');

    const fifth = await addHelper(agent, eventId, { email: 'h5@example.no' });
    expect(await followFlash(agent, fifth)).toContain('h5@example.no er lagt til som hjelper.');
    expect(await linksOf(eventId)).toHaveLength(5);
    const full = await agent.get(`/events/${eventId}`);
    expect(full.text).not.toContain('action="/events/' + eventId + '/helpers"');
    expect(full.text).toContain('Hjelpere (5 av 5)');

    const sixth = await addHelper(agent, eventId, { email: 'h6@example.no', name: 'Seks' });
    expect(await followFlash(agent, sixth)).toContain('Et arrangement kan ha maks fem hjelpere.');
    expect(await linksOf(eventId)).toHaveLength(5);
    expect(await allHelpers()).toHaveLength(5);
  });

  it.each([
    ['an invalid email', { email: 'abc', name: 'Ola' }, 'Skriv inn en gyldig e-postadresse.'],
    ['an empty email', { email: '', name: 'Ola' }, 'Skriv inn en gyldig e-postadresse.'],
    ['an email over 254 characters', { email: `${'a'.repeat(250)}@example.no`, name: 'Ola' }, 'E-postadressen kan ha maks 254 tegn.'],
    ['a name over 100 characters', { email: 'ola@example.no', name: 'n'.repeat(101) }, 'Navnet kan ha maks 100 tegn.'],
  ])('refuses %s with 422 and keeps the input', async (_label, body, message) => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    const res = await addHelper(agent, eventId, body);
    expect(res.status).toBe(422);
    expect(res.text).toContain(message);
    expect(res.text).toContain(`name="email" type="email" maxlength="254" value="${body.email}"`);
    expect(res.text).toContain(`name="name" type="text" maxlength="100" value="${body.name}"`);
    expect(await allHelpers()).toHaveLength(0);
  });

  it('accepts a 100-character name', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    const res = await addHelper(agent, eventId, { email: 'ola@example.no', name: 'n'.repeat(100) });
    expect(res.status).toBe(302);
    expect(await allHelpers()).toHaveLength(1);
  });

  it('makes a unique token per helper, and the token seam is used', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    for (let i = 1; i <= 5; i++) await addHelper(agent, eventId, { email: `h${i}@example.no` });
    const tokens = (await allHelpers()).map((h) => h.linkToken);
    expect(tokens.every((t) => TOKEN_FORMAT.test(t))).toBe(true);
    expect(new Set(tokens).size).toBe(5);

    const other = await createEvent(agent, 'wedding', '2027-06-12');
    const organizerId = (await allHelpers())[0]!.organizerId;
    const seeded = await addHelperToEvent(ctx.db, ctx.clock, organizerId, other, { email: 'fast@example.no' }, () => 'A'.repeat(32));
    expect(seeded.linkToken).toBe('A'.repeat(32));
  });
});

describe('showing helpers', () => {
  it('shows the name, or the email when there is no name, with a copy button and a read-only link', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    await addHelper(agent, eventId, { email: 'ola@example.no', name: 'Ola Nordmann' });
    await addHelper(agent, eventId, { email: 'kim@example.no' });
    const page = (await agent.get(`/events/${eventId}`)).text;
    const ola = await helperByEmail('ola@example.no');
    const kim = await helperByEmail('kim@example.no');
    expect(page).toContain('<span class="helper-name">Ola Nordmann</span>');
    expect(page).toContain('<span class="helper-name">kim@example.no</span>');
    expect(displayName(ola)).toBe('Ola Nordmann');
    expect(displayName(kim)).toBe('kim@example.no');
    expect(page).toContain(
      `<input id="link-${ola.id}" type="text" class="link-field" value="https://masterplan.example.no/h/${ola.linkToken}" readonly>`,
    );
    expect(page).toContain(`<button type="button" class="small" data-copy="link-${ola.id}" aria-live="polite">Kopier lenke</button>`);
  });

  it('loads copy.js, serves it, and has no inline script body', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    await addHelper(agent, eventId, { email: 'ola@example.no' });
    const page = (await agent.get(`/events/${eventId}`)).text;
    expect(page).toContain('<script src="/copy.js" defer></script>');
    const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, attrs, body] of scripts) {
      expect(attrs).toMatch(/src=/);
      expect(body!.trim()).toBe('');
    }
    const js = await request(ctx.app).get('/copy.js');
    expect(js.status).toBe(200);
    expect(js.headers['content-type']).toMatch(/javascript/);
    expect(js.text).toContain('navigator.clipboard');
    expect(js.text).toContain('Kopiert!');
  });

  it('shows a "Velg hjelper" placeholder on an Unassigned task, not a preselected helper', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    await addHelper(agent, eventId, { email: 'ola@example.no', name: 'Ola' });
    const [task] = await eventTasks(eventId);
    const page = (await agent.get(`/events/${eventId}`)).text;
    expect(page).toMatch(
      new RegExp(`<select id="assign-${task!.id}" name="helperId" required>\\s*<option value="" selected disabled>Velg hjelper</option>`),
    );
    expect(page).not.toMatch(/<option value="\d+" selected>/);
  });

  it('shows the add form with its error on a 422 even when five helpers are linked', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    for (let i = 1; i <= 5; i++) await addHelper(agent, eventId, { email: `h${i}@example.no` });
    const res = await addHelper(agent, eventId, { email: 'abc' });
    expect(res.status).toBe(422);
    expect(res.text).toContain(`action="/events/${eventId}/helpers"`);
    expect(res.text).toContain('Skriv inn en gyldig e-postadresse.');
  });

  it('shows no assign control while the event has no helpers', async () => {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    const page = (await agent.get(`/events/${eventId}`)).text;
    expect(page).not.toContain('Tildel</button>');
    expect(page).toContain('Ikke tildelt');
  });
});

describe('assigning tasks', () => {
  async function withHelpers() {
    const agent = await loggedIn();
    const eventId = await createEvent(agent);
    await addHelper(agent, eventId, { email: 'a@example.no', name: 'Anne' });
    await addHelper(agent, eventId, { email: 'b@example.no', name: 'Bjørn' });
    const a = await helperByEmail('a@example.no');
    const b = await helperByEmail('b@example.no');
    const [task] = await eventTasks(eventId);
    return { agent, eventId, a, b, task: task! };
  }

  const assign = (agent: Agent, eventId: number, taskId: number, helperId: number | string) =>
    agent.post(`/events/${eventId}/tasks/${taskId}/assign`).type('form').send({ helperId: String(helperId) });

  it('assigns an Unassigned task: Open, helper set, assigned_at = now', async () => {
    const { agent, eventId, a, task } = await withHelpers();
    const res = await assign(agent, eventId, task.id, a.id);
    const page = await followFlash(agent, res);
    expect(page).toContain('Oppgaven er tildelt Anne.');
    expect(await taskById(task.id)).toMatchObject({ status: 'open', helperId: a.id, assignedAt: FIXED_NOW, acceptedAt: null });
    expect(page).toContain('<span class="status status-open">Venter på svar</span> · Anne');
    expect(page).toContain(`<option value="${a.id}" selected>Anne</option>`);
    expect((await listForHelper(ctx.db, a.id)).map((t) => t.id)).toEqual([task.id]);
  });

  it('reassigns to another helper with a new assigned_at and accepted_at cleared', async () => {
    const { agent, eventId, a, b, task } = await withHelpers();
    await assign(agent, eventId, task.id, a.id);
    // As if A had accepted earlier.
    await ctx.db
      .update(tasks)
      .set({ status: 'accepted', assignedAt: '2026-10-01T08:00:00.000Z', acceptedAt: '2026-10-02T08:00:00.000Z' })
      .where(eq(tasks.id, task.id));
    const res = await assign(agent, eventId, task.id, b.id);
    expect(await followFlash(agent, res)).toContain('Oppgaven er tildelt Bjørn.');
    expect(await taskById(task.id)).toMatchObject({ status: 'open', helperId: b.id, assignedAt: FIXED_NOW, acceptedAt: null });
    expect(await listForHelper(ctx.db, a.id)).toEqual([]);
    expect((await listForHelper(ctx.db, b.id)).map((t) => t.id)).toEqual([task.id]);
  });

  it('changes nothing when the task already has the chosen helper', async () => {
    const { agent, eventId, a, task } = await withHelpers();
    await assign(agent, eventId, task.id, a.id);
    await ctx.db.update(tasks).set({ assignedAt: '2026-10-01T08:00:00.000Z' }).where(eq(tasks.id, task.id));
    const before = await taskById(task.id);
    const res = await assign(agent, eventId, task.id, a.id);
    expect(await followFlash(agent, res)).toContain('Oppgaven er allerede tildelt Anne.');
    expect(await taskById(task.id)).toEqual(before);
  });

  it('refuses a helper of the same organizer who is only on another event', async () => {
    const { agent, eventId, task } = await withHelpers();
    const other = await createEvent(agent, 'wedding', '2027-06-12');
    await addHelper(agent, other, { email: 'c@example.no', name: 'Cecilie' });
    const c = await helperByEmail('c@example.no');
    const before = await taskById(task.id);
    const res = await assign(agent, eventId, task.id, c.id);
    expect(await followFlash(agent, res)).toContain('Hjelperen er ikke lagt til i dette arrangementet.');
    expect(await taskById(task.id)).toEqual(before);
  });

  it('lists a helper’s tasks by deadline and leaves out Unassigned ones', async () => {
    const { agent, eventId, a } = await withHelpers();
    const all = await eventTasks(eventId);
    const lowId = all[0]!;
    const highId = all.at(-1)!;
    // Give the higher-id task the earlier deadline, so id order and deadline order disagree.
    await ctx.db.update(tasks).set({ deadline: '2026-11-15' }).where(eq(tasks.id, highId.id));
    await ctx.db.update(tasks).set({ deadline: '2027-02-01' }).where(eq(tasks.id, lowId.id));
    await assign(agent, eventId, lowId.id, a.id);
    await assign(agent, eventId, highId.id, a.id);
    const listed = await listForHelper(ctx.db, a.id);
    expect(listed.map((t) => t.id)).toEqual([highId.id, lowId.id]);
    expect(listed.map((t) => t.deadline)).toEqual(['2026-11-15', '2027-02-01']);
  });

  it.each(['', 'abc', '0', '01', '1e0', '999999'])('gives 404 for the helper id "%s"', async (helperId) => {
    const { agent, eventId, task } = await withHelpers();
    const res = await assign(agent, eventId, task.id, helperId);
    expect(res.status).toBe(404);
    expect(await taskById(task.id)).toMatchObject({ status: 'unassigned', helperId: null });
  });

  it('gives 404 when the task belongs to another event', async () => {
    const { agent, eventId, a } = await withHelpers();
    const other = await createEvent(agent, 'wedding', '2027-06-12');
    const [otherTask] = await eventTasks(other);
    const res = await assign(agent, eventId, otherTask!.id, a.id);
    expect(res.status).toBe(404);
    expect(await taskById(otherTask!.id)).toMatchObject({ status: 'unassigned', helperId: null });
  });
});

describe('data isolation between organizers (FR-2)', () => {
  it('gives 404 when posting another organizer’s event, task or helper id, and changes nothing', async () => {
    const kari = await loggedIn('kari@example.no');
    const kariEvent = await createEvent(kari);
    await addHelper(kari, kariEvent, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const [kariTask] = await eventTasks(kariEvent);

    const per = await loggedIn('per@example.no');
    const perEvent = await createEvent(per);
    await addHelper(per, perEvent, { email: 'pal@example.no', name: 'Pål' });
    const pal = (await allHelpers()).find((h) => h.name === 'Pål')!;
    const [perTask] = await eventTasks(perEvent);

    const before = { helpers: await allHelpers(), links: await ctx.db.select().from(eventHelpers), kariTask: await taskById(kariTask!.id) };
    const attempts = [
      // Kari's event
      per.post(`/events/${kariEvent}/helpers`).type('form').send({ email: 'x@example.no' }),
      per.post(`/events/${kariEvent}/helpers`).type('form').send({ email: 'abc' }),
      // Kari's task, with Per's own helper or Kari's helper
      per.post(`/events/${kariEvent}/tasks/${kariTask!.id}/assign`).type('form').send({ helperId: String(pal.id) }),
      per.post(`/events/${perEvent}/tasks/${kariTask!.id}/assign`).type('form').send({ helperId: String(pal.id) }),
      // Kari's helper on Per's own task
      per.post(`/events/${perEvent}/tasks/${perTask!.id}/assign`).type('form').send({ helperId: String(ola.id) }),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(404);
      expect(res.text).toContain('Siden finnes ikke');
    }
    expect(await allHelpers()).toEqual(before.helpers);
    expect(await ctx.db.select().from(eventHelpers)).toEqual(before.links);
    expect(await taskById(kariTask!.id)).toEqual(before.kariTask);
    expect(await taskById(perTask!.id)).toMatchObject({ status: 'unassigned', helperId: null });
  });

  it('keeps helpers separate per organizer for the same email', async () => {
    const kari = await loggedIn('kari@example.no');
    await addHelper(kari, await createEvent(kari), { email: 'ola@example.no' });
    const per = await loggedIn('per@example.no');
    await addHelper(per, await createEvent(per), { email: 'ola@example.no' });
    const rows = await allHelpers();
    expect(rows).toHaveLength(2);
    expect(rows[0]!.linkToken).not.toBe(rows[1]!.linkToken);
  });
});
