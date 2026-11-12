# Mayham Accounts v0.1 — from Solid UI Edition

This is the COMPLETE fork source project, not a compiled Windows `.exe`.

## New in v0.1

- The **Solid UI** remains the default; players can change to **RoALT classic** and restore the original liquid/bubble navigation appearance. Bubble movement can independently be toggled in Custom Themes.
- Theme colours, radius, glow and opacity are adjustable.
- Players can upload PNG, JPEG, WebP and GIF backgrounds from their PCs (8 MB maximum, consistent with the original background importer).
- **Save as preset** snapshots theme options plus the current background image. Applying the saved theme restores its image from the application's database, even if the original image is moved. Saved custom themes can be deleted. Built-in themes can be hidden and later restored.
- News includes a fixed **v0.1 menu release announcement** with credits for Macro Mayham and inspectsoftware/the original RoALT developers. Roblox and other non-RoALT news remain.
- The **Macro Mayham Macros** tab starts with **no official macros** and accepts local references to `.ahk`, `.rec`, `.pmc`, `.au3`, `.mcr`, `.mmacro` and `.py` files. Importing never automatically runs them.
- Settings → About retains a separate Macro Mayham section and RoALT MIT licence/credit/Discord (`https://discord.gg/roaltdev`).

## Build a Windows setup installer

Build on Windows 10/11 with Node 22+, MSVC Desktop C++ tools (including Windows SDK), Rust stable and Strawberry Perl for bundled OpenSSL. Run `npm ci` and `npm run tauri -- build --bundles nsis`. The installer appears under `src-tauri/target/release/bundle/nsis`.

The GitHub Actions workflow `.github/workflows/mayham-windows.yml` also builds an installer on a hosted Windows runner. Your **community only needs the installer**; it does not need the build tools.

### Faster repeat builds

Keep the same `src-tauri/target` directory (or set a shared `CARGO_TARGET_DIR`). Moving source into a completely new directory can force OpenSSL and other native dependencies to rebuild. Do not delete `target` between minor edits.

## Publishing signed in-app updates (configuration required)

**Safety:** The fork never checks or installs the original RoALT update feed. In-app updates are dormant until you configure your own public GitHub release repository **and** a matching P-256 signing public key at Windows build time.

1. Pick your own GitHub release repo, for example `YourOrg/Mayham-Accounts`, and set `MAYHAM_UPDATE_REPO=YourOrg/Mayham-Accounts` in the environment when building.
2. On a protected machine, install Python `cryptography` and run `python scripts/mayham-release-sign.py keygen`. Store the generated PEM **private key privately**; do not commit, publish or send it to players.
3. Set `MAYHAM_UPDATE_PUBLIC_KEY=<128-digit hex value printed by keygen>` in the build environment. Rebuild the app; the public key is embedded in its binary and the private key is not.
4. For your next release, bump both `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` versions, build the NSIS installer, rename the installer asset to `Mayham-Accounts-Setup-X.Y.Z.exe` (where `X.Y.Z` matches the version).
5. Run `python scripts/mayham-release-sign.py sign Mayham-Accounts-Setup-X.Y.Z.exe --private-key /safe/path/mayham-update-private.pem`. This creates `Mayham-Accounts-Setup-X.Y.Z.exe.sig`.
6. Create a GitHub Release with tag `vX.Y.Z` and attach **both** files. The app can then check that release and install it after the player's confirmation. Installer must be configured to use a consistent install path; NSIS silent `/S` is used.

The original RoALT updater uses a different key and release naming convention; do not reuse it. A private signing key and public release location are mandatory to actually deliver secure in-app updates. Test upgrading from a clean `v0.1.0` install before distributing.

## Credits

Mayham Accounts is an independent fork of RoALT by **inspectsoftware** under the project's original MIT licence and NOTICE. Thanks to the original RoALT contributors. [Original developers' Discord](https://discord.gg/roaltdev). Macro Mayham is responsible for this fork's branding, custom UI and feature additions; it is not officially associated with RoALT.
