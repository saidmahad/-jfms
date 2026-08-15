import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest: (process.env.NODE_ENV ?? 'development') === 'test',
  jwtSecret: process.env.JWT_SECRET ?? 'jfms-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  dbPath: process.env.DB_PATH ?? './data/jfms.sqlite',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} as const;
