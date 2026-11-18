# 0006 - Use UUIDs as identifiers

Status: Accepted
Date: 2026-11-07

## Context

Each entity needs a stable, unique identifier. We need to choose an identifier format for the project.

## Decision

Use UUIDs as identifiers to support independent ID generation without a central sequence. IDs do not replace authorization or tenant isolation.

## Alternatives considered

Use auto-incrementing integer IDs.

## Consequences

- UUIDs require more storage than integer IDs and increase index size.
## Related decisions

- `AGENTS.md`: identifier convention in section 3.
