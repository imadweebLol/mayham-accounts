# Mayham VIP crown and Discord profile update

- The VIP crown is now a top-level navigation tile instead of hiding under More Tools.
- Bottom-right account panel displays the verified Discord avatar, display name, and @username. Unlinked accounts see Link Discord Here.
- Users authorize once in their browser; no DM or chat bot verification step is needed. Discord desktop running is NOT sufficient authentication.
- The existing VIP service now returns displayName and avatar from Discord OAuth. The role check remains server-authoritative and fail-closed.
- Locked VIP page directs users to Discord. Configure `VITE_MAYHAM_DISCORD_INVITE_URL` with your real server invitation URL before building; without it, the button opens Discord's channel list rather than an invented invite.
- Configure `VITE_MAYHAM_VIP_API_URL` to your deployed HTTPS verification backend. Without it, login stays disabled and VIP stays locked.
- VIP feature cards remain roadmap previews, NOT enabled premium features.
- GitHub signed update needs a locally signed build and release assets; source ZIP alone does not update installed clients.
