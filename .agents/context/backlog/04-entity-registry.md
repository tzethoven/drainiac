# Entity registry for cross-cutting aggregation

`search-store.buildIndex` and `end-of-day-store.buildQueue` both take `(transcriptions, todos, readingItems, watchItems)` and walk them with hardcoded per-type logic. Callers must instantiate all four stores and pass the arrays through — e.g. `routes/+page.svelte` spins up five stores just to compute `eodQueueLength`.

Every future entity type requires editing `buildIndex`, `buildQueue`, *and* every caller that passes the arrays. Neither module is deep — both are shape-shifters driven by the caller.

**Deepening:** invert the dependency. Each entity collection exposes small projections — `toSearchable()` and `toProcessable(today)` — and registers itself with a registry. `Search` and `EndOfDay` ask the registry, not individual stores.

**Wins:** adding `Idea` or `Habit` to search and the end-of-day queue is a single file (the new collection); UI asks `search.results` / `endOfDay.queue` without knowing how many kinds of thing exist; filter tests stop needing fixtures of four unrelated types.
