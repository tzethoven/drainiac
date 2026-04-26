# Capture module

Code-word routing is currently smeared across `routes/+page.svelte` and four stores. `transcription-store.add` detects the category, saves the transcription, and hands the result back to the page, which then fans out with an `if/else if` chain into `todoStore.add` / `readingStore.add` / `watchStore.add`.

The project's central domain concept — "capture a thought, detect its code word, file it in the right place" — has no module of its own. Adding a new code word (`Idea`, `Note`, `Habit` from the vision) currently requires edits in the detector, the UI page, and a new store instantiation.

**Deepening:** introduce a `Capture` module with a single `capture(text)` method that hides code-word detection, transcription persistence, and routing to the target collection. The category → target-collection map lives inside it.

**Wins:** adding a code word becomes one edit; UI stops doing orchestration; the branching logic becomes testable without mounting a Svelte page.
