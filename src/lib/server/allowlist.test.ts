import { describe, it, expect } from 'vitest';
import { parseAllowlist, isAllowed } from './allowlist';

describe('parseAllowlist', () => {
	it('returns empty set for undefined', () => {
		expect(parseAllowlist(undefined)).toEqual(new Set());
	});

	it('returns empty set for null', () => {
		expect(parseAllowlist(null)).toEqual(new Set());
	});

	it('returns empty set for empty string', () => {
		expect(parseAllowlist('')).toEqual(new Set());
	});

	it('parses a single email', () => {
		expect(parseAllowlist('alice@example.com')).toEqual(
			new Set(['alice@example.com']),
		);
	});

	it('parses multiple emails', () => {
		expect(parseAllowlist('alice@example.com,bob@example.com')).toEqual(
			new Set(['alice@example.com', 'bob@example.com']),
		);
	});

	it('trims surrounding whitespace around entries', () => {
		expect(parseAllowlist('  alice@example.com  ,  bob@example.com  ')).toEqual(
			new Set(['alice@example.com', 'bob@example.com']),
		);
	});

	it('lowercases entries', () => {
		expect(parseAllowlist('Alice@Example.COM,BOB@example.com')).toEqual(
			new Set(['alice@example.com', 'bob@example.com']),
		);
	});

	it('drops empty entries from trailing commas', () => {
		expect(parseAllowlist('alice@example.com,,bob@example.com,')).toEqual(
			new Set(['alice@example.com', 'bob@example.com']),
		);
	});

	it('drops whitespace-only entries', () => {
		expect(parseAllowlist('alice@example.com, ,bob@example.com')).toEqual(
			new Set(['alice@example.com', 'bob@example.com']),
		);
	});

	it('preserves unicode in the local part', () => {
		// Non-ASCII local parts (RFC 6531) are lowercased per Unicode rules via
		// `String.prototype.toLowerCase`. Comparison must round-trip stably.
		expect(parseAllowlist('Zoë@example.com')).toEqual(
			new Set(['zoë@example.com']),
		);
	});
});

describe('isAllowed', () => {
	const list = parseAllowlist('alice@example.com, Bob@Example.com');

	it('matches an exact allowlisted email', () => {
		expect(isAllowed('alice@example.com', list)).toBe(true);
	});

	it('matches case-insensitively on the caller side', () => {
		expect(isAllowed('ALICE@EXAMPLE.COM', list)).toBe(true);
		expect(isAllowed('bob@example.com', list)).toBe(true);
	});

	it('tolerates surrounding whitespace on the caller side', () => {
		expect(isAllowed('  alice@example.com  ', list)).toBe(true);
	});

	it('rejects an email not on the list', () => {
		expect(isAllowed('eve@example.com', list)).toBe(false);
	});

	it('rejects empty input', () => {
		expect(isAllowed('', list)).toBe(false);
	});

	it('rejects everyone when the list is empty (missing env var case)', () => {
		const empty = parseAllowlist(undefined);
		expect(isAllowed('alice@example.com', empty)).toBe(false);
	});
});
