<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<div class="app-container">
	<header>
		<div class="header-content">
			<h1>Drainiac</h1>
			<form method="post" action="?/signOut" use:enhance>
				<button type="submit" class="sign-out-button">Sign out</button>
			</form>
		</div>
	</header>

	<main>
		<div class="welcome">
			<h2>Welcome, {data.user.name}! 👋</h2>
			<p>Your productivity dashboard is coming soon.</p>
		</div>
	</main>
</div>

<style>
	.app-container {
		min-height: 100vh;
		background: #f5f5f5;
	}

	header {
		background: white;
		border-bottom: 1px solid #e0e0e0;
		padding: 1rem;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #667eea;
	}

	.sign-out-button {
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		color: #666;
		background: transparent;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sign-out-button:hover {
		background: #f5f5f5;
		color: #333;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.welcome {
		background: white;
		padding: 3rem 2rem;
		border-radius: 12px;
		text-align: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.welcome h2 {
		margin: 0 0 1rem;
		font-size: 2rem;
		color: #1a1a1a;
	}

	.welcome p {
		margin: 0;
		color: #666;
		font-size: 1.1rem;
	}
</style>
