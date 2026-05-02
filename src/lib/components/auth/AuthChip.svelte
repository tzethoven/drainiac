<script lang="ts">
	/**
	 * AuthChip — tiny auth-state affordance pinned to the top-right of
	 * the Capture pane's <section>. Deliberately minimal:
	 *
	 *   - Loading (pre-first-response): renders nothing. The shell is
	 *     prerendered, so any placeholder would flash on every cold
	 *     load. Silence is the right default until better-auth resolves
	 *     `get-session`.
	 *   - Signed-out: a small "Sign in" pill linking to the Google
	 *     OAuth entry point. Plain anchor (not JS) so it works even if
	 *     the client SDK fails to hydrate.
	 *   - Signed-in: a circular avatar / initial button that toggles a
	 *     popover with the email + a sign-out action.
	 *
	 * Does not own any gesture geometry. Lives as a *sibling* of
	 * <CapturePane />, positioned absolutely inside the snap section —
	 * so holding on the pane to record still works unobstructed, and
	 * scrolling to the Inbox scrolls the chip away with the section
	 * (matches the "chrome scrolls with Capture" invariant from the
	 * PRD).
	 */
	import { authClient } from '$lib/auth-client';

	const session = authClient.useSession();

	let popoverOpen = $state(false);

	async function handleSignIn() {
		// better-auth's `/sign-in/social` endpoint is POST-only (it sets
		// CSRF state before redirecting to Google), so we go through the
		// SDK rather than a plain <a href>. The SDK POSTs and then the
		// browser follows the 302 to Google's consent screen.
		await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
	}

	async function handleSignOut() {
		popoverOpen = false;
		await authClient.signOut();
		// useSession() is a reactive atom; it refetches on sign-out
		// and the chip flips back to "Sign in" without a reload.
	}

	function toggle() {
		popoverOpen = !popoverOpen;
	}

	function initialOf(email: string | undefined, name: string | undefined): string {
		const source = name || email || '';
		const ch = source.trim().charAt(0);
		return ch ? ch.toUpperCase() : '?';
	}
</script>

<svelte:window
	onclick={(e) => {
		// Close popover on outside click. The chip button stops
		// propagation so its own clicks don't immediately re-close.
		if (popoverOpen && !(e.target as HTMLElement)?.closest?.('[data-auth-chip]')) {
			popoverOpen = false;
		}
	}}
/>

{#if $session.isPending}
	<!-- Loading: render nothing. See block comment above. -->
{:else if $session.data?.user}
	{@const user = $session.data.user}
	<div data-auth-chip class="relative">
		<button
			type="button"
			class="flex h-8 w-8 items-center justify-center rounded-full bg-card text-card-foreground text-xs font-semibold ring-1 ring-border shadow-sm hover:bg-muted transition-colors"
			aria-label="Account menu"
			aria-expanded={popoverOpen}
			aria-haspopup="menu"
			onclick={toggle}
		>
			{#if user.image}
				<img
					src={user.image}
					alt=""
					class="h-8 w-8 rounded-full object-cover"
					referrerpolicy="no-referrer"
				/>
			{:else}
				<span aria-hidden="true">{initialOf(user.email, user.name)}</span>
			{/if}
		</button>

		{#if popoverOpen}
			<div
				role="menu"
				class="absolute right-0 top-10 min-w-56 rounded-lg bg-popover text-popover-foreground ring-1 ring-border shadow-lg p-3 text-sm z-20"
			>
				<div class="truncate text-muted-foreground mb-2" title={user.email}>
					{user.email}
				</div>
				<button
					type="button"
					role="menuitem"
					class="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
					onclick={handleSignOut}
				>
					Sign out
				</button>
			</div>
		{/if}
	</div>
{:else}
	<button
		type="button"
		class="inline-flex h-8 items-center rounded-full bg-card text-card-foreground px-3 text-xs font-medium ring-1 ring-border shadow-sm hover:bg-muted transition-colors"
		data-auth-chip
		onclick={handleSignIn}
	>
		Sign in
	</button>
{/if}
