# 0005 - Keep the API Compose stack local until system integration

Status: Accepted
Date: 2026-10-22

## Context

The current Compose file starts the NestJS API, PostgreSQL with PostGIS, and Redis. The web demo and simulator do not exist yet. The planned repository layout placed a Compose file at the repository root, while the working file is under `rumbo-api/`.

## Decision

Keep `rumbo-api/compose.yaml` as the API development stack. Add a root-level Compose file when the web demo or simulator needs to run with the API as one integrated system. The root file will use explicit build paths for the component directories.

## Alternatives considered

- Move the current file to the root immediately. This would make it the system entry point before other applications exist and require changing working build and environment paths now.
- Keep only the API file permanently. This would make it harder to provide one command for the complete demo system later.

## Consequences

- API development can continue with the working local stack.
- The integrated stack is deferred until there is a second application to coordinate.
- The two Compose stacks may publish the same ports and must not be run simultaneously without adjusting them.
- Documentation must identify which Compose file to run for each workflow.

## Related decisions

- `AGENTS.md`: planned repository layout, milestone 0.
