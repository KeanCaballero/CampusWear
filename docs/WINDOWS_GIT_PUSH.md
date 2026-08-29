# Push the Fresh CampusWear ZIP to GitHub on Windows

This method is safer than running `git init` inside the ZIP folder because it preserves the existing history in `KeanCaballero/CampusWear` while replacing the old working files with the clean release contents.

## Before you start

Install [Git for Windows](https://git-scm.com/download/win) if `git --version` does not work. Then extract `CampusWear-Release-Latest.zip` into your Downloads folder.

Open **PowerShell** and run these commands one section at a time.

## 1. Define the two folders

Change `$release` if you extracted the ZIP under a different folder name.

```powershell
$release = "$HOME\Downloads\CampusWear-Release-Latest"
$repo = "$HOME\Downloads\CampusWear-github"
```

## 2. Clone your existing GitHub repository

```powershell
git clone https://github.com/KeanCaballero/CampusWear.git $repo
Set-Location $repo
```

If Git asks you to sign in, choose **Sign in with your browser** and authorize your GitHub account.

## 3. Replace only the cloned working files

The following command deletes every file in the fresh clone except its `.git` history. Do **not** run it in another folder.

```powershell
Get-ChildItem -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
Copy-Item -Path "$release\*" -Destination $repo -Recurse -Force
```

## 4. Check the changes, commit, and push

```powershell
git status
git add -A
git commit -m "Add account onboarding and latest CampusWear release"
git push origin main
```

After `git push origin main` succeeds, Vercel should automatically create a new deployment from the updated `main` branch.

## If Git says you do not have an identity

Run these once, using your own GitHub email:

```powershell
git config --global user.name "Your GitHub Name"
git config --global user.email "your-github-email@example.com"
```

Then repeat the commit and push commands.

## If Git says the push was rejected

Do not use `git push --force` first. Run:

```powershell
git pull --rebase origin main
git push origin main
```

If you see a merge conflict, stop and share the exact PowerShell message before deleting or force-pushing anything.
