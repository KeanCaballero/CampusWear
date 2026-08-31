# Inventory restoration — historical backfill dossier

**Status: NOT PERFORMED. Requires separate approval after the migration is reviewed and applied.**

This document records what the pre-fix bug destroyed, so the correction can be approved on evidence
rather than estimate. Every figure below came from a read-only query against the production
database. No production data was modified in producing it.

## The bug, in one line

`create_order_from_cart` decremented `public.inventory`; `transition_order_status` moved orders to
`cancelled` or `rejected` without ever giving the stock back, and nothing else in the database
restores inventory.

## Scope of the loss

**2 orders, 2 variants, 5 units.**

| Order | Status | Terminated | Vendor | Product | Size | Units lost | Stock now | Stock after restore | Low-stock threshold |
|---|---|---|---|---|---|---|---|---|---|
| `CW-05D5CD523C` | rejected | 2026-08-30 | Test | BSIT UNI M | L | 1 | **0** | 1 | 8 |
| `CW-E8085D1F80` | cancelled | 2026-08-31 | Test | BSIT UNI M | S | 4 | 2 | 6 | 5 |

Order ids:

```
a9eebd88-bedc-4fc3-a541-9f7a465bc28d   CW-05D5CD523C   rejected
d69f2732-667d-4240-ac82-0889a636130e   CW-E8085D1F80   cancelled
```

Variant ids:

```
9ab086df-ae8a-49c6-8a2e-8aafe0630a39   BSIT UNI M / L   +1
611ff136-b04f-4247-8b18-f38f7976dfc3   BSIT UNI M / S   +4
```

### Why this matters beyond the number

Size **L is sitting at 0** — `get_public_catalog` derives `out_of_stock` from `quantity <= 0`, so
that size is currently unbuyable to every student, and the only reason is a rejected order. Size
**S is at 2 against a threshold of 5**, so it is being advertised as low stock when six are really
on the shelf.

## Evidence that the stock was genuinely consumed

- Every order in the database has a matching `order_placed` movement — **0** orders lack one.
- Movement deltas agree with `order_items.quantity` for every order — **0** disagreements.
- No order has duplicate `order_placed` rows for one variant — **0** duplicates.
- No `order_items` row has a null `variant_id`, and no movement has a null `order_id`.
- Neither order has any existing restoration movement — `existing_restorations = 0` for both, so a
  backfill cannot double-credit.

Both terminal states are genuinely post-consumption: an order only exists once
`create_order_from_cart` has committed, `rejected` is reachable only from `pending`, and `cancelled`
only from `pending` / `confirmed` / `preparing` / `ready_for_pickup`. All are post-checkout.

## Proposed backfill — for approval, not execution

Run **after** `20260831060000_restore_inventory_on_terminal_orders.sql` is applied, so the partial
unique index exists and makes the operation self-guarding.

```sql
-- Backfill: credit back stock destroyed by terminal orders that predate the fix.
-- Idempotent by construction: the partial unique index added by the migration means a second run
-- inserts nothing, and the UPDATE reads only the rows this INSERT actually created.
begin;

with consumed as (
  select m.order_id, o.status, m.variant_id, sum(m.quantity_delta) as net_delta
  from public.inventory_movements m
  join public.orders o on o.id = m.order_id
  where m.reason = 'order_placed'
    and m.variant_id is not null
    and o.status in ('cancelled', 'rejected')
  group by m.order_id, o.status, m.variant_id
  having sum(m.quantity_delta) < 0
),
restored as (
  insert into public.inventory_movements (variant_id, quantity_delta, reason, order_id, created_by)
  select c.variant_id, -c.net_delta, 'order_' || c.status::text, c.order_id, null
  from consumed c
  on conflict do nothing
  returning variant_id, quantity_delta
)
update public.inventory i
set quantity = i.quantity + r.quantity_delta,
    updated_at = now()
from restored r
where i.variant_id = r.variant_id;

-- Inspect before committing.
select variant_id, quantity from public.inventory
where variant_id in (
  '9ab086df-ae8a-49c6-8a2e-8aafe0630a39',
  '611ff136-b04f-4247-8b18-f38f7976dfc3'
);
-- Expect L -> 1 and S -> 6. If anything differs, ROLLBACK.

commit;
```

`created_by` is `null` deliberately: `auth.uid()` is null in an administrative session, and the FK is
`ON DELETE SET NULL`, so null is already a valid value. Attributing the correction to a real person
would misrepresent who performed it.

### Risks

- **Low.** Two rows in `inventory`, two inserts into `inventory_movements`. No schema change.
- **Double-credit:** prevented by the unique index; verified `existing_restorations = 0` today.
- **Concurrency:** run it when the vendor is not editing stock. The `UPDATE` takes row locks, so a
  simultaneous manual edit will serialise rather than corrupt, but the vendor could be surprised by
  the change; tell them first.
- **Rollback:** the transaction above can be rolled back before `COMMIT`. After commit, reverse by
  deleting the two restoration movements and subtracting the same amounts — but prefer re-checking
  against this dossier rather than reversing blind.

### What must be true before running it

1. The migration is applied, so the unique index exists.
2. `existing_restorations` is still 0 for both orders (re-run the dossier query).
3. The vendor is aware the two sizes will change.
