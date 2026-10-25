import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { organizers } from '../src/db/schema.ts';
import { authenticate, hashPassword, register, verifyPassword } from '../src/services/auth.ts';
import { FIXED_NOW, setupTestApp, type TestContext } from './helpers.ts';

let ctx: TestContext;

beforeEach(async () => {
  ctx = await setupTestApp();
});

afterEach(() => {
  ctx.close();
});

const kari = { name: 'Kari Nordmann', email: ' Kari@Example.no ', password: 'hemmelig123' };

describe('password hashing', () => {
  it('stores a salted scrypt hash that verifies', async () => {
    const a = await hashPassword('hemmelig123');
    const b = await hashPassword('hemmelig123');
    expect(a).toMatch(/^scrypt\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword('hemmelig123', a)).toBe(true);
    expect(await verifyPassword('feil', a)).toBe(false);
  });
});

describe('register (service)', () => {
  it('lowercases and trims the email, hashes the password and uses the clock', async () => {
    const organizer = await register(ctx.db, ctx.clock, kari);
    expect(organizer.email).toBe('kari@example.no');
    const [row] = await ctx.db.select().from(organizers).where(eq(organizers.id, organizer.id));
    expect(row?.passwordHash).not.toContain('hemmelig123');
    expect(row?.createdAt).toBe(FIXED_NOW);
  });

  it('refuses a taken email in any case', async () => {
    await register(ctx.db, ctx.clock, kari);
    await expect(register(ctx.db, ctx.clock, { ...kari, email: 'KARI@example.NO' })).rejects.toMatchObject({
      code: 'email_in_use',
    });
  });

  it('turns a race on the unique email index into email_in_use', async () => {
    const results = await Promise.allSettled([register(ctx.db, ctx.clock, kari), register(ctx.db, ctx.clock, kari)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toMatchObject({ code: 'email_in_use' });
    expect(await ctx.db.select().from(organizers)).toHaveLength(1);
  });

  it('authenticates with any email case and fails the same way for both errors', async () => {
    await register(ctx.db, ctx.clock, kari);
    await expect(authenticate(ctx.db, { email: 'KARI@EXAMPLE.NO', password: kari.password })).resolves.toMatchObject({
      email: 'kari@example.no',
    });
    await expect(authenticate(ctx.db, { email: kari.email, password: 'feil-passord' })).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    await expect(authenticate(ctx.db, { email: 'ukjent@example.no', password: 'x' })).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });
});

describe('registration and login (HTTP)', () => {
  it('registers, logs in the new organizer and shows the overview with her name', async () => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/registrer').type('form').send(kari);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    const overview = await agent.get('/');
    expect(overview.status).toBe(200);
    expect(overview.text).toContain('Oversikt');
    expect(overview.text).toContain('Kari Nordmann');
  });

  it('re-renders with 422 and keeps input but not the password for invalid input', async () => {
    const res = await request(ctx.app)
      .post('/registrer')
      .type('form')
      .send({ name: '', email: 'ikke-epost', password: 'kort7xx' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('Skriv inn navnet ditt.');
    expect(res.text).toContain('Skriv inn en gyldig e-postadresse.');
    expect(res.text).toContain('Passordet må ha minst 8 tegn.');
    expect(res.text).toContain('value="ikke-epost"');
    expect(res.text).not.toContain('kort7xx');
    expect(await ctx.db.select().from(organizers)).toHaveLength(0);
  });

  it('refuses a taken email with 422 and a Norwegian message', async () => {
    await register(ctx.db, ctx.clock, kari);
    const res = await request(ctx.app)
      .post('/registrer')
      .type('form')
      .send({ ...kari, email: 'kari@example.no' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('E-postadressen er allerede i bruk.');
    expect(await ctx.db.select().from(organizers)).toHaveLength(1);
  });

  it('logs in with the right password in any email case', async () => {
    await register(ctx.db, ctx.clock, kari);
    const agent = request.agent(ctx.app);
    const res = await agent.post('/logg-inn').type('form').send({ email: 'KARI@example.no', password: kari.password });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect((await agent.get('/')).status).toBe(200);
  });

  it('gives the same page for a wrong password and an unknown email', async () => {
    await register(ctx.db, ctx.clock, kari);
    const wrongPassword = await request(ctx.app)
      .post('/logg-inn')
      .type('form')
      .send({ email: 'kari@example.no', password: 'feil-passord' });
    const unknownEmail = await request(ctx.app)
      .post('/logg-inn')
      .type('form')
      .send({ email: 'ukjent@example.no', password: 'feil-passord' });
    expect(wrongPassword.status).toBe(422);
    expect(unknownEmail.status).toBe(422);
    expect(wrongPassword.text).toContain('Feil e-post eller passord.');
    // Same body apart from the echoed email value.
    expect(unknownEmail.text.replace('ukjent@example.no', 'kari@example.no')).toBe(wrongPassword.text);
  });

  it('logout clears the session', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/registrer').type('form').send(kari);
    const res = await agent.post('/logg-ut');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/logg-inn');
    const after = await agent.get('/');
    expect(after.status).toBe(302);
    expect(after.headers.location).toBe('/logg-inn');
  });

  it('sends a logged-in organizer from the login and register pages to the overview', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/registrer').type('form').send(kari);
    for (const path of ['/logg-inn', '/registrer']) {
      const res = await agent.get(path);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
    }
  });

  it('redirects to login when not logged in', async () => {
    const res = await request(ctx.app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/logg-inn');
  });

  it('redirects to login when the session names an organizer that does not exist', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/registrer').type('form').send(kari);
    await ctx.db.delete(organizers);
    const res = await agent.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/logg-inn');
  });
});
