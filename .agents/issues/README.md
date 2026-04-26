# v1 MVP Issues

Tracer-bullet vertical slices derived from `.agents/prd/v1-mvp-voice-capture-inbox.md`.

## Dependency graph

```
#1 walking skeleton
 └─ #2 parser + store + basic inbox
     ├─ #3 scroll-snap layout ─────────────┐
     ├─ #4 grouping + filters + clear done ┤
     └─ #5 swipe-left delete + undo toast ─┤
         ├─ #6 swipe-right done/reviewed ──┤
         └─ #7 tap-edit + long-press menu ─┤
                                           │
#1 + #5 ──► #8 speech errors + permissions ┤
                                           │
                                           └──► #9 PWA + letterbox + acceptance (HITL)
```

## Slice list

| # | Title | Type | Blocked by |
|---|-------|------|------------|
| 01 | Walking skeleton: hold-to-record → live transcript | AFK | — |
| 02 | Parser + persisted entries + basic inbox list | AFK | #1 |
| 03 | ScrollSnapLayout: elastic capture ↔ inbox | AFK | #2 |
| 04 | Day grouping + filter chips + Clear done | AFK | #2 |
| 05 | EntryRow swipe-left delete + undo toast | AFK | #2 |
| 06 | Swipe-right done/reviewed + strike-through | AFK | #5 |
| 07 | Tap-to-edit + long-press category menu | AFK | #5 |
| 08 | Speech error taxonomy + permission/unsupported | AFK | #1, #5 |
| 09 | PWA + desktop letterbox + acceptance walkthrough | HITL | #3, #4, #6, #7, #8 |

## Recommended implementation order

`#1 → #2 → #5 → #6 → #7 → #3 → #4 → #8 → #9`

(This order keeps each slice demoable and delivers the core capture-and-process loop earliest.)
