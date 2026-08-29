# CampusWear Architecture

CampusWear uses a modular React, TypeScript, Tailwind, and tRPC application surface with a normalized relational domain model. The application is designed to serve multiple schools without placing school identity in client-managed state. Every operational record is scoped through its school and vendor relationships.

## Role model

The canonical product roles are `student`, `vendor_staff`, `school_admin`, and `platform_admin`. The legacy `admin` role remains accepted as a migration compatibility alias and is normalized to platform-admin privileges in application authorization helpers. Role-specific routes improve usability, while server procedures enforce the actual access boundary.

## Data ownership

Schools own vendors, categories, products, announcements, and school memberships. Vendors own catalog fulfillment context, pickup slots, and operational orders. A product owns its variants; every variant has an independent inventory record. Orders contain immutable line-item snapshots, preventing later catalog edits from changing historical purchase records.

## Inventory and order safety

Inventory availability is derived from quantity and a low-stock threshold instead of storing a duplicate status field. Order placement must lock and validate each requested inventory row inside a server-side transaction before decrementing inventory and creating the order. The allowable lifecycle is enforced centrally: `pending → confirmed → preparing → ready_for_pickup → completed`, with controlled cancellation or rejection alternatives.

## Supabase production alignment

The repository contains an explicit Supabase PostgreSQL migration and RLS policy set in `supabase/`. The managed project scaffold currently provides its own authenticated database runtime for local preview; the application schema mirrors the production domain so the Supabase migration can be applied once a dedicated CampusWear Supabase project is assigned. Browser clients never receive a service-role key. In production, Supabase Auth identities map to `profiles.user_id`, RLS scopes access by `auth.uid()`, and product image storage uses policies scoped to vendor membership.

