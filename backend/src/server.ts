import { createApp } from './app.ts';
import { config } from './config.ts';
import { runMigrations } from './db/migrate.ts';
import { runSeed } from './db/seed.ts';

runMigrations();
// Seed a fresh database (skips automatically when users already exist) so a
// brand-new deployment is immediately usable with the demo accounts.
runSeed();

const app = createApp();
app.listen(config.port, () => {
  console.log(`\n  ⛽ JUPA Fuel Station Management System API`);
  console.log(`  Running at http://localhost:${config.port}/api`);
  console.log(`  Health check: http://localhost:${config.port}/api/health\n`);
});
