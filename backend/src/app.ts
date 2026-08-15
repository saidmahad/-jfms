import express from 'express';
import cors from 'cors';
import { config } from './config.ts';
import { apiLimiter } from './middleware/rate-limit.ts';
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts';
import routes from './routes/index.ts';

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
