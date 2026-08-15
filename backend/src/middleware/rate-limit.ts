import rateLimit from 'express-rate-limit';
import { config } from '../config.ts';

// Skipped in tests so the suite never trips limits.
const skip = () => config.isTest;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});
