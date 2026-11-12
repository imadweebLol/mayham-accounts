# Macro Mayham — Official catalog auto-connect

Official repository: https://github.com/imadweebLol/Macro-Mayham-Macros

The **Macro Mayham Macros** tab is preconfigured to fetch `https://raw.githubusercontent.com/imadweebLol/Macro-Mayham-Macros/main/catalog.json` automatically whenever the tab opens. Users do not need GitHub accounts or to paste a URL. The **Refresh Official Macros** button rechecks the catalog.

## Publishing official macros

1. Keep the repository public on its `main` branch.
2. Put `catalog.json` at the repository root with macro files under `macros/`.
3. Update the catalog's macro version, relative path and SHA-256 for each release.
4. Commit and push. Users refresh the tab; they do not need to update the app for new macro entries.

## One-time app installation

Run `INSTALL_MAYHAM_MACRO_UPDATE.cmd` on a Windows development PC with Node.js, Rust and MSVC installed. It compiles the source and opens a standard Windows NSIS installer. Once generated, distribute `Mayham Accounts Installer/Mayham-Accounts-Setup.exe` to your community: *they do not need compilers*. Preserve/backup account data before installing the new fork, and verify saved accounts survive your first update.

## Safety and limitations

The current macro catalog opens GitHub file pages when users select View / Download; it does not silently install or execute scripts. Files should be reviewed and checksums checked before use. If `catalog.json` has not been uploaded or is inaccessible, the tab displays an error rather than fake entries.

This ZIP is **source + build script**, not a precompiled installer; a Windows build is still required once.
