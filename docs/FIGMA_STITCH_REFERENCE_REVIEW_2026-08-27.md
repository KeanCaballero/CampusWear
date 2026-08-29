# CampusWear Figma and Stitch Reference Review

The user supplied a Figma board and a Stitch project as additional design references for the active Pasted Content 11/12 redesign. Their interface patterns are treated as visual inspiration only; no source, assets, unpublished content, production data, or protected implementation is copied.

## Compatible visual patterns applied

The Figma board presents a cohesive institutional commerce system with a compact navy side-navigation pattern for operations work, light content surfaces, concise metric cards, table-like management regions, and clearly separated public, student, vendor, school-admin, authentication, and onboarding screens. These patterns directly reinforce the current CampusWear redesign: the shared operations shell, semantic metric surfaces, compact student navigation, real-data product cards, ordered pickup information, and focused vendor-application framing have all been retained or strengthened.

The Stitch project loaded only its application shell in the available session, so no project-screen detail could be safely extracted. Its project location is recorded as a design-reference source only and does not influence application behavior without visible, user-authorized content.

| Reference pattern | CampusWear decision |
|---|---|
| Navy operational navigation and light working surface | Retained and strengthened in the shared role-protected dashboard shell. |
| Compact KPI and management-card hierarchy | Applied to vendor, school, and platform overviews using real query data only. |
| Distinct public, student, and operational layouts | Retained through public landing/auth, StudentShell, and DashboardLayout boundaries. |
| Store discovery and public store-profile references | Deferred; the verified production schema lacks the required store-profile migration and no vendor/store data is invented. |
| Dense management tables/forms | Applied only where existing real vendor/school/platform operations already support the associated actions. |

## Constraints retained

The redesign does not add a public store directory, store profile, banner/logo, public pickup projection, vendor storefront identity fields, unsupported announcement categories, synthetic catalog records, or placeholder analytics. These features require a verified CampusWear Supabase schema path and real authorized data before they may be designed and accepted.
