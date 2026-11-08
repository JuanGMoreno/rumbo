# 0001 - Share couriers across tenants

Status: Accepted
Date: 2026-10-22

## Context

Rumbo serves multiple restaurants. The project aims to dispatch ready orders quickly while making a courier available to more than one restaurant. Separate fleets would simplify tenant boundaries but could leave couriers idle while another restaurant has waiting orders.

## Decision

Use one shared courier pool across tenants. Orders remain owned by a single tenant, and business managers may access only their own tenant's orders and history. Couriers can receive offers for orders from different tenants, subject to the rule that each courier has at most one active order and one pending offer.

## Alternatives considered

- Use a separate courier pool per tenant. This would simplify allocation and isolation but would not test competition for shared couriers, a central part of Rumbo's problem.

## Consequences

- Couriers can be used across restaurants, improving the chance of finding an available courier.
- Dispatches from different tenants compete for the same couriers, so reservation and acceptance need concurrency controls.
- Every tenant-facing query must enforce tenant isolation. The shared courier pool must not expose another tenant's order data.

## Related decisions

- `AGENTS.md`: D1, D3, I2, I7.
