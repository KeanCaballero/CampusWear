# Fix the CampusWear Vercel Deployment

## What the screenshots show

The Vercel domain is displaying JavaScript that begins with `// server/_core/index.ts`. That means Vercel is publishing the **server bundle** (`dist/index.js`) as a static website. The browser should instead receive the Vite frontend build from `dist/public/index.html`.

Do **not** set `dist` as Vercel’s Output Directory. Do **not** use `pnpm build` as Vercel’s build command for this project; that command builds both the client and the Node server bundle.

## 1. Update the repository root files

In GitHub, open the `CampusWear` repository. These files must be in the **top-level folder** beside `package.json`, not inside `client/` or `server/`.

### Create or replace `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm run build:client",
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Update `package.json`

In the `scripts` section, make sure these scripts exist exactly:

```json
{
  "build": "pnpm run build:client && pnpm run build:server",
  "build:client": "vite build",
  "build:server": "esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "vercel-build": "pnpm run build:client"
}
```

Keep your existing `dev`, `test`, and `check` scripts. The important change is that **Vercel builds only the client** with `pnpm run build:client`.

### Confirm `api/trpc/[...trpc].ts` exists

Create this file if it is missing:

```ts
import { createApp } from "../../server/_core/app";

export default createApp();
```

This is for `/api/trpc/*` requests. It is not required just to fix the visible homepage, but it is required for the tRPC API after environment variables are configured.

## 2. Commit and push

After saving the files in GitHub, create one commit with a message such as:

```text
Fix Vercel Vite output configuration
```

Push the commit to the `main` branch. Vercel automatically detects the new commit.

## 3. Correct Vercel Project Settings

Open **Vercel → CampusWear → Settings → General → Build and Deployment**. Click **Override** where needed and set these values:

| Setting | Value |
|---|---|
| Framework Preset | `Vite` |
| Root Directory | `./` or leave it empty |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build:client` |
| Output Directory | `dist/public` |
| Node.js Version | `22.x` |

Remove any incorrect **Output Directory** value such as `dist`, `server`, `server/_core`, or `dist/index.js`.

## 4. Redeploy without cache

1. Open **Deployments** in the Vercel sidebar.
2. Open the newest deployment from `main`.
3. Click the **⋯** menu, then choose **Redeploy**.
4. Turn off **Use existing Build Cache** if Vercel shows that option.
5. Start the redeployment and wait for the status to become **Ready**.

## 5. Verify the fix

Open `https://campuswear.vercel.app/` in a new private/incognito window. You should see the CampusWear landing page beginning with **“Know Before You Go.”** If you see source code again, check the deployment’s **Build Logs**. The ending lines must show a Vite output similar to:

```text
dist/public/index.html
dist/public/assets/...
```

They must not end by selecting `dist/index.js` as the static output.

## Important: Supabase and API follow-up

This repair fixes the public frontend deployment. The authenticated ordering API still needs a compatible server database configuration. The current server uses `mysql2`, so do not place a Supabase Postgres URL in `DATABASE_URL`. Use `docs/PRODUCTION_HANDOFF.md` when you create the dedicated CampusWear Supabase project and plan the server data-layer migration.

