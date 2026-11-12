# Mayham Accounts v0.2.1 — publishing and testing

## What is included
- Existing Discord Rich Presence using application ID `1569520017224106054`. Enable in Settings.
- Existing Mayham VIP tab and Discord OAuth role verification client. **VIP linking requires a separately deployed HTTPS backend** (see `MAYHAM_VIP_SETUP.md` and `vip-service/README.md`).
- Mayham branding refinements for classic theme labels and installer publisher link.
- Updater version increased to 0.2.1.

## Important: GitHub is empty until you push
1. Create a public repository at `https://github.com/imadweebLol/mayham-accounts`, if it does not exist.
2. Commit the project files to that repository. Do not commit `.pem`, private keys, build secrets, or local `.env` files.
3. In repository Settings > Secrets and variables > Actions, set:
   - Variable: `MAYHAM_UPDATE_PUBLIC_KEY` = the 128-character public key from local updater setup.
   - Secret: `MAYHAM_UPDATE_PRIVATE_KEY_B64` = base64 encoding of your local private key PEM; generate this locally and paste into GitHub Actions only. Never paste the PEM into a chat.
4. Verify the installed v0.2.0 app was compiled with matching `MAYHAM_UPDATE_PUBLIC_KEY` and `MAYHAM_UPDATE_REPO`; **otherwise it cannot discover or authenticate v0.2.1**.
5. Commit and push `main`. On a Windows Git terminal, after reviewing the staged files:

```powershell
git init
git branch -M main
git remote add origin https://github.com/imadweebLol/mayham-accounts.git
git add .
git status
git commit -m "Mayham Accounts v0.2.1"
git push -u origin main
git tag v0.2.1
git push origin v0.2.1
```

6. Check Actions > **Mayham Accounts - Signed Release** and wait until it succeeds. A successful run uploads `Mayham-Accounts-Setup-0.2.1.exe` and its signature/metadata.
7. Open Releases and confirm the v0.2.1 release exists. Run installed v0.2.0 and use **Check for updates**, confirm it recognizes v0.2.1, validates the signature, and installs.

## Limits and compatibility
- Existing `roalt` internal compatibility identifiers, legacy database filenames, theme values, storage keys, and backup extensions are deliberately **not renamed**: changing them without a migration can lose accounts or break settings. This update removes selected user-visible branding, not every internal historical identifier.
- Required license/copyright/attribution for RoALT remain in Credits and legal files.
- A Windows build, signed release, Discord handshake and end-to-end update have **not yet** been tested by this package preparation.
