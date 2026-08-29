# CampusWear Client Handoff

**Release:** Final client-handoff preparation  
**Production application:** [campuswear.vercel.app](https://campuswear.vercel.app/)  
**Verified source release:** [`0881c01`](https://github.com/KeanCaballero/CampusWear/commit/0881c015824734016285ce0d4d6aeb105c1256e4) — `chore: publish vendor delete release`, 29 August 2026  
**Deployment state:** Vercel Production reports **Ready** for the matching `0881c01` commit on branch `main`, confirmed 29 August 2026.  
**Previous release:** [`095bc81`](https://github.com/KeanCaballero/CampusWear/commit/095bc81fa15b364f6a65567fd9d4a4fc2417145a) — Vercel Production reported **Ready** for that matching source commit on 27 August 2026.

> Each CampusWear publish creates a new orphan root commit and force-replaces `main`, so earlier release SHAs such as `095bc81` are no longer reachable from `main` through `git log`. They remain valid on GitHub as records of what was verified at the time.

> CampusWear is prepared for a **controlled launch**. The application is technically deployed and its verified workflows are ready to receive real information. It is not represented as fully client-accepted until an authorized vendor and school administrator complete acceptance testing with real organizational data.

## Launch Boundary

CampusWear is an availability and pickup-request platform. Students can browse active products, select a size, request pickup, and track progress. Authorized vendor staff maintain product variants, stock, pickup information, order status, and vendor updates. School administrators oversee vendor authorization and school announcements. Platform administrators manage access and review vendor applications.

| Area | Current launch position | Required rule |
|---|---|---|
| Student browsing and pickup requests | Ready for real use once a vendor publishes real products and stock | Use confirmed individual accounts only. |
| Vendor onboarding | Ready for a real vendor application and administrator review | Submit actual business, school, contact, and pickup details. |
| Vendor operations | Ready after approval | Enter only real products, size variants, SKU values, stock, pickup location, and announcements. |
| School administration | Ready after a real school administrator is securely provisioned | Do not use a shared login or a role-only workaround. |
| Store profile / public store directory | **Not included in this release** | Do not promise a store profile until the required Supabase migration is verified and the vendor supplies real data. |

## Final Acceptance Classifications

| Classification | Current position | Required follow-up |
|---|---|---|
| **READY** | The verified `0881c01` source is deployed, with Vercel Production **Ready** from the matching commit. On the prior `095bc81` deployment, the public home/auth entry and strict existing-vendor role redirects were observed live, and the production diagnostic route returned the ordinary not-found screen. | Repeat those live route checks on the `0881c01` deployment. Preserve this baseline; do not substitute test data or relax security safeguards. |
| **CLIENT INPUT REQUIRED** | CampusWear has no client-approved final vendor/store identity, staff email, operating hours, catalog, product images, size-level stock, SKU values, pickup information, or authorized school administrator. | Supply and authorize the genuine operational information listed in this handoff. |
| **EXTERNAL DEPENDENCY** | The available Supabase management connection is not scoped to CampusWear, so the deferred Store Profile schema work cannot be reviewed or applied safely. | Restore authorized management access to the CampusWear project before considering a reviewed, backed-up Store Profile migration. |
| **NEEDS REAL-ACCOUNT VERIFICATION** | Student, vendor, school-admin, and platform-admin end-to-end acceptance has not been completed with the final authorized accounts. The existing vendor session also left `/vendor/orders` and `/vendor/announcements` on loading skeletons during non-mutating automated checks, without exposed request errors. | Have the real authorized vendor reproduce or clear these two observations with permission to collect diagnostics; then complete the cross-role test. |
| **NON-BLOCKING IMPROVEMENT** | The successful production build retains an approximately 1.88 MB uncompressed client-chunk advisory. | Plan code-splitting/performance work after controlled-launch acceptance unless a measurable live performance failure occurs. |

## Student Access

Students begin at [CampusWear](https://campuswear.vercel.app/) and select **Sign in**. New students select **Create account**, enter their real name, email address, and password, and complete the email-confirmation step before expecting protected account features. The confirmation and password-recovery guidance asks students to check Inbox, Spam/Junk, and Promotions before requesting a new message. They should never share their password or use another person’s account.

After confirmation, the student workspace provides the following flow:

1. Open **Shop** and browse only currently published authorized-vendor products.
2. Select a product and choose an available size. Availability is size-specific; a product can be available in one size and unavailable in another.
3. Add the selected size and quantity to the cart, then submit a pickup request with an actual preferred pickup note or time when prompted. The cart is the supported checkout surface in this release; there is no separate `/checkout` page.
4. Open **Orders** to track the vendor-controlled status: Pending, Confirmed, Preparing, Ready for Pickup, Completed, Cancelled, or Rejected.
5. Use **Announcements** and **Notifications** for real vendor and school updates. Empty states are intentional when no authorized organization has provided content yet.

Students must not see vendor, school-admin, or platform-admin records merely by visiting those URLs. Workspace routing is role-aware, while database authorization remains the security boundary.

## Vendor Onboarding

A real vendor representative must first create and confirm an individual CampusWear account. From the public application, select **Apply as a vendor**, or go to `/vendor/apply` after signing in. The applicant completes the business-onboarding form with the following real information:

| Required submission | Purpose |
|---|---|
| School affiliation | Identifies the campus the vendor is requesting to serve. |
| Business or trading name | The recognizable real vendor name used by administrators and students. |
| Vendor identifier | A unique lowercase identifier using letters, numbers, and hyphens. |
| Contact email | The real operational contact route. |
| Contact phone | Optional operational contact information. |
| Actual pickup location | The physical collection location students will use. |
| Operating hours | The actual days and collection hours students should follow. |

The platform administrator reviews the application; vendor access is **not** created automatically on signup. Approval must be based on the actual vendor’s authorization to serve the selected school. If additional documentation is needed, the platform administrator should request it through an approved secure channel. Applicants must not send sensitive documents by ordinary email unless a secure request is provided.

After approval, the vendor staff member signs out and signs back in to open the Vendor Workspace. The first acceptance test should be read-only: confirm that the correct vendor workspace, business name, school affiliation, and pickup location are visible before adding inventory.

## School-Administrator Onboarding

A real school representative must create and confirm their own CampusWear account. The platform owner must then complete the **authorized school-onboarding process** that assigns the account to the applicable school with the `school_admin` role. The Platform Accounts screen intentionally does not offer a generic role-only button for this; school roles must remain tied to a real school organization.

Before any school administrator is invited to operate CampusWear, the platform owner should record the authorized person’s name, work email, school, and approval authority according to the school’s own process. The school administrator’s acceptance test should verify that they can view only their school overview, authorize or hide only their school’s vendors, and publish only school-scoped announcements.

## Product and Variant Setup

After vendor approval, vendor staff use **Products** in the Vendor Workspace to enter actual catalog information. A product must have an accurate name, description, school/vendor ownership, selling price, active state, and product image where available. Product photos should represent the actual supplied item. The built-in photo adjustment flow can crop and position an uploaded image before it is saved; it should not be used to imply a product that is not sold.

Create independent variants for every offered size. For example, Small, Medium, Large, XL, and XXL are separate records with separate stock—not one combined stock figure. Use a real SKU or internal product code when the vendor has one. The SKU label is explained in the application as an internal code that helps staff identify the exact product and size.

## Inventory Setup

Vendor staff manage physical stock through **Inventory**. Each row or mobile card represents one product-size variant.

| Field | Meaning | Entry rule |
|---|---|---|
| Available now / Stock | The real number of units physically available for the specific size | Enter a non-negative whole number. |
| Low-stock alert / Alert at | The number of units at which staff should pay attention | Enter a non-negative whole number appropriate to the vendor’s replenishment process. |
| Availability | A student-friendly status calculated from stock and the low-stock threshold | Do not manually substitute a status for the stock count. |
| SKU | Internal identifier for staff recognition | Keep it consistent with the vendor’s real catalog or stock records. |

CampusWear presents **In Stock**, **Low Stock**, or **Out of Stock** to students. Inventory must be updated by authorized vendor staff whenever a sale, delivery, loss, or stock count changes. The browser is not trusted as the source of inventory; order processing validates availability through the existing controlled flow.

## Pickup Location and Order Fulfillment

The vendor’s actual collection point is maintained in the Vendor Dashboard’s **Pickup location** field. Examples such as “Main campus bookstore, ground floor” are guidance only. The saved value must identify the real collection point and be updated whenever the vendor relocates or changes counter hours.

Vendor staff process real requests through **Orders**. The intended sequence is Pending → Confirmed → Preparing → Ready for Pickup → Completed. Cancelled and Rejected are terminal alternatives. Status updates should be made only when the real-world handoff state has changed, because they affect what the student sees and may trigger student notifications. Terminal orders are intentionally finalized and cannot be advanced further through the normal control.

## Announcements

Vendor staff can publish vendor updates and school administrators can publish school-scoped updates. Announcements should be limited to useful operational information such as real restocks, pickup counter changes, school schedules, or collection reminders. The currently verified production contract supports a **title** and **body**; it does not support announcement categories or priority levels. Do not represent those unimplemented fields as available.

Use concise, dated, factual language. Delete or replace test-labelled announcements only after the platform owner identifies the exact production records and approves the action.

## Store Profile Status

The reference material includes a public store-profile concept. It is **deferred** from the deployed source because the current verified CampusWear Supabase schema does not yet provide the production-ready public store-profile contract. There is no public Store Directory/Profile route or logo/banner/operating-hours editor in this release.

Before implementing that workflow, the platform owner must obtain an authorized CampusWear Supabase migration path and verify a migration that safely introduces vendor storefront data plus the required public-catalog/profile access contract. Only after that migration is verified should a real approved vendor supply its actual public name, logo, banner, location, hours, and pickup information. No placeholder store content should be created.

## Controlled-Launch Checklist

| Before inviting real students | Owner or authorized party |
|---|---|
| Confirm the real vendor’s business name, contact email, school, and pickup location | Platform administrator and vendor representative |
| Approve the vendor application only after authorization is confirmed | Platform administrator |
| Create actual products, sizes, prices, SKU values, stock, and low-stock thresholds | Approved vendor staff |
| Remove or obtain owner approval for any test-labelled public records | Platform owner |
| Provision a real school administrator through the authorized school process | Platform owner and school authority |
| Perform one real student browse → size selection → pickup-request → vendor fulfillment acceptance test | Student, vendor staff, and school administrator |
| Upload and review at least one real product image using the vendor photo-adjustment flow | Approved vendor staff |
| Confirm real pickup information appears correctly during the student-to-vendor handoff | Student and approved vendor staff |
| Confirm email confirmation and password recovery arrive for a new real test account; check Spam/Junk/Promotions first | Account owner |

## Known Launch Limitations

The deployed interface and verified data contracts are ready for controlled use. The following are not bugs in the deployed workflow but are prerequisites for broader production use: a real authorized vendor, real vendor staff, a real school administrator, owner-approved cleanup of test-labelled public data, and live cross-role acceptance testing. Public store profiles require the deferred database work described above. The production build also retains a Vite large-client-chunk advisory; it did not block the successful build and should be addressed in a future performance iteration.

## Full Production Prerequisites

CampusWear cannot be represented as fully production-ready until the client supplies and authorizes the real information below. This requirement protects students, vendors, schools, and platform data from invented organization records.

| Required client input | Why it is required |
|---|---|
| Real vendor/store name, contact, confirmed staff email, pickup location, and operating hours | Enables verified vendor onboarding and the real fulfilment test. |
| Real products, descriptions, category, price, image rights/links, sizes, SKU values, stock, and low-stock thresholds | Enables a genuine catalog and size-level inventory validation. |
| Confirmed school-administrator email and school authorization | Enables secure school-scoped acceptance testing. |
| Written approval and exact IDs for any test-labelled data | Prevents removal of legitimate production data. |
| Authorized CampusWear Supabase database-management connection | Required before the deferred Store Profile migration can be reviewed, backed up, applied, and verified. |

The currently available Supabase management connection exposes an unrelated project, not the CampusWear production project. No Store Profile migration may be applied until the authorized CampusWear connection is available and the migration is reviewed against the live schema. Never send passwords, SMTP keys, service-role keys, or database passwords through chat.

## Final Public Smoke Recheck — 28 August 2026

The live public surface was rechecked after the owner-side GitHub update. The CampusWear homepage loaded with the expected branding and student/vendor entry points, the `/auth` entry resolved to the account screen after its session check, and `/__manus__/debug-collector.js` returned the standard CampusWear 404 page. These checks were read-only and did not replace the pending real vendor and school-administrator acceptance checks.

CampusWear is ready for a **controlled launch**, not yet fully client-accepted. Final acceptance still requires the authorized University of Cebu school administrator and real authorized vendor staff to complete their respective workflows using real operational data. Store Profile remains deferred until a verified CampusWear-project-scoped Supabase management connection and rollback path are available. No placeholder users, vendors, products, stock, orders, announcements, analytics, reviews, or synthetic organization records should be introduced to close these items.

## Support and Change Control

For launch-day changes, make no direct database edits, no role changes, and no product/inventory changes without identifying the authorized person and the exact real record. Do not weaken email confirmation, password recovery, rate limits, leaked-password protection, RLS, or role checks to make onboarding faster. Document real defects with the affected route, account role, timestamp, expected result, and actual result before making a scoped correction.


## Temporary QA record — cleanup required before real student use

An explicitly approved vendor QA test created one clearly labelled temporary product named `CAMPUSWEAR QA TEMP - DELETE AFTER TEST` with temporary price, size, SKU, stock, low-stock, and image values. The product-create, size-level availability, decimal-price display, PNG upload, and photo-adjustment flows were verified without creating customer, order, review, announcement, analytics, or organization records.

The temporary product appeared in the live student catalog because newly created products are active by default. The deployed Products UI did not expose a delete control. The selected Supabase project returned no matching row because the current application catalog uses its separate MySQL-backed repository. Cleanup is not confirmed and must be completed through the actual deployed application database management path or a supported archive/delete control before real student use. Do not delete from the empty Supabase `public.products` table, and do not invite real students until the product is confirmed inactive or removed.


## Vendor product deletion workflow

The updated Vendor Products workspace includes a **Delete product** action behind an accessible confirmation dialog. Use it only for a vendor-owned product with no order history. CampusWear blocks deletion when any order item references one of the product’s variants; in that case, use **Visible to students** to hide the product while preserving historical order information. The action removes the product and cascading size-level inventory records, then attempts to remove its stored image.

This control is present in the current `0881c01` release, which is deployed to Vercel Production, so it is available to authorized vendor staff. The previously created temporary QA product is currently hidden but its physical deletion remains unverified. Do not create another test record. Real vendor and school-admin acceptance remains required before full client acceptance.
