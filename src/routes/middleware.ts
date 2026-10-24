import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Db } from '../db/client.ts';
import { getOrganizer, type OrganizerSummary } from '../services/auth.ts';
import { paths } from './paths.ts';

// Session shape stored in the signed cookie.
interface SessionData {
  organizerId?: number;
  flash?: string;
}

export function session(req: Request): SessionData {
  return (req.session ?? {}) as SessionData;
}

/** Stores a one-time notice shown on the next page (Post/Redirect/Get, AD-1). */
export function setFlash(req: Request, message: string): void {
  if (req.session) (req.session as SessionData).flash = message;
}

/** Moves the flash notice into res.locals and clears it from the session. */
export const flashMiddleware: RequestHandler = (req, res, next) => {
  const s = req.session as SessionData | null | undefined;
  res.locals.flash = s?.flash;
  if (s?.flash !== undefined) delete s.flash;
  next();
};

export function organizerOf(res: Response): OrganizerSummary {
  const organizer = res.locals.organizer as OrganizerSummary | undefined;
  if (!organizer) throw new Error('organizerOf called on a route without requireLogin');
  return organizer;
}

/** Guards organizer routes. The organizer id comes only from the session (AD-5). */
export function requireLogin(db: Db): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const organizerId = session(req).organizerId;
    const organizer = typeof organizerId === 'number' ? await getOrganizer(db, organizerId) : undefined;
    if (!organizer) {
      req.session = null;
      res.redirect(paths.login());
      return;
    }
    res.locals.organizer = organizer;
    next();
  };
}
