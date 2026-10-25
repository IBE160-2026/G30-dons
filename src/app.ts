import { fileURLToPath } from 'node:url';
import cookieSession from 'cookie-session';
import ejs from 'ejs';
import express, { type ErrorRequestHandler, type Express } from 'express';
import helmet from 'helmet';
import type { Clock } from './clock.ts';
import type { Config } from './config.ts';
import type { Db } from './db/client.ts';
import { formatDateNb } from './domain/dates.ts';
import { DomainError } from './domain/errors.ts';
import { helperHeaders, helperRoutes } from './routes/helper.ts';
import { flashMiddleware } from './routes/middleware.ts';
import { authRoutes } from './routes/organizer/auth.ts';
import { eventRoutes } from './routes/organizer/events.ts';
import { overviewRoutes } from './routes/organizer/overview.ts';
import { paths } from './routes/paths.ts';
import { loadTemplates } from './templates/index.ts';

export interface AppDeps {
  config: Config;
  db: Db;
  clock: Clock;
  /** Folder with the template JSON files; tests point it elsewhere. */
  templatesDir?: URL;
}

const viewsDir = fileURLToPath(new URL('./views', import.meta.url));
const publicDir = fileURLToPath(new URL('../public', import.meta.url));

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function createApp({ config, db, clock, templatesDir }: AppDeps): Express {
  // AD-8: an invalid template file stops startup here.
  const templates = loadTemplates(templatesDir);
  const app = express();

  app.engine('ejs', ejs.renderFile);
  app.set('view engine', 'ejs');
  app.set('views', viewsDir);
  app.disable('x-powered-by');
  // Render terminates TLS at its proxy; trust it so secure cookies work there.
  if (!config.testMode) app.set('trust proxy', 1);

  // Set first, so the error page can render even when a later middleware fails.
  app.use((_req, res, next) => {
    res.locals.paths = paths;
    res.locals.formatDate = formatDateNb;
    res.locals.organizer = undefined;
    res.locals.flash = undefined;
    next();
  });
  app.use(helmet());
  app.use(express.static(publicDir));
  // Before the body parser, so a 413/400 on a helper POST still carries the AD-6 headers.
  app.use('/h', helperHeaders);
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  // Helper pages go by token only (AD-5), so they are mounted before the session is read.
  app.use(helperRoutes(db, clock));
  app.use(
    cookieSession({
      name: 'mp_session',
      keys: [config.sessionSecret],
      httpOnly: true,
      sameSite: 'lax',
      secure: !config.testMode,
      maxAge: SESSION_MAX_AGE_MS,
    }),
  );
  app.use(flashMiddleware);

  app.get(paths.health(), (_req, res) => {
    res.status(200).type('text/plain').send('ok');
  });

  app.use(authRoutes(db, clock));
  app.use(overviewRoutes(db, clock));
  app.use(eventRoutes(db, clock, templates, config));

  app.use((_req, res) => {
    res.status(404).render('404');
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    // Another organizer's id, or one that does not exist, is a plain 404 (FR-2).
    if (err instanceof DomainError && err.code === 'not_found') {
      res.status(404).render('404');
      return;
    }
    // Client errors from the body parser (413, 400) keep their status; everything else is a 500.
    const status = Number(err?.status ?? err?.statusCode);
    const clientError = Number.isInteger(status) && status >= 400 && status < 500;
    if (!clientError) console.error(err);
    res.status(clientError ? status : 500).render('error');
  };
  app.use(errorHandler);

  return app;
}
