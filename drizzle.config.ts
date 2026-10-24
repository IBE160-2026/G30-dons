import { defineConfig } from 'drizzle-kit';

// Only used by `npm run db:generate`. Migrations are applied by src/db/migrate.ts (AD-14).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
