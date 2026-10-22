# Rumbo — Project Context for AI Coding Agents

> Read this whole file before writing or changing code. It is the source of truth for scope, domain rules and working agreements.
> If the code and this file disagree, stop and ask the owner. If a decision changes, update this file and add an ADR in `docs/adr/`.

---

## 1. What Rumbo is

**Rumbo** is a delivery dispatch platform for multiple restaurants that share one pool of couriers.

When a restaurant marks an order as ready, Rumbo finds nearby available couriers, offers them the order, and makes sure only one courier gets it. The customer follows the delivery live. Every step is recorded.

**Tagline:** Delivery dispatch that never leaves an order waiting.

**The problem it solves.** A restaurant finishes an order, but the external courier agency is slow to assign someone and gives no information. The food gets cold, the kitchen is blocked and nobody can explain what happened. Rumbo makes assignment fast, with clear retry rules, and records every step so any delay can be explained with data.

**Demo tenant:** MaxiBurguer (fictional), plus two more simulated restaurants to test tenant isolation.

**Purpose of the project.** It is a backend learning project and a portfolio piece that must show mid-level backend skills. The hard parts are concurrency, reliability under failure, volume and traceability. It is not a startup product, so there are no real users, real payments or real maps.

---

## 2. Working agreement with the owner (IMPORTANT)

The owner wants to learn by building and must be able to explain every part of the code in an interview. Follow these rules:

1. **Explain, do not just produce.** Say why a solution works and which alternatives exist, in a few lines.
2. **Do not write full implementations of the core learning areas unless the owner explicitly asks.** These areas are: the state machines, concurrency control and locking, the dispatch algorithm, idempotency, geospatial SQL, the outbox, queue jobs, and the Dockerfile and docker-compose. Instead guide, ask questions, and review the owner's code.
3. **Boilerplate is fine on request:** DTOs, module wiring, simple CRUD, config, test scaffolding.
4. **When asked to review, be critical and specific.** Point out bugs, race conditions, missing tests and violated invariants. Do not flatter.
5. **Never silently change** a design decision, an invariant, a state machine or the scope. Propose the change and ask. Significant changes need an ADR.
6. **Reproduce before fixing.** For concurrency and performance problems, first write a test or benchmark that shows the problem, then fix it, then measure again.
7. **Language.** The owner writes in Spanish, so answer in Spanish unless asked otherwise. Everything inside the repository is in English (see section 3). If the owner writes English text for the repo (README, ADRs), correct the errors and explain them briefly so the owner learns.
8. If something is ambiguous or listed under "Open decisions" (section 19), ask instead of choosing.

---

## 3. Conventions

- **Code, database, API, branch names and commit messages:** English.
- **README and ADRs:** English. **`docs/learning-log.md`:** Spanish (owner's personal notes).
- **Naming:** domain terms in code are `Tenant`, `Courier`, `Order`, `Dispatch`, `Round`, `Offer`. Use them consistently.
- **Glossary (Spanish → code):** negocio/restaurante = Tenant, repartidor = Courier, pedido = Order, despacho = Dispatch, ronda = Round, oferta = Offer, gerente = Business manager, cliente = Customer.
- **Language:** TypeScript with strict mode. Run lint and type check before finishing any task.
- **Git:** one branch per feature (the owner's usual Git Flow), small focused commits. Conventional Commit prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) are recommended.
- **Time:** store all timestamps in UTC (`timestamptz`).
- **Money:** order totals are integers in the smallest currency unit. Never use floats for money. Payments are simulated.
- **Coordinates:** PostGIS and Redis GEO take **longitude first, then latitude**. Mixing the order is a classic bug.
- **IDs:** format is an open decision (section 19). Do not assume.

---

## 4. Scope

### In scope (version 1)
- Multiple restaurants (tenants) sharing a pool of couriers.
- Full order lifecycle with a state machine.
- Dispatch in rounds with parallel offers, an acceptance time limit and growing search radius.
- Live courier location.
- Public customer tracking by link, with no account.
- Live dashboard for the restaurant.
- Complete immutable history of every order.
- Simulated notifications (logged, or sent to a test webhook).
- Courier and order simulator, plus load tests.
- Basic observability: structured logs, metrics, correlation ids.

### Out of scope (version 1)
Real payments, real routing and ETA, address geocoding, native mobile apps, several orders per courier, pricing, ratings, chat, real SMS or WhatsApp, per-city sharding. The web UI is only a demo. Do not build anything from this list. If the owner asks, confirm first.

---

## 5. Actors and permissions

- **Business manager (`BUSINESS_MANAGER`):** creates orders, marks them ready, cancels them, retries or reassigns dispatch, sees their own fleet and order history. Sees data from their own tenant only.
- **Courier (`COURIER`):** goes online or offline, sends location, receives offers, accepts or rejects, marks picked up and delivered.
- **Customer:** no account. Receives a tracking link with a random, unguessable token.
- **Platform admin (`PLATFORM_ADMIN`):** creates tenants and sees global metrics.

**Tracking privacy rules:**
- Courier name and vehicle are visible from `ASSIGNED`.
- Live location is visible only while the order is `IN_TRANSIT`.
- After delivery, the link stops showing contact data and location after a short time.
- The tracking token must be random (at least 128 bits) and must expire.

**Tenant isolation:** every query that touches tenant data must be scoped by `tenantId`. A manager must never read another tenant's orders.

---

## 6. Design decisions (provisional; changing one requires an ADR)

- **D1.** Multi-tenant platform with a shared courier pool, so orders from different restaurants compete for the same couriers.
- **D2.** Parallel offers to N couriers (N=3, configurable). The first to accept wins.
- **D3.** A courier has at most one active order and one pending offer.
- **D4.** Payment is an attribute of the order, not a state. Fields: payment method (`PREPAID` or `CASH_ON_DELIVERY`) and a simulated payment status.
- **D5.** Three separate state machines: Order, Offer, Courier. The offer is its own entity, not a courier state.
- **D6.** Order coordinates (latitude and longitude) come in the request. No geocoding.
- **D7.** Location updates are the courier heartbeat. A courier who stops reporting is taken offline.
- **D8.** Modular monolith in NestJS. No microservices.
- **D9.** The database is the source of truth. Jobs and timers are accelerators. A periodic sweeper guarantees nothing stays stuck if a job is lost.
- **D10.** An order can be cancelled until the courier picks it up. After pickup it is an incident, not a cancellation.

---

## 7. State machines

### 7.1 Order
States: `CREATED`, `READY`, `DISPATCHING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`, `DISPATCH_FAILED`. Terminal: `DELIVERED`, `CANCELLED`.

| From | To | Triggered by |
|---|---|---|
| CREATED | READY | manager |
| CREATED | CANCELLED | manager |
| READY | DISPATCHING | system (dispatch picks the order up) |
| READY | CANCELLED | manager |
| DISPATCHING | ASSIGNED | an offer is accepted |
| DISPATCHING | DISPATCH_FAILED | rounds exhausted |
| DISPATCHING | CANCELLED | manager |
| DISPATCH_FAILED | READY | manager (retry) |
| DISPATCH_FAILED | CANCELLED | manager |
| ASSIGNED | IN_TRANSIT | courier marks picked up |
| ASSIGNED | READY | manager reassigns (courier is released) |
| ASSIGNED | CANCELLED | manager (courier is released) |
| IN_TRANSIT | DELIVERED | courier |

Any other transition is invalid and must be rejected.

### 7.2 Offer
States: `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`. From `PENDING` it can go to any of the other four; those are terminal. `CANCELLED` is a system decision (another courier accepted, the order was cancelled, or the courier went offline).

### 7.3 Courier
States: `OFFLINE`, `AVAILABLE`, `OFFERED`, `BUSY`.

- OFFLINE → AVAILABLE: courier goes online.
- AVAILABLE → OFFERED: receives an offer.
- OFFERED → AVAILABLE: offer rejected, expired or cancelled.
- OFFERED → BUSY: offer accepted.
- BUSY → AVAILABLE: delivered, or released.
- AVAILABLE or OFFERED → OFFLINE: manual, or stale heartbeat.

A `BUSY` courier is never taken offline automatically. If they stop reporting, raise an alert.

**Rule:** all transitions go through one state machine function per entity. No code may update a `status` column directly.

---

## 8. Invariants (must never be broken)

- **I1.** An order has at most one assigned courier and one accepted offer.
- **I2.** A courier has at most one active order and one pending offer.
- **I3.** An offer can be accepted only if it is `PENDING`, not expired, and its order is still `DISPATCHING`.
- **I4.** A courier is `OFFERED` if and only if they have exactly one `PENDING` offer.
- **I5.** Every state change writes an event in the same transaction that makes the change.
- **I6.** Events are never updated or deleted.
- **I7.** A tenant never sees another tenant's data.
- **I8.** Repeating the same operation (create order, accept offer) never produces a double effect.

Every invariant must have a test. An **invariant checker** (a script that verifies I1–I8 against the database) must run at the end of every load and concurrency test.

---

## 9. Dispatch algorithm v1

Rounds with growing radius (initial values, configurable): round 1 = 2 km, round 2 = 4 km, round 3 = 8 km, round 4 = 15 km. Maximum 4 rounds or 5 minutes in total. Offer time limit: 30 seconds. N = 3 offers per round.

For each round:
1. Find `AVAILABLE` couriers inside the radius who were not already asked for this order, sorted by straight-line distance.
2. Reserve up to N of them so a concurrent dispatch cannot reserve the same couriers (row locks that skip locked rows).
3. Create the offers and move those couriers to `OFFERED`.
4. Schedule the round expiry.
5. If someone accepts: one atomic assignment. The offer becomes `ACCEPTED` only if it is still `PENDING`. The order becomes `ASSIGNED`, the courier `BUSY`, the other offers `CANCELLED`, and their couriers go back to `AVAILABLE`.
6. If all are rejected or expired: next round. If no rounds are left: `DISPATCH_FAILED` and notify the manager.

A periodic **sweeper** finds expired offers and orders stuck in `DISPATCHING` and fixes them, so a lost timer never leaves an order hanging.

**Failure cases that must have tests:**
- A1: nobody available in the radius → next round.
- A2: all reject or ignore → next round, excluding couriers already asked.
- A3: rounds exhausted → `DISPATCH_FAILED`.
- A4: two couriers accept almost at the same time → only one wins; the other gets a clear conflict (409).
- A5: the restaurant cancels → courier released or pending offers cancelled.
- A6: a courier goes offline with a pending offer → the offer is cancelled and the round continues.
- A7: the assigned courier does not pick up in time → alert to the manager, who can reassign.
- A8: the restaurant retries order creation after a network error → no duplicate (idempotency).
- A9: the server restarts in the middle of a dispatch → the sweeper recovers and no order is orphaned.

---

## 10. Traceability, events and outbox

- Each order has a timeline of immutable `OrderEvent` records: type, actor (system, manager, courier), relevant data, timestamp, and a correlation id that links logs and events.
- Record: creation, state changes, rounds started, offers sent, accepted, rejected or expired, cancellations, alerts and reassignments.
- The history must answer: "Why did this order take 25 minutes to leave?", "Who was offered it, when, and what did each answer?", "Who cancelled it and in which state?"
- `OrderEvent` is append-only. Enforce it in the database too (permissions or trigger), not only in code.
- **Outbox:** side effects (notifications, realtime messages) are written to an `OutboxMessage` table in the same transaction as the state change. A separate worker publishes them. Consumers must be idempotent, because delivery is at-least-once.

---

## 11. Data model (high level)

- **Tenant:** name, restaurant location, dispatch configuration.
- **User:** credentials, role, tenant.
- **Courier:** status, vehicle, last known location, last heartbeat time.
- **Order:** tenant, status, items, address and coordinates, total (integer), payment method and status, assigned courier, tracking token.
- **DispatchRound:** order, round number, radius, start and end.
- **Offer:** order, round, courier, status, expiry time, response time.
- **OrderEvent:** append-only.
- **OutboxMessage:** pending side effects.
- **IdempotencyKey:** key, operation, stored response, expiry.
- **LocationHistory:** location history, expected to grow to tens of millions of rows.

---

## 12. API v1 (summary)

REST under `/api/v1`, documented with OpenAPI from day one.

- **Auth:** register, login, refresh token.
- **Business:** create order (requires an `Idempotency-Key` header), mark ready, cancel, retry or reassign dispatch, list orders (cursor pagination and filters), order timeline, live fleet.
- **Courier:** go online or offline, send location, receive offers live, accept or reject an offer, mark picked up, mark delivered.
- **Public:** tracking by token, with live updates.
- **Platform:** create tenants, metrics.

**Conventions:**
- Invalid state transitions and "offer no longer available" return **409 Conflict**.
- Use one consistent error format across the API (exact format is an open decision).
- Accepting an offer twice must be safe.
- Same idempotency key with the same payload returns the original response. Same key with a different payload is rejected.
- Cursor pagination, never offset, for large lists.

---

## 13. Architecture and stack

- **API:** NestJS (TypeScript), modular monolith. Modules: `tenants`, `auth`, `couriers`, `orders`, `dispatch`, `offers`, `tracking`, `notifications`, `events`.
- **Database:** PostgreSQL with PostGIS. Prisma for the schema and migrations. Raw SQL (`$queryRaw`) for geospatial queries and row locking, because Prisma does not support geography types natively.
- **Redis:** live courier positions, pub/sub for realtime across instances, rate limiting, queues.
- **Queues:** for offer expiry, next rounds and notifications. The library is an open decision (BullMQ is the likely candidate).
- **Realtime:** Server-Sent Events or WebSockets (open decision).
- **Testing:** Jest for unit tests, integration tests against a real PostgreSQL, end-to-end tests, own concurrency tests, k6 for load.
- **Operations:** Docker Compose, GitHub Actions (install, lint, type check, tests), structured logs with correlation ids, a metrics endpoint.
- **Demo web:** Next.js with a map. Keep it small (around 15% of the effort). Do not polish it.

**Planned repository layout:**
```
rumbo/
  rumbo-api/        NestJS API
  rumbo-simulator/  courier and order simulator (not created yet)
  rumbo-web/        demo UI (not created yet)
  docs/
    adr/            architecture decision records
    learning-log.md
  docker-compose.yml
  AGENTS.md
  README.md
```
Package manager and monorepo tooling are open decisions.

---

## 14. Simulator

A separate tool that creates couriers moving around a fictional city (a rectangle of about 12 x 12 km) and orders arriving at a configurable rate. Each simulated courier has an accept probability, variable response times, rejections, ignored offers and abrupt disconnections. Use a fixed random seed so experiments are repeatable. It is what lets us measure the system without real users.

---

## 15. Targets (initial; adjust after measuring)

- Create offers after an order is ready: p95 under 300 ms with 5,000 couriers online.
- Location ingestion: sustain 1,000 updates per second with p95 under 100 ms.
- Double assignment: zero in every stress test, verified by the invariant checker.
- Recovery: killing the API or a worker in the middle of a dispatch leaves no stuck orders.
- Order timeline query: p95 under 100 ms with 5 million events in the database.

**Version 1 is done when** the targets are met, the nine failure cases have tests, and the README shows the real results.

---

## 16. Milestones

- **Milestone 0 — Design and technical base.** Repo, Docker Compose (API, PostgreSQL with PostGIS, Redis, healthchecks), Prisma with a first migration, CI, learning-log, ADR folder.
- **Milestone 1 — Core.** Tenants, users and auth with roles, couriers, orders with the state machine, events written in the same transaction, consistent errors, OpenAPI.
- **Milestone 2 — Dispatch.** Courier location, geospatial search, rounds, offers, acceptance and expiry with queues and the sweeper.
- **Milestone 3 — Concurrency and idempotency.** Reproduce failures with a naive version first (double assignment, double accept, duplicate order), then fix them with locks, atomic operations and idempotency keys.
- **Milestone 4 — Volume and performance.** Location ingestion with Redis, history with partitioning or retention, simulator and load tests, `EXPLAIN ANALYZE`, indexes, caching, rate limits, cursor pagination.
- **Milestone 5 — Realtime and reliability.** Live tracking and dashboard, outbox with idempotent consumers, alert for a courier who does not pick up.
- **Milestone 6 — Production and portfolio.** Logs, metrics, failure tests (kill processes mid-dispatch), AWS deploy, final docs, architecture diagram and case study.

**Current status:** Milestone 0 (design and technical base). _Update this line as the project moves._

---

## 17. Testing strategy

- Unit tests for state machines and domain rules.
- Integration tests against a real PostgreSQL (not mocks) for locking, transactions and constraints.
- Concurrency tests that fire many simultaneous requests and then run the invariant checker.
- End-to-end tests for the main flow and the failure cases A1–A9.
- Load tests with k6 and the simulator, with results recorded in the README.

---

## 18. Definition of done for any change

- All state changes go through the state machine function.
- An event is written in the same transaction as the change.
- Queries are scoped by `tenantId`.
- Tests added or updated (including an invariant test when a rule is touched).
- Lint and type check pass.
- OpenAPI updated if the API changed.
- ADR added if a decision was made or changed.
- A short entry in `docs/learning-log.md` is the owner's job, not the agent's.

---

## 19. Open decisions (the owner decides; do not choose silently)

- ID format (UUID, ULID or auto-increment).
- How to store location history (time partitioning, separate table with retention, or sampling).
- Nearby candidates: PostGIS or Redis GEO (to be measured before choosing).
- Server-Sent Events or WebSockets, and how to scale to several instances.
- Queue technology and what happens if Redis goes down.
- Authentication token strategy and refresh.
- Rate limit values per endpoint type.
- How to structure repeatable concurrency tests.
- Package manager, monorepo tooling and logging library.
- Exact error response format.

---

## 20. Known gotchas

- Longitude comes before latitude in PostGIS and Redis GEO.
- Use `geography(Point, 4326)` when you need distances in meters.
- Prisma cannot model geography columns: use raw SQL and keep those queries isolated and tested.
- Redis GEO members do not expire on their own. A courier who stops reporting leaves a stale entry. Handle it with the heartbeat rule (D7).
- Timers can be lost on restart. The database plus the sweeper is the source of truth (D9).
- Delivery from the outbox is at-least-once, so consumers must tolerate duplicates.
