# CampusWear QA Notes

## Published repository review

The GitHub repository currently contains the Vercel Vite output repair (`vercel.json`, `api/trpc/`, and the corrected package scripts). Its latest visible commit is **Fix Vercel Vite output configuration**. The public Vercel screenshot supplied by the user confirms that the landing page now renders instead of the server bundle source.

## Account page review

The `/auth` route was checked in the active local authenticated session. It displays the account summary, a role-aware continue action, and a sign-out action inside the CampusWear design system. When no session is present, the same page exposes sign-in and create-account modes that start the existing secure OAuth account flow.

