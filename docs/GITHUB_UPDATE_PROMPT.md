# GitHub Update Prompt

Copy and paste the following prompt into GitHub Copilot Chat, a GitHub coding agent, or use it as your implementation checklist after uploading the refreshed CampusWear ZIP:

```text
You are updating the CampusWear repository. Keep the existing React + Vite + TypeScript structure and do not add secrets or .env files.

1. Replace the repository contents with the latest CampusWear release files from the uploaded ZIP, preserving .git history.
2. Ensure these root files are present and committed:
   - vercel.json
   - package.json
   - pnpm-lock.yaml
   - README.md
   - docs/VERCEL_FIX_STEPS.md
   - docs/WINDOWS_SETUP.md
   - docs/PRODUCTION_HANDOFF.md
   - supabase/migrations/20260824190000_campuswear_mvp.sql
3. Ensure client/src/pages/Auth.tsx exists and client/src/App.tsx registers /auth.
4. Ensure the home page Sign in and Open vendor workspace buttons link to /auth.
5. Keep Vercel configured to build only the Vite client:
   - buildCommand: pnpm run build:client
   - outputDirectory: dist/public
   - installCommand: pnpm install --frozen-lockfile
6. Do not use pnpm build as Vercel’s static-site build command, and do not set dist or dist/index.js as the output directory.
7. Remove nonessential repository artifacts from the public repository if they are not needed at runtime, including old design-system exports, spec-notes.md, template.json, and todo.md. Do not remove source code, tests, docs, migrations, or configuration files.
8. Run pnpm check, pnpm test, and pnpm run build:client before committing.
9. Commit with: "Add account onboarding and finalize Vercel release configuration".
10. Follow docs/WINDOWS_GIT_PUSH.md if you need a safe Windows PowerShell workflow that preserves the existing GitHub history.

Do not deploy, modify Vercel environment variables, or apply a Supabase migration. Report any missing required files before making changes.
```
