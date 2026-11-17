import { Router } from 'express';
import type { Clock } from '../../clock.ts';
import type { Db } from '../../db/client.ts';
import { osloHour } from '../../domain/dates.ts';
import { greeting, overviewSentence } from '../../domain/overviewText.ts';
import { overviewSummaries } from '../../services/summaries.ts';
import { organizerOf, requireLogin } from '../middleware.ts';
import { paths } from '../paths.ts';
import { daysToEventText, newRepliesText, overviewStatusText } from './summaryText.ts';

// FR-19: the organizer's first page, with one framed card per event, recomputed against today on
// every load. Story 5.1: the greeting by the Oslo time of day and the D4 texts for past, today and
// empty events.
export function overviewRoutes(db: Db, clock: Clock): Router {
  const router = Router();

  router.get(paths.overview(), requireLogin(db), async (_req, res) => {
    const organizer = organizerOf(res);
    const rows = await overviewSummaries(db, organizer.id, clock.today());
    const upcoming = rows.filter((r) => !r.summary.past);
    res.render('overview', {
      greeting: `${greeting(osloHour(clock.now()))}, ${organizer.name}`,
      sentence: overviewSentence(upcoming.length, upcoming.filter((r) => !r.summary.onTrack).length),
      events: rows.map(({ event, summary, newReplies }) => ({
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        past: summary.past,
        // D4: «Var ‹dato›» replaces the days text and the pill for a past event.
        daysText: summary.past ? null : daysToEventText(summary.daysToEvent),
        statusText: summary.past ? null : overviewStatusText(summary),
        pill: summary.onTrack ? 'pill-on-track' : 'pill-urgent',
        done: summary.done,
        total: summary.total,
        newRepliesText: newReplies > 0 ? newRepliesText(newReplies) : null,
      })),
    });
  });

  return router;
}
