import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { events, tasks } from '../src/db/schema.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { setupTestApp, type TestContext } from './helpers.ts';

// Oslo today in tests is 2026-11-01 (FIXED_NOW).
let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp();
});

afterEach(() => {
  ctx.close();
});

async function loggedIn(email = 'kari@example.no') {
  const agent = request.agent(ctx.app);
  await agent.post('/registrer').type('form').send({ name: 'Kari', email, password: 'hemmelig123' });
  return agent;
}

type Agent = Awaited<ReturnType<typeof loggedIn>>;

async function createEvent(agent: Agent, fields: Record<string, string>) {
  const res = await agent.post('/events').type('form').send(fields);
  const match = /^\/events\/(\d+)$/.exec(res.headers.location ?? '');
  return { res, eventId: match ? Number(match[1]) : undefined };
}

const eventTasks = (eventId: number) =>
  ctx.db.select().from(tasks).where(eq(tasks.eventId, eventId)).orderBy(tasks.id);

describe('creating an event from a template', () => {
  it('creates the event and one Unassigned task per template entry, dated back from the event', async () => {
    const agent = await loggedIn();
    const { res, eventId } = await createEvent(agent, {
      templateKey: 'wedding',
      name: 'Bryllupet til Kari og Ola',
      occasion: 'Bryllup',
      location: 'Molde',
      eventDate: '2027-06-12',
      guestCount: '80',
      todo: 'Alt',
      otherInfo: 'Sommerbryllup',
    });
    expect(res.status).toBe(302);
    expect(eventId).toBeDefined();

    const [event] = await ctx.db.select().from(events).where(eq(events.id, eventId!));
    expect(event).toMatchObject({ name: 'Bryllupet til Kari og Ola', templateKey: 'wedding', guestCount: 80, location: 'Molde' });

    const rows = await eventTasks(eventId!);
    expect(rows).toHaveLength(23);
    expect(rows.every((t) => t.status === 'unassigned')).toBe(true);
    expect(rows[0]).toMatchObject({ title: 'Sette budsjett', deadline: '2026-12-14' });
    expect(rows.at(-1)).toMatchObject({ title: 'Pynte lokalet', deadline: '2027-06-11' });

    const page = await agent.get(res.headers.location!);
    expect(page.status).toBe(200);
    expect(page.text).toContain('Arrangementet er opprettet.');
    expect(page.text).toContain('14. desember 2026');
  });

  it('names the event after the template when the name is left empty, and stores blanks as empty', async () => {
    const agent = await loggedIn();
    const { eventId } = await createEvent(agent, { templateKey: 'bachelorette', name: '  ', eventDate: '2027-03-01' });
    const [event] = await ctx.db.select().from(events).where(eq(events.id, eventId!));
    expect(event).toMatchObject({ name: 'Utdrikningslag', occasion: null, guestCount: null });
    expect(await eventTasks(eventId!)).toHaveLength(16);
    const page = await agent.get(`/events/${eventId}`);
    expect(page.text).toMatch(/<dt>Hvor<\/dt><dd>–<\/dd>/);
    expect(page.text).toMatch(/<dt>Antall gjester<\/dt><dd>–<\/dd>/);
  });

  it('moves deadlines that would be in the past to today', async () => {
    const agent = await loggedIn();
    const { eventId } = await createEvent(agent, { templateKey: 'bachelorette', eventDate: '2026-11-06' });
    const rows = await eventTasks(eventId!);
    const budget = rows.find((t) => t.title === 'Sette budsjett per person');
    expect(budget?.deadline).toBe('2026-11-01');
    expect(rows.find((t) => t.title === 'Bekrefte tidsplanen med alle')?.deadline).toBe('2026-11-05');
  });

  it('allows an event today', async () => {
    const agent = await loggedIn();
    const { res } = await createEvent(agent, { templateKey: 'wedding', eventDate: '2026-11-01' });
    expect(res.status).toBe(302);
  });

  it.each([
    ['no date', '', 'Velg en dato.'],
    ['a past date', '2026-10-31', 'Datoen kan ikke være tilbake i tid.'],
    ['an impossible date', '2026-02-30', 'Skriv inn en gyldig dato.'],
  ])('refuses %s with 422 and keeps the input', async (_label, eventDate, message) => {
    const agent = await loggedIn();
    const { res } = await createEvent(agent, { templateKey: 'wedding', name: 'Mitt bryllup', eventDate });
    expect(res.status).toBe(422);
    expect(res.text).toContain(message);
    expect(res.text).toContain('value="Mitt bryllup"');
    expect(await ctx.db.select().from(events)).toHaveLength(0);
  });

  it('refuses an unknown template with 422', async () => {
    const agent = await loggedIn();
    const { res } = await createEvent(agent, { templateKey: 'birthday', eventDate: '2027-01-01' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Velg en mal.');
    expect(await ctx.db.select().from(events)).toHaveLength(0);
  });

  it.each([
    ['-3', 'Skriv inn et helt tall.'],
    ['2.5', 'Skriv inn et helt tall.'],
    ['abc', 'Skriv inn et helt tall.'],
    ['0x10', 'Skriv inn et helt tall.'],
    ['1e3', 'Skriv inn et helt tall.'],
    ['10001', 'Antallet kan være maks 10 000.'],
  ])('refuses the guest count "%s"', async (guestCount, message) => {
    const agent = await loggedIn();
    const { res } = await createEvent(agent, { templateKey: 'wedding', eventDate: '2027-01-01', guestCount });
    expect(res.status).toBe(422);
    expect(res.text).toContain(message);
    expect(await ctx.db.select().from(events)).toHaveLength(0);
  });

  it('accepts guest counts 0 and 10000', async () => {
    const agent = await loggedIn();
    for (const guestCount of ['0', '10000']) {
      const { res } = await createEvent(agent, { templateKey: 'wedding', eventDate: '2027-01-01', guestCount });
      expect(res.status).toBe(302);
    }
  });

  it('requires login', async () => {
    const res = await request(ctx.app).get('/events/new');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/logg-inn');
  });
});

describe('several events', () => {
  it('shows a tab per event on each event page, marking the current one', async () => {
    const agent = await loggedIn();
    const wedding = await createEvent(agent, { templateKey: 'wedding', eventDate: '2027-06-12' });
    const party = await createEvent(agent, { templateKey: 'bachelorette', eventDate: '2027-05-01' });
    for (const id of [wedding.eventId, party.eventId]) {
      const page = await agent.get(`/events/${id}`);
      expect(page.text).toContain(`href="/events/${wedding.eventId}"`);
      expect(page.text).toContain(`href="/events/${party.eventId}"`);
      expect(page.text).toMatch(new RegExp(`href="/events/${id}" class="tab current" aria-current="page"`));
    }
    // Soonest first: the bachelorette (May) comes before the wedding (June), on the overview and in the tabs.
    const overview = await agent.get('/');
    const weddingLink = `href="/events/${wedding.eventId}"`;
    const partyLink = `href="/events/${party.eventId}"`;
    expect(overview.text.indexOf(partyLink)).toBeGreaterThan(-1);
    expect(overview.text.indexOf(partyLink)).toBeLessThan(overview.text.indexOf(weddingLink));
    expect(overview.text).toContain('href="/events/new"');
    const page = await agent.get(`/events/${wedding.eventId}`);
    expect(page.text.indexOf(partyLink)).toBeLessThan(page.text.indexOf(weddingLink));
  });
});

describe('editing the plan', () => {
  async function withEvent() {
    const agent = await loggedIn();
    const { eventId } = await createEvent(agent, { templateKey: 'bachelorette', eventDate: '2027-03-01' });
    return { agent, eventId: eventId! };
  }

  it('adds an Unassigned task', async () => {
    const { agent, eventId } = await withEvent();
    const res = await agent.post(`/events/${eventId}/tasks`).type('form').send({ title: ' Kjøpe sugerør ', deadline: '2027-02-01' });
    expect(res.status).toBe(302);
    const added = (await eventTasks(eventId)).find((t) => t.title === 'Kjøpe sugerør');
    expect(added).toMatchObject({ status: 'unassigned', deadline: '2027-02-01' });
  });

  it.each([
    ['an empty title', { title: '', deadline: '2027-02-01' }, 'Skriv inn en oppgave.'],
    ['a title over 120 characters', { title: 'x'.repeat(121), deadline: '2027-02-01' }, 'Oppgaven kan ha maks 120 tegn.'],
    ['an invalid deadline', { title: 'Noe', deadline: '2027-13-01' }, 'Skriv inn en gyldig frist.'],
    ['a past deadline', { title: 'Noe', deadline: '2026-10-31' }, 'Fristen kan ikke være tilbake i tid.'],
  ])('refuses to add a task with %s', async (_label, body, message) => {
    const { agent, eventId } = await withEvent();
    const before = (await eventTasks(eventId)).length;
    const res = await agent.post(`/events/${eventId}/tasks`).type('form').send(body);
    expect(res.status).toBe(422);
    expect(res.text).toContain(message);
    expect(res.text).toContain(`id="new-title" name="title" type="text" maxlength="120" placeholder="Hva skal gjøres?" value="${body.title}"`);
    expect(await eventTasks(eventId)).toHaveLength(before);
  });

  it('allows a manual deadline after the event date, when adding and editing', async () => {
    const { agent, eventId } = await withEvent();
    const add = await agent.post(`/events/${eventId}/tasks`).type('form').send({ title: 'Levere tilbake leid utstyr', deadline: '2027-03-05' });
    expect(add.status).toBe(302);
    const added = (await eventTasks(eventId)).find((t) => t.title === 'Levere tilbake leid utstyr')!;
    expect(added.deadline).toBe('2027-03-05');
    const edit = await agent.post(`/events/${eventId}/tasks/${added.id}`).type('form').send({ title: added.title, deadline: '2027-03-10' });
    expect(edit.status).toBe(302);
    const [stored] = await ctx.db.select().from(tasks).where(eq(tasks.id, added.id));
    expect(stored?.deadline).toBe('2027-03-10');
  });

  it('accepts a 120-character title', async () => {
    const { agent, eventId } = await withEvent();
    const res = await agent.post(`/events/${eventId}/tasks`).type('form').send({ title: 'x'.repeat(120), deadline: '2027-02-01' });
    expect(res.status).toBe(302);
  });

  it('renames and re-dates a task, and the list is sorted by deadline', async () => {
    const { agent, eventId } = await withEvent();
    const [first] = await eventTasks(eventId);
    const res = await agent
      .post(`/events/${eventId}/tasks/${first!.id}`)
      .type('form')
      .send({ title: 'Avklare dato med forloveden', deadline: '2027-02-28' });
    expect(res.status).toBe(302);
    const [updated] = await ctx.db.select().from(tasks).where(eq(tasks.id, first!.id));
    expect(updated).toMatchObject({ title: 'Avklare dato med forloveden', deadline: '2027-02-28', status: 'unassigned' });

    const page = await agent.get(`/events/${eventId}`);
    const positions = ['Lage gjesteliste', 'Avklare dato med forloveden'].map((t) => page.text.indexOf(t));
    expect(positions[0]).toBeGreaterThan(-1);
    expect(positions[0]).toBeLessThan(positions[1]!);
  });

  it('lets an unchanged past deadline stay when renaming', async () => {
    const agent = await loggedIn();
    const { eventId } = await createEvent(agent, { templateKey: 'bachelorette', eventDate: '2026-11-06' });
    const clamped = (await eventTasks(eventId!)).find((t) => t.deadline === '2026-11-01')!;
    // Put the deadline in the past directly, as if the task were old.
    await ctx.db.update(tasks).set({ deadline: '2026-10-20' }).where(eq(tasks.id, clamped.id));
    const res = await agent.post(`/events/${eventId}/tasks/${clamped.id}`).type('form').send({ title: 'Nytt navn', deadline: '2026-10-20' });
    expect(res.status).toBe(302);
    const moved = await agent.post(`/events/${eventId}/tasks/${clamped.id}`).type('form').send({ title: 'Nytt navn', deadline: '2026-10-25' });
    expect(moved.status).toBe(422);
  });

  it.each([
    ['an empty title', (d: string) => ({ title: '', deadline: d }), 'Skriv inn en oppgave.'],
    ['a title over 120 characters', (d: string) => ({ title: 'y'.repeat(121), deadline: d }), 'Oppgaven kan ha maks 120 tegn.'],
    ['an invalid deadline', () => ({ title: 'Nytt navn', deadline: '2027-13-01' }), 'Skriv inn en gyldig frist.'],
    ['a deadline moved into the past', () => ({ title: 'Nytt navn', deadline: '2026-10-31' }), 'Fristen kan ikke være tilbake i tid.'],
  ])('refuses an edit with %s: 422 on that row with the input kept, task unchanged', async (_label, body, message) => {
    const { agent, eventId } = await withEvent();
    const [first, second] = await eventTasks(eventId);
    const sent = body(first!.deadline);
    const res = await agent.post(`/events/${eventId}/tasks/${first!.id}`).type('form').send(sent);
    expect(res.status).toBe(422);
    expect(res.text).toContain(`id="title-${first!.id}" name="title" type="text" maxlength="120" value="${sent.title}"`);
    expect(res.text).toContain(`id="deadline-${first!.id}" name="deadline" type="date" value="${sent.deadline}"`);
    // The error sits in the edited row, before the next task's row.
    const errorAt = res.text.indexOf(message);
    expect(errorAt).toBeGreaterThan(res.text.indexOf(`id="title-${first!.id}"`));
    expect(errorAt).toBeLessThan(res.text.indexOf(`id="title-${second!.id}"`));
    const [stored] = await ctx.db.select().from(tasks).where(eq(tasks.id, first!.id));
    expect(stored).toEqual(first);
  });

  it('deletes a task', async () => {
    const { agent, eventId } = await withEvent();
    const [first] = await eventTasks(eventId);
    const res = await agent.post(`/events/${eventId}/tasks/${first!.id}/delete`);
    expect(res.status).toBe(302);
    expect(await ctx.db.select().from(tasks).where(eq(tasks.id, first!.id))).toHaveLength(0);
  });

  it('refuses a task row for an event that does not exist (foreign keys on)', async () => {
    await expect(
      ctx.db.insert(tasks).values({ eventId: 9999, title: 'x', deadline: '2027-01-01', status: 'unassigned', createdAt: 'now' }),
    ).rejects.toThrow();
  });
});

describe('data isolation between organizers (FR-2)', () => {
  it('gives 404 for another organizer’s event and tasks, and changes nothing', async () => {
    const kari = await loggedIn('kari@example.no');
    const { eventId } = await createEvent(kari, { templateKey: 'wedding', eventDate: '2027-06-12' });
    const [task] = await eventTasks(eventId!);
    const before = await eventTasks(eventId!);

    const per = await loggedIn('per@example.no');
    const attempts = [
      per.get(`/events/${eventId}`),
      per.post(`/events/${eventId}/tasks`).type('form').send({ title: 'Inntrenger', deadline: '2027-01-01' }),
      per.post(`/events/${eventId}/tasks/${task!.id}`).type('form').send({ title: 'Endret', deadline: '2027-01-01' }),
      per.post(`/events/${eventId}/tasks/${task!.id}`).type('form').send({ title: '', deadline: '' }),
      per.post(`/events/${eventId}/tasks/${task!.id}/delete`),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(404);
      expect(res.text).toContain('Siden finnes ikke');
    }
    expect(await eventTasks(eventId!)).toEqual(before);
    expect((await per.get('/')).text).not.toContain('Bryllup');
  });

  it('gives 404 when a task id belongs to another event of the same organizer', async () => {
    const agent = await loggedIn();
    const a = await createEvent(agent, { templateKey: 'wedding', eventDate: '2027-06-12' });
    const b = await createEvent(agent, { templateKey: 'bachelorette', eventDate: '2027-05-01' });
    const [taskOfA] = await eventTasks(a.eventId!);
    const res = await agent.post(`/events/${b.eventId}/tasks/${taskOfA!.id}/delete`);
    expect(res.status).toBe(404);
    expect(await ctx.db.select().from(tasks).where(eq(tasks.id, taskOfA!.id))).toHaveLength(1);
    // Invalid input does not turn a wrong task id into a form error.
    for (const body of [{ title: '', deadline: '' }, { title: 'Ok', deadline: '2027-01-01' }]) {
      const edit = await agent.post(`/events/${b.eventId}/tasks/${taskOfA!.id}`).type('form').send(body);
      expect(edit.status).toBe(404);
    }
    const missing = await agent.post(`/events/${b.eventId}/tasks/999999`).type('form').send({ title: '', deadline: '' });
    expect(missing.status).toBe(404);
  });

  it.each(['abc', '0', '-1', '1.5', '1e0', '0x1', '01'])('gives 404 for a malformed event id "%s"', async (id) => {
    const agent = await loggedIn();
    expect((await agent.get(`/events/${id}`)).status).toBe(404);
  });
});

describe('startup', () => {
  it('createApp throws when a template file is invalid', () => {
    const dir = mkdtempSync(join(TEST_DB_DIR, 'templates-'));
    copyFileSync(new URL('../src/templates/bachelorette.json', import.meta.url), join(dir, 'bachelorette.json'));
    writeFileSync(join(dir, 'wedding.json'), '{"key":"wedding"}');
    expect(() => createApp({ config: ctx.config, db: ctx.db, clock: ctx.clock, templatesDir: pathToFileURL(`${dir}/`) })).toThrow(
      /wedding\.json/,
    );
  });
});
