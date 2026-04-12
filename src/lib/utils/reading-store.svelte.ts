import type { ReadingItem } from '$lib/types/media';
import { createMediaStore } from './media-store.svelte';
import { XP_VALUES } from '$lib/constants/xp';

export function createReadingStore() {
	return createMediaStore<ReadingItem>({
		storageKey: 'drainiac-reading-list',
		migrationFlag: 'drainiac-reading-migrated',
		transcriptionCategory: 'read',
		defaultType: 'other',
		calculateXP: (item) => {
			let xp = 0;

			// Base XP
			if (item.type === 'book') xp = XP_VALUES.BOOK;
			else if (item.type === 'article') xp = XP_VALUES.ARTICLE;
			else xp = XP_VALUES.ARTICLE;

			// Bonus: completed within 24hrs
			if (item.startedAt && item.completedAt) {
				const hoursDiff = (item.completedAt - item.startedAt) / (1000 * 60 * 60);
				if (hoursDiff <= 24) xp += XP_VALUES.BONUS_24HR;
			}

			return xp;
		}
	});
}
