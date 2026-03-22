<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="login-container">
	<div class="login-card">
		<h1>Drainiac</h1>
		<p class="tagline">Capture fast, process later</p>

		{#if form?.message}
			<div class="error">
				{form.message}
			</div>
		{/if}

		<form method="post" action="?/signInGoogle" use:enhance>
			<input type="hidden" name="callbackURL" value="/app" />
			<button type="submit" class="google-button">
				<svg viewBox="0 0 24 24" width="20" height="20">
					<path
						fill="currentColor"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="currentColor"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="currentColor"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="currentColor"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				Continue with Google
			</button>
		</form>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.login-card {
		background: white;
		border-radius: 12px;
		padding: 3rem 2rem;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 2.5rem;
		font-weight: 700;
		text-align: center;
		color: #1a1a1a;
	}

	.tagline {
		margin: 0 0 2rem;
		text-align: center;
		color: #666;
		font-size: 1rem;
	}

	.error {
		background: #fee;
		border: 1px solid #fcc;
		color: #c33;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.google-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		color: #1a1a1a;
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.google-button:hover {
		background: #f8f8f8;
		border-color: #d0d0d0;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.google-button:active {
		transform: translateY(0);
	}

	.google-button svg {
		flex-shrink: 0;
	}
</style>
