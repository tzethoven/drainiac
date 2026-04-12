<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	interface Props {
		xp: number;
		onComplete?: () => void;
	}

	let { xp, onComplete }: Props = $props();

	function handleAnimationEnd() {
		if (onComplete) onComplete();
	}
</script>

<div
	class="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
	in:fly={{ y: 0, duration: 0 }}
	out:fly={{ y: -100, duration: 800 }}
	onoutroend={handleAnimationEnd}
>
	<div
		class="rounded-lg bg-primary px-4 py-2 text-lg font-bold text-primary-foreground shadow-lg"
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 200 }}
	>
		+{xp} XP
	</div>
</div>
