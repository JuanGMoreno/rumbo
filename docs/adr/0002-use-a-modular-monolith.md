# 0002 - Use a modular monolith for the API

Status: Accepted
Date: 2026-10-22

## Context

Rumbo needs coordinated changes to orders, offers, couriers, events, and outbox messages. It is a backend learning and portfolio project with no real users. The first version needs reliable transactions and clear module boundaries without the operational cost of multiple services.

## Decision

Build the API as a modular monolith in NestJS. Keep the domain areas in separate modules within one deployable API. Use PostgreSQL as the transactional database and separate workers only where background processing requires them.

## Alternatives considered

- Split the domain into microservices now. This would add network calls, distributed failure modes, and deployment complexity before the project has evidence that separate services are needed.

## Consequences

- Cross-module workflows can share a database transaction where required by the invariants.
- One API is simpler to develop, test, and run during the early milestones.
- Modules need explicit boundaries to prevent the monolith from becoming tightly coupled.
- Scaling or deploying individual domain areas independently is limited unless the architecture is revisited.

## Related decisions

- `AGENTS.md`: D8, I5, milestone 1.
