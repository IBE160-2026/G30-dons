import { mkdirSync } from 'node:fs';
import { eq, isNull } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { events, helpers, messages, type TaskStatus, tasks } from '../src/db/schema.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { FIXED_NOW, setupTestApp, type TestContext } from './helpers.ts';

// FR-19 to FR-22, AD-3, AD-15 (story 1.5): the overview and event view show what needs attention.
// The fixed clock makes today 2026-11-01.
let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp();
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

async function createEvent(agent: Agent, templateKey: string, eventDate: string, name?: string) {
  const res = await agent
    .post('/events')
    .type('form')
    .send({ templateKey, eventDate, ...(name ? { name } : {}) });
  const match = /^\/events\/(\d+)$/.exec(res.headers.location ?? '');
  if (!match) throw new Error('event not created');
  return Number(match[1]);
}

const addHelper = (agent: Agent, eventId: number, body: Record<string, string>) =>
  agent.post(`/events/${eventId}/helpers`).type('form').send(body);

const helperByEmail = async (email: string) =>
  (await ctx.db.select().from(helpers).where(eq(helpers.email, email)))[0]!;

const helperPost = (token: string, taskId: number, body: Record<string, string>) =>
  request(ctx.app).post(`/h/${token}/tasks/${taskId}`).type('form').send(body);

interface TaskSpec {
  title: string;
  status: TaskStatus;
  deadline: string;
  helperId?: number | null;
  assignedAt?: string | null;
}

/** Replaces the event's template tasks with exactly these, so counts are known. Returns their ids by title. */
async function setTasks(eventId: number, specs: TaskSpec[]): Promise<Record<string, number>> {
  await ctx.db.delete(tasks).where(eq(tasks.eventId, eventId));
  const ids: Record<string, number> = {};
  for (const s of specs) {
    const assigned = s.status !== 'unassigned';
    const [row] = await ctx.db
      .insert(tasks)
      .values({
        eventId,
        title: s.title,
        deadline: s.deadline,
        status: s.status,
        helperId: assigned ? (s.helperId ?? null) : null,
        assignedAt: assigned ? (s.assignedAt ?? '2026-10-31T10:00:00.000Z') : null,
        acceptedAt: s.status === 'accepted' ? '2026-10-31T12:00:00.000Z' : null,
        createdAt: FIXED_NOW,
      })
      .returning({ id: tasks.id });
    ids[s.title] = row!.id;
  }
  return ids;
}

/** The overview <li> for one event. */
function overviewRow(html: string, eventId: number): string {
  const start = html.indexOf(`href="/events/${eventId}"`);
  expect(start).toBeGreaterThan(-1);
  const end = html.indexOf('</li>', start);
  return html.slice(start, end);
}

const unseen = () => ctx.db.select().from(messages).where(isNull(messages.seenAt));

describe('overview', () => {
  it('shows "I rute" for a clean event and "1 haster · N trenger hjelper" for one with an Urgent task', async () => {
    const kari = await loggedIn();
    const clean = await createEvent(kari, 'wedding', '2027-03-01', 'Rolig fest');
    const busy = await createEvent(kari, 'bachelorette', '2027-05-01', 'Travel fest');
    await addHelper(kari, clean, { email: 'ola@example.no', name: 'Ola' });
    await addHelper(kari, busy, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    await setTasks(clean, [
      { title: 'A', status: 'accepted', deadline: '2027-01-01', helperId: ola.id },
      { title: 'B', status: 'done', deadline: '2026-11-02', helperId: ola.id },
    ]);
    await setTasks(busy, [
      { title: 'C', status: 'accepted', deadline: '2026-11-03', helperId: ola.id },
      { title: 'D', status: 'unassigned', deadline: '2027-01-01' },
      { title: 'E', status: 'declined', deadline: '2027-01-01', helperId: ola.id },
    ]);

    const res = await kari.get('/');
    expect(res.status).toBe(200);
    const cleanRow = overviewRow(res.text, clean);
    expect(cleanRow).toContain('Rolig fest');
    expect(cleanRow).toContain('1. mars 2027');
    expect(cleanRow).toContain('I rute');
    expect(cleanRow).not.toContain('haster');
    const busyRow = overviewRow(res.text, busy);
    expect(busyRow).toContain('1 haster · 2 trenger hjelper');
    expect(busyRow).not.toContain('I rute');
  });

  it('leaves out zero parts', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await setTasks(eventId, [{ title: 'A', status: 'unassigned', deadline: '2027-01-01' }]);
    const row = overviewRow((await kari.get('/')).text, eventId);
    expect(row).toContain('1 trenger hjelper');
    expect(row).not.toContain('haster');
  });

  it('shows "Arrangementet er over" for a past event, with no Urgent or Needs a helper', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await setTasks(eventId, [{ title: 'A', status: 'unassigned', deadline: '2026-10-20' }]);
    await ctx.db.update(events).set({ eventDate: '2026-10-31' }).where(eq(events.id, eventId));
    const row = overviewRow((await kari.get('/')).text, eventId);
    expect(row).toContain('Arrangementet er over');
    expect(row).not.toContain('trenger hjelper');
    expect(row).not.toContain('I rute');

    const view = await kari.get(`/events/${eventId}`);
    expect(view.text).toContain('Var for 1 dag siden');
    expect(view.text).not.toContain('Trenger hjelper (');
  });

  it('shows New replies and only the organizer’s own events', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01', 'Karis fest');
    await addHelper(kari, eventId, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const ids = await setTasks(eventId, [{ title: 'A', status: 'open', deadline: '2027-01-01', helperId: ola.id }]);
    await helperPost(ola.linkToken, ids.A!, { action: 'yes', message: 'Fikser det' });
    expect(overviewRow((await kari.get('/')).text, eventId)).toContain('1 nytt svar');

    const berit = await loggedIn('berit@example.no', 'Berit');
    const other = await berit.get('/');
    expect(other.text).not.toContain('Karis fest');
    expect(await unseen()).toHaveLength(1);
  });
});

describe('overview order and reply counts', () => {
  it('lists upcoming events soonest first, then past events most recent first', async () => {
    const kari = await loggedIn();
    const later = await createEvent(kari, 'wedding', '2027-05-01', 'Senere fest');
    const sooner = await createEvent(kari, 'wedding', '2027-03-01', 'Snart fest');
    const older = await createEvent(kari, 'wedding', '2027-04-01', 'Eldre fest');
    const recent = await createEvent(kari, 'wedding', '2027-04-02', 'Nylig fest');
    await ctx.db.update(events).set({ eventDate: '2026-09-01' }).where(eq(events.id, older));
    await ctx.db.update(events).set({ eventDate: '2026-10-15' }).where(eq(events.id, recent));
    const html = (await kari.get('/')).text;
    const pos = (id: number) => html.indexOf(`href="/events/${id}"`);
    const order = [sooner, later, recent, older];
    for (const id of order) expect(pos(id)).toBeGreaterThan(-1);
    const positions = order.map(pos);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('shows each event\u2019s own New reply count and no badge at zero', async () => {
    const kari = await loggedIn();
    const one = await createEvent(kari, 'wedding', '2027-03-01', 'Fest en');
    const two = await createEvent(kari, 'bachelorette', '2027-04-01', 'Fest to');
    const none = await createEvent(kari, 'wedding', '2027-05-01', 'Fest null');
    for (const id of [one, two]) await addHelper(kari, id, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const a = await setTasks(one, [{ title: 'A', status: 'open', deadline: '2027-01-01', helperId: ola.id }]);
    const b = await setTasks(two, [
      { title: 'B', status: 'open', deadline: '2027-01-01', helperId: ola.id },
      { title: 'C', status: 'open', deadline: '2027-01-02', helperId: ola.id },
    ]);
    await helperPost(ola.linkToken, a.A!, { action: 'yes' });
    await helperPost(ola.linkToken, b.B!, { action: 'yes' });
    await helperPost(ola.linkToken, b.C!, { action: 'no' });

    const html = (await kari.get('/')).text;
    expect(overviewRow(html, one)).toContain('1 nytt svar');
    expect(overviewRow(html, two)).toContain('2 nye svar');
    const noneRow = overviewRow(html, none);
    expect(noneRow).not.toContain('nye svar');
    expect(noneRow).not.toContain('nytt svar');
  });
});

describe('event view panels', () => {
  it('shows Done, To do, Timeline and Messages summaries for tasks in every status', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await addHelper(kari, eventId, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    await setTasks(eventId, [
      { title: 'Ikke tildelt oppgave', status: 'unassigned', deadline: '2027-01-10' },
      { title: 'Åpen nær frist', status: 'open', deadline: '2026-11-03', helperId: ola.id },
      { title: 'Åpen langt unna', status: 'open', deadline: '2027-01-10', helperId: ola.id },
      { title: 'Akseptert snart', status: 'accepted', deadline: '2026-11-02', helperId: ola.id },
      { title: 'Akseptert senere', status: 'accepted', deadline: '2026-12-01', helperId: ola.id },
      { title: 'Avslått oppgave', status: 'declined', deadline: '2027-01-10', helperId: ola.id },
      { title: 'Ferdig oppgave', status: 'done', deadline: '2026-10-20', helperId: ola.id },
      { title: 'Umulig oppgave', status: 'cant_do', deadline: '2027-01-10', helperId: ola.id },
    ]);

    const res = await kari.get(`/events/${eventId}`);
    expect(res.status).toBe(200);
    const html = res.text;
    expect(html).toContain('1 av 8 ferdig');
    expect(html).toContain('<progress value="1" max="8" aria-label="1 av 8 oppgaver ferdig">');
    expect(html).toContain('1 haster · 4 trenger hjelper');
    // To do is open because it has tasks; the urgent and needs-a-helper lists name them.
    expect(html).toMatch(/<details class="panel panel-todo" open>/);
    const todo = html.slice(html.indexOf('panel-todo'), html.indexOf('panel-timeline'));
    expect(todo).toContain('Haster (1)');
    expect(todo).toContain('Akseptert snart');
    expect(todo).toContain('Trenger hjelper (4)');
    for (const title of ['Ikke tildelt oppgave', 'Åpen nær frist', 'Avslått oppgave', 'Umulig oppgave'])
      expect(todo).toContain(title);
    for (const title of ['Åpen langt unna', 'Akseptert senere', 'Ferdig oppgave']) expect(todo).not.toContain(title);
    expect(todo).toContain('Ola');
    expect(html).toContain('Om 120 dager');
    expect(html).toContain('Neste frist: 2. november 2026');
    expect(html).toContain('0 nye svar');
    expect(html).toContain(`href="/events/${eventId}?panel=messages"`);
    expect(html).toContain('<span class="panel-action">Vis svar</span>');
    expect(html).not.toContain('Vis svar (0 nye)');
    // The other panels start closed, and the full task list is still there.
    expect(html).toMatch(/<details class="panel panel-done">/);
    expect(html).toMatch(/<details class="panel panel-timeline">/);
    expect(html).toContain('Oppgaver (8)');
    // No inline scripts.
    expect(html).not.toMatch(/<script(?![^>]*src=)/i);
  });

  it('shows "Ingenting haster" and "Ingen flere frister" when nothing needs attention', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await setTasks(eventId, [{ title: 'A', status: 'done', deadline: '2026-11-20' }]);
    const html = (await kari.get(`/events/${eventId}`)).text;
    expect(html).toContain('Ingenting haster');
    expect(html).toContain('Ingen flere frister');
    expect(html).toMatch(/<details class="panel panel-todo">/);
  });

  it('shows "I dag" on the day of the event', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2026-11-01');
    expect((await kari.get(`/events/${eventId}`)).text).toContain('I dag');
  });

  it('shows the new status and counts after a helper answers and the organizer reloads', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await addHelper(kari, eventId, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const ids = await setTasks(eventId, [
      { title: 'A', status: 'open', deadline: '2026-11-03', helperId: ola.id },
      { title: 'B', status: 'accepted', deadline: '2027-01-01', helperId: ola.id },
    ]);
    let html = (await kari.get(`/events/${eventId}`)).text;
    expect(html).toContain('0 haster · 1 trenger hjelper');
    expect(overviewRow((await kari.get('/')).text, eventId)).toContain('1 trenger hjelper');

    await helperPost(ola.linkToken, ids.A!, { action: 'yes' });
    html = (await kari.get(`/events/${eventId}`)).text;
    expect(html).toContain('1 haster · 0 trenger hjelper');
    expect(html).toContain('1 nytt svar');
    expect(overviewRow((await kari.get('/')).text, eventId)).toContain('1 haster');

    await helperPost(ola.linkToken, ids.A!, { action: 'done' });
    await helperPost(ola.linkToken, ids.B!, { action: 'done' });
    html = (await kari.get(`/events/${eventId}`)).text;
    expect(html).toContain('2 av 2 ferdig');
    expect(html).toContain('Ingenting haster');
    expect(overviewRow((await kari.get('/')).text, eventId)).toContain('I rute');
  });
});

describe('Messages panel and seen replies (AD-15)', () => {
  /** Kari's event with 1 seen and 3 unseen replies from Ola, oldest first: yes (seen), done, no, cantDo. */
  async function withReplies() {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await addHelper(kari, eventId, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const ids = await setTasks(eventId, [
      { title: 'Bestille kake', status: 'open', deadline: '2027-01-01', helperId: ola.id },
      { title: 'Kjøpe pynt', status: 'open', deadline: '2027-01-02', helperId: ola.id },
      { title: 'Leie lokale', status: 'accepted', deadline: '2027-01-03', helperId: ola.id },
    ]);
    await helperPost(ola.linkToken, ids['Bestille kake']!, { action: 'yes', message: 'Første svar' });
    await ctx.db.update(messages).set({ seenAt: '2026-11-01T09:00:00.000Z' });
    await helperPost(ola.linkToken, ids['Bestille kake']!, { action: 'done', message: 'Andre svar' });
    await helperPost(ola.linkToken, ids['Kjøpe pynt']!, { action: 'no', message: 'Tredje svar' });
    await helperPost(ola.linkToken, ids['Leie lokale']!, { action: 'cantDo', message: 'Fjerde svar' });
    return { kari, eventId, ola, ids };
  }

  it('lists all replies newest first, marks the 3 unseen "Ny", and afterwards all are seen with count 0', async () => {
    const { kari, eventId } = await withReplies();
    expect((await kari.get(`/events/${eventId}`)).text).toContain('Vis svar (3 nye)');

    const res = await kari.get(`/events/${eventId}?panel=messages`);
    expect(res.status).toBe(200);
    const html = res.text;
    expect(html).toMatch(/<details class="panel panel-messages" open>/);
    // The header counts the replies that were new when listed.
    const panelStart = html.indexOf('panel-messages');
    const header = html.slice(panelStart, html.indexOf('</summary>', panelStart));
    expect(header).toContain('3 nye svar');
    const fourth = html.indexOf('Fjerde svar');
    const third = html.indexOf('Tredje svar');
    expect(fourth).toBeGreaterThan(-1);
    expect(fourth).toBeLessThan(third);
    const second = html.indexOf('Andre svar');
    const first = html.indexOf('Første svar');
    expect(third).toBeGreaterThan(-1);
    expect(third).toBeLessThan(second);
    expect(second).toBeLessThan(first);
    expect(html.match(/class="badge">Ny</g)).toHaveLength(3);
    // The badges sit on the two newest replies.
    const lastBadge = html.lastIndexOf('class="badge">Ny<');
    expect(lastBadge).toBeLessThan(first);
    expect(lastBadge).toBeGreaterThan(third);
    const actions = [...html.matchAll(/<span class="reply-action">([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(actions).toEqual(['Kan ikke gjøres', 'Sa nei', 'Ferdig', 'Sa ja']);
    expect(html).toContain('Bestille kake');
    expect(html).toContain('<strong>Ola</strong>');
    expect(html).toContain('1. november 2026');

    const rows = await ctx.db.select().from(messages);
    expect(rows.every((m) => m.seenAt !== null)).toBe(true);
    // Only the rows it marked got the request's time; the earlier seen row kept its time.
    expect(rows.filter((m) => m.seenAt === FIXED_NOW)).toHaveLength(3);
    expect(rows.filter((m) => m.seenAt === '2026-11-01T09:00:00.000Z')).toHaveLength(1);

    const after = await kari.get(`/events/${eventId}`);
    expect(after.text).toContain('0 nye svar');
    expect(after.text).toContain('<span class="panel-action">Vis svar</span>');
    const reopened = await kari.get(`/events/${eventId}?panel=messages`);
    expect(reopened.text).not.toContain('class="badge">Ny<');
    expect(reopened.text).toContain('Tredje svar');
  });

  it('never marks replies seen anywhere else, so the count stays the same across reloads', async () => {
    const { kari, eventId, ola } = await withReplies();
    const first = await kari.get(`/events/${eventId}`);
    const second = await kari.get(`/events/${eventId}`);
    expect(first.text).toContain('3 nye svar');
    expect(second.text).toContain('3 nye svar');
    await kari.get('/');
    await kari.get(`/events/${eventId}?panel=other`);
    await request(ctx.app).get(`/h/${ola.linkToken}`);
    expect(await unseen()).toHaveLength(3);
  });

  it('gives 404 for another organizer’s event, with or without the panel, and marks nothing', async () => {
    const { eventId } = await withReplies();
    const berit = await loggedIn('berit@example.no', 'Berit');
    expect((await berit.get(`/events/${eventId}?panel=messages`)).status).toBe(404);
    expect((await berit.get(`/events/${eventId}`)).status).toBe(404);
    expect(await unseen()).toHaveLength(3);
  });

  it('lists at most 50 replies, unseen first, so repeated openings clear every New reply', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari, 'wedding', '2027-03-01');
    await addHelper(kari, eventId, { email: 'ola@example.no', name: 'Ola' });
    const ola = await helperByEmail('ola@example.no');
    const ids = await setTasks(eventId, [{ title: 'A', status: 'accepted', deadline: '2027-01-01', helperId: ola.id }]);
    await ctx.db.insert(messages).values(
      Array.from({ length: 52 }, (_, i) => ({
        taskId: ids.A!,
        helperId: ola.id,
        action: 'yes' as const,
        statusAfter: 'accepted' as const,
        body: `Svar ${i + 1}`,
        createdAt: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:${String(i).padStart(2, '0')}:00.000Z`,
        seenAt: null,
      })),
    );
    const res = await kari.get(`/events/${eventId}?panel=messages`);
    expect(res.text.match(/class="reply"/g)).toHaveLength(50);
    expect(res.text.match(/class="badge">Ny</g)).toHaveLength(50);
    expect(await unseen()).toHaveLength(2);
    expect((await kari.get(`/events/${eventId}`)).text).toContain('Vis svar (2 nye)');

    // The second opening lists the 2 older unseen replies first and marks them.
    const again = await kari.get(`/events/${eventId}?panel=messages`);
    expect(again.text.match(/class="reply"/g)).toHaveLength(50);
    expect(again.text.match(/class="badge">Ny</g)).toHaveLength(2);
    expect(await unseen()).toHaveLength(0);
    const after = (await kari.get(`/events/${eventId}`)).text;
    expect(after).toContain('0 nye svar');
    expect(after).toContain('<span class="panel-action">Vis svar</span>');
  });
});
