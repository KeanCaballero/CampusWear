# CampusWear Production Release Steps

This release contains the live Supabase migrations, University of Cebu school import CSV, secure email-and-password account interface, one-time owner bootstrap policy, and configurable vendor pickup location.

## 1. Update the GitHub repository

Extract this release ZIP. In the extracted `CampusWear-Production-Release` folder, open PowerShell and run the following commands after replacing the placeholder with your GitHub repository URL.

```powershell
git init
git branch -M main
git add .
git commit -m "Deploy CampusWear Supabase production release"
git remote add origin https://github.com/KeanCaballero/CampusWear.git
git push -u origin main
```

If the repository already has a `main` branch, clone it first, replace its files with the extracted release files while keeping its `.git` folder, then run `git add .`, `git commit`, and `git push`.

## 2. Configure Vercel before deployment

In Vercel, open the **CampusWear** project, then open **Settings → Environment Variables**. Add these values for the **Production** environment.

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://iwexgirpqomquorkikzs.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Copy the active **Publishable key** from Supabase **Project Settings → API** |

Do not use a Supabase service-role key in Vercel or any variable beginning with `VITE_`. After saving the variables, use Vercel’s **Redeploy** action for the latest GitHub commit.

## 3. Import the real school

In Supabase, open **Table Editor → `schools` → Import data from CSV** and upload:

```text
docs/imports/university-of-cebu.schools.csv
```

The CSV adds only University of Cebu. It contains no vendor, product, order, review, analytics, or placeholder data.

## 4. Create the initial owner account

After Vercel finishes deploying, go to:

```text
https://campuswear.vercel.app/auth
```

Select **Create account** and register using the configured bootstrap-owner email. Complete the confirmation email. The database has a one-time safeguard: only the configured bootstrap-owner account can claim the initial `platform_admin` role. Every later registration defaults to `student`.

> Users sign up on the CampusWear website. The Vercel dashboard only configures and deploys the site.

## 5. Supabase Auth settings

Set the Auth Site URL to the deployed site root and add the following exact redirect URLs:

```text
https://campuswear.vercel.app
https://campuswear.vercel.app/auth/confirmed
https://campuswear.vercel.app/auth/reset
```

The configured Site URL must be `https://campuswear.vercel.app`; the code supplies the confirmation and reset path as an allowed redirect. Set the minimum password length to **8** in Supabase Auth security settings. Leaked Password Protection should be enabled only when the selected Supabase plan makes that control available.

## Deferred onboarding

Do not create substitute vendors, staff members, administrators, products, orders, reviews, or analytics. The remaining real acceptance checks require the actual authorized vendor, a real pickup location, vendor staff, and school administrator accounts.
