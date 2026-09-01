# CampusWear

> **Your Uniform. Your Identity.**
>
> A campus commerce platform for the University of Cebu.

[![React](https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://campuswear.vercel.app)

**[Live application](https://campuswear.vercel.app)** · [Architecture notes](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md) · [Security model](docs/ROLE_AND_SECURITY_MODEL.md)

---

## Overview

CampusWear helps University of Cebu students find uniforms and campus merchandise, check what is actually in stock, place a pickup order, follow it to completion, and collect it with a QR code at the counter.

It gives authorized campus vendors the other half: a workspace to publish products, keep size-level inventory accurate, move orders through fulfilment, post announcements, review activity, and verify a student's pickup from a phone.

CampusWear is a **student-built MVP**, deployed and working, developed as a practical proposal for the university. It is not a commercial product, and nothing in this README claims adoption, scale, or endorsement it does not have.

---

## Why CampusWear?

Buying a university uniform usually means guessing. A student travels to a vendor without knowing whether their size is in stock, queues, and leaves without a reliable way to check on an order. On the other side of the counter, availability lives in someone's head or a notebook, and order status is whatever was last said out loud.

CampusWear turns that into one visible workflow.

| | Traditional | With CampusWear |
|---|---|---|
| **Stock** | Found out on arrival | Size-level availability shown before the trip |
| **Ordering** | In person, manual | Pickup order placed online |
| **Status** | Ask, or come back | Tracked from confirmation to ready |
| **Handover** | Manual lookup | QR scanned and verified at the counter |
| **Updates** | Word of mouth | Announcements and in-app notifications |

### For students
Check availability before travelling, reserve the right size, and know when the order is ready.

### For vendors
Keep inventory accurate per size, work a real fulfilment queue instead of a stack of messages, and verify handovers in seconds.

### For the university
A more organised picture of campus commerce: structured vendor operations, visible order state, and announcements in one place rather than scattered across channels.

---

## How It Works

| | Step | What happens |
|---|---|---|
| **01** | **Browse** | Find uniforms and campus essentials published by authorized vendors. |
| **02** | **Choose** | Pick a size and quantity, with live availability shown before committing. |
| **03** | **Order** | Send a pickup request to the store. Nothing is paid online. |
| **04** | **Track** | Follow the order as it is confirmed, prepared, and made ready. |
| **05** | **Collect** | Show the pickup code or QR at the counter; the vendor verifies and confirms. |

Order lifecycle enforced in the database:

```
pending → confirmed → preparing → ready_for_pickup → completed
                   ↘ cancelled / rejected
```

---

## Student Experience

- **Catalog and product detail** — browse published products, view variants, and open a size guide
- **Size-level availability** — stock is derived from real inventory rows and a low-stock threshold, not a manually set label
- **Cart** — quantity controls, per-school cart, and add-to-cart confirmation
- **Checkout** — places a pickup order through a single server-side transaction
- **Order history and tracking** — a timeline showing each stage the order has reached
- **Pickup code and QR** — every ready order carries a code and a QR that can be downloaded as a PNG
- **Notifications** — a notification centre with an unread badge and a popover
- **Favorites** — save products to return to
- **Recently viewed** — quick access to products already opened
- **Announcements** — campus and vendor updates
- **Offline notice** — the interface tells you when it cannot reach the network instead of silently failing

---

## Vendor Experience

Vendors work in a dedicated workspace, scoped to their own store.

- **Dashboard** — current operational state at a glance
- **Products** — publish and edit products, variants, and images, with a photo adjuster for framing
- **Inventory** — per-size quantities with low-stock attention
- **Orders** — a fulfilment queue moving orders through the lifecycle above
- **Pickup scanner** — mobile-first QR verification (see below)
- **Announcements** — publish updates students can see
- **Reports** — activity summaries drawn from real order data

Vendor access is not self-granted. A vendor submits an application, and a platform administrator reviews it before any staff access is activated.

---

## Pickup & QR Verification

Pickup verification is the part of CampusWear that most changes the counter experience, so it is worth describing precisely.

**Student**

```
Order becomes ready_for_pickup
   → a pickup code and QR appear on the order
   → student saves the QR image to their phone
   → student arrives at the counter
```

**Vendor**

```
Open Vendor Workspace → Pickup
   → scan the student's QR with the rear camera
   → the order is looked up and shown for checking
   → vendor explicitly confirms the handover
   → order becomes completed
```

Three design decisions worth knowing:

- **The QR contains only the order number.** No name, email, user id, or token. It identifies an order; it does not authorize anyone. Authorization happens in the database.
- **Scanning never completes an order.** The scan performs a lookup. A vendor must confirm before anything changes.
- **The saved QR image opens without a connection.** It is generated on the device. Verification itself still needs the network — CampusWear does not claim offline pickup.

If a camera is unavailable or permission is denied, the vendor can type the order number instead, through the same lookup and the same authorization path.

---

## Admin & School Operations

- **School administration** — oversight of vendors and school-level activity
- **Vendor applications** — platform administrators approve or reject applications with a review note
- **Platform accounts** — an account directory for platform administrators, limited to the minimum information needed for operations
- **Platform team** — grant and revoke platform administrator access. The database refuses two revocations outright: you cannot revoke your own access, and the bootstrap owner cannot be revoked through team management
- **Access audit** — every grant and revoke is written to `platform_access_audit` with who performed it

---

## Security & Data Protection

CampusWear puts its access rules in the database rather than in the interface, because the interface is the part an attacker can skip.

- **Supabase Auth** for identity; sessions are managed by the Supabase client
- **PostgreSQL Row Level Security** on application tables, scoped by `auth.uid()` and by vendor or school membership
- **Vendor-scoped reads** — a vendor's queries return only their own store's records, so another vendor's order simply matches zero rows
- **Server-side authorization for sensitive operations** — order transitions, checkout, vendor approval, and platform access changes run through `SECURITY DEFINER` PostgreSQL functions with a pinned `search_path`, each re-checking the caller's role before touching a row
- **Atomic checkout** — inventory is locked and validated inside a transaction before it is decremented
- **Guarded order transitions** — only permitted status changes are accepted, and the row is locked so two devices cannot both complete the same order
- **Inventory restoration** — cancelling or rejecting an order returns its units to stock; completing an order does not, because those units left with the student
- **No service-role key in the browser** — the frontend uses only the public publishable key; the service role is never shipped to a client

This is a student project, and the honest framing is that these are sound engineering practices rather than a certified security posture. There has been no external audit, penetration test, or compliance certification, and none is claimed.

---

## Technology

**Frontend** — React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 4 · shadcn/ui on Radix primitives · TanStack Query 5 · wouter (routing) · React Hook Form + Zod · Recharts · Sonner · Lucide

**Backend** — Supabase: PostgreSQL, Auth, Row Level Security, PostgreSQL functions (RPCs), and Storage for product images

**Pickup** — `qrcode-generator` to draw the QR on-device, `qr-scanner` to read it

**Deployment** — Vercel, from GitHub

**Testing** — Vitest, TypeScript type-checking, and production build verification

---

## Architecture

The deployed application is a static single-page app that talks directly to Supabase. There is no application server in production — Vercel builds the client and serves it, and every authorization decision is made by PostgreSQL.

```
Student browser                    Vendor phone / browser
      │                                     │
      ▼                                     ▼
   CampusWear SPA  ── React + TanStack Query ──  Vendor Workspace
      │                                     │
      └──────────────┬──────────────────────┘
                     ▼
              supabase-js client
                     │
                     ▼
   ┌─────────────────────────────────────────────┐
   │  Supabase                                   │
   │    Auth            identity + sessions      │
   │    PostgreSQL      normalized domain model  │
   │    RLS             per-row access control   │
   │    RPCs            guarded write operations │
   │    Storage         product images           │
   └─────────────────────────────────────────────┘
```

Reads are filtered by RLS. Writes that carry rules — placing an order, moving its status, approving a vendor, changing platform access — go through PostgreSQL functions that re-check the caller before acting, so the browser cannot reach past them.

> **A note on the repository layout.** `server/`, `api/trpc/`, and `drizzle/` are an earlier Express/tRPC/Drizzle scaffold from the project's starting template. They are **not part of the deployed application**: `vercel.json` builds only the client, and no serverless function is deployed. Some files in `docs/` were written during that earlier phase and still describe Supabase as future work. Supabase is the live backend today.

---

## User Roles

| Role | Can do |
|---|---|
| `student` | Browse the catalog, manage a cart, place pickup orders, track and collect them, receive notifications, save favorites |
| `vendor_staff` | Manage their own vendor's products, inventory, orders, announcements, and reports; verify pickups |
| `school_admin` | Oversee vendors and activity for their school |
| `platform_admin` | Review vendor applications, manage the account directory, and grant or revoke platform access |

Roles are stored on the user's profile and enforced by database policies, not by which page the browser happens to render.

---

## Project Status

CampusWear is a **working University of Cebu MVP, deployed for demonstration and evaluation** at [campuswear.vercel.app](https://campuswear.vercel.app).

Implemented and running end to end:

| System | Status |
|---|---|
| Student catalog, cart, checkout | Implemented |
| Order tracking and history | Implemented |
| Notifications | Implemented |
| Favorites, recently viewed | Implemented |
| Vendor products and inventory | Implemented |
| Vendor order fulfilment | Implemented |
| Vendor announcements and reports | Implemented |
| QR pickup verification | Implemented |
| Vendor application and approval | Implemented |
| Platform account administration | Implemented |

The schema is managed as 21 SQL migrations under `supabase/migrations/`.

---

## Getting Started

### Requirements

- Node.js 20.19+ or 22.12+ (the version Vite 7 requires; the repository does not pin an `engines` field)
- pnpm (the repository's scripts and `vercel.json` use it; `npx pnpm …` works if it is not installed globally)
- A Supabase project

### Install

```bash
pnpm install
```

### Configure

Create `.env` in the repository root with your own Supabase project values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Both are public, browser-safe values. Never add a service-role key to a `VITE_`-prefixed variable — anything with that prefix is compiled into the browser bundle. Never commit a `.env` file.

### Run

```bash
npx vite
```

This serves the client on its own, which is what production runs: the SPA talking directly to Supabase.

The repository also has a `pnpm dev` script, but it boots the legacy Express/tRPC scaffold described above and expects that scaffold's environment variables. It is not needed to run CampusWear.

### Build

```bash
pnpm build:client
```

Outputs to `dist/public` — the same command and output directory Vercel uses.

### Apply the database schema

Apply the migrations in `supabase/migrations/` to your Supabase project in filename order. They create the schema, RLS policies, the Storage policy for product images, and the PostgreSQL functions the application calls.

---

## Environment Variables

| Variable | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL. Public. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Supabase publishable (anon) key. Public. |

These two are all the deployed application needs. The legacy scaffold in `server/` references additional variables (`DATABASE_URL`, `JWT_SECRET`, and others) which are documented in [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md); they are not required to run or deploy CampusWear.

No secret values appear anywhere in this repository, and none should be added to it.

---

## Testing

```bash
pnpm check    # TypeScript, no emit
pnpm test     # Vitest
pnpm build:client
```

The suite currently covers 78 test files. At the time of writing, type-checking and the production build pass, and **1057 of 1058 tests pass**.

The single failure is `server/supabase.connection.test.ts`, which performs a live request against a Supabase endpoint and therefore needs local Supabase credentials. It fails in any checkout without a configured `.env` and is unrelated to application behaviour. No lint or end-to-end suite is configured.

---

## Current Limitations

Worth stating plainly, because a proposal is easier to evaluate when its edges are visible:

- **This is an MVP.** It is deployed for demonstration and evaluation, not rolled out to a student cohort.
- **Email delivery needs configuration before wider onboarding.** Confirmation and recovery emails depend on the SMTP configuration of the Supabase project; the notes in `docs/` cover the current state.
- **Some operations need university input** — real vendor accounts, product catalogs, and pickup locations have to be provided and approved rather than invented by the application.
- **Authenticated end-to-end testing needs controlled test accounts**, so parts of the signed-in experience are verified manually rather than automatically.
- **Legacy scaffold still present.** The unused Express/tRPC/Drizzle files remain in the repository and some older documents in `docs/` predate the move to Supabase.

---

## Roadmap

Not built yet, and listed here as intent rather than capability:

- University-provided size measurement guidance
- Expanded pickup scheduling
- A student order issue and return workflow
- Richer vendor inventory workflows
- Deeper reporting and analytics
- Operational monitoring, backup, and recovery procedures
- Support for additional campuses, if that is ever approved

---

## Built for University of Cebu

CampusWear was designed around one real campus and one real problem, rather than a generic e-commerce template. Students need a clearer way to find uniforms and merchandise and to know what is in stock before travelling. Vendors need better tools to keep availability accurate and to move orders through fulfilment. The university benefits from that activity being organised and visible.

The product is scoped to the University of Cebu on purpose. Nothing here is a claim of official adoption or endorsement — CampusWear is a proposal, built to be evaluated on what it actually does.

---

## Project Context

CampusWear is a student-developed project exploring a practical digital approach to university uniform and campus merchandise operations. It is built with production tooling and production practices — typed end to end, tested, database-enforced authorization, deployed on real infrastructure — and it is presented for academic and institutional evaluation.

Developed by a student project team at the University of Cebu.

---

## Screenshots

Not yet included in the repository. Product screenshots and a short walkthrough of the student and vendor flows are the natural next addition here; the live application at [campuswear.vercel.app](https://campuswear.vercel.app) shows the current interface in the meantime.

---

## License

`package.json` declares `MIT`, but no `LICENSE` file is present in the repository, so the licensing terms are not yet formally specified. Adding a `LICENSE` file — or removing the field — would resolve the ambiguity before any wider distribution.
