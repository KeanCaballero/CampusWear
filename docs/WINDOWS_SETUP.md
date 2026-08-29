# Run CampusWear on Windows

The PowerShell message `pnpm is not recognized` means that pnpm is not installed or is not available in your current terminal PATH. The CampusWear repository uses pnpm because its lockfile is `pnpm-lock.yaml`.

## 1. Confirm Node.js is installed

Open **PowerShell** and run:

```powershell
node --version
npm --version
```

If either command is not found, install the current **Node.js 22 LTS** release from [nodejs.org](https://nodejs.org/), then close and reopen PowerShell.

## 2. Install or activate pnpm

Use either method below. The first method is recommended because Node 22 includes Corepack.

```powershell
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm --version
```

If Corepack is unavailable, use npm instead:

```powershell
npm install --global pnpm@10.4.1
pnpm --version
```

If PowerShell says scripts are disabled, run this once as your normal Windows account, close PowerShell, and open it again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 3. Install and run CampusWear

Open PowerShell in the extracted project folder:

```powershell
cd "$HOME\Downloads\CampusWear-GitHub-Vercel-Supabase-handoff"
pnpm install
pnpm dev
```

Then open the local address printed in the terminal, usually `http://localhost:3000`.

## Useful checks

```powershell
pnpm check
pnpm test
pnpm build
```

Do not create or commit a `.env` file containing secrets. Configure production values only through the Vercel environment-variable UI.

