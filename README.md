# Rumbo

Rumbo is a delivery dispatch platform for restaurants.

When a restaurant finishes preparing an order, it often waits a long time for a courier to be assigned, and the customer receives cold food. Rumbo reduces that waiting time: it finds nearby couriers, offers them the order and makes sure only one of them gets it.

Many things happen at the same time (several orders, several couriers, offers that expire), so the project focuses on concurrency, performance under load and a complete history of every order.

## Project status

Milestone 0 — Design and technical base — completed on November 18, 2026.

- NestJS API with strict TypeScript.
- Local Docker Compose stack with PostgreSQL/PostGIS, Redis, and healthchecks.
- Prisma 7 integration and an initial migration for a minimal `Tenant` model using UUID identifiers.
- GitHub Actions CI for dependency installation, Prisma Client generation, lint, type checks, the existing unit test, and build on Node.js 24.
- Protected `develop` and `main` branches requiring pull requests, the `build-and-test` check, and up-to-date branches, with force pushes and deletion blocked.
- Architecture decision records in [docs/adr](docs/adr) and the owner's [learning log](docs/learning-log.md).

Verification: [successful CI run](https://github.com/JuanGMoreno/rumbo/actions/runs/44100560699), merged in [PR #3](https://github.com/JuanGMoreno/rumbo/pull/3). Local stack startup and the applied migration were also verified during development.

Next is milestone 1: tenants, users and authentication, couriers, orders, transactional events, consistent errors, and OpenAPI. The current `Tenant` model contains only `id`, `name`, `createdAt`, and `updatedAt`; restaurant location and dispatch configuration will follow in later migrations. CI does not yet run database integration, end-to-end, concurrency, or load tests.
