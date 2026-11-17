import { mkdirSync, readFileSync } from 'node:fs';
import { eq, isNull } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { helpers, messages, type TaskStatus, tasks } from '../src/db/schema.ts';
import { TEST_DB_DIR } from './dbDir.ts';
import { FIXED_NOW, setupTestApp, type TestContext } from './helpers.ts';

// Story 5.1, step 4 (AC 4, AC 5): the restructured event view. «Trenger deg nå», Fremdrift with the
// week groups (D3), the Hjelpere and Meldinger cards (D6), read-only task rows with one edit box at a
// time (D2), the assign error (D7), the collapsible cards (D8) and done tasks last and compact (D9).
// The fixed clock makes today Sunday 1 November 2026, so «Denne uka» is only today and «Neste uke»
// is 2–8 November.
let ctx: TestContext;

beforeEach(async () => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  ctx = await setupTestApp({ APP_BASE_URL: 'https://masterplan.example.no' });
});

afterEach(() => {
  ctx.close();
});

async function loggedIn() {
  const agent = request.agent(ctx.app);
  await agent.post('/registrer').type('form').send({ name: 'Kari', email: 'kari@example.no', password: 'hemmelig123' });
  return agent;
}

type Agent = Awaited<ReturnType<typeof loggedIn>>;

async function createEvent(agent: Agent, eventDate = '2027-03-01') {
  const res = await agent.post('/events').type('form').send({ templateKey: 'wedding', eventDate });
  const match = /^\/events\/(\d+)$/.exec(res.headers.location ?? '');
  if (!match) throw new Error('event not created');
  return Number(match[1]);
}

const addHelper = (agent: Agent, eventId: number, email: string, name: string) =>
  agent.post(`/events/${eventId}/helpers`).type('form').send({ email, name });

const helperByEmail = async (email: string) =>
  (await ctx.db.select().from(helpers).where(eq(helpers.email, email)))[0]!;
const taskById = async (id: number) => (await ctx.db.select().from(tasks).where(eq(tasks.id, id)))[0]!;
const unseen = () => ctx.db.select().from(messages).where(isNull(messages.seenAt));

interface TaskSpec {
  title: string;
  status: TaskStatus;
  deadline: string;
  helperId?: number;
}

/** Replaces the event's template tasks with exactly these. Returns their ids by title. */
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
        assignedAt: assigned ? '2026-10-31T10:00:00.000Z' : null,
        acceptedAt: s.status === 'accepted' || s.status === 'done' ? '2026-10-31T12:00:00.000Z' : null,
        createdAt: FIXED_NOW,
      })
      .returning({ id: tasks.id });
    ids[s.title] = row!.id;
  }
  return ids;
}

/**
 * Kari's wedding with Ola and Kim and eight tasks, one per case:
 * - Needs a helper: «Lage gjesteliste» (Unassigned, due 3 Nov) and «Leie lokale» (Kim said no, with a message).
 * - Urgent: «Bestille kake» (Accepted, due 2 Nov).
 * - Next week, not in «Trenger deg nå»: «Sende invitasjoner» (Open, 6 Nov) and «Kjøpe servietter» (Accepted, 8 Nov).
 * - Later: «Bestille blomster» (Accepted, 9 Nov).
 * - Done: «Velge meny» (Ola, 20 Oct) and «Booke fotograf» (Kim, 5 Nov).
 */
async function wedding() {
  const kari = await loggedIn();
  const eventId = await createEvent(kari);
  await addHelper(kari, eventId, 'ola@example.no', 'Ola');
  await addHelper(kari, eventId, 'kim@example.no', 'Kim');
  const ola = await helperByEmail('ola@example.no');
  const kim = await helperByEmail('kim@example.no');
  const ids = await setTasks(eventId, [
    { title: 'Velge meny', status: 'done', deadline: '2026-10-20', helperId: ola.id },
    { title: 'Bestille kake', status: 'accepted', deadline: '2026-11-02', helperId: ola.id },
    { title: 'Lage gjesteliste', status: 'unassigned', deadline: '2026-11-03' },
    { title: 'Booke fotograf', status: 'done', deadline: '2026-11-05', helperId: kim.id },
    { title: 'Sende invitasjoner', status: 'open', deadline: '2026-11-06', helperId: ola.id },
    { title: 'Kjøpe servietter', status: 'accepted', deadline: '2026-11-08', helperId: ola.id },
    { title: 'Bestille blomster', status: 'accepted', deadline: '2026-11-09', helperId: ola.id },
    { title: 'Leie lokale', status: 'declined', deadline: '2027-01-10', helperId: kim.id },
  ]);
  await ctx.db.insert(messages).values({
    taskId: ids['Leie lokale']!,
    helperId: kim.id,
    action: 'no',
    statusAfter: 'declined',
    body: 'Jeg er bortreist den helgen',
    createdAt: '2026-10-31T18:00:00.000Z',
    seenAt: null,
  });
  return { kari, eventId, ola, kim, ids };
}

/** One card of the event view: from its aria-labelledby to the end of its <section>. */
function card(html: string, name: string): string {
  const start = html.indexOf(`aria-labelledby="${name}-title"`);
  expect(start, name).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf('</section>', start));
}

const isOpen = (html: string, id: string) => {
  const tag = new RegExp(`<details class="collapsible" id="${id}"( open)?>`).exec(html);
  expect(tag, id).not.toBeNull();
  return tag![1] === ' open';
};

/** One task row of «Alle oppgaver», up to its closing </li> (an open edit box is inside the row). */
function row(html: string, taskId: number): string {
  const start = html.indexOf(`id="task-${taskId}"`);
  expect(start, `task-${taskId}`).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf('</li>', start));
}

/** Asserts that the strings appear in this order in the text. */
function expectOrder(text: string, parts: string[]) {
  const positions = parts.map((p) => text.indexOf(p));
  for (const [i, p] of positions.entries()) expect(p, parts[i]).toBeGreaterThan(-1);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
}

describe('«Trenger deg nå»', () => {
  it('lists Needs a helper first, then Urgent, with the right controls and the helper’s message', async () => {
    const { kari, eventId, ids } = await wedding();
    const html = (await kari.get(`/events/${eventId}`)).text;
    const needs = card(html, 'needs-you');
    expect(needs).toContain('Trenger deg nå');
    expect(needs).toContain('1 haster · 2 trenger hjelper');
    expectOrder(needs, ['Lage gjesteliste', 'Leie lokale', 'Bestille kake']);
    for (const title of ['Sende invitasjoner', 'Kjøpe servietter', 'Bestille blomster', 'Velge meny'])
      expect(needs).not.toContain(title);
    expect(needs).toContain('Jeg er bortreist den helgen');

    // Delegation rows: a helper select with «Gi oppgaven», and a quiet «Marker som ferdig».
    for (const title of ['Lage gjesteliste', 'Leie lokale']) {
      const id = ids[title]!;
      expect(needs).toContain(`<select id="needs-assign-${id}" name="helperId"`);
      expect(needs).toContain(`action="/events/${eventId}/tasks/${id}/assign"`);
      expect(needs).toContain(`action="/events/${eventId}/tasks/${id}/done"`);
    }
    expect(needs).toContain('Gi oppgaven');
    // The urgent row has «Marker som ferdig» and no select.
    const kake = ids['Bestille kake']!;
    expect(needs).toContain(`action="/events/${eventId}/tasks/${kake}/done"`);
    expect(needs).not.toContain(`id="needs-assign-${kake}"`);
    expect(html).not.toMatch(/<script(?![^>]*src=)/i);
  });

  it('is hidden when nothing needs Kari, and Fremdrift says so instead', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari);
    await setTasks(eventId, [{ title: 'Alt klart', status: 'done', deadline: '2026-11-20' }]);
    const html = (await kari.get(`/events/${eventId}`)).text;
    expect(html).not.toContain('aria-labelledby="needs-you-title"');
    expect(card(html, 'progress')).toContain('Ingenting trenger deg akkurat nå.');
  });

  it('asks for a helper first when the event has none', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari);
    await setTasks(eventId, [{ title: 'Lage gjesteliste', status: 'unassigned', deadline: '2026-11-03' }]);
    const needs = card((await kari.get(`/events/${eventId}`)).text, 'needs-you');
    expect(needs).toContain('Legg til en hjelper først');
    expect(needs).not.toContain('<select');
  });
});

describe('Fremdrift and the week groups (D3)', () => {
  it('shows the progress, one count per group, and this and next week without the tasks above', async () => {
    const { kari, eventId } = await wedding();
    const html = (await kari.get(`/events/${eventId}`)).text;
    const progress = card(html, 'progress');
    expect(progress).toContain('2 av 8 ferdig');
    expect(progress).toContain('<progress value="2" max="8" aria-label="2 av 8 oppgaver ferdig">');
    for (const count of ['2 trenger hjelper', '1 venter på svar', '3 i gang', '2 ferdig'])
      expect(progress).toContain(count);
    expect(progress).not.toContain('Ingenting trenger deg akkurat nå.');

    const thisWeek = progress.slice(progress.indexOf('Denne uka'), progress.indexOf('Neste uke'));
    const nextWeek = progress.slice(progress.indexOf('Neste uke'));
    expect(thisWeek).toContain('Ingen frister');
    expectOrder(nextWeek, ['fredag 6. november', 'Sende invitasjoner', 'søndag 8. november', 'Kjøpe servietter']);
    // Already in «Trenger deg nå», Done, or after next week.
    for (const title of ['Lage gjesteliste', 'Bestille kake', 'Booke fotograf', 'Bestille blomster'])
      expect(progress).not.toContain(title);
    expect(nextWeek).not.toContain('Ingen frister');
  });
});

describe('the Hjelpere card (D6, D8)', () => {
  it('is closed with helpers, shows «Kopier lenke» per helper and the link only behind «Vis lenken»', async () => {
    const { kari, eventId, ola } = await wedding();
    const html = (await kari.get(`/events/${eventId}`)).text;
    expect(isOpen(html, 'helpers-card')).toBe(false);
    const helpersCard = card(html, 'helpers');
    expect(helpersCard).toContain('<span class="collapsible-title" id="helpers-title">Hjelpere</span>');
    expect(helpersCard).toContain('2 av 5');
    expect(helpersCard).toContain('<span class="helper-name">Ola</span>');
    expect(helpersCard).toContain(`data-copy="link-${ola.id}">Kopier lenke</button>`);
    expect(helpersCard).toContain('role="status"');

    // The raw URL is only in the read-only field inside «Vis lenken».
    const url = `https://masterplan.example.no/h/${ola.linkToken}`;
    expect(html.split(url)).toHaveLength(2);
    const details = helpersCard.lastIndexOf('<details class="link-details">', helpersCard.indexOf(url));
    expect(details).toBeGreaterThan(-1);
    expect(helpersCard.slice(details, helpersCard.indexOf(url))).toContain('<summary>Vis lenken</summary>');
    expect(helpersCard.slice(details, helpersCard.indexOf(url))).not.toContain('</details>');
    expect(helpersCard).toContain(`<input id="link-${ola.id}" type="text" class="link-field" value="${url}" readonly>`);
  });

  it('is open with the add form when there are no helpers', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari);
    const html = (await kari.get(`/events/${eventId}`)).text;
    expect(isOpen(html, 'helpers-card')).toBe(true);
    const helpersCard = card(html, 'helpers');
    expect(helpersCard).toContain('Ingen hjelpere ennå.');
    expect(helpersCard).toContain(`action="/events/${eventId}/helpers"`);
  });

  it('is open with the error when the add form fails', async () => {
    const { kari, eventId } = await wedding();
    const res = await kari.post(`/events/${eventId}/helpers`).type('form').send({ email: 'abc' });
    expect(res.status).toBe(422);
    expect(isOpen(res.text, 'helpers-card')).toBe(true);
    expect(card(res.text, 'helpers')).toContain('Skriv inn en gyldig e-postadresse.');
  });

  it('copy.js announces «Lenken er kopiert» and falls back to the details', async () => {
    const js = readFileSync(new URL('../public/copy.js', import.meta.url), 'utf8');
    expect(js).toContain('Lenken er kopiert');
    expect(js).toContain("'use strict'");
    expect(js).toMatch(/\.open\s*=\s*true/);
  });
});

describe('the Meldinger card', () => {
  it('previews the newest replies without marking them seen; only ?panel=messages does', async () => {
    const { kari, eventId, ola, ids } = await wedding();
    for (const [i, body] of ['Eldste svar', 'Midterste svar'].entries()) {
      await ctx.db.insert(messages).values({
        taskId: ids['Kjøpe servietter']!,
        helperId: ola.id,
        action: 'yes',
        statusAfter: 'accepted',
        body,
        createdAt: `2026-10-${29 + i}T10:00:00.000Z`,
        seenAt: null,
      });
    }
    for (let i = 0; i < 2; i++) {
      const html = (await kari.get(`/events/${eventId}`)).text;
      const box = card(html, 'messages');
      expect(box).toContain('3 nye svar');
      expectOrder(box, ['Jeg er bortreist den helgen', 'Midterste svar']);
      expect(box).not.toContain('Eldste svar');
      expect(box).toContain(`href="/events/${eventId}?panel=messages"`);
      expect(box).toContain('Vis alle svar');
    }
    expect(await unseen()).toHaveLength(3);

    const panel = card((await kari.get(`/events/${eventId}?panel=messages`)).text, 'messages');
    expect(panel).toContain('Eldste svar');
    expect(panel).toContain('Skjul svar');
    expect(await unseen()).toHaveLength(0);
  });

  it('says «Ingen nye svar ennå» when no helper has answered', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari);
    const box = card((await kari.get(`/events/${eventId}`)).text, 'messages');
    expect(box).toContain('Ingen nye svar ennå');
    expect(box).toContain('Svar fra hjelperne dukker opp her.');
  });
});

describe('«Alle oppgaver»: read-only rows grouped by status (D8, D9)', () => {
  it('is closed on load, groups by status with «Ferdig» last, and has no form on any row', async () => {
    const { kari, eventId, ids } = await wedding();
    const html = (await kari.get(`/events/${eventId}`)).text;
    expect(isOpen(html, 'tasks-card')).toBe(false);
    const list = card(html, 'tasks');
    expect(list).toContain('<span class="collapsible-title" id="tasks-title">Alle oppgaver</span>');
    expect(list).toContain('8 oppgaver · 2 ferdig');
    expect(list).not.toContain('<form');
    expectOrder(list, [
      '>Trenger hjelper</h3>',
      'Lage gjesteliste',
      'Leie lokale',
      '>Venter på svar</h3>',
      'Sende invitasjoner',
      '>I gang</h3>',
      'Bestille kake',
      'Kjøpe servietter',
      'Bestille blomster',
      '>Ferdig</h3>',
      'Velge meny',
      'Booke fotograf',
    ]);

    const pills: [string, string][] = [
      ['Lage gjesteliste', 'Ingen hjelper'],
      ['Leie lokale', 'Avslått · Kim'],
      ['Sende invitasjoner', 'Venter på svar · Ola'],
      ['Bestille kake', 'Haster · Ola'],
      ['Kjøpe servietter', 'I gang · Ola'],
    ];
    for (const [title, pill] of pills) {
      const r = row(list, ids[title]!);
      expect(r).toContain(pill);
      expect(r).toContain(`href="/events/${eventId}?endre=${ids[title]}#task-${ids[title]}"`);
      expect(r).toContain('>Endre</a>');
    }
  });

  it('shows a Done row compact: «Ferdig · ‹helper›», «Frist ‹dato›» and «Endre», no buttons', async () => {
    const { kari, eventId, ids } = await wedding();
    const list = card((await kari.get(`/events/${eventId}`)).text, 'tasks');
    const done = row(list, ids['Booke fotograf']!);
    expect(list).toContain(`<li class="task-row task-row-done" id="task-${ids['Booke fotograf']}">`);
    expect(done).toContain('Ferdig · Kim');
    expect(done).toContain('Frist 5. november 2026');
    expect(done).toContain(`href="/events/${eventId}?endre=${ids['Booke fotograf']}#task-${ids['Booke fotograf']}"`);
    expect(done).not.toContain('<button');
  });

  it('is open with the empty state when the event has no tasks, and «Ny oppgave» is its own open card', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari);
    await setTasks(eventId, []);
    const html = (await kari.get(`/events/${eventId}`)).text;
    expect(isOpen(html, 'tasks-card')).toBe(true);
    const list = card(html, 'tasks');
    expect(list).toContain('Ingen oppgaver her ennå');
    expect(list).toContain('Legg til den første oppgaven.');
    const add = card(html, 'new-task');
    expect(add).toContain('Ny oppgave');
    expect(add).toContain(`action="/events/${eventId}/tasks"`);
    expect(add).not.toContain('<details');
    expect(html.indexOf('aria-labelledby="new-task-title"')).toBeGreaterThan(
      html.indexOf('aria-labelledby="tasks-title"'),
    );
  });

  it('labels each collapsible card by its summary text and puts no heading inside <summary>', async () => {
    const { kari, eventId } = await wedding();
    const html = (await kari.get(`/events/${eventId}`)).text;
    for (const name of ['tasks', 'helpers']) {
      expect(html).toContain(`<section class="card card-collapsible" aria-labelledby="${name}-title">`);
    }
    for (const [, summary] of html.matchAll(/<summary>([\s\S]*?)<\/summary>/g)) expect(summary).not.toMatch(/<h\d/);
  });
});

describe('the edit box (D2)', () => {
  it('?endre opens «Alle oppgaver» and one box under that task, with every action', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Sende invitasjoner']!;
    const html = (await kari.get(`/events/${eventId}?endre=${id}`)).text;
    expect(isOpen(html, 'tasks-card')).toBe(true);
    expect(html.match(/class="edit-box"/g)).toHaveLength(1);
    const box = row(html, id);
    expect(box).toContain(`<div class="edit-box" id="edit-${id}">`);
    expect(box).toContain(`id="title-${id}" name="title" type="text" maxlength="120" value="Sende invitasjoner"`);
    expect(box).toContain(`id="deadline-${id}" name="deadline" type="date" value="2026-11-06"`);
    expectOrder(box, [
      `action="/events/${eventId}/tasks/${id}"`,
      '>Lagre</button>',
      `action="/events/${eventId}/tasks/${id}/assign"`,
      '>Gi oppgaven</button>',
      `action="/events/${eventId}/tasks/${id}/done"`,
      '>Marker som ferdig</button>',
      `action="/events/${eventId}/tasks/${id}/delete"`,
      '>Slett oppgaven</button>',
    ]);
    expect(box).toContain(`href="/events/${eventId}#task-${id}">Avbryt</a>`);
    // The row's own link closes the box.
    expect(box).toContain('>Lukk</a>');
    expect(box).not.toContain('>Endre</a>');
    // Other rows stay read-only.
    expect(row(html, ids['Kjøpe servietter']!)).not.toContain('<form');
  });

  it('offers no «Marker som ferdig» for a Done task, but keeps «Slett oppgaven»', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Velge meny']!;
    const box = row((await kari.get(`/events/${eventId}?endre=${id}`)).text, id);
    expect(box).toContain('class="edit-box"');
    expect(box).not.toContain('/done"');
    expect(box).toContain('>Slett oppgaven</button>');
  });

  it.each([
    ['a task in another event', 'other'],
    ['a value that is not an id', 'abc'],
    ['zero', '0'],
    ['a missing task', '999999'],
    ['an empty value', ''],
  ])('?endre with %s gives the full page without a box', async (_label, value) => {
    const { kari, eventId } = await wedding();
    const otherEvent = await createEvent(kari, '2027-06-01');
    const [otherTask] = await ctx.db.select().from(tasks).where(eq(tasks.eventId, otherEvent));
    const endre = value === 'other' ? String(otherTask!.id) : value;
    const res = await kari.get(`/events/${eventId}?endre=${encodeURIComponent(endre)}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('class="edit-box"');
    expect(isOpen(res.text, 'tasks-card')).toBe(false);
  });

  it('a validation error reopens the card and the box with the error', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Kjøpe servietter']!;
    const res = await kari
      .post(`/events/${eventId}/tasks/${id}`)
      .type('form')
      .send({ title: '', deadline: '2026-11-08' });
    expect(res.status).toBe(422);
    expect(isOpen(res.text, 'tasks-card')).toBe(true);
    const box = row(res.text, id);
    expect(box).toContain('class="edit-box"');
    expect(box).toContain('Skriv inn en oppgave.');
    expect(box).toMatch(/aria-describedby="title-\d+-error"/);
  });
});

describe('«Gi oppgaven» without a helper (D7)', () => {
  it('from the edit box: 422, «Velg en hjelper.» under that select with focus, task unchanged', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Sende invitasjoner']!;
    const before = await taskById(id);
    const res = await kari.post(`/events/${eventId}/tasks/${id}/assign`).type('form').send({ helperId: '' });
    expect(res.status).toBe(422);
    expect(isOpen(res.text, 'tasks-card')).toBe(true);
    const box = row(res.text, id);
    expect(box).toMatch(
      new RegExp(`<select id="assign-${id}" name="helperId" aria-describedby="assign-${id}-error" autofocus>`),
    );
    expectOrder(box, [`id="assign-${id}"`, `<p class="field-error" id="assign-${id}-error">Velg en hjelper.</p>`]);
    expect(res.text.match(/autofocus/g)).toHaveLength(1);
    expect(await taskById(id)).toEqual(before);
  });

  it('with no helperId field at all: the same 422', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Sende invitasjoner']!;
    const res = await kari.post(`/events/${eventId}/tasks/${id}/assign`).type('form').send({});
    expect(res.status).toBe(422);
    expect(row(res.text, id)).toContain('Velg en hjelper.');
  });

  it('from «Trenger deg nå»: the error is under that row’s select, and «Alle oppgaver» stays closed', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Lage gjesteliste']!;
    const before = await taskById(id);
    const res = await kari
      .post(`/events/${eventId}/tasks/${id}/assign`)
      .type('form')
      .send({ helperId: '', fra: 'trenger' });
    expect(res.status).toBe(422);
    const needs = card(res.text, 'needs-you');
    expect(needs).toMatch(
      new RegExp(
        `<select id="needs-assign-${id}" name="helperId" aria-describedby="needs-assign-${id}-error" autofocus>`,
      ),
    );
    expect(needs).toContain(`<p class="field-error" id="needs-assign-${id}-error">Velg en hjelper.</p>`);
    expect(isOpen(res.text, 'tasks-card')).toBe(false);
    expect(res.text).not.toContain('class="edit-box"');
    expect(await taskById(id)).toEqual(before);
  });

  it('still gives 404 for a helper id that is not a valid id, and for another event’s task', async () => {
    const { kari, eventId, ids } = await wedding();
    const id = ids['Sende invitasjoner']!;
    for (const helperId of ['abc', '0', '999999']) {
      const res = await kari.post(`/events/${eventId}/tasks/${id}/assign`).type('form').send({ helperId });
      expect(res.status, helperId).toBe(404);
    }
    const otherEvent = await createEvent(kari, '2027-06-01');
    const res = await kari.post(`/events/${otherEvent}/tasks/${id}/assign`).type('form').send({ helperId: '' });
    expect(res.status).toBe(404);
  });
});

describe('event details', () => {
  it('shows date, days left, place and guests, and hides the rest behind «Vis alle detaljer»', async () => {
    const kari = await loggedIn();
    const eventId = await createEvent(kari);
    const html = (await kari.get(`/events/${eventId}`)).text;
    const details = html.indexOf('<details class="event-details">');
    expect(details).toBeGreaterThan(-1);
    expect(html.indexOf('1. mars 2027')).toBeLessThan(details);
    expect(html.indexOf('Om 120 dager')).toBeLessThan(details);
    expect(html.indexOf('<dt>Hvor</dt>')).toBeLessThan(details);
    expect(html.indexOf('<dt>Hva må gjøres</dt>')).toBeGreaterThan(details);
    expect(html).toContain('<summary>Vis alle detaljer</summary>');
  });
});
