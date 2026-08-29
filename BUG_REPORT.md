# CampusWear — Known Issues and Remaining Work

## Last Updated

**27 August 2026, Asia/Manila**

## Overall Status

**FINAL REDESIGN DEPLOYED / REAL-CLIENT ACCEPTANCE REMAINS LIMITED BY REAL OPERATIONS DATA.** GitHub `main` is now at `095bc81fa15b364f6a65567fd9d4a4fc2417145a` (**“chore: publish CampusWear production checkpoint”**), and Vercel Production reports **Ready** for the matching `095bc81` commit. The deployed application, database schema, RLS model, platform-account controls, public route guards, and automated validation are in place. The former public diagnostic collector returns CampusWear’s normal 404 page. A connected vendor session rendered the live redesigned Vendor Workspace with its scoped metrics, pickup-location control, and recent-order information without any update action. The real remaining launch limitations are cross-role acceptance, owner-approved production-data hygiene, and onboarding the authorized organizations that will provide real inventory.

## Critical Issues

### Pasted Content 13 — Full production launch assessment

**Classification:** **BLOCKED — CLIENT INPUT REQUIRED** and **EXTERNAL DEPENDENCY**  
**Status:** Compatible source hardening validated; full production acceptance cannot yet be verified  
**Area:** Store Profile, real organizations and catalog data, cross-role acceptance, Supabase administration

The compatible Pasted Content 13 work is complete. A new regression test protects the production build rule that development diagnostic assets are served only in local development and the `dist/public/__manus__` directory is removed during production builds. The full suite now passes **93 Vitest tests across 41 files**, strict TypeScript, client/server production build, and `verify:supabase-production`; concrete credential-value and deferred-storefront implementation scans are clean.

The repository owner subsequently published this checkpoint from an authenticated local Git client. GitHub `main` now resolves to `095bc81fa15b364f6a65567fd9d4a4fc2417145a` (`chore: publish CampusWear production checkpoint`), and Vercel Production reports `Ready` for the matching `095bc81` deployment. The guarded owner-side publication is complete; no unqualified force-push was used.

The requested Store Profile migration was not applied. The authorized Supabase management connector currently exposes only the unrelated inactive **SaveWise** project (`yvigdpnagjjubukfyfji`), not CampusWear (`iwexgirpqomquorkikzs`). Applying a CampusWear migration through that connection would be unsafe and is prohibited. The deployable source migration set intentionally contains no Store Profile migration; the current verified catalog RPC remains the compatible implementation. A valid database migration path must be restored before any public store profile, logo, banner, operating-hours, or store-specific catalog route can be added and verified.

Full launch also requires genuine operational input. No real vendor organization, authorized vendor staff member, school administrator, client-approved product catalog, size-level stock, SKU list, pickup location, operating hours, or record-cleanup authorization was supplied in this task. No user, vendor, product, order, inventory record, announcement, or security configuration was created, changed, or removed. Student-to-vendor fulfilment, vendor-to-school isolation, and school-administrator acceptance therefore remain **NEEDS REAL ACCOUNT VERIFICATION**, rather than bugs that can be safely simulated.

**Exact required input:** provide the real vendor/store name; authorized vendor contact and confirmed vendor-staff email; physical pickup location; operating hours; complete product names, descriptions, categories, prices, image rights/links, sizes, SKU values, size-level stock, and low-stock thresholds; the real school administrator’s confirmed account email and authorization; exact record IDs plus written approval for any test-data cleanup; and an authorized CampusWear Supabase management path for the Store Profile migration. Do not supply passwords, SMTP credentials, service-role keys, or database passwords in chat.

---

### Client Handoff Preparation — Controlled real-client launch

**Status:** Ready for controlled launch; real-account acceptance remains pending  
**Area:** Client-facing UI, onboarding, operational data, and launch governance

The deployed production release was reviewed without submitting a form or modifying a record. The live public home rendered the expected official CampusWear identity, student availability and pickup messaging, and vendor application entry. The connected authorized vendor account was correctly redirected away from the applicant-only `/vendor/apply` route to the Vendor Workspace, where its scoped metric cards, existing pickup-location control, and recent order summary rendered. This confirms the visible role-aware boundary for that existing session. The former development collector path renders the normal application 404 screen rather than a public diagnostic asset.

`CLIENT_HANDOFF.md` now documents real student access, vendor application and approval, school-administrator provision, product/variant/price/SKU setup, size-level inventory, pickup location, fulfillment statuses, and announcements. It also records that public store profiles are not in the current production contract and must remain deferred until the authorized CampusWear Supabase migration path is verified. The guide intentionally directs staff not to create placeholder records, bypass account confirmation, weaken role/RLS controls, or use shared credentials.

**Remaining acceptance items:** A real vendor and authorized vendor staff account must complete a live browse → size selection → pickup request → fulfillment → pickup test with actual stock. A real school administrator must be provisioned through the authorized school process and confirm school-scoped vendor authorization and announcement behavior. The owner must approve disposition of any test-labelled public records before inviting a wider audience. These are controlled-launch prerequisites, not unverified software defects.

**Additional verification note:** The user-authorized vendor session completed read-only loads for `/vendor/orders`, `/vendor/inventory`, `/vendor/products`, `/vendor/announcements`, and `/vendor/reports` without an exposed request error or any mutation. The earlier loading-skeleton observation is cleared for this account; broader vendor operational acceptance still requires final real organization data and fulfillment testing.

**Student hero note:** The mobile Student Workspace hero was corrected so the decorative ring is hidden below the small-screen breakpoint and the Catalog/Orders actions remain unobstructed. Focused regression coverage, mobile/desktop screenshots, the full 95-test suite, strict TypeScript, production build, and Supabase readiness checks passed.

---

### Release Note — Pasted Content 9 and 10 UI/UX Upgrade

**Status:** Published and verified in the final `6e22af7` Vercel Production deployment  
**Area:** Design system / Vendor onboarding / Administrator reliability / Student experience

The current source applies the compatible requirements from the supplied UI/UX briefs without changing production data or the verified Supabase schema. The user explicitly selected **“Your Uniform. Your Identity.”** as the current primary brand tagline; the public landing page, shared brand mark, authentication hero, document title, and footer are aligned with that copy and the supporting **“Your official school uniform store.”** positioning.

The release also refines the separate vendor application path into business-information, school-affiliation, and contact/pickup sections with visible application stages; scopes platform and school administrator overview caches to the authenticated account; keeps vendor operations responsive through inventory cards and order-status filters; and uses contextual retry states for authenticated order and notification failures. Full local validation passed **62 Vitest tests**, strict TypeScript, production build, and Supabase readiness before the final documentation updates.

The user subsequently pushed the refreshed package from the repository owner’s local Git client. GitHub `main` now resolves to `5f84b4a26cd28a01091123c482c46cbb904dfda3` (**“Improve CampusWear UI UX and operational reliability”**, 27 August 2026), and its published Home source contains the current `Your Uniform. Your Identity.` marker. This clears the earlier GitHub credential obstacle for the Pasted Content 9/10 compatibility baseline.

The next compatible refinement cycle was then completed locally under the UI/UX, full-stack engineering, and Supabase safety standards. It adds an accessible student skip link; a labelled mobile route to announcements; active-state treatment for student utility links; touch-ready catalog search, filters, result feedback, and clear-filter controls; protection against blank category controls when live category labels are empty; a retry state for unavailable product retrieval; semantic size controls with live availability feedback; and actionable vendor priority cards with connected pickup-location field guidance. No production data, RLS policy, schema, storage policy, role rule, or Supabase RPC contract was changed. The local suite now passes **70 Vitest tests across 30 files**, strict TypeScript, production build, Supabase-readiness, credential-value, and deferred-storefront scans. The build retains the known Vite large-client-chunk advisory only.

**Remaining blockers:** Public store discovery/profile, editable public storefront identity, operating hours, vendor logo/banner, and public pickup-location projection remain deliberately excluded because they require the unverified PostgreSQL storefront migration and a real authorized vendor. Announcement categories remain deferred because the verified production contract contains only title/body content. Real vendor, school-admin, platform-owner, and real-data acceptance remain required; no production record was created, edited, or fabricated for this release.

---

### Release Note — Pasted Content 11/12 and reference-driven redesign

**Status:** Published and verified in the final `6e22af7` Vercel Production deployment  
**Area:** Full public/student/operations visual system, responsive UX, accessibility, Supabase-contract preservation

The current source extends the established CampusWear navy, blue, and sparse-gold identity into a consistent official-campus-commerce system. Public entry, sign-in, student home, catalog, cart, order tracking, announcements, notifications, profile, vendor product operations, vendor fulfillment, platform operations, platform accounts, school administration, empty states, status badges, and the shared dashboard shell now use a coherent page-intro hierarchy, responsive campus panels, clearer touch-safe controls, and real-data-first messaging. The Figma board informed safe patterns such as navy operational navigation, compact management views, distinct public/student/operations layers, and concise information cards. The Stitch project exposed only its application shell in the available review session, so no unverified screen detail was adopted. Reference-review decisions are recorded in `docs/FIGMA_STITCH_REFERENCE_REVIEW_2026-08-27.md`.

No database schema, Supabase client method, RPC signature, row-level security policy, role rule, authentication control, storage policy, or production record was changed. The checkout form no longer presets a fictional pickup location; it now requires the student to enter their own preference and keeps the vendor confirmation language explicit. The release adds focused regression coverage for public/student redesign routes, transactional feedback, operations redesign, platform accounts, vendor dashboard, dashboard branding, and the shared brand mark.

**Local validation:** The final source passed **92 Vitest tests across 40 files**, strict TypeScript, production client/server build, and the verified Supabase production schema/RPC readiness check. The exact deferred-storefront implementation scan and concrete credential-value scan also passed. Desktop and 390px mobile visual QA covered public, authentication, student, catalog, announcements, cart/orders/profile guards, and protected vendor/platform entry states without observed layout overflow. The production build retains the known Vite advisory for its approximately **1.88 MB** uncompressed client JavaScript chunk.

**Remaining blockers:** Visible test-labelled vendor/product/announcement records found in visual QA remain a production-data hygiene matter; no record was changed or replaced without owner authorization. A real vendor, real vendor staff, real school administrator, and a separate student still need to complete live cross-role acceptance. Store directory/profile references remain intentionally excluded until the authorized CampusWear Supabase migration path is operational and the real vendor provides actual storefront data.

---

### Release Note — Latest supplied reference-screen refinement

**Status:** Published and verified in the final `6e22af7` Vercel Production deployment  
**Area:** Mobile student experience, vendor inventory operations, platform-team operations, shared navigation

The latest supplied reference images were used as visual guidance only. The source now emphasizes the same official-campus structure through a high-contrast navy StudentShell header, compact labelled utility controls, a clear white mobile bottom-navigation surface, an unobstructed student-workspace hero, and a responsive two-column product-catalog scan. The real product images remain untouched. The vendor inventory screen now uses a clearer stock-ledger hierarchy on desktop and structured size-level edit cards on mobile; the platform-team page is reframed as an operations workspace with confirmation-aware grant access and protected-owner controls. The existing navy DashboardLayout preserves the reference’s operational sidebar pattern across vendor, school, and platform screens.

Visual QA found a narrow-screen readability conflict between the student-home decorative ring and the “STUDENT WORKSPACE” label. The decorative ring is now hidden only below the `sm` breakpoint while retaining its larger-screen treatment; the label and welcome copy are fully readable at 390px. Test-labelled public catalog/vendor/announcement text was deliberately not altered because production data must be owner-approved. The public store-profile mockup in the reference remains excluded: CampusWear’s verified production schema does not yet support the required store-profile contract, and no invented store information was created.

**Local validation:** **92 Vitest tests across 40 files**, strict TypeScript, production client/server build, and the live Supabase schema/RPC readiness check passed. Concrete credential-value and deferred-storefront implementation scans passed. The build retains the existing Vite advisory for the approximately **1.88 MB** uncompressed client JavaScript chunk; this is an improvement item rather than a failed build.

**Remaining blockers:** Real vendor, real vendor staff, real school administrator, and owner-authorized data-hygiene acceptance are still required before all operational paths can be represented as client-accepted.

---

### BUG-001 — Mailjet confirmation and password-recovery acceptance

**Severity:** Resolved  
**Status:** Verified  
**Area:** Authentication / Email / External Provider
**Classification:** RESOLVED WITH REAL-ACCOUNT EVIDENCE

**What is wrong:** The Mailjet cutover required final confirmation and recovery acceptance evidence after earlier expired-link observations.

**Expected behavior:** Supabase Auth should submit confirmation and recovery messages through the configured Mailjet SMTP relay. The recipient should receive CampusWear-branded messages, and links should route to `/auth/confirmed` and `/auth/reset` respectively.

**Actual behavior:** Mailjet is saved as Supabase custom SMTP with the CampusWear sender and port 587. A direct Mailjet sender-list review shows the configured sender as **Active**. A fresh authorized new-account registration produced a **Confirm your email address** message from CampusWear, which Gmail classified as Spam; its one-time link rendered the **Email verified** state at `/auth/confirmed` and continued to the student workspace. Supabase Auth Logs record the recovery action `user_recovery_requested` with HTTP `200`. The fresh **Reset your password** message was then found by an explicit Gmail Spam search and its one-time link rendered the valid `/auth/reset` new-password form. No password was entered or submitted.

**How to reproduce:**

1. Open `https://campuswear.vercel.app/auth`.
2. Select **Forgot your password**.
3. Enter the email for a confirmed account and submit.
4. Check Inbox, Spam/Junk, and Promotions for the privacy-preserving recovery message, then open the fresh link promptly without changing a password during acceptance testing.

**Likely cause:** The former Brevo integration was not reaching the provider. The active Mailjet path is operational; Gmail spam filtering initially obscured the fresh recovery message from non-Spam searches.

**What was attempted:** Mailjet Free was selected as the replacement, its SMTP credential was entered only through the Supabase dashboard, and the generic CampusWear sender was validated by the user. Read-only Supabase verification shows custom SMTP enabled with host `in-v3.mailjet.com`, port `587`, sender name CampusWear, and the existing generic sender address. The password remains non-viewable/encrypted. A real recovery message was sent and confirmed delivered by Mailjet and received in Gmail. No credential value was revealed or stored.

**What has already been fixed:** CampusWear continues to preserve confirmation, recovery, per-user interval, and rate-limit safeguards; the real recovery delivery path now works with the generic CampusWear branding and no workaround or secret exposure was introduced.

**What remains to be done:** No further Mailjet confirmation or reset-link acceptance test is required. A custom verified sending domain with SPF/DKIM is a future deliverability improvement, not a security workaround.

**Exact action required:** Preserve current Auth safeguards and direct users to Inbox, Spam/Junk, and Promotions guidance while sender reputation matures.

**Blocked by:** Not blocked.

**Risk:** Gmail classified both fresh Auth message types as Spam. This is a deliverability/reputation concern for the generic Gmail sender and does not justify weakening confirmation, recovery, or rate-limit safeguards.

**Verification method:** Fresh confirmation completed at `/auth/confirmed` with student-workspace continuation. Fresh recovery was found in Gmail Spam and rendered the valid `/auth/reset` recovery form without a password change.

---

### BUG-002 — No verified end-to-end live role and RLS acceptance with real organizations

**Severity:** Critical  
**Status:** Needs Verification  
**Area:** RLS / Authorization / Vendor Onboarding / School Administration
**Classification:** NEEDS REAL-ACCOUNT VERIFICATION

**What is wrong:** The Supabase schema, policies, controlled RPCs, and role-routing tests are implemented, but live multi-organization acceptance cannot be completed without real authorized vendor, vendor-staff, school-admin, and school records beyond the initial University of Cebu configuration.

**Expected behavior:** Student, vendor staff, school administrator, and platform administrator accounts must access only their authorized data and workspace. One vendor must not access another vendor’s orders, inventory, or images; one school must not access another school’s private data.

**Actual behavior:** Automated policy/readiness checks pass, but no real authorized vendor or school-administrator identity has been provided for full live acceptance. No synthetic production identities were created to substitute for them.

**How to reproduce:** This is an unverified acceptance scenario rather than a confirmed product defect. It requires real organizations and distinct role accounts.

**Likely cause:** Required production identities and organization assignments are intentionally not fabricated.

**What was attempted:** RLS migrations, scoped RPCs, storage policies, role-routing helpers, route guards, database privilege checks, and platform-only account-management controls were implemented and validated.

**What has already been fixed:** The schema, RLS, guarded RPC, client routing, and anonymous protected-route boundaries are implemented and pass their available checks.

**What remains to be done:** Onboard one real vendor, one vendor-staff account, one school administrator, and a separate confirmed student account. Run the documented cross-role isolation scenarios against real records.

**Exact action required:** Authorized campus and vendor representatives must provide and approve the real organizations and accounts required for cross-role acceptance.

**Blocked by:** Authorized client identities, vendor organization details, and school-admin authorization.

**Risk:** The platform cannot be represented as fully client-accepted across every role until real-world authorization checks complete.

**Verification method:** Verify Student A versus Student B privacy; Vendor A versus Vendor B isolation; school isolation; scoped storage/image access; platform-account directory minimal disclosure; and direct deep-link rejection for unauthorized roles.

---

## High Priority Issues

### BUG-003 — Production Auth redirect navigation

**Severity:** Resolved  
**Status:** Verified  
**Area:** Authentication / Deployment
**Classification:** RESOLVED WITH CONTROLLED BROWSER VERIFICATION

**What is wrong:** The configured URLs needed final validation using fresh Supabase Auth tokens.

**Expected behavior:** The Supabase Site URL should be `https://campuswear.vercel.app`; redirect allow-list entries should include `https://campuswear.vercel.app/auth/confirmed` and `https://campuswear.vercel.app/auth/reset`.

**Actual behavior:** On 26 August 2026, the Supabase URL Configuration page was inspected read-only. The Site URL is `https://campuswear.vercel.app`, with exactly these permitted redirect URLs: `https://campuswear.vercel.app/auth/confirmed` and `https://campuswear.vercel.app/auth/reset`. Fresh confirmation completed successfully at `/auth/confirmed` and continued to the student workspace. A fresh recovery link found in Gmail Spam rendered the valid `/auth/reset` new-password form without submitting a password.

**How to reproduce:** Request a fresh reset or confirmation email, use its link immediately, and observe the final route without submitting a password change.

**Likely cause:** Dependent on BUG-001; no application defect has been confirmed.

**What was attempted:** The live routes `/auth/confirmed`, `/platform`, `/platform/team`, and `/vendor/apply` were checked for route availability. Account page code uses the deployed-origin redirect paths, and the corresponding Supabase Site URL plus redirect allow-list were verified read-only in the live dashboard.

**What has already been fixed:** The live Site URL and exact confirmation/reset allow-list are configured correctly; both destination routes render.

**What remains to be done:** No further redirect acceptance action is required.

**Exact action required:** Preserve the verified Site URL and redirect allow-list.

**Blocked by:** Not blocked.

**Risk:** A delivered email could direct users to an unexpected URL if dashboard configuration is incomplete.

**Verification method:** Receive a real message and confirm the final URL and role-aware continuation behavior.

---

### BUG-004 — Real vendor catalog, pickup, storage, decimal-price, and fulfillment acceptance is pending

**Severity:** High  
**Status:** Needs Verification  
**Area:** Vendor / Inventory / Storage / Orders
**Classification:** NEEDS REAL-ACCOUNT VERIFICATION

**What is wrong:** Vendor functions are implemented and validated through code and database boundaries, but live acceptance with a real authorized vendor and real inventory has not occurred.

**Expected behavior:** An authorized vendor should configure the actual pickup location, create a real product with decimal Philippine-peso price values, manage size-level inventory, upload an authorized product image, and process only its own orders through the controlled fulfillment sequence.

**Actual behavior:** No real vendor organization, pickup location, product, or order was fabricated for production testing.

**How to reproduce:** After onboarding a real vendor, create a real product with a decimal price, variants/sizes, inventory, and an authorized image; then test scoped order management.

**Likely cause:** Required real operational data has not been supplied, by design.

**What was attempted:** Product numeric conversion regression tests, atomic checkout, inventory guards, status-transition RPCs, vendor pickup RPC, image-storage policies, and vendor route protections are implemented.

**What has already been fixed:** Size-level inventory, decimal-price conversion, scoped workflow RPCs, and vendor route protections have automated or source-level validation.

**What remains to be done:** Complete vendor onboarding and run the real, authorized workflow from product creation through fulfillment.

**Exact action required:** The authorized vendor must supply real operational details, catalog entries, variants, inventory, and pickup location, then execute the workflow with authorized staff.

**Blocked by:** Real vendor organization, vendor staff account, actual pickup location, and real operational data.

**Risk:** Production operational readiness for vendor fulfillment is unproven until the real workflow is exercised.

**Verification method:** Validate decimal price entry, size stock labels, low/out-of-stock behavior, image upload/delete authorization, vendor-scoped order visibility, transitions, cancellation, and inventory consistency.

---

### BUG-005 — Student commerce and notification acceptance is pending a separate confirmed student and real inventory

**Severity:** High  
**Status:** Needs Verification  
**Area:** Student / Orders / Notifications
**Classification:** NEEDS REAL-ACCOUNT VERIFICATION

**What is wrong:** The platform owner account must not be used as the sole student acceptance account. A separate confirmed student is now available, but real authorized vendor inventory is still needed for complete client acceptance.

**Expected behavior:** A student should browse public availability, select a size, review real stock, add to cart, request pickup, track their own order, receive notifications, and be denied all privileged workspaces.

**Actual behavior:** The authorized separate student completed confirmation, normal sign-in, profile access, empty cart access, own-order tracking, notifications, and denied privileged-route checks. A bounded read-only ownership check confirmed that the observed order belongs to that student; no cross-account order disclosure was found. QA also identified that student orders and notifications had static browser query-cache keys, creating stale-data risk after an account change. Source is now hardened with authenticated-user query keys and regression coverage, pending the next production deployment.

**How to reproduce:** Register a separate real student account and use real authorized vendor inventory.

**Likely cause:** Identity and product prerequisites are intentionally absent.

**What has already been fixed:** Public catalog availability and announcement empty states are truthful. Student order and notification queries are now account-scoped in source, and the observed order was verified as correctly owned rather than a Row Level Security failure.

**What remains to be done:** Deploy and verify the account-scoped order/notification cache change, then complete the catalog-to-pickup journey against legitimate authorized vendor inventory.

**Exact action required:** Publish the current QA source release, then onboard approved vendor inventory for the remaining student acceptance flow.

**Blocked by:** Real vendor inventory and the next source deployment.

**Risk:** The primary student journey is not yet accepted using real operational data.

**Verification method:** Student sign-in, profile, catalog, filters, product availability, cart, checkout, own-order tracking, notifications, pickup details, and unauthorized-workspace redirects.

---

### BUG-006 — Platform Accounts controls require authenticated live-owner acceptance

**Severity:** High  
**Status:** Needs Verification  
**Area:** Platform Administration / Authorization
**Classification:** NEEDS REAL-ACCOUNT VERIFICATION

**What is wrong:** The Platform Accounts directory and audited account-access functions are deployed to the database and pass automated/readiness validation. The live protected route now resolves correctly, but authenticated owner acceptance has not yet been completed.

**Expected behavior:** The platform owner should land in `/platform`, open `/platform/accounts` and `/platform/team`, view only the minimum necessary account identity/role data, promote an individually confirmed account to platform access, and restore platform access to student without self-revocation or arbitrary vendor assignment.

**Actual behavior:** The live `/platform/accounts` route resolves to the expected sign-in guard rather than a missing route. Authenticated live-owner UI acceptance has not been completed.

**How to reproduce:** Sign in as the real platform owner and use an existing confirmed tester account to exercise the audited directory and team controls.

**What has already been fixed:** The platform-only bounded account directory RPC and audited grant/revoke controls pass automated and anonymous privilege-boundary checks.

**What remains to be done:** Sign in as the real platform owner and test an existing real confirmed tester account through the audited UI.

**Exact action required:** Provide a confirmed non-privileged tester account and have the owner execute the documented controls without using shared credentials.

**Blocked by:** A confirmed tester account and the remaining authenticated owner acceptance; no fake account should be used.

**Risk:** The intended administrator workflow remains unverified in the live browser.

**Verification method:** Confirm directory search, grant/revoke audit behavior, no self-removal, no bootstrap-owner removal, minimal identity fields, and student restoration behavior.

---

## Medium Priority Issues

### BUG-007 — Leaked-password protection is unavailable on the current Supabase Free plan

**Severity:** Medium  
**Status:** External Plan Limitation  
**Area:** Authentication / Security
**Classification:** CONFIGURATION / PLAN LIMITATION

**What is wrong:** Supabase rejected saving the leaked-password protection toggle because the control is available only on Pro plans and above for this project.

**Expected behavior:** If the project’s security baseline requires HaveIBeenPwned-backed leaked-password checking, the platform needs a plan that supports it.

**Actual behavior:** The email provider is enabled, email confirmation and password reset remain enabled, the password minimum is set to eight characters, and authentication rate limits remain enabled. A read-only 26 August 2026 rate-limit review showed the configured email limit is 30 per hour, token verification is 30 per five minutes per IP, and sign-up/sign-in is 30 per five minutes per IP. Leaked-password protection is off because it cannot be enabled on the Free plan.

**How to reproduce:** In Supabase Auth Attack Protection, attempt to enable leaked-password protection for the current Free project; the dashboard identifies the Pro-plan requirement.

**What has already been fixed:** Password minimum, confirmation, reset, custom-SMTP configuration, and configured rate limits remain in place.

**What remains to be done:** Make and document a platform-owner Supabase plan decision before a broader public launch.

**Exact action required:** The platform owner must decide whether the leaked-password control is required before launch and upgrade the Supabase plan if so.

**Blocked by:** Supabase plan capability.

**Risk:** Known-compromised passwords are not checked by the provider’s Pro-only feature.

**Verification method:** If upgraded, enable the control and save the dashboard configuration successfully.

---

### BUG-008 — Production data hygiene must be audited before client handoff

**Severity:** Medium  
**Status:** Needs Verification  
**Area:** Production Data / Reporting
**Classification:** UNVERIFIED — PRODUCTION DATA HYGIENE

**What is wrong:** CampusWear is designed not to generate production seed data, but a final database audit is still required to prove that no test products, test orders, synthetic organizations, analytics, reviews, or placeholder records remain visible in production.

**Expected behavior:** All dashboard values should be database-derived from real records, and empty states should display zero/empty information rather than fabricated activity.

**Actual behavior:** A full post-onboarding data audit has not been performed because final real organizations and catalog data are not yet complete.

**How to reproduce:** Review the production tables and public surfaces with the platform owner, comparing every visible record with approved real data.

**What has already been fixed:** The identified public test announcement was removed with owner approval; public catalog and announcement screens now show honest empty states.

**What remains to be done:** Before client handoff, review the production tables and public catalog with the platform owner and remove only clearly identified non-production test records through an approved process.

**Exact action required:** The platform owner must approve a table-by-table production data review after real onboarding is complete.

**Risk:** Test content could be mistaken for real university merchandise or operational metrics.

**Verification method:** Inspect products, variants, orders, vendors, announcements, and reporting output; confirm no fabricated review or analytics content exists.

---

### BUG-009 — Production performance optimization remains an improvement item

**Severity:** Medium  
**Status:** Open Improvement  
**Area:** Frontend Performance
**Classification:** UNVERIFIED IMPROVEMENT

**What is wrong:** The current production client bundle is approximately 1.79 MB before gzip and produces a Vite chunk-size advisory.

**Expected behavior:** Public student routes should remain fast on typical mobile connections.

**Actual behavior:** Production build succeeds, but Vite advises code splitting for large chunks.

**How to reproduce:** Run `pnpm build`; Vite reports the minified client chunk is above its 500 kB advisory threshold.

**What has already been fixed:** The bundle builds successfully and no production diagnostic asset or reference is retained.

**What remains to be done:** Introduce route-level lazy loading or manual chunks after core acceptance work is complete; remeasure the deployed client bundle.

**Exact action required:** Perform a measured code-splitting change only after critical deployment and SMTP blockers are cleared.

**Risk:** Slower initial loads on constrained devices or networks.

**Verification method:** Compare initial-load performance before and after route-level code splitting on a mobile network profile.

---

## Low Priority Issues

### BUG-010 — Documentation and recovery procedures need final client-specific completion

**Severity:** Low  
**Status:** Ready; retain client-owned acceptance follow-up
**Area:** Operations / Deployment
**Classification:** READY

**What is wrong:** Deployment, migration, credential-rotation, and rollback guidance exists in repository documentation, but the client must validate it against the final GitHub repository, Vercel project, real domain, and selected service plans.

**How to reproduce:** Compare the current GitHub `main`, Vercel deployment commit, and operational access controls against the checked-in release guidance.

**What has already been fixed:** Task-facing Auth URL guidance, checkpoint history, release archive exclusions, and credential-free SMTP handoff records were updated.

**Actual behavior:** This historical publication issue is resolved. GitHub `main` is verified at `095bc81fa15b364f6a65567fd9d4a4fc2417145a` and Vercel Production is Ready from matching `095bc81`; the report and handoff now record the final client-owned acceptance steps.

**Expected behavior:** The platform owner should have an approved and tested process to deploy, roll back, rotate compromised SMTP credentials, deactivate compromised accounts, and apply migrations safely.

**What remains to be done:** Preserve the documented deployment and recovery process. Complete only the client-owned real-account and real-operational-data acceptance activities described in this report and the handoff.

**Exact action required:** None for the verified release. Use the documented guarded owner-side Git process and production verification before any future change.

**Verification method:** GitHub `main` and Vercel Production were verified at matching `095bc81`; production diagnostic routes return normal not-found responses.

**Risk:** A future operational incident may take longer to recover from.

---

### BUG-011 — Test-labeled announcement content was publicly visible on the student route

**Severity:** High  
**Status:** Resolved and Verified  
**Area:** Production Data / Student Experience

**What is wrong:** The live unauthenticated `/student` route displayed a public announcement labeled `Test` with the content `Uni Female` and `On stock 5` during the production audit.

**Expected behavior:** Public student pages should show only approved, real vendor or school communications. If no approved content exists, the application should show its honest empty state.

**Actual behavior:** The catalog section showed the expected no-product empty state, but a test-labeled announcement remained publicly visible. The owner confirmed its removal.

**Resolution:** The owner confirmed removal. The single identified record was deleted through the authenticated Supabase table editor, and the live `/student` page was rechecked. It now shows the honest **“No announcements yet”** empty state.

**Verification:** Passed on the live student route after cleanup.

---

### BUG-012 — Authentication page nested the linked brand mark within an additional link wrapper

**Severity:** Medium  
**Status:** Resolved and Verified Locally  
**Area:** Authentication / Accessibility / Client Rendering

**What was wrong:** Historical browser-console evidence showed React's nested-anchor warning on `/auth`. The current source no longer contains the historical additional link wrapper around the shared `BrandMark`, which already owns its own home link; a redundant non-link styling wrapper was also removed during the audit.

**Resolution:** The linked brand mark remains the only brand-navigation anchor and the redundant styling wrapper was removed without affecting the visual layout. A server-rendered Vitest regression now parses all anchor tags in the rendered unauthenticated Auth page and asserts that the maximum anchor depth is one.

**Verification:** The rendered-markup regression passed, the local `/auth` page rendered normally, and the recent browser-console tail contained no nested-anchor or hydration warning after the change. This source correction is not yet included in the deployed Vercel build.

---

### BUG-013 — Current deployed build publicly serves a development debug collector asset

**Severity:** High  
**Status:** Resolved and Verified Live  
**Area:** Deployment / Privacy / Diagnostics
**Classification:** CONFIGURATION / DEPLOYMENT

**What is wrong:** The current deployed `https://campuswear.vercel.app/__manus__/debug-collector.js` URL served a browser-debug collector script. The script is intended for local development and includes console, network, and interaction collection logic.

**Expected behavior:** The live production URL must return CampusWear’s normal 404 state for the collector path and expose no diagnostic collector or report endpoint reference.

**Actual behavior:** The prior deployment served the collector script. After the new Vercel deployment, read-only requests to both `https://campuswear.vercel.app/__manus__/debug-collector.js` and `https://campuswear.vercel.app/__manus__/logs` rendered CampusWear’s normal 404 state and exposed no diagnostic script or log data.

**How to reproduce:** Historical only: the pre-fix deployment served JavaScript at `https://campuswear.vercel.app/__manus__/debug-collector.js`. The current `095bc81` release returns the ordinary application not-found response.

**Resolution:** The Vite configuration now limits the collector plugin to development serving, while the production server dynamically loads Vite configuration only in its development setup path. The build also removes `dist/public/__manus__` as a defense-in-depth measure. A fresh production build verified that neither the collector nor diagnostic version file exists in the deployable output, and that generated production HTML, client assets, and bundled server contain no `debug-collector`, `__manus__/logs`, or collector-plugin reference.

**What has already been fixed:** The verified source and current live `095bc81` release have no collector output file or runtime reference.

**What remains:** No diagnostic-removal action remains. Continue to keep production builds on the verified configuration.

**Exact action required:** None for this resolved issue; preserve the production-build safeguards in future releases.

**Local verification:** The final validation suite passed after the change: **93 Vitest tests across 41 files**, strict TypeScript validation, production client/server build, Supabase readiness probe, no deployable `__manus__` directory, no debug-collector reference in generated production output, and no tracked SMTP/service-role/private-key pattern in application source or documentation.

**Verification method:** Verified on the current `095bc81` Vercel deployment: both paths render the application 404 state. No diagnostic data was submitted during the audit.

---

### BUG-014 — GitHub repository push is blocked despite read-only API administration visibility

**Severity:** High  
**Status:** Resolved and Verified Live  
**Area:** Source Control / Deployment
**Classification:** READY

**What is wrong:** The verified local `main` snapshot cannot currently be published to the CampusWear GitHub repository from this environment, preventing the Vercel Git integration from receiving the debug-asset fix.

**Expected behavior:** The authenticated GitHub identity should be able to force-push the user-authorized release snapshot to the repository’s `main` branch.

**Actual behavior:** The connected environment’s write attempt was historically blocked by HTTPS 403, but the repository owner successfully published from a local Git client. GitHub `main` now resolves to `095bc81fa15b364f6a65567fd9d4a4fc2417145a` with message `chore: publish CampusWear production checkpoint`; Vercel reports Production **Ready** from matching source `main` / `095bc81`.

**Reproduction:** Historical only: the sandbox GitHub credential returned HTTP 403 during an earlier automated push attempt. The verified release is already published; do not use an unqualified force-push for future publication.

**What has already been fixed:** The verified source is published: strict TypeScript, **93 tests across 41 files**, production build, Supabase readiness, and the no-debug-reference artifact audit passed.

**What remains:** No release-publication action remains for this release. The connected environment’s separate write credential may be reauthorized before a future automated push.

**Exact action required:** None for this release. Reauthorize the connected environment’s repository-write credential only if future automated publication is required.

**Verification method:** Verified through GitHub and the Vercel Production overview: both identify the matching `095bc81` release, and the live collector route returns the application 404 state.

---

## Open-Issue Classification and Required Actions

| ID | Classification | Exact action required | Verification method |
|---|---|---|---|
| BUG-001 | **READY** | Keep the verified Mailjet/Supabase confirmation and recovery configuration unchanged. | Authorized confirmation and recovery flows have been verified without exposing credentials or weakening rate limits. |
| BUG-002 | **NEEDS REAL-ACCOUNT VERIFICATION** | Onboard a real vendor, vendor staff member, school administrator, and separate confirmed student. | Execute documented cross-role, cross-school, storage, and direct-route isolation checks. |
| BUG-003 | **READY** | Retain the safe `/auth/confirmed` and `/auth/reset` return paths. | Valid confirmation and recovery continuations are verified; no new auth change is required. |
| BUG-004 | **CLIENT INPUT REQUIRED** and **NEEDS REAL-ACCOUNT VERIFICATION** | Authorize a real vendor, staff account, pickup information, products, variants, inventory, image assets, and operating hours. | Complete product-to-fulfillment and vendor-scoped storage/RLS acceptance. |
| BUG-005 | **NEEDS REAL-ACCOUNT VERIFICATION** | Confirm a separate real student using authorized vendor inventory. | Complete catalog, cart, checkout, own-order, notification, and denied-workspace checks. |
| BUG-006 | **NEEDS REAL-ACCOUNT VERIFICATION** | Have the real platform owner validate platform-account operations with an authorized confirmed tester. | Validate directory search, audited grant/revoke, no self-removal, and student restoration. |
| BUG-007 | **NON-BLOCKING IMPROVEMENT** | Decide whether leaked-password protection is a requirement for a broader launch tier. | If the service plan is upgraded, enable it and record the owner decision; existing confirmation, recovery, and rate limits stay enabled. |
| BUG-008 | **CLIENT INPUT REQUIRED** | Review production records with the owner; remove only exact approved non-production records. | Confirm products, variants, orders, vendors, announcements, analytics, and reviews contain no fabricated data. |
| BUG-009 | **NON-BLOCKING IMPROVEMENT** | Add route-level code splitting only if measured mobile performance requires it after acceptance. | Measure initial load on a representative mobile network profile; the approximately 1.88 MB advisory is not a launch blocker. |
| BUG-010 | **READY** | Preserve the recorded GitHub/Vercel deployment, rollback, monitoring, and recovery procedures. | GitHub `main` and Vercel Production were verified at matching `095bc81`; Vercel reported Ready. |
| BUG-011 | **EXTERNAL DEPENDENCY** | Do not restore Store Profile code or a migration until a working authorized CampusWear management connection exists. | Review a migration and rollback plan against the actual CampusWear schema, then test separately with a real authorized vendor. |

---

## External Dependencies

| Dependency | Why it is required | Current status | Who needs to act | Exact action required |
|---|---|---|---|---|
| Mailjet delivery | Supabase Auth needs a transactional relay for confirmation and recovery messages. | **READY:** confirmation and password-recovery delivery/return flows were verified with the generic CampusWear sender. | CampusWear owner | Preserve the current secure SMTP and Auth settings; monitor ordinary sender reputation and ask recipients to check Spam/Junk/Promotions before resending. |
| Real authorized vendor | Required to prove vendor catalog, storage, pickup, inventory, and fulfillment behavior. | Not onboarded. | CampusWear client/vendor owner | Submit or approve real vendor onboarding with actual organization and pickup details. |
| Real vendor staff | Required for vendor-scoped RLS, dashboard, and fulfillment tests. | Not onboarded. | Authorized vendor and platform owner | Register a real account and complete approved vendor-staff assignment. |
| Real school administrator | Required for school-scoped access acceptance. | Not onboarded. | University of Cebu representative and platform owner | Register and assign a verified authorized school-admin account. |
| Separate confirmed student | Required for a true student acceptance path independent of the platform owner. | No separate student acceptance account has been designated. | Student tester / platform owner | Register and confirm one real student account using the working Mailjet confirmation flow. |
| Final authorized vendor catalog and pickup location | Required for real checkout, stock, photo, order, and pickup acceptance. | Not supplied. | Authorized vendor | Enter real products, size variants, inventory, image assets, and pickup location. |
| Supabase plan decision | Leaked-password protection is required only if the owner makes it a broader-launch condition. | Non-blocking plan decision; confirmation, recovery, and rate limiting remain enabled. | Platform owner | Record a deliberate plan decision before any policy change; do not weaken existing controls. |
| Deferred Store Profile data module | Public store pages, editable profile, optional banner/logo, operating-hours editor, and public pickup projection require a new database contract. | **EXTERNAL DEPENDENCY:** deferred from the deployable release because only an unrelated Supabase management project is available. | Platform owner / authorized database operator | Restore a working authenticated CampusWear management connection, review schema compatibility and rollback before any migration, and use genuine vendor data only after approval. |

## Production Readiness

### Ready

The CampusWear React/Vite/TypeScript build, verified Supabase schema/RLS model, storage policies, checkout and fulfillment RPCs, role-routing helpers, vendor-application workflow, school configuration, platform-account controls, public route availability, and production readiness probe are implemented. GitHub `main` is verified at `095bc81fa15b364f6a65567fd9d4a4fc2417145a`, and Vercel Production is **Ready** from the matching `095bc81` commit. The source passed **93 Vitest tests across 41 files**, strict TypeScript validation, client/server production build, Supabase readiness, credential-value safety scan, and deferred-storefront scan. The live public home/auth entry and the existing vendor role boundary render as expected; the live diagnostic routes render the ordinary application 404 state.

### Historical and current live deep-link observations

| Route | Observed production behavior |
|---|---|
| `/` | Historical smoke testing rendered the public landing page normally; the current release is verified separately at `095bc81`. |
| `/student` | Public student portal rendered with honest catalog and announcement empty states after cleanup. |
| `/auth/confirmed` | Confirmation-success page rendered. |
| `/auth/reset` | Password-reset form rendered with new-password and confirmation fields. |
| `/auth` | Post-deploy smoke test confirmed the public sign-in form, password-visibility control, and recovery action. No credentials or form were submitted. |
| `/shop` | Post-deploy public catalog rendered its honest zero-product state: `0 items found` and `No live products match your search yet.` |
| `/shop/00000000-0000-0000-0000-000000000000` | Post-deploy smoke test showed the user-safe unavailable-product state with no internal error detail or data exposure. |
| `/cart` | Anonymous request redirected to `/auth?next=%2Fcart`. |
| `/orders` | Anonymous request redirected to `/auth?next=%2Forders`. |
| `/announcements` | Post-deploy smoke test rendered the approved **No announcements yet** state after test-content cleanup. |
| `/notifications` | Anonymous request redirected to `/auth?next=%2Fnotifications`. |
| `/profile` | Anonymous request redirected to `/auth?next=%2Fprofile`. |
| `/vendor` | Post-deploy smoke test rendered the vendor-workspace authentication guard; no vendor data was visible to the anonymous browser. |
| `/vendor/apply` | Unauthenticated vendor-onboarding guard rendered. |
| `/vendor/orders` | Vendor-workspace authentication guard rendered. |
| `/vendor/inventory` | Vendor-workspace authentication guard rendered. |
| `/vendor/products` | Vendor-workspace authentication guard rendered. |
| `/vendor/announcements` | Vendor-workspace authentication guard rendered. |
| `/vendor/reports` | Vendor-workspace authentication guard rendered. |
| `/admin` | School-administration authentication guard rendered. |
| `/platform` | Post-deploy smoke test rendered the platform-administration authentication guard; no account-management data was visible to the anonymous browser. |
| `/platform/accounts` | Platform-administration authentication guard rendered. |
| `/platform/team` | Platform-administration authentication guard rendered. |
| `/404` | Application not-found state rendered without development information. |
| `/__manus__/debug-collector.js` | Post-deploy read-only request rendered the application 404; no collector script was served. |
| `/__manus__/logs` | Post-deploy read-only GET rendered the application 404; no diagnostic log data was exposed. |
| `/__manus__/version.json` | Post-deploy read-only request rendered the application 404; no version metadata was exposed. |

### Needs Real-Account Verification

The authenticated platform-owner UI; student, vendor, school-admin, cross-organization, storage, inventory, checkout, fulfillment, data-hygiene, clean-checkout, and operational-recovery acceptance all require real authorized identities and non-synthetic records. The existing vendor session confirmed the `/vendor` dashboard and `/vendor/inventory` displays, but `/vendor/orders` remained on a loading skeleton in three read-only snapshots and `/vendor/announcements` in two. No request failure was exposed, so these are not yet confirmed defects. Direct live narrow-viewport checks previously showed readable stacked landing controls, responsive catalog/filter layout, accessible authentication controls, and a reachable vendor sign-in guard without horizontal overflow.

### Deferred Store Profile Data Module

The optional public store directory/profile, vendor-managed public identity, banner/logo media, operating-hours editor, and public pickup-location projection are **not part of this deployable release**. The deployable source intentionally retains only the verified existing `get_public_catalog(p_search, p_product_id)` contract and has no Store Profile route, management UI, media helper, or migration dependency. The authorized Supabase management connector exposes only the unrelated inactive SaveWise project, not CampusWear, so no CampusWear migration can be reviewed or applied safely.

Current production behavior remains safe and honest: public catalog cards and product details show the authorized vendor name already supported by the live catalog. Product photos, products, size-level inventory, checkout, orders, existing vendor pickup settings, and the released vendor SKU/stock/photo-adjustment workflow remain intact. Pickup details continue to be confirmed during the existing request/fulfillment process rather than exposed through an unverified public storefront contract.

> **Later prerequisite:** Restore a working authorized CampusWear PostgreSQL management path, review the real live schema and rollback plan, then introduce and verify the scoped Store Profile migration. Only then may the source module be reconsidered and accepted with genuine authorized-vendor data.

### Current Safe Release Deployment

The current source was published to GitHub `main` at `095bc81fa15b364f6a65567fd9d4a4fc2417145a` (**`chore: publish CampusWear production checkpoint`**). Vercel Production is **Ready** from matching `095bc81`. Read-only production verification confirms the public CampusWear entry, signed-in vendor dashboard, role-safe redirects from vendor access to student-only routes, size-level SKU/stock/threshold inventory display, and diagnostic-route 404 behavior. The deferred Store Profile module remains absent.

### UI Quality Review — Mobile Student Discovery

A local phone-sized visual review of `/shop` and `/student` confirmed readable two-column product cards, explicit vendor identity, price, featured size/availability copy, non-color-only low-stock badges, product-detail links, navigation icons, and a clear student hero. The client source has been improved with visible focus treatment, active navigation surfaces, explicit product-card action copy, and selected-size availability language.

The review also displayed test-labeled product descriptions and an announcement. Those are real-data hygiene concerns rather than a reason to hard-code substitute content. No product, announcement, or vendor record was changed. The platform owner must review and approve removal or correction of any non-production records before client launch.

### Controlled Verification Pending

Mailjet confirmation and password-recovery delivery/return flows are verified. Remaining controlled verification is real operational acceptance: final vendor onboarding, school-admin assignment, real catalog/inventory/pickup input, cross-role/RLS isolation, real product-image upload, and real student-to-vendor fulfillment.

### Client Actions Required

The client must provide and authorize the final vendor/store name, vendor contact and confirmed staff email, pickup location, operating hours, actual catalog/product images, prices, sizes, SKU values, size-level stock, low-stock thresholds, and the authorized school-administrator identity. The client must also approve any test-data disposition by exact record ID and complete live cross-role acceptance with permission to collect diagnostics where necessary.

### Recommended Next Task

**Preserve the verified `095bc81` release and Mailjet/Auth safeguards, then complete the remaining real-role, vendor, school-admin, Store Profile access, and operational acceptance work.** Spam/Junk/Promotions placement is a deliverability consideration, not a reason to weaken authentication safeguards.

## Final Deployment Status

### READY

The local release source is verified for its currently available scope: the normalized Supabase schema and RLS model, public catalog/announcement empty states, role-routing guards, vendor onboarding, platform-account controls, production Auth URL configuration, and non-destructive public smoke states all operate as documented. The authentic release build contains no debug-collector file or reference, and no tracked SMTP, service-role, or private-key pattern was found.

### FIXED IN THIS TASK

The production-build collector defect was fully addressed in source. The debug plugin is restricted to Vite development serving; production startup no longer statically bundles the Vite configuration; and `dist/public/__manus__` is removed defensively. The final artifact audit verified no collector file, diagnostic endpoint reference, or plugin string in production HTML, JavaScript, assets, or server bundle. The authentication page also has a rendered-markup test that prevents nested anchors, clear Inbox/Spam/Junk/Promotions guidance after sign-up, and secure resend screens for expired confirmation or reset links. The public test announcement has been removed.

### Email Delivery Status

**Mailjet Free** is the active Supabase custom-SMTP path. The generic CampusWear sender is active, and authorized confirmation and recovery flows completed using the approved routing without exposing credentials or weakening Auth safeguards. Historic Brevo troubleshooting is context only; it is not an active launch dependency. GitHub/Vercel publication is complete at `095bc81`.

### NEEDS REAL ACCOUNT VERIFICATION

Real authorized vendor, vendor-staff, school-admin, and separate confirmed-student accounts are still required for cross-role RLS, vendor inventory/storage, real checkout-to-pickup, school operations, and authenticated platform-account acceptance. No substitute identities, products, orders, analytics, or organizations were created.

### PRODUCTION URL

`https://campuswear.vercel.app` is the current verified deployment URL. Vercel Production is **Ready** from GitHub `main` commit `095bc81` (`chore: publish CampusWear production checkpoint`), which matches `095bc81fa15b364f6a65567fd9d4a4fc2417145a`. The debug collector, diagnostic log, and version-metadata paths each render CampusWear’s application 404 state.

### TEST RESULTS

| Check | Result |
|---|---|
| Vitest | The verified source suite passed **93 tests across 41 files**. |
| TypeScript | Passed with `tsc --noEmit`. |
| Production build | Passed for client and server. The known Vite large-chunk advisory remains an improvement item, not a build failure. |
| Supabase readiness | Passed; production schema and guarded RPC endpoints are reachable. |
| Production artifact audit | Passed; no `__manus__` output, collector reference, or tracked secret-pattern match. |
| GitHub/Vercel release match | Passed; GitHub `main` and Vercel Production both identify `095bc81`. |
| Live diagnostic endpoints | Passed; collector, logs, and version-metadata paths render application 404 states. |

### FINAL RECOMMENDATION

**READY FOR CONTROLLED LAUNCH / FULL CLIENT ACCEPTANCE PENDING.** The current Vercel deployment matches `095bc81`, exposes no checked diagnostic endpoint, and passed the recorded public/auth/role-boundary smoke checks. Mailjet confirmation and recovery are verified. Preserve the baseline, collect the required real client data and roles, restore a project-scoped CampusWear Supabase management path before any Store Profile work, and complete the documented cross-role acceptance using only authorized accounts and data.

## References

[1] [Supabase Auth SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp)  
[2] [Brevo transactional-email log guidance](https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews)  
[3] [Supabase Auth user-management documentation](https://supabase.com/docs/guides/auth/managing-user-data)


### BUG-016 — Platform RPC return-type mismatch remains unresolved in live schema

**Classification:** **NEEDS REAL-ACCOUNT VERIFICATION / EXTERNAL DEPENDENCY**  
**Status:** Open — live repair persistence and Account Directory output require confirmation  
**Area:** Platform Accounts and Platform Team RPCs

The precise PostgreSQL failure is `42804`: `auth.users.email` is `character varying(255)` while the RPC return contract declares `email text` (column 2). The approved source migration `20260828050000_fix_platform_rpc_email_type.sql` now contains `u.email::text` in both `list_platform_accounts` and `list_platform_team_members`, preserves the existing platform-admin gate, `security definer`, search path, filters, fields, and authenticated-only grants, and is covered by `platformRpcMigrationContract.test.ts`.

The Supabase SQL Editor submission did not produce a reliable execution confirmation, and a metadata-only post-attempt diagnostic still reported `42804` before the final dashboard re-entry. The live browser pages subsequently rendered normal non-error empty states, but the Account Directory still showed **No matching accounts** and the Team page showed **0 members**; this is not sufficient proof that the live RPC definitions and returned rows are correct. No account, vendor, product, order, commerce record, role, RLS policy, or security setting was modified.

**Required next step:** verify the persisted live function definitions and execute the approved function-only correction through a confirmed CampusWear Supabase project-scoped SQL path, then verify both RPC responses and route logs. Do not mark this item resolved or declare final acceptance based solely on the UI’s empty state.


---

### Final platform-admin and RPC verification — 28 August 2026

**Classification:** **READY** for the verified platform-admin scope; **NEEDS REAL-ACCOUNT VERIFICATION** remains for school-admin and real vendor acceptance.

Using the authorized platform-admin session `keancaballero147@gmail.com`, the read-only production checks completed successfully. `/platform` loaded the CampusWear Platform Operations overview with University of Cebu availability and the existing approved-vendor summary. `/platform/accounts` loaded the authenticated Account Directory and returned the honest `No matching accounts` empty state without exposing account records or a PostgreSQL `42804` error. `/platform/team` loaded the controlled-access workspace and returned the honest `No platform team members` empty state without exposing access-management data or a PostgreSQL `42804` error. Opening `/student` under the same platform-admin session redirected back to `/platform`, confirming the strict role boundary.

The two approved live database-function corrections were saved through the CampusWear Supabase project’s function editor. `list_platform_accounts` now uses `u.email::text` and retains its existing platform-admin authorization gate, `SECURITY DEFINER` behavior, search filter, returned fields, timestamp cast, ordering, row limit, and authenticated grant. `list_platform_team_members` now uses `u.email::text` and retains its existing platform-admin authorization gate, `SECURITY DEFINER` behavior, returned fields, timestamp cast, ordering, and authenticated grant. No account, vendor, product, order, inventory, announcement, role, RLS policy, or security setting was created, changed, approved, revoked, or deleted.

The live route results confirm that both RPC calls complete successfully for the authorized platform-admin session and that the previous `42804` failure is no longer exposed on the two routes. Because the live UI currently has no account-directory matches and no platform-team members, a non-empty return-row verification remains a future real-account acceptance item rather than a reason to create test data.

The platform workspace is therefore ready for the currently available read-only scope. Full client acceptance remains pending an authorized school-administrator account, a real authorized vendor and vendor-staff account, real catalog/inventory/pickup information, and cross-role acceptance using approved production identities.

---

## Final controlled-launch classification

| Category | Current result |
|---|---|
| **READY** | Public/auth/student/vendor/platform route checks already documented; platform-admin overview, Accounts, Team, and strict `/student` denial verified; both approved platform RPC corrections saved and live routes complete without `42804`; GitHub/Vercel baseline remains `095bc81` Ready. |
| **CLIENT INPUT REQUIRED** | Authorized school administrator; real vendor/store and vendor staff; actual products, images, sizes, SKUs, stock, low-stock thresholds, pickup location, operating hours, and acceptance participants. |
| **EXTERNAL DEPENDENCIES** | Authorized CampusWear Supabase management path for the deferred Store Profile migration; Mailjet remains the active custom-SMTP provider and should be monitored without weakening Auth safeguards. |
| **NON-BLOCKING IMPROVEMENTS** | Measure mobile performance and consider route-level code splitting for the approximately 1.88 MB Vite advisory only after real acceptance; review any test-labelled records only with exact IDs and owner approval. |
| **NEXT REQUIRED ACTION** | Provision the real authorized school administrator and vendor staff accounts, then execute the documented school/vendor cross-role acceptance. Do not claim full client acceptance before those checks pass. |


### Student role-boundary follow-up — 28 August 2026

**Classification:** **READY** for the tested route guards.

The authorized confirmed student session was tested read-only against `/vendor` and `/admin`. Both deep links redirected to `/student`, and the student workspace rendered without exposing vendor or school-administration controls. No product, order, inventory, account, role, or other production record was created or changed. This closes the two previously unverified student deep-link checks; real vendor, school-admin, storage, and cross-organization RLS acceptance remain separate client-input items.


### Final public smoke recheck — 28 August 2026

**Classification:** **READY** for the public surface reviewed.

The live public homepage loaded with the expected CampusWear branding, “Your Uniform. Your Identity.” messaging, browse-uniforms action, vendor-application action, and pickup-first product positioning. The public `/auth` entry resolved to the CampusWear account screen after its session check; no account mutation or privileged operation was attempted. The former development diagnostic path `/__manus__/debug-collector.js` returned the normal CampusWear 404 page. These observations do not replace the pending real vendor and school-administrator acceptance checks.


### Vendor-application role guard recheck — 28 August 2026

**Classification:** **READY** for the tested application boundary.

The authorized student account opened `/vendor/apply` and rendered the empty application form with real-data guidance without submitting an application or receiving vendor access. After a clean sign-out and sign-in, the authorized platform-admin account opened the same deep link and was redirected to `/platform`; the application form was not exposed. No account, vendor, application, product, inventory, order, announcement, role, or security setting was changed.


### Checkout-route clarification — 28 August 2026

**Classification:** **READY / NOT A BUG**.

The current CampusWear route map registers `/cart` as the pickup-request and checkout surface; it does not register a separate `/checkout` route. The authorized student’s `/cart` view loaded the account-scoped empty state with a safe “Browse catalog” action, and direct navigation to `/checkout` returned the standard 404. No order or cart mutation was attempted. The documented student flow should therefore use **Product → Size → Cart → Send pickup request → Orders**, not a separate `/checkout` deep link.


### Student acceptance pass — profile, cart, and checkout boundary — 28 August 2026

**Classification:** **READY** for the read-only student surfaces reviewed.

The authorized University of Cebu student account loaded its Profile screen, showing the assigned Student role and account-scoped identity. The account-scoped Cart loaded the honest empty state with a Browse catalog action. The supported checkout surface is the Cart pickup-request flow; direct `/checkout` is not a registered route and correctly returns the normal 404 page. This is not a broken checkout workflow. No item was added and no pickup request or order was submitted.

### Vendor price-input verification — 28 August 2026

**Classification:** **NEEDS REAL-ACCOUNT VERIFICATION** for the mutation path; **READY** for local validation.

The vendor product form uses `type="number"`, `min="1"`, `step="0.01"`, decimal input mode, and strict conversion before schema validation. The focused Vitest coverage passed for whole peso values, decimal peso values, zero stock values, and blank numeric fields. A real vendor product was not submitted during this review because no client-approved catalog record was authorized for mutation.


## 2026-08-28 Temporary vendor QA mutation and cleanup result

**Classification:** **BLOCKED — EXTERNAL DEPENDENCY / OWNER CLEANUP REQUIRED**

With explicit owner approval, the authorized vendor account `keancaballero143@gmail.com` created one clearly labelled temporary product named `CAMPUSWEAR QA TEMP - DELETE AFTER TEST` at `1111.50` PHP. The live product flow created three independent variants (`S`, `M`, and `L`), each with a temporary SKU, quantity `1`, and low-stock threshold `1`; each displayed the expected **Low stock** state. The live photo flow rejected SVG as unsupported, accepted a supported PNG below 4 MB, exposed zoom and horizontal/vertical crop controls, and saved the adjusted image. No customer, order, review, announcement, analytics, or organization record was created.

The temporary product was visible in the student catalog because new products are active by default. The observed vendor Products UI exposed editing, visibility, inventory, and photo controls but no delete control. The selected Supabase project `iwexgirpqomquorkikzs` returned zero rows for the exact QA product name and for a bounded `public.products` sample. Source inspection confirms the deployed CampusWear catalog uses `server/campuswear/repository` and the application’s MySQL-backed data layer; therefore no guessed deletion was executed against Supabase or the sandbox database.

A subsequent re-authenticated vendor Products view rendered `0 products`, but the authorized student catalog still displayed the temporary QA product. Cleanup is therefore **not confirmed**. The product must be removed or made inactive through the actual deployed application database management path before inviting real students. The temporary sandbox image and inspection scripts were removed from the source workspace and are not part of the release archive.

**Required owner action:** identify the deployed Vercel application’s actual production database management path, then remove only `CAMPUSWEAR QA TEMP - DELETE AFTER TEST` and its directly dependent variants/inventory rows. Recheck the student catalog afterward. Do not run deletion against the empty Supabase `public.products` table.


## Vendor product deletion control — READY IN SOURCE / DEPLOYMENT VERIFICATION REQUIRED

The vendor Products page now includes an accessible, confirmation-gated **Delete product** action. The client mutation is scoped to the authenticated vendor context and attempts to remove the associated stored image after successful product deletion. The live CampusWear Supabase project contains a `DELETE` policy on `public.products` for authenticated vendor staff that requires `private.is_vendor_staff(vendor_id)` and rejects products referenced by `public.order_items` through `public.product_variants`; order-linked products must be hidden instead.

Focused delete-contract coverage passed, the full regression suite passed with **97 tests across 43 files**, strict TypeScript passed, and the production build passed. The control is implemented in the current source but still requires deployment before it is available in the current live release. The temporary QA product is currently hidden from the student-facing catalog, but its physical deletion and image cleanup are not confirmed. The previous exact-record deletion attempt was rejected by a read-only transaction; no unrelated data was changed. Publish the updated source, then use the authorized vendor account’s confirmation dialog for future deletion, or provide a writable owner-level cleanup path for the existing QA record.
