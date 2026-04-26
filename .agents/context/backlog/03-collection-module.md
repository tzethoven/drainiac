# Generic Collection module

`todo-store`, `transcription-store`, `media-store` (+ `reading` / `watch`), and `end-of-day-store` independently reimplement the same pattern: load-from-localStorage, `add` / `update` / `remove` / `archive`, filter-archived in the getter, `getByStatus`, `getCounts`. `media-store` tried to generalise; `todo-store` didn't adopt it. `createLocalStorage<T>` is too thin — it only wraps `JSON.parse/stringify`, so every caller rebuilds the same array-mutation boilerplate on top.

Deletion test: remove any one of these stores and the same six methods reappear verbatim in the caller — complexity reappears across N callers, so a deeper collection module is earning its keep.

**Deepening:** a `createCollection<T>({ key, archivable, statuses })` module that owns reactive array state, localStorage persistence, archived-filtering, status counts, and archive/restore. Entity stores become ~10 lines of domain-specific verbs on top (e.g. `toggleComplete` for todos, `markInProgress` for media).

**Wins:** switching from localStorage to SQLite/Drizzle (already on the roadmap) is one module, not five; new entity types (Idea, Note, Habit) cost a schema + a couple of verbs; collection invariants tested once.
