import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildPlan, type PlanEntry } from '../src/domain/plan.ts';
import { loadTemplates, parseTemplate, TemplateError } from '../src/templates/index.ts';
import { TEST_DB_DIR } from './dbDir.ts';

const TODAY = '2026-11-01';
const EVENT = '2027-01-15';

const entries = (n: number): PlanEntry[] =>
  Array.from({ length: n }, (_, i) => ({ title: `Oppgave ${i + 1}`, daysBeforeEvent: i }));

describe('buildPlan', () => {
  it('turns offsets into deadlines counted back from the event date', () => {
    const result = buildPlan(
      [
        { title: ' Bestille lokale ', daysBeforeEvent: 30 },
        { title: 'Pynte', daysBeforeEvent: 0 },
      ],
      EVENT,
      TODAY,
    );
    expect(result).toEqual({
      ok: true,
      tasks: [
        { title: 'Bestille lokale', deadline: '2026-12-16' },
        { title: 'Pynte', deadline: EVENT },
      ],
    });
  });

  it('moves a deadline before today to today and keeps the plan valid', () => {
    const result = buildPlan([{ title: 'Sette budsjett', daysBeforeEvent: 180 }], '2026-11-06', TODAY);
    expect(result).toEqual({ ok: true, tasks: [{ title: 'Sette budsjett', deadline: TODAY }] });
  });

  it('keeps a deadline that is exactly today', () => {
    const result = buildPlan([{ title: 'I dag', daysBeforeEvent: 5 }], '2026-11-06', TODAY);
    expect(result.ok && result.tasks[0]?.deadline).toBe(TODAY);
  });

  it('allows a deadline on the event date and refuses one a day after', () => {
    expect(buildPlan([{ title: 'På dagen', daysBeforeEvent: 0 }], EVENT, TODAY).ok).toBe(true);
    expect(buildPlan([{ title: 'Etterpå', daysBeforeEvent: -1 }], EVENT, TODAY)).toEqual({
      ok: false,
      reason: 'after_event',
    });
  });

  it('refuses no tasks, accepts 40 and refuses 41', () => {
    expect(buildPlan([], EVENT, TODAY)).toEqual({ ok: false, reason: 'no_tasks' });
    expect(buildPlan(entries(40), EVENT, TODAY).ok).toBe(true);
    expect(buildPlan(entries(41), EVENT, TODAY)).toEqual({ ok: false, reason: 'too_many_tasks' });
  });

  it('accepts a 120-character title and refuses 121 or blank', () => {
    expect(buildPlan([{ title: 'x'.repeat(120), daysBeforeEvent: 1 }], EVENT, TODAY).ok).toBe(true);
    expect(buildPlan([{ title: 'x'.repeat(121), daysBeforeEvent: 1 }], EVENT, TODAY)).toEqual({
      ok: false,
      reason: 'bad_title',
    });
    expect(buildPlan([{ title: '   ', daysBeforeEvent: 1 }], EVENT, TODAY)).toEqual({ ok: false, reason: 'bad_title' });
  });

  it('refuses a non-integer offset', () => {
    expect(buildPlan([{ title: 'Halv', daysBeforeEvent: 1.5 }], EVENT, TODAY)).toEqual({
      ok: false,
      reason: 'bad_offset',
    });
  });

  it('refuses an offset beyond ten years instead of throwing', () => {
    expect(buildPlan([{ title: 'Langt', daysBeforeEvent: 100_000_000 }], EVENT, TODAY)).toEqual({
      ok: false,
      reason: 'bad_offset',
    });
    expect(buildPlan([{ title: 'Ti år', daysBeforeEvent: 3650 }], '2037-01-15', TODAY).ok).toBe(true);
  });
});

describe('templates', () => {
  it('loads both shipped templates with their plans', () => {
    const templates = loadTemplates();
    expect(templates.get('wedding')).toMatchObject({ name: 'Bryllup' });
    expect(templates.get('wedding')?.defaultPlan).toHaveLength(23);
    expect(templates.get('bachelorette')).toMatchObject({ name: 'Utdrikningslag' });
    expect(templates.get('bachelorette')?.defaultPlan).toHaveLength(16);
  });

  it('every shipped template plan passes the plan validator', () => {
    for (const template of loadTemplates().values()) {
      expect(buildPlan(template.defaultPlan, EVENT, TODAY).ok).toBe(true);
    }
  });

  it.each([
    ['not JSON', '{'],
    [
      'negative offset',
      JSON.stringify({ key: 'wedding', name: 'Bryllup', defaultPlan: [{ title: 'x', daysBeforeEvent: -1 }] }),
    ],
    ['empty plan', JSON.stringify({ key: 'wedding', name: 'Bryllup', defaultPlan: [] })],
    [
      'offset over ten years',
      JSON.stringify({ key: 'wedding', name: 'Bryllup', defaultPlan: [{ title: 'x', daysBeforeEvent: 3651 }] }),
    ],
    [
      'title too long',
      JSON.stringify({
        key: 'wedding',
        name: 'Bryllup',
        defaultPlan: [{ title: 'x'.repeat(121), daysBeforeEvent: 1 }],
      }),
    ],
    [
      'wrong key',
      JSON.stringify({ key: 'bachelorette', name: 'Bryllup', defaultPlan: [{ title: 'x', daysBeforeEvent: 1 }] }),
    ],
  ])('refuses a template file with %s', (_label, json) => {
    expect(() => parseTemplate('wedding.json', json, 'wedding')).toThrow(TemplateError);
  });

  it('stops loading when one file in the folder is invalid', () => {
    mkdirSync(TEST_DB_DIR, { recursive: true });
    const dir = mkdtempSync(join(TEST_DB_DIR, 'templates-'));
    copyFileSync(new URL('../src/templates/bachelorette.json', import.meta.url), join(dir, 'bachelorette.json'));
    writeFileSync(join(dir, 'wedding.json'), JSON.stringify({ key: 'wedding', name: 'Bryllup', defaultPlan: [] }));
    expect(() => loadTemplates(pathToFileURL(`${dir}/`))).toThrow(/wedding\.json/);
  });
});
