# Mayham VIP verification service

This optional Node.js 20+ HTTPS service verifies Patreon-managed Discord role membership. It does not process payments. **Never put DISCORD_CLIENT_SECRET or tokens in the desktop source or frontend.**

Discord Application ID: `1569520017224106054`  
Discord Guild ID: `1551126395432861708`  
VIP Role ID: `1558801424396058755`

## Before distributing the updater-enabled app

1. Deploy this folder to an HTTPS-capable Node server (or reverse proxy) with a stable public domain. The service uses an in-memory session store, so use one instance; restarting it requires users to reconnect. For production, use persistent encrypted storage, add rate limiting, audit logs and session revocation.
2. In Discord Developer Portal > OAuth2 > Redirects, add `https://YOUR-DOMAIN/oauth/callback` and use that exact value for `DISCORD_REDIRECT_URI`.
3. Set the following **server environment variables** (keep the secret private):

   - `DISCORD_CLIENT_SECRET` — your Discord application's client secret, not bot token
   - `DISCORD_REDIRECT_URI=https://YOUR-DOMAIN/oauth/callback`
   - `VIP_PUBLIC_URL=https://YOUR-DOMAIN`
   - `VIP_CORS_ORIGIN=http://tauri.localhost,tauri://localhost` (adjust for your Tauri build)
   - `PORT=8787` (or your hosting provider's port)

4. Run `node vip-service/server.mjs` from the project root. The server requires HTTPS termination upstream.
5. When building the desktop app, set `VITE_MAYHAM_VIP_API_URL=https://YOUR-DOMAIN` in your build environment. If unset, the VIP tab shows a setup-needed message and never grants VIP.
6. Check the Discord OAuth `identify` and `guilds.members.read` scopes are enabled and that the user's Patreon account is linked to Discord. Their server role must match the ID above.

### Security and limitations

- Verification happens on the server on every `/api/status` check; local flags cannot grant VIP. The desktop currently displays a membership and feature roadmap; individual VIP benefits are **not yet implemented** and must each enforce an entitlement in their corresponding backend action or service.
- The desktop has an opaque pairing/session identifier stored locally. A stolen session identifier can be used to look up membership; treat it as sensitive. In production persist sessions securely and add explicit revoke/sign-out, rate limiting, HTTPS, CSRF protections and token encryption at rest. The reference implementation is suitable for development, not an audited production paywall.
- VIP membership is fail-closed if Discord is unavailable. Free features are unaffected.
- Users cannot turn VIP on through local storage: the service always verifies the actual role with Discord.
