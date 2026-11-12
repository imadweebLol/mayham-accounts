# Browse -> Use in Launcher (Mayham Accounts)

New one-click game selection in Browse:

- On an individual Roblox game page (`/games/<placeId>`), use **Use in Launcher** in the toolbar.
- On the built-in **Popular** and **Playtime** game cards, select **Use in Launcher**.
- The selected Roblox **place ID** is copied to the clipboard and the Launch screen's **Where To** field is set to that game (via the existing `draftFor` target pipeline).
- The action never launches Roblox automatically, so users can still choose the account(s) and hit Play themselves.
- If clipboard permission is unavailable the game is still selected in the launcher.

The existing one-click Play and Details controls are unchanged. This bundle retains previous short-path Windows build work, automatic GitHub macro source, and the Mayham Discord RPC ID.

Build on Windows using `BUILD_MAYHAM_WINDOWS.cmd`. This is source code, not a compiled installer.
