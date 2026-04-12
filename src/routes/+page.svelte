<script lang="ts">
    import { createSpeechRecognition } from "$lib/utils/speech-recognition.svelte";
    import { createTranscriptionStore } from "$lib/utils/transcription-store.svelte";
    import { CATEGORIES, getCategoryInfo } from "$lib/types/transcription";
    import type { Category } from "$lib/types/transcription";

    const speech = createSpeechRecognition();
    const store = createTranscriptionStore();

    let stopping = false;
    let selectedCategory = $state<Category | 'all'>('all');

    function onPointerDown() {
        stopping = false;
        speech.start();
    }

    async function onPointerUp() {
        if (stopping || !speech.isRecording) return;
        stopping = true;
        await new Promise((r) => setTimeout(r, 1000));
        const text = await speech.stop();
        if (text) {
            store.add(text);
        }
    }

    function formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleString();
    }

    // Computed filtered transcriptions
    let filteredTranscriptions = $derived(
        selectedCategory === 'all' 
            ? store.transcriptions 
            : store.getByCategory(selectedCategory)
    );

    // Category counts
    let categoryCounts = $derived(store.getCategoryCounts());

    // Visible categories (hide if count is 0)
    let visibleCategories = $derived(
        CATEGORIES.filter(cat => (categoryCounts[cat.id] || 0) > 0)
    );
</script>

<div class="flex min-h-svh flex-col items-center px-4 py-8">
    <h1 class="text-2xl text-foreground">Drainiac</h1>
    <p class="mt-1 text-sm text-muted-foreground">
        Capture fast, process later.
    </p>

    {#if !speech.isSupported}
        <div
            class="mt-8 rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-sm text-destructive"
        >
            Speech recognition is not supported in this browser. Please use
            Chrome or Edge.
        </div>
    {:else}
        <!-- Record button -->
        <div class="mt-12 flex flex-col items-center gap-4">
            <button
                aria-label={speech.isRecording
                    ? "Recording — release to stop"
                    : "Hold to record"}
                class="flex h-32 w-32 items-center justify-center rounded-full border-4 transition-all select-none
					{speech.isRecording
                    ? 'animate-pulse border-primary bg-primary text-primary-foreground scale-110'
                    : 'border-primary bg-primary text-primary-foreground hover:opacity-90'}"
                onpointerdown={onPointerDown}
                onpointerup={onPointerUp}
                onpointerleave={onPointerUp}
                oncontextmenu={(e) => e.preventDefault()}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="h-12 w-12"
                >
                    <path
                        d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
                    />
                    <path
                        d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.07A7 7 0 0 0 19 11Z"
                    />
                </svg>
            </button>
            <p class="text-sm text-muted-foreground">
                {speech.isRecording ? "Listening..." : "Hold to record"}
            </p>
        </div>

        <!-- Live transcription -->
        {#if speech.isRecording || speech.fullText}
            <div class="mt-8 w-full max-w-md rounded-lg border bg-card p-4">
                <p class="text-sm text-card-foreground">
                    {speech.finalText}{#if speech.interimText}<span
                            class="text-muted-foreground"
                            >{speech.interimText}</span
                        >{/if}
                </p>
            </div>
        {/if}

        <!-- Error -->
        {#if speech.error}
            <p class="mt-4 text-sm text-destructive">{speech.error}</p>
        {/if}
    {/if}

    <!-- Transcription history -->
    {#if store.transcriptions.length > 0}
        <div class="mt-12 w-full max-w-md">
            <h2 class="mb-3 text-lg font-semibold text-foreground">
                Recent captures
            </h2>

            <!-- Category filter tabs -->
            <div class="mb-4 flex flex-wrap gap-2">
                <!-- All tab -->
                <button
                    class="rounded-full px-3 py-1 text-sm font-medium transition-colors border
                        {selectedCategory === 'all'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-card-foreground border-border hover:bg-muted'}"
                    onclick={() => selectedCategory = 'all'}
                >
                    All {categoryCounts.all ? `(${categoryCounts.all})` : ''}
                </button>

                <!-- Category tabs (only show if they have items) -->
                {#each visibleCategories as category}
                    <button
                        class="rounded-full px-3 py-1 text-sm font-medium transition-colors border {category.color}
                            {selectedCategory === category.id
                                ? 'ring-2 ring-offset-2'
                                : 'hover:opacity-80'}"
                        onclick={() => selectedCategory = category.id}
                    >
                        <span class="mr-1">{category.icon}</span>
                        {category.label}
                        {#if categoryCounts[category.id]}
                            ({categoryCounts[category.id]})
                        {/if}
                    </button>
                {/each}
            </div>

            <!-- Transcription list -->
            {#if filteredTranscriptions.length === 0}
                <p class="text-sm text-muted-foreground text-center py-8">
                    No {selectedCategory !== 'all' ? selectedCategory : ''} captures yet.
                </p>
            {:else}
                <ul class="flex flex-col gap-2">
                    {#each filteredTranscriptions as transcription (transcription.id)}
                        <li
                            class="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                        >
                            <div class="min-w-0 flex-1">
                                <!-- Category badge -->
                                {#if transcription.category}
                                    {@const categoryInfo = getCategoryInfo(transcription.category)}
                                    {#if categoryInfo}
                                        <div class="mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium {categoryInfo.color}">
                                            <span>{categoryInfo.icon}</span>
                                            <span>{categoryInfo.label}</span>
                                        </div>
                                    {/if}
                                {/if}

                                <p class="text-sm text-card-foreground">
                                    {transcription.text}
                                </p>
                                <p class="mt-1 text-xs text-muted-foreground">
                                    {formatTime(transcription.timestamp)}
                                </p>
                            </div>
                            <button
                                class="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                onclick={() => store.remove(transcription.id)}
                                aria-label="Delete transcription"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    class="h-4 w-4"
                                >
                                    <path
                                        d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
                                    />
                                </svg>
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>
