import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupTestApp, type TestContext } from './helpers.ts';

let ctx: TestContext;

beforeEach(async () => {
  ctx = await setupTestApp();
});

afterEach(() => {
  ctx.close();
});

describe('app shell', () => {
  it('answers GET /health with 200', async () => {
    const res = await request(ctx.app).get('/health');
    expect(res.status).toBe(200);
  });

  it('applies the migrations on setup', async () => {
    const tables = await ctx.db.$client.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.rows.map((r) => r.name)).toContain('organizers');
  });

  it('turns foreign keys on for the connection (AD-12)', async () => {
    const res = await ctx.db.$client.execute('PRAGMA foreign_keys');
    expect(Number(res.rows[0]?.[0])).toBe(1);
  });

  it('keeps foreign keys on for a second pooled connection while a transaction is open (AD-12)', async () => {
    const tx = await ctx.db.$client.transaction('write');
    try {
      const res = await ctx.db.$client.execute('PRAGMA foreign_keys');
      expect(Number(res.rows[0]?.[0])).toBe(1);
    } finally {
      await tx.rollback();
    }
  });

  it('answers a body over the size limit with 413 and the Norwegian error page', async () => {
    const res = await request(ctx.app)
      .post('/logg-inn')
      .type('form')
      .send({ email: 'kari@example.no', password: 'x'.repeat(60_000) });
    expect(res.status).toBe(413);
    expect(res.text).toContain('Noe gikk galt');
  });

  it('shows a Norwegian 404 page for unknown routes', async () => {
    const res = await request(ctx.app).get('/finnes-ikke');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Siden finnes ikke');
  });

  it('sends helmet security headers and no inline scripts', async () => {
    const res = await request(ctx.app).get('/logg-inn');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.text).not.toMatch(/<script/i);
  });

  it('sets an httpOnly, sameSite=lax session cookie, not secure in test mode', async () => {
    const res = await request(ctx.app)
      .post('/registrer')
      .type('form')
      .send({ name: 'Kari', email: 'kari@example.no', password: 'hemmelig123' });
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const session = cookies.find((c) => c.startsWith('mp_session='));
    expect(session).toBeDefined();
    expect(session).toMatch(/httponly/i);
    expect(session).toMatch(/samesite=lax/i);
    expect(session).not.toMatch(/;\s*secure/i);
  });
});

describe('production cookie', () => {
  it('marks the session cookie secure when test mode is off', async () => {
    const prod = await setupTestApp({
      TEST_MODE: 'false',
      SESSION_SECRET: 'x'.repeat(32),
      APP_BASE_URL: 'https://masterplan.example',
      MAIL_TRANSPORT: 'disabled',
    });
    try {
      const res = await request(prod.app)
        .post('/registrer')
        .set('X-Forwarded-Proto', 'https')
        .type('form')
        .send({ name: 'Kari', email: 'kari@example.no', password: 'hemmelig123' });
      const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
      expect(cookies.find((c) => c.startsWith('mp_session='))).toMatch(/;\s*secure/i);
    } finally {
      prod.close();
    }
  });
});
