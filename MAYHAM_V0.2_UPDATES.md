# Mayham Accounts v0.2.0 — signed automatic updates

This release has the full in-app signed updater enabled. It **cannot** deliver updates until you set up your own **public GitHub repository for Mayham Accounts releases** and publish a later signed version (v0.2.1 or higher). The GitHub macro repository is separate. Never use RoALT's release workflow or signing key.

## First build on your Windows PC

1. Create a public GitHub repository for **Mayham Accounts itself** (NOT the Macro-Mayham-Macros catalog).
2. Extract this source project; double-click `BUILD_MAYHAM_WINDOWS.cmd`.
3. The builder will prompt for `owner/repo` the first time. Enter the **actual repository you created**. It creates a local P-256 signing key in `%LOCALAPPDATA%\MayhamUpdateKeys\` (not in the ZIP).
4. The builder embeds the **public** key and repository name in the Windows app. It outputs a normal installer plus `Mayham-Accounts-Setup-0.2.0.exe` and `.sig` in `Mayham Accounts Installer`.
5. Install the v0.2.0 installer once on all existing PCs. New users also install v0.2.0 once. It runs a check on launch, then every six hours (if automatic checks are enabled). Updates offer an **Update Now** action; none are installed without confirmation.
6. Back up the private PEM file securely and **never distribute, commit, or upload it**. Losing it means you cannot sign accepted updates for these installations.

## Publish future updates through GitHub Actions

1. Put the same full source project in the public GitHub repository named above. Ensure the project is at the repository root.
2. GitHub repository **Settings → Secrets and variables → Actions → Variables**: create `MAYHAM_UPDATE_PUBLIC_KEY`. Read its 128-digit hex value from `%LOCALAPPDATA%\MayhamUpdateKeys\` by running `python scripts/configure-mayham-updates.py` on your PC; the printed value is public.
3. Under **Secrets**, create `MAYHAM_UPDATE_PRIVATE_KEY_B64`, containing the **Base64 encoding of your original PEM private key**. On Windows PowerShell, copy the result of `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:LOCALAPPDATA\MayhamUpdateKeys\mayham-update-private.pem"))` directly into GitHub Actions secrets. Do not post that value in chats or issues.
4. Edit `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` to the **same newer version** (e.g., `0.2.1`), and update the lockfiles. Commit/push those edits to GitHub.
5. Make a tag `v0.2.1` and push it: `git tag v0.2.1` and `git push origin v0.2.1`.
6. The **Mayham Accounts - Signed Release** workflow builds and signs a Windows NSIS installer, validates the signing key, and publishes both `.exe` and `.exe.sig` as GitHub Release assets. The installed v0.2.0 app discovers the newest public non-prerelease GitHub release.

**GitHub Actions is optional**: your local Windows builder also signs release files. Upload both `Mayham-Accounts-Setup-X.Y.Z.exe` and `.exe.sig` to a GitHub release tagged `vX.Y.Z` in the configured repository. The names must match exactly.

## Troubleshooting

- No update offered: Is the repo public? Is the release **published**, not a draft or prerelease? Is the version higher than installed? Are both correctly named assets present? Is Settings → automatic app update checks on?
- "Updates not configured": The installed EXE was built without `MAYHAM_UPDATE_REPO` and `MAYHAM_UPDATE_PUBLIC_KEY`. Rebuild with the setup script.
- Signature mismatch: The update was signed by a different private key, or the signature does not match the installer. Do **not** bypass verification.
- Keep the installed v0.2.0 application's update signing key for ALL later versions. Changing the key or repository after distribution requires another manual install.
- The app refuses an update while active launches/Roblox installation tasks are running. Close those activities and try again.
- Windows may still show a UAC/system installer prompt depending on how Mayham Accounts was originally installed.

### Preserved functionality

The VIP/Discord/Patreon role flow and free Macro Collections from the last source package are retained. Patreon role verification still requires configuring and hosting `vip-service/` separately.
