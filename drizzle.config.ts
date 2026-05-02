import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit config — used only to generate incremental migration SQL
 * files under `./migrations/` by diffing the schema checked in at
 * `src/lib/server/db/schema.ts`.
 *
 * Migrations are applied by `wrangler d1 migrations apply` (see the
 * `db:migrate:local` / `db:migrate:remote` scripts in package.json),
 * not by drizzle-kit. Wrangler tracks applied migrations inside D1
 * itself (`d1_migrations` table); drizzle-kit's `meta/` folder is
 * ignored by wrangler.
 */
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './migrations',
});
