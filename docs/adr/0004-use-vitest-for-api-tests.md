# 0004 - Use Vitest for API tests

Status: Accepted
Date: 2026-10-22

## Context

The Rumbo API uses the NestJS ESM project layout and already has Vitest configuration and tests. The original project plan named Jest, so the plan and repository disagreed. NestJS supports either runner; its current ESM project scaffold uses Vitest by default.

## Decision

Use Vitest for API unit, integration, and end-to-end tests. Keep database-backed integration tests against a real PostgreSQL instance where transaction and locking behavior matters.

## Alternatives considered

- Replace Vitest with Jest to follow the original plan. This would require changing a working test setup without a project requirement that Jest uniquely satisfies.

## Consequences

- Existing API tests and configuration remain in use.
- New test examples and CI commands should use Vitest consistently.
- Tests for database invariants still need a real PostgreSQL database; the runner does not replace that requirement.

## Related decisions

- `AGENTS.md`: architecture and stack, testing strategy, milestone 0.
