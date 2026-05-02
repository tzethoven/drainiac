/**
 * Email allowlist — pure parser and matcher.
 *
 * Consumes the raw `EMAIL_ALLOWLIST` env value (comma-separated emails)
 * and answers "is this email allowed?".
 *
 * Deliberately free of I/O, env reads, and better-auth imports so it
 * can be unit-tested in isolation and reused from any server context.
 */

/**
 * Parse a raw allowlist string into a lookup set.
 *
 * - Splits on `,`.
 * - Trims whitespace from each entry.
 * - Lowercases each entry (matches are case-insensitive).
 * - Drops empty entries (e.g. trailing commas, double commas).
 *
 * `undefined` / empty input yields an empty set, which means no one is
 * allowed — a safe default for a missing env var.
 */
export function parseAllowlist(raw: string | undefined | null): Set<string> {
	if (!raw) return new Set();
	return new Set(
		raw
			.split(',')
			.map((entry) => entry.trim().toLowerCase())
			.filter((entry) => entry.length > 0),
	);
}

/**
 * Return true iff `email` is in the allowlist.
 *
 * Case- and whitespace-insensitive on the caller side: leading/trailing
 * whitespace is trimmed and the local and domain parts are lowercased
 * before comparison.
 */
export function isAllowed(email: string, allowlist: Set<string>): boolean {
	if (!email) return false;
	return allowlist.has(email.trim().toLowerCase());
}
