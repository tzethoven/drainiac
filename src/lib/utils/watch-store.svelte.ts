import type { WatchItem } from '$lib/types/media';
import { createMediaStore } from './media-store.svelte';
import { XP_VALUES } from '$lib/constants/xp';

export function createWatchStore() {
	return createMediaStore<WatchItem>({
		storageKey: 'drainiac-watch-list',
		migrationFlag: 'drainiac-watch-migrated',
		transcriptionCategory: 'watch',
		defaultType: 'other',
		calculateXP: (item) => {
			let xp = 0;

			// Base XP
			if (item.type === 'film') xp = XP_VALUES.FILM;
			else if (item.type === 'series') xp = XP_VALUES.SERIES;
			else if (item.type === 'video') xp = XP_VALUES.VIDEO;
			else xp = XP_VALUES.VIDEO;

			// Bonus: completed within 24hrs
			if (item.startedAt && item.completedAt) {
				const hoursDiff = (item.completedAt - item.startedAt) / (1000 * 60 * 60);
				if (hoursDiff <= 24) xp += XP_VALUES.BONUS_24HR;
			}

			return xp;
		}
	});
}
