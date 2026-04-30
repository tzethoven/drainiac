# Architecture Decision Records

One ADR per meaningful architectural decision. Short, dated, immutable
once accepted — supersede rather than edit.

## Conventions

- Filename: `NNNN-kebab-title.md`, zero-padded, sequential.
- Status: `Proposed | Accepted | Superseded by NNNN | Deprecated`.
- Link the terms you use to `CONTEXT.md`. If a decision introduces a
  new domain term, add it to `CONTEXT.md` in the same change.
- Keep each ADR short (one screen where possible). If it needs more,
  it is probably two decisions.

## Template

```markdown
# NNNN — <Title>

- **Status:** Proposed
- **Date:** YYYY-MM-DD

## Context

What is the forcing function? Which `CONTEXT.md` terms are in play?

## Decision

The decision, stated in one or two sentences, in the imperative.

## Consequences

What becomes easier. What becomes harder. Which invariants in
`CONTEXT.md` this decision relies on or introduces.

## Alternatives considered

Briefly, with the reason each was rejected.
```

## Index

<!-- Add entries here as ADRs are written. -->

_No ADRs recorded yet._
