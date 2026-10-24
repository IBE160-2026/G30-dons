import { z } from 'zod';

// AD-10: the only module that reads settings. Called once with process.env, or with an
// explicit environment in tests.

export type MailTransport = 'disabled';

export interface Config {
  testMode: boolean;
  port: number;
  databaseUrl: string;
  databaseAuthToken: string | undefined;
  sessionSecret: string;
  appBaseUrl: string;
  mailTransport: MailTransport;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(`Ugyldig konfigurasjon: ${message}`);
    this.name = 'ConfigError';
  }
}

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const envSchema = z.object({
  TEST_MODE: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).optional()),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  DATABASE_AUTH_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  SESSION_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  APP_BASE_URL: z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional()),
  MAIL_TRANSPORT: z.preprocess(emptyToUndefined, z.string().optional()),
});

const MAIL_TRANSPORTS: readonly MailTransport[] = ['disabled'];

// With test mode off, the development value from .env.example must never sign real sessions.
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = ['local-dev-secret-change-me'];

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ConfigError(`${issue?.path.join('.') ?? 'ukjent'} er ugyldig`);
  }
  const e = parsed.data;

  // Test mode is off unless explicitly switched on, so it never turns on by accident.
  const testMode = e.TEST_MODE === 'true';
  const port = e.PORT ?? 3000;

  const databaseUrl = e.DATABASE_URL ?? (testMode ? 'file:./data/local.db' : undefined);
  if (!databaseUrl) throw new ConfigError('DATABASE_URL mangler');
  if (!databaseUrl.startsWith('file:') && !e.DATABASE_AUTH_TOKEN) {
    throw new ConfigError('DATABASE_AUTH_TOKEN mangler (kreves når DATABASE_URL ikke er en file:-sti)');
  }

  if (!testMode) {
    if (!e.SESSION_SECRET) throw new ConfigError('SESSION_SECRET mangler');
    if (e.SESSION_SECRET.length < MIN_SECRET_LENGTH || PLACEHOLDER_SECRETS.includes(e.SESSION_SECRET)) {
      throw new ConfigError(`SESSION_SECRET må være en tilfeldig verdi på minst ${MIN_SECRET_LENGTH} tegn`);
    }
    if (!e.APP_BASE_URL) throw new ConfigError('APP_BASE_URL mangler');
    if (!e.MAIL_TRANSPORT) throw new ConfigError('MAIL_TRANSPORT mangler (sett den til "disabled")');
  }

  const mailTransport = e.MAIL_TRANSPORT ?? 'disabled';
  if (!(MAIL_TRANSPORTS as readonly string[]).includes(mailTransport)) {
    throw new ConfigError(`MAIL_TRANSPORT "${mailTransport}" er ukjent (gyldig: ${MAIL_TRANSPORTS.join(', ')})`);
  }

  return {
    testMode,
    port,
    databaseUrl,
    databaseAuthToken: e.DATABASE_AUTH_TOKEN,
    sessionSecret: e.SESSION_SECRET ?? 'test-mode-session-secret',
    appBaseUrl: (e.APP_BASE_URL ?? `http://localhost:${port}`).replace(/\/+$/, ''),
    mailTransport: mailTransport as MailTransport,
  };
}
