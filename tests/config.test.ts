import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.ts';

const production = {
  TEST_MODE: 'false',
  DATABASE_URL: 'libsql://masterplan.turso.io',
  DATABASE_AUTH_TOKEN: 'token',
  SESSION_SECRET: 'x'.repeat(32),
  APP_BASE_URL: 'https://masterplan.onrender.com/',
  MAIL_TRANSPORT: 'disabled',
};

describe('loadConfig', () => {
  it('uses safe defaults in test mode', () => {
    const config = loadConfig({ TEST_MODE: 'true' });
    expect(config).toMatchObject({
      testMode: true,
      port: 3000,
      databaseUrl: 'file:./data/local.db',
      appBaseUrl: 'http://localhost:3000',
      mailTransport: 'disabled',
    });
  });

  it('defaults the base URL to the configured port in test mode', () => {
    expect(loadConfig({ TEST_MODE: 'true', PORT: '4000' }).appBaseUrl).toBe('http://localhost:4000');
  });

  it('treats a missing TEST_MODE as off', () => {
    const { TEST_MODE: _omitted, ...withoutTestMode } = production;
    expect(loadConfig(withoutTestMode).testMode).toBe(false);
    expect(() => loadConfig({ ...withoutTestMode, SESSION_SECRET: '' })).toThrow(/SESSION_SECRET/);
  });

  it.each(['kort', 'local-dev-secret-change-me'])('refuses a weak SESSION_SECRET "%s" with test mode off', (secret) => {
    expect(() => loadConfig({ ...production, SESSION_SECRET: secret })).toThrow(/SESSION_SECRET/);
  });

  it('refuses a non-http APP_BASE_URL', () => {
    expect(() => loadConfig({ ...production, APP_BASE_URL: 'javascript://masterplan' })).toThrow(ConfigError);
  });

  it('accepts a complete production environment and trims the base URL', () => {
    const config = loadConfig(production);
    expect(config.testMode).toBe(false);
    expect(config.appBaseUrl).toBe('https://masterplan.onrender.com');
  });

  it.each(['SESSION_SECRET', 'APP_BASE_URL', 'MAIL_TRANSPORT', 'DATABASE_URL'])(
    'refuses to start with test mode off and %s missing',
    (key) => {
      expect(() => loadConfig({ ...production, [key]: '' })).toThrow(new RegExp(key));
    },
  );

  it.each(['gmail', 'smtp'])('refuses an unsupported MAIL_TRANSPORT "%s"', (value) => {
    expect(() => loadConfig({ ...production, MAIL_TRANSPORT: value })).toThrow(/MAIL_TRANSPORT/);
  });

  it('requires DATABASE_AUTH_TOKEN for a non-file database', () => {
    expect(() => loadConfig({ ...production, DATABASE_AUTH_TOKEN: '' })).toThrow(/DATABASE_AUTH_TOKEN/);
  });

  it('does not require DATABASE_AUTH_TOKEN for a file database', () => {
    expect(() =>
      loadConfig({ ...production, DATABASE_URL: 'file:./data/prod.db', DATABASE_AUTH_TOKEN: '' }),
    ).not.toThrow();
  });

  it('rejects an invalid APP_BASE_URL', () => {
    expect(() => loadConfig({ ...production, APP_BASE_URL: 'not a url' })).toThrow(ConfigError);
  });
});
