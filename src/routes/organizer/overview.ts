import { Router } from 'express';
import type { Db } from '../../db/client.ts';
import { organizerOf, requireLogin } from '../middleware.ts';
import { paths } from '../paths.ts';

// The organizer's first page. Event summaries arrive in Story 1.5.
export function overviewRoutes(db: Db): Router {
  const router = Router();

  router.get(paths.overview(), requireLogin(db), (_req, res) => {
    res.render('overview', { organizer: organizerOf(res) });
  });

  return router;
}
