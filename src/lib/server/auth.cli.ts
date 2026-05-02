/**
 * CLI-only config for `@better-auth/cli generate`.
 *
 * Runtime code MUST NOT import this file. It constructs a better-auth
 * instance with a fake D1 binding and stub secrets purely so the CLI
 * can introspect the configured tables when regenerating
 * `src/lib/server/db/schema.ts`.
 *
 * Invocation:
 *   npx @better-auth/cli generate \
 *     --config src/lib/server/auth.cli.ts \
 *     --output src/lib/server/db/schema.ts
 */
import { _buildAuthForCLI } from './auth';

export const auth = _buildAuthForCLI({} as unknown as D1Database, {
	secret: 'cli-stub-secret-not-for-runtime-use',
	googleClientId: 'cli-stub',
	googleClientSecret: 'cli-stub',
	emailAllowlist: '',
});
