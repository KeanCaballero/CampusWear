# Queued CampusWear UI/UX Upgrade Constraints

## Source material

The user supplied `pasted_content_9.txt` and `pasted_content_10.txt` on 27 August 2026, with instruction to apply them **after** the active vendor reliability improvements.

## Approved visual direction to evaluate next

The supplied brief calls for a polished university-service experience with an official, reliable, student-friendly voice; navy `#0F2747`, blue `#2563EB`, a sparing gold `#F4B942` accent, light neutral backgrounds, clear hierarchy, consistent navigation, accessible components, and restrained motion. It requests the headline positioning **“Your Uniform. Your Identity.”** and supporting copy **“Your official school uniform store.”**

## Production constraints that still govern implementation

The current release must preserve working business logic, Supabase RLS and Auth controls, real data, existing vendor inventory/order/photo flows, and the schema-compatible `get_public_catalog(p_search, p_product_id)` contract. No synthetic vendor, store, product, order, review, or analytics data may be created.

The brief requests public store discovery and store profiles. Those capabilities depend on the separately deferred storefront data module. Do not reintroduce store-profile routes, public store metadata fields, media helpers, or migration `20260827090000_vendor_storefronts.sql` until a working authenticated CampusWear PostgreSQL migration path applies and verifies that database contract.

## Applied compatible requirements

The user explicitly instructed the current brand tagline **“Your Uniform. Your Identity.”** as the primary copy in Pasted Content 10. The public landing page, authentication hero, shared brand mark, page title, and public footer now use that copy together with the supporting positioning **“Your official school uniform store.”**

The source also now includes the compatible operational and usability refinements requested by the supplied briefs: clear student availability hierarchy, selected-size messaging, responsive inventory cards, vendor order-status filters, terminal-order feedback, consistent contextual retry states, account-scoped vendor and administrator caches, active/focus navigation treatment, and a professional vendor application route with visible business-onboarding, review, and approval stages. No production data was created or modified.

## Deferred requirements

Public **Store Directory** and **Store Profile** pages, editable store identities, public vendor logos/banners, operating hours, and public pickup-location projection remain intentionally deferred. They require the separately reviewed PostgreSQL storefront migration and a real authorized vendor; the production SQL Editor did not accept even a harmless query, so that migration is not applied. Announcements also remain title/body only because the current production data model has no verified category or priority contract.
