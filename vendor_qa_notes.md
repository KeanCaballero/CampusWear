# Temporary vendor QA notes

- Date: 28 August 2026.
- Authorized vendor account: the user-provided vendor session resolved to `keancaballero143@gmail.com`.
- `/vendor` loaded the Vendor Workspace, confirming the role boundary after the initial auth transition briefly displayed stale student-shell content.
- `/vendor/products` loaded the Products and stock form.
- The vendor catalog currently rendered `0 products`, so there is no existing vendor-owned product to use for non-destructive edit or photo QA.
- The form visibly includes Product name, Description, Price (PHP), Sizes/SKU/stock, and low-stock alert controls.
- No product, image, inventory, order, announcement, or other production record has been created yet.
- Temporary QA creation is authorized by the user only for one clearly labelled test product, with cleanup attempted afterward; no customer/order/review/analytics data is permitted.


## Mutation evidence

- The temporary record was created successfully as `CAMPUSWEAR QA TEMP - DELETE AFTER TEST`.
- Price `1111.50` was accepted and displayed as `₱1,112`, confirming decimal-to-centavo rounding/display behavior.
- Three variants were created: S, M, and L, each with a unique temporary SKU and quantity `1`; each displayed `Low stock` at threshold `1`.
- SVG upload was rejected by the form’s supported-file guard; PNG upload then succeeded.
- The PNG preview rendered in the photo-adjustment dialog. Zoom changed to `125%`, horizontal position to `0.15`, and vertical position to `-0.1`; the adjusted-photo save action completed and closed the editable state.
- No customer, order, review, announcement, analytics, or organization record was created.
- Cleanup status is pending. The Products UI exposes photo adjustment and product editing but no delete control; if no supported delete/archive action exists, the record will be made non-visible and its inventory set to zero, then residual retention will be documented for owner-approved cleanup.


## Session/cleanup observation

- The temporary product card visibly showed the saved QA image, price `₱1,112`, three size rows at one unit, and `Low stock` badges.
- Opening the temporary product edit section exposed the normal edit surface, but a subsequent scroll caused the live session to return to the authentication guard. No cleanup action was taken yet.
- The Products UI has not exposed a delete control in the observed card surface. Cleanup will therefore be attempted only through a supported visible control after re-authentication; no direct database deletion will be performed through an unapproved path.


## Visibility and cleanup-critical finding

- After the vendor session transitioned back through the student shell, the temporary product and its saved QA image appeared in the public student catalog as an active product with `₱1,112` and low-stock size cards. This confirms the product-create flow publishes active products immediately.
- The Products UI observed in the live DOM exposes edit, visibility, size/inventory fields, and photo adjustment, but no delete control. The temporary record is therefore currently a residual production record and must be cleaned up through a supported owner-approved path before final acceptance can be reported.
- No student added the product to a cart and no order was created. The temporary image file remains outside the project and is not part of the release archive.


## Data-source reconciliation blocker

The authorized Supabase project `iwexgirpqomquorkikzs` returned zero rows for the exact temporary QA product name and for a bounded sample of `public.products`. Meanwhile, the live CampusWear app showed the temporary product in both vendor and student views. Because the live app record is not identifiable in this project’s `public.products` table, no DELETE statement was executed. This discrepancy must be resolved before cleanup; issuing a guessed deletion against another table or project would violate the approved scope.


## Confirmed backend mismatch

The deployed bundle references `https://iwexgirpqomquorkikzs.supabase.co`, but the current CampusWear source routes catalog operations through `server/campuswear/repository` and the server’s existing database layer rather than the Supabase `public.products` table. The authorized Supabase SQL editor returned zero rows for both the exact QA name and a bounded products sample, while the live app continued to show the temporary product. Cleanup must not target the empty Supabase table; it must use the app’s actual supported data path or an owner-approved management path for that backend.


## Cleanup verification attempt

After re-authenticating the authorized vendor account and opening `/vendor/products`, the live vendor catalog rendered `0 products`, with no temporary QA record visible. This is consistent with cleanup having completed or with the vendor catalog query returning an empty state; the student-side catalog must still be checked to distinguish those outcomes. No SQL DELETE was executed because the selected Supabase project does not contain the app record.


## Re-authenticated cleanup observation

The authorized vendor account successfully reopened the vendor workspace, but the Products route subsequently returned an empty `0 products` state and the session expired during repeated editor navigation. The application’s supported Products UI still exposed no delete control. The Supabase SQL editor is not the app’s catalog backend, so no direct deletion was executed there. The final check is now switching to the authorized student session to verify whether the temporary product remains publicly visible.

## Delete-control visual QA

The local vendor Products route renders the authentication gate when no session is present. Desktop and mobile captures confirmed the route remains responsive after adding the confirmation-gated delete action; a signed-in visual capture of the new control still requires the vendor session to be available. The action uses a minimum touch-sized button and the existing AlertDialog confirmation primitive. Focused feature tests and strict TypeScript validation passed.


## Post-hide catalog check

A live read-only navigation to `/student` under the current authorized vendor session redirected to `/vendor`, consistent with strict role routing. The returned CampusWear catalog surface did not list `CAMPUSWEAR QA TEMP - DELETE AFTER TEST`; it showed only the remaining catalog entries. This verifies student-facing visibility is hidden, but it does not prove physical deletion of the product, variants, inventory rows, or stored image. The new source-level delete control remains pending deployment and exact-record deletion remains blocked by the read-only management path.
