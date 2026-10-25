import type { Clock } from '../src/clock.ts';
import type { Db } from '../src/db/client.ts';
import { addDays, osloDate } from '../src/domain/dates.ts';
import type { Actor, HelperAction } from '../src/domain/taskRules.ts';
import { register } from '../src/services/auth.ts';
import { createEvent } from '../src/services/events.ts';
import { addHelperToEvent } from '../src/services/helpers.ts';
import { listAndMarkSeen } from '../src/services/messages.ts';
import { apply, applyAsHelper, listForEvent, updateTask } from '../src/services/tasks.ts';
import { loadTemplates } from '../src/templates/index.ts';
import {
  SEED_EVENT_NAMES,
  SEED_HELPERS,
  TEST_LOGIN,
  type SeedEventKey,
  type SeedHelperKey,
} from './fixture.ts';

// FR-25, AD-11: builds the test data only through the services, never by inserting rows. The seed
// day is clock.today(); every step happens a whole number of days before it, at a fixed UTC hour
// (08–18 UTC is always the same Oslo date), so the counts are the same on any seed day.

export interface SeedResult {
  organizerId: number;
  events: Record<SeedEventKey, number>;
  helpers: Record<SeedHelperKey, { id: number; token: string }>;
}

/** A clock the seed moves to past instants: `at(daysAgo, hourUtc)` sets it and returns the instant. */
function movableClock(seedDay: string) {
  let instant = `${seedDay}T10:00:00.000Z`;
  const clock: Clock = { now: () => instant, today: () => osloDate(instant) };
  const at = (daysAgo: number, hourUtc: number) => {
    instant = `${addDays(seedDay, -daysAgo)}T${String(hourUtc).padStart(2, '0')}:00:00.000Z`;
    return instant;
  };
  return { clock, at };
}

interface Step {
  daysAgo: number;
  hourUtc: number;
  run: (now: string) => Promise<unknown>;
}

const WEDDING_DAYS_AHEAD = 21;
const WEDDING_CREATED_DAYS_AGO = 60;
const BACHELORETTE_DAYS_AHEAD = 45;
const BACHELORETTE_CREATED_DAYS_AGO = 20;

/** The Wedding template's first 15 tasks are Done; the rest get one story each (see docs/fixtures.md). */
const WEDDING_DONE_COUNT = 15;
/** The Bachelorette template's first 6 tasks are Done, the rest Accepted. */
const BACHELORETTE_DONE_COUNT = 6;

const DONE_NOTES = ['Ferdig! Kvitteringen ligger i fellesmappa.', 'Ordnet.', 'Bekreftet på e-post.'];

export async function seed(db: Db, seedClock: Clock): Promise<SeedResult> {
  const seedDay = seedClock.today();
  const { clock, at } = movableClock(seedDay);
  const templates = loadTemplates();

  const helperIds = {} as Record<SeedHelperKey, number>;
  const taskIds: Record<SeedEventKey, Map<string, number>> = { wedding: new Map(), bachelorette: new Map() };
  const eventIds = {} as Record<SeedEventKey, number>;
  let organizerId = 0;
  const organizer = (): Actor => ({ kind: 'organizer', organizerId });

  const taskId = (event: SeedEventKey, title: string) => {
    const id = taskIds[event].get(title);
    if (id === undefined) throw new Error(`Seed: no task "${title}" in ${event}`);
    return id;
  };
  const token = (key: SeedHelperKey) => SEED_HELPERS.find((h) => h.key === key)!.token;

  const steps: Step[] = [];
  const step = (daysAgo: number, hourUtc: number, run: Step['run']) => steps.push({ daysAgo, hourUtc, run });

  const assign = (event: SeedEventKey, title: string, helper: SeedHelperKey, daysAgo: number, hourUtc = 9) =>
    step(daysAgo, hourUtc, (now) =>
      apply(db, organizer(), taskId(event, title), { action: 'assign', helperId: helperIds[helper] }, now),
    );
  const answer = (
    event: SeedEventKey,
    title: string,
    helper: SeedHelperKey,
    action: HelperAction,
    daysAgo: number,
    hourUtc: number,
    message?: string,
  ) =>
    step(daysAgo, hourUtc, async (now) => {
      const result = await applyAsHelper(db, token(helper), taskId(event, title), message ? { action, message } : { action }, now);
      if (result === 'invalidLink' || result === 'noop') throw new Error(`Seed: ${action} on "${title}" did nothing`);
    });

  // The organizer and the Wedding, 60 days ago, with all four helpers.
  step(WEDDING_CREATED_DAYS_AGO, 8, async () => {
    const kari = await register(db, clock, TEST_LOGIN);
    organizerId = kari.id;
  });
  step(WEDDING_CREATED_DAYS_AGO, 9, async () => {
    eventIds.wedding = await createEvent(db, clock, templates, organizerId, {
      templateKey: 'wedding',
      name: SEED_EVENT_NAMES.wedding,
      occasion: 'Bryllup med middag og fest',
      location: 'Molde',
      eventDate: addDays(seedDay, WEDDING_DAYS_AHEAD),
      guestCount: 80,
      todo: 'Vielse, middag, taler og fest.',
      otherInfo: 'Kari og Jon gifter seg. Alle hjelpere får sine oppgaver her.',
    });
    for (const t of await listForEvent(db, organizerId, eventIds.wedding)) taskIds.wedding.set(t.title, t.id);
  });
  step(WEDDING_CREATED_DAYS_AGO, 10, async () => {
    for (const h of SEED_HELPERS) {
      const helper = await addHelperToEvent(
        db,
        clock,
        organizerId,
        eventIds.wedding,
        { email: h.email, name: h.name ?? undefined },
        () => h.token,
      );
      helperIds[h.key] = helper.id;
    }
  });

  const weddingTitles = templates.get('wedding')!.defaultPlan.map((t) => t.title);
  const rotation: SeedHelperKey[] = ['ola', 'kim', 'siri', 'per'];

  // The early Wedding tasks: assigned 58 days ago and Done since. Kari marks the first two Done herself.
  weddingTitles.slice(0, WEDDING_DONE_COUNT).forEach((title, i) => {
    const helper = rotation[i % rotation.length]!;
    assign('wedding', title, helper, 58);
    if (i < 2) {
      step(55, 12, (now) => apply(db, organizer(), taskId('wedding', title), { action: 'markDone' }, now));
      return;
    }
    answer('wedding', title, helper, 'yes', 57, 17);
    answer('wedding', title, helper, 'done', 56 - 3 * i, 16, i % 4 === 0 ? DONE_NOTES[i % DONE_NOTES.length] : undefined);
  });

  // Accepted, then Kari moves the deadline: Urgent and "Endret etter at du svarte" (AD-13).
  assign('wedding', 'Bestille kake', 'siri', 30);
  answer('wedding', 'Bestille kake', 'siri', 'yes', 29, 15, 'Jeg spør bakeren i Storgata.');
  step(2, 11, () =>
    updateTask(db, clock, organizerId, eventIds.wedding, taskId('wedding', 'Bestille kake'), {
      title: 'Bestille kake',
      deadline: addDays(seedDay, 2),
    }),
  );
  // Accepted with the deadline today: Urgent.
  assign('wedding', 'Planlegge bordplassering', 'ola', 14);
  answer('wedding', 'Planlegge bordplassering', 'ola', 'yes', 13, 18, 'Jeg lager et utkast.');
  // Accepted and far off: neither Urgent nor Needs a helper. Per has no name, so he shows by email.
  assign('wedding', 'Pynte lokalet', 'per', 9);
  answer('wedding', 'Pynte lokalet', 'per', 'yes', 8, 16, 'Jeg tar med stige.');
  // Open since 10 days ago with no answer: stale, Needs a helper.
  assign('wedding', 'Lage bordkort', 'ola', 10);
  // Accepted, then Can't be done yesterday: Needs a helper, New reply.
  assign('wedding', 'Lage program for dagen', 'siri', 12);
  answer('wedding', 'Lage program for dagen', 'siri', 'yes', 11, 14);
  answer('wedding', 'Lage program for dagen', 'siri', 'cantDo', 1, 13, 'Skriveren min er ødelagt. Kan noen andre ta den?');
  // Declined yesterday: Needs a helper, New reply.
  assign('wedding', 'Kjøpe pynt', 'kim', 6);
  answer('wedding', 'Kjøpe pynt', 'kim', 'no', 1, 15, 'Beklager, jeg er bortreist den uka.');
  // Open since 2 days ago, deadline two weeks off: fine for now.
  assign('wedding', 'Bekrefte alle leverandører', 'kim', 2);
  // "Hente antrekk" stays Unassigned: Needs a helper.

  // Kari read the Wedding replies 3 days ago, so only yesterday's two are New.
  step(3, 12, (now) => listAndMarkSeen(db, organizerId, eventIds.wedding, now));

  // The Bachelorette party, 20 days ago, with the same three named helpers (same links).
  step(BACHELORETTE_CREATED_DAYS_AGO, 17, async () => {
    eventIds.bachelorette = await createEvent(db, clock, templates, organizerId, {
      templateKey: 'bachelorette',
      name: SEED_EVENT_NAMES.bachelorette,
      occasion: 'Overraskelse for Lise',
      location: 'Ålesund',
      eventDate: addDays(seedDay, BACHELORETTE_DAYS_AHEAD),
      guestCount: 12,
      todo: 'Aktivitet på dagen, middag og fest.',
      otherInfo: 'Lise må ikke få vite noe!',
    });
    for (const t of await listForEvent(db, organizerId, eventIds.bachelorette)) taskIds.bachelorette.set(t.title, t.id);
  });
  step(BACHELORETTE_CREATED_DAYS_AGO, 18, async () => {
    for (const h of SEED_HELPERS.filter((x) => x.key !== 'per')) {
      await addHelperToEvent(db, clock, organizerId, eventIds.bachelorette, { email: h.email, name: h.name ?? undefined }, () => h.token);
    }
  });

  const bacheloretteTitles = templates.get('bachelorette')!.defaultPlan.map((t) => t.title);
  const trio: SeedHelperKey[] = ['ola', 'kim', 'siri'];
  bacheloretteTitles.forEach((title, i) => {
    const helper = trio[i % trio.length]!;
    assign('bachelorette', title, helper, 19);
    answer('bachelorette', title, helper, 'yes', 18, 10 + (i % 8), i % 5 === 0 ? 'Den tar jeg!' : undefined);
    if (i < BACHELORETTE_DONE_COUNT) answer('bachelorette', title, helper, 'done', 15 - 2 * i, 17);
  });
  step(4, 12, (now) => listAndMarkSeen(db, organizerId, eventIds.bachelorette, now));
  // A message on a task Siri already accepted: one New reply, the status stays Accepted.
  answer('bachelorette', 'Lage matplan', 'siri', 'yes', 1, 17, 'Matplanen er klar, jeg deler den i chatten.');

  // Run the steps in time order, moving the clock to each one.
  const ordered = steps
    .map((s, order) => ({ ...s, order }))
    .sort((a, b) => b.daysAgo - a.daysAgo || a.hourUtc - b.hourUtc || a.order - b.order);
  for (const s of ordered) await s.run(at(s.daysAgo, s.hourUtc));

  const helpers = {} as SeedResult['helpers'];
  for (const h of SEED_HELPERS) helpers[h.key] = { id: helperIds[h.key], token: h.token };
  return { organizerId, events: eventIds, helpers };
}
