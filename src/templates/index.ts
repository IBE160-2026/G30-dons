import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { MAX_OFFSET_DAYS, MAX_PLAN_TASKS, MAX_TITLE_LENGTH } from '../domain/plan.ts';

// AD-8: template files have one fixed shape and are validated once, when the app is created.

export const TEMPLATE_KEYS = ['wedding', 'bachelorette'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const templateSchema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  name: z.string().min(1).max(100),
  defaultPlan: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
        daysBeforeEvent: z.number().int().min(0).max(MAX_OFFSET_DAYS),
      }),
    )
    .min(1)
    .max(MAX_PLAN_TASKS),
});

export type Template = z.infer<typeof templateSchema>;
export type Templates = ReadonlyMap<TemplateKey, Template>;

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

/** Parses one template file's JSON. Throws TemplateError naming the file on any problem. */
export function parseTemplate(file: string, json: string, expectedKey: TemplateKey): Template {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new TemplateError(`Malen ${file} er ikke gyldig JSON`);
  }
  const parsed = templateSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new TemplateError(`Malen ${file} er ugyldig: ${issue?.path.join('.') ?? ''} ${issue?.message ?? ''}`.trim());
  }
  if (parsed.data.key !== expectedKey) {
    throw new TemplateError(`Malen ${file} har nøkkel "${parsed.data.key}", forventet "${expectedKey}"`);
  }
  return parsed.data;
}

export function loadTemplates(dir: URL = new URL('./', import.meta.url)): Templates {
  const templates = new Map<TemplateKey, Template>();
  for (const key of TEMPLATE_KEYS) {
    const file = `${key}.json`;
    templates.set(key, parseTemplate(file, readFileSync(new URL(file, dir), 'utf8'), key));
  }
  return templates;
}

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}
