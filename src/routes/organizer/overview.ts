import { Router } from 'express';
import type { Clock } from '../../clock.ts';
import type { Db } from '../../db/client.ts';
import { overviewSummaries } from '../../services/summaries.ts';
import { organizerOf, requireLogin } from '../middleware.ts';
import { paths } from '../paths.ts';
import { newRepliesText, overviewStatusText } from './summaryText.ts';

// FR-19: the organizer's first page, with one summary per event, recomputed against today on every load.
export function overviewRoutes(db: Db, clock: Clock): Router {
  const router = Router();

  router.get(paths.overview(), requireLogin(db), async (_req, res) => {
    const organizer = organizerOf(res);
    const rows = await overviewSummaries(db, organizer.id, clock.today());
    res.render('overview', {
      organizer,
      events: rows.map(({ event, summary, newReplies }) => ({
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        statusText: overviewStatusText(summary),
        state: summary.past ? 'past' : summary.onTrack ? 'on-track' : 'attention',
        newRepliesText: newReplies > 0 ? newRepliesText(newReplies) : null,
      })),
    });
  });

  return router;
}
