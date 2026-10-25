import { Router } from 'express';
import { z } from 'zod';
import type { Clock } from '../../clock.ts';
import type { Db } from '../../db/client.ts';
import { DomainError, errorText } from '../../domain/errors.ts';
import { authenticate, register } from '../../services/auth.ts';
import { session } from '../middleware.ts';
import { paths } from '../paths.ts';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Skriv inn navnet ditt.').max(100, 'Navnet kan ha maks 100 tegn.'),
  email: z.string().trim().max(254, 'E-postadressen er for lang.').pipe(z.email('Skriv inn en gyldig e-postadresse.')),
  password: z.string().min(8, 'Passordet må ha minst 8 tegn.').max(200, 'Passordet kan ha maks 200 tegn.'),
});

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === 'name' || field === 'email' || field === 'password') && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

export function authRoutes(db: Db, clock: Clock): Router {
  const router = Router();

  router.get(paths.register(), (req, res) => {
    if (session(req).organizerId) return res.redirect(paths.overview());
    res.render('register', { values: {}, errors: {} });
  });

  router.post(paths.register(), async (req, res) => {
    const values = { name: text(req.body?.name), email: text(req.body?.email) };
    const parsed = registerSchema.safeParse({ ...values, password: text(req.body?.password) });
    if (!parsed.success) {
      return res.status(422).render('register', { values, errors: fieldErrors(parsed.error) });
    }
    try {
      const organizer = await register(db, clock, parsed.data);
      req.session = { organizerId: organizer.id };
      res.redirect(paths.overview());
    } catch (err) {
      if (err instanceof DomainError && err.code === 'email_in_use') {
        return res.status(422).render('register', { values, errors: { email: errorText('email_in_use') } });
      }
      throw err;
    }
  });

  router.get(paths.login(), (req, res) => {
    if (session(req).organizerId) return res.redirect(paths.overview());
    res.render('login', { values: {}, error: undefined });
  });

  router.post(paths.login(), async (req, res) => {
    const values = { email: text(req.body?.email) };
    const parsed = loginSchema.safeParse({ ...values, password: text(req.body?.password) });
    try {
      if (!parsed.success) throw new DomainError('invalid_credentials');
      const organizer = await authenticate(db, parsed.data);
      // A fresh session object on login, so nothing from before carries over.
      req.session = { organizerId: organizer.id };
      res.redirect(paths.overview());
    } catch (err) {
      // Wrong password and unknown email get the same page, text and status (FR-1).
      if (err instanceof DomainError && err.code === 'invalid_credentials') {
        return res.status(422).render('login', { values, error: errorText('invalid_credentials') });
      }
      throw err;
    }
  });

  router.post(paths.logout(), (req, res) => {
    req.session = null;
    res.redirect(paths.login());
  });

  return router;
}
