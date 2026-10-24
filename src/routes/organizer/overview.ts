import { Router } from 'express';
import type { Db } from '../../db/client.ts';
import { listEvents } from '../../services/events.ts';
import { organizerOf, requireLogin } from '../middleware.ts';
import { paths } from '../paths.ts';

// The organizer's first page. Event summaries arrive in Story 1.5.
export function overviewRoutes(db: Db): Router {
  const router = Router();

  router.get(paths.overview(), requireLogin(db), async (_req, res) => {
    const organizer = organizerOf(res);
    res.render('overview', { organizer, events: await listEvents(db, organizer.id) });
  });

  return router;
}
