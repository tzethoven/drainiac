<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { onMount } from 'svelte';

	interface Props {
		level: number;
		onClose: () => void;
	}

	let { level, onClose }: Props = $props();

	// Auto-close after 3 seconds
	onMount(() => {
		const timeout = setTimeout(onClose, 3000);
		return () => clearTimeout(timeout);
	});

	// Simple confetti effect using emoji
	function createConfetti() {
		const confettiElements = [];
		const emojis = ['🎉', '⭐', '✨', '🎊', '🌟'];
		
		for (let i = 0; i < 20; i++) {
			confettiElements.push({
				emoji: emojis[Math.floor(Math.random() * emojis.length)],
				left: Math.random() * 100,
				delay: Math.random() * 300,
				duration: 1000 + Math.random() * 1000
			});
		}
		return confettiElements;
	}

	const confetti = createConfetti();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={onClose}
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 200 }}
>
	<!-- Confetti -->
	{#each confetti as particle}
		<div
			class="pointer-events-none absolute text-3xl animate-confetti"
			style="left: {particle.left}%; animation-delay: {particle.delay}ms; animation-duration: {particle.duration}ms;"
		>
			{particle.emoji}
		</div>
	{/each}

	<!-- Modal -->
	<div
		class="relative max-w-md rounded-lg bg-card p-8 shadow-xl border border-border text-center"
		onclick={(e) => e.stopPropagation()}
		in:scale={{ duration: 300, start: 0.8 }}
		out:scale={{ duration: 200, start: 0.8 }}
	>
		<div class="mb-4 text-6xl">🎉</div>
		<h2 class="mb-2 text-3xl font-bold text-foreground">Level Up!</h2>
		<p class="mb-4 text-lg text-muted-foreground">You're now Level {level}</p>
		<button
			onclick={onClose}
			class="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
		>
			Awesome!
		</button>
	</div>
</div>

<style>
	@keyframes confetti-fall {
		0% {
			transform: translateY(-100vh) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(100vh) rotate(720deg);
			opacity: 0;
		}
	}

	.animate-confetti {
		animation: confetti-fall linear forwards;
	}
</style>
