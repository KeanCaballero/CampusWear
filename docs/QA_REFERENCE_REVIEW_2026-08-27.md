# CampusWear QA and Reference-Design Review

## Source Material

This record captures requirements visible in the two user-supplied CampusWear PDF files received on 27 August 2026. It distinguishes requested product direction from verified live behavior so no untested requirement is treated as complete.

## Confirmed Product Requirements

| Area | Requested outcome | Status at review |
| --- | --- | --- |
| Vendor onboarding | The sign-in path must distinguish student sign-in from a vendor application flow. A prospective vendor must be able to apply without first being treated as a student. An administrator reviews the application before vendor access is activated. | Existing application flow requires live acceptance review. No role, vendor, or application record was created during this review. |
| Catalog cards | Product cards should show the authorized vendor or store name and a useful pickup/store location when that information exists. | Requires normalized vendor profile data and live vendor acceptance; do not fabricate a store name or location. |
| Store profile | Vendors need a public store profile with logo, banner, information, and a browseable vendor catalog. | New scoped module; requires schema/RLS review before implementation. |
| Brand identity | Replace the graduation-cap-style identity with a university-oriented mark. Use navy `#0F2747`, blue `#2563EB`, gold `#F4B942` only as a University of Cebu-related accent, background `#F8FAFC`, and text `#172033`. | Requires an asset and global design-token audit; the existing visual identity remains in place until an approved asset is available. |
| Tagline | The supplied reference proposes “Your Uniform. Your Identity.” and “Your official school uniform store.” | Existing product promise “Know Before You Go.” remains the current approved core promise. Any public tagline replacement must be confirmed before changing marketing copy. |

## Previously Reported Vendor Product Usability Requirements

Vendor product management must explain **SKU** as an internal item code, label stock as the number available now, make the low-stock threshold clear, and show an availability state. Before a vendor uploads or replaces an image, the product workflow should provide a 4:3 preview with adjustment controls so the presentation is suitable for the marketplace.

## Verification Notes

GitHub `main` at review time is commit `c7257e263697b1a1b78d8a2f27e94b826f176635` (`chore: finalize CampusWear production release`). The source contains `ProductPhotoAdjuster`, `VendorProducts`, `PlatformAccounts`, and `PlatformTeam`, including the plain-language vendor stock labels and session-scoped platform query helpers.

The Vercel production deployment is **Ready** and identifies the same `c7257e2` Git commit as its source. The public home page loads successfully. This does not by itself prove that an authenticated vendor or platform session receives the intended behavior; those checks remain pending authorized acceptance testing.

### Live vendor-product acceptance

On the production vendor product route, an existing authenticated vendor workspace displayed the following released controls without changing product data:

| Requirement | Live observation |
| --- | --- |
| SKU explanation | Each variant row is labeled **SKU (internal code)** and its inline explanation confirms that students do not see the SKU. |
| Stock clarity | Each variant row is labeled **Available now (stock)**. Existing catalog cards show a size, a numeric `N in stock` value, and a user-facing availability badge. |
| Low-stock clarity | The alert field is labeled **Low-stock alert at** and the inline explanation states that CampusWear displays **Low stock** when available quantity reaches the alert number. |
| Photo preparation | **Adjust or replace product photo** opens a dialog with JPEG/PNG/WebP validation, 4:3 card-preview guidance, zoom, horizontal position, vertical position, reset, cancel, and save-adjusted-photo controls. No file was selected or uploaded. |

These three previously reported vendor-product usability items are present in the deployed production interface. The test deliberately did not upload a photo, edit stock, create a product, or alter a vendor record.

## Storefront Migration Verification Status

The project’s local template database is MySQL and correctly rejected PostgreSQL `public.vendors` DDL. The real CampusWear Supabase production SQL workspace was then opened at `https://supabase.com/dashboard/project/iwexgirpqomquorkikzs/sql/new`.

The dashboard SQL Editor returned **`query: Too small: expected string to have >=1 characters`** when running both the approved storefront migration and a separate `select 1` read-only check. Therefore, no production migration success was established and the storefront schema is **not marked as applied**. The local migration file remains the source-controlled release artifact; deployment must wait for verified execution against the real Supabase project.

### Local visual QA

The local preview correctly renders the revised **Continue your vendor application** sign-in state at `/auth?next=%2Fvendor%2Fapply`, including explicit text that vendor access is activated only after administrator approval. This confirms the QA concern about being misrepresented as a student has been addressed in source.

The experimental `/shop` and `/stores/:slug` previews demonstrated that the additional catalog function signature was not available in production. The user approved deferral of that optional storefront data module. The deployable source has therefore been returned to the existing verified catalog contract and does not include a public store page, vendor store-profile workspace, storefront media fields, or a migration dependency.

## Visual Token Audit

The supplied reference favors a clean university-service identity: pale neutral surfaces, institutional blue, strong black/navy hierarchy, a restrained accent, rounded cards, and minimal motion. CampusWear’s existing system already uses a light neutral background, white surfaces, deep blue primary color, clear contrast, rounded cards, a grid motif, Lucide symbols, visible focus support, and reduced-motion handling. Its global tokens are therefore retained to avoid a disruptive restyle that is not supported by a production defect.

The university-specific visual correction made in this cycle is the shared **Landmark** brand symbol, replacing the generic graduation-cap mark. The optional warm accent remains limited to contextual operational states rather than being promoted into primary navigation or commerce controls, preserving the user-approved blue-led CampusWear identity.

## Safe Release Deployment Verification

GitHub `main` now identifies commit `9e418b88915f5007da8de85035ddda6bc1d613bb` with message **Release validated CampusWear schema-compatible build**. The Vercel Production overview reports **Ready**, branch `main`, and the matching short commit `9e418b8`. A GitHub content check confirmed the deferred `client/src/pages/Storefront.tsx` file is absent from `main`.

Using an existing authorized vendor workspace in read-only mode, the deployed Products page showed the completed plain-language size guidance: **SKU (internal code)**, **Available now (stock)**, and **Low-stock alert at**, alongside numerical in-stock values and availability badges. The **Adjust product photo** dialog also opened without file selection or upload and displayed the JPEG/PNG/WebP ≤4 MB note, 4:3 crop explanation, zoom, horizontal position, vertical position, reset, cancel, and disabled save-adjusted-photo controls. No product, inventory, order, or image data was changed.

## Guardrails

No vendor, store profile, school administrator, product, inventory, order, vendor application, or customer-facing content was created for this review. New public vendor-data features must use owner-scoped access controls and derive availability from real variant inventory.
