# CampusWear First-Account Bootstrap and Sign-Up

CampusWear users register on the **public CampusWear site**, not in the Vercel dashboard. Once the latest version is deployed with the required Supabase browser variables, open:

```text
https://campuswear.vercel.app/auth
```

Select **Create account** with the configured bootstrap-owner email, set a password, and complete the confirmation email. The Vercel dashboard is only for deployment settings; it is not a user account portal.

## One-time ownership policy

The migration `20260825077000_bootstrap_platform_admin.sql` establishes a deliberately narrow first-owner control. It promotes only the configured bootstrap-owner email to `platform_admin` when that account first creates a Supabase Auth account. Every other account remains a `student` by default. The decision is serialized and recorded in a private state table, so later sign-ups cannot race or repeat the elevation.

> This is safer than making whichever public visitor happens to sign up first an administrator. Do not change the configured bootstrap email after the account has been claimed; use the future platform-administrator workflow to manage additional roles.

## University of Cebu CSV import

Upload [`university-of-cebu.schools.csv`](./imports/university-of-cebu.schools.csv) in Supabase **Table Editor → `schools` → Import data from CSV**. The file contains only the real school the project owner specified. It creates no vendor, product, order, review, statistic, or placeholder record.

## Required Vercel configuration

The deployed `/auth` page uses the Supabase email-and-password form. Retain these Vercel production variables for future deployments:

| Variable | Required value |
|---|---|
| `VITE_SUPABASE_URL` | The CampusWear project URL for `iwexgirpqomquorkikzs` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The active Supabase publishable key for that project |

Also configure Supabase Auth exactly as verified in the production dashboard:

| Setting | Required value |
|---|---|
| Site URL | `https://campuswear.vercel.app` |
| Redirect URL | `https://campuswear.vercel.app/auth/confirmed` |
| Redirect URL | `https://campuswear.vercel.app/auth/reset` |

Never put a Supabase service-role key in Vercel variables prefixed with `VITE_`. Mailjet now delivers real CampusWear recovery and confirmation emails. Fresh one-time links must still be tested to completion because previously delivered links were observed as expired; the application now gives users a secure resend path rather than bypassing verification.

## Deferred real-role checks

Vendor staff, school administrator, vendor pickup location, product-image upload, checkout-to-pickup, and cross-role denial checks remain deliberately deferred. They require the real vendor and staff/admin accounts, plus an actual pickup location; no replacement identities or commerce records will be fabricated.

## References

1. [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data.md)
2. [Supabase Auth Security](https://supabase.com/docs/guides/auth/password-security)
