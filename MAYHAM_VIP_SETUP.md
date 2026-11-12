# Mayham VIP / Patreon role verification

This source package adds a **Mayham VIP** navigation tab and free **Macro Collections** in the Macros tab. Existing free account, browsing, launch, themes and macros features are not gated.

## Configured Discord identifiers
- Application ID: `1569520017224106054`
- Guild/server ID: `1551126395432861708`
- Patreon-managed VIP role ID: `1558801424396058755`

## What currently works
- New VIP tab in More Tools, with Discord linking through the **optional external service** (see `vip-service/README.md`).
- Only a verified Discord guild role causes the VIP status to display as active; no local VIP switch exists.
- Refreshes Discord role checks while the VIP page is open. Not connected or verification unavailable means no VIP access.
- Free macro collections with create, rename, delete, assign macros, filter and favourites; stored locally.

## Not yet implemented
- The VIP perks (exclusive themes, advanced macro profiles, early access, advanced launcher presets, profile customisation and voting) are **roadmap cards**, not functioning premium tools yet.
- The VIP backend must be deployed before Discord connection works. Setting IDs alone does **not** make Discord OAuth functional.
- This reference service uses ephemeral memory for sessions, not production-grade persistent session storage or a hardened subscription entitlement service. See production precautions in the service README.

## Build + installation
1. Deploy the VIP service via HTTPS, configure your Discord OAuth redirect and client secret **on the server**, never in the app.
2. Set `VITE_MAYHAM_VIP_API_URL` to the server's `https://` public base URL before compiling Mayham Accounts. (If unset, the VIP page explains that setup is pending.)
3. Run your existing `BUILD_MAYHAM_WINDOWS.cmd` script. It is unchanged and retains previous short-path fixes.
4. Test a Patreon VIP Discord account, an ordinary Discord account, and a removed/expired role before distributing an installer.
