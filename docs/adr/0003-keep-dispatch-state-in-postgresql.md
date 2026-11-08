# 0003 - Keep dispatch state in PostgreSQL

Status: Accepted
Date: 2026-10-22

## Context

Offer expiry and dispatch rounds need timely processing, but queue jobs and timers can be delayed or lost during a restart. Rumbo must recover without leaving an order indefinitely in `DISPATCHING` or an expired offer in `PENDING`.

## Decision

Treat PostgreSQL as the source of truth for orders, rounds, offers, and their state changes. Use jobs and timers to process work promptly. Run a periodic sweeper that reads persisted state and recovers expired offers and stuck dispatches. Do not rely on Redis or an in-memory timer as the only record of dispatch progress.

## Alternatives considered

- Rely only on queue jobs and timers. This is simpler initially, but a lost job or process restart could leave dispatch state stuck.
- Store authoritative dispatch state in Redis. This would make recovery and transactional event recording harder for the planned data model.

## Consequences

- Recovery can be driven by database state after API or worker restarts.
- Jobs and the sweeper must be safe to run more than once and may race; later concurrency tests must verify the invariants.
- Periodic scans add database work and require suitable indexes and monitoring.
- State changes and their events must be committed in the same transaction.

## Related decisions

- `AGENTS.md`: D9, I3, I5, A9.
