import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.ts';
import { apiLimiter } from './middleware/rate-limit.ts';
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts';
import routes from './routes/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The built React app lives in backend/public (built during deploy). When present,
// the API also serves the SPA so the whole system runs from one origin.
const publicDir = path.resolve(__dirname, '..', 'public');

function serveSpa(app: express.Express) {
  app.use(express.static(publicDir, { index: 'index.html' }));
  // SPA fallback: any non-/api path returns index.html so client-side routes
  // (e.g. /dashboard, /sales) work on refresh and deep links.
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    next();
  });

  app.use(cors({ origin: config.corsOrigin.split(',').map((o) => o.trim()), credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiLimiter, routes);

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'JFMS API is healthy', data: { time: new Date().toISOString() } });
  });

  // Serve the bundled frontend (single-origin deployment) when it exists.
  if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    serveSpa(app);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
