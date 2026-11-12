# Mayham Accounts — Discord Rich Presence

Discord Application ID: `1569520017224106054` (supplied by the project owner).

The Rust Discord RPC handshake now uses this ID rather than the upstream RoALT ID.
The old `roalt` image asset and upstream download/Discord buttons were removed from the activity, so no unconfigured art asset is required.
Discord will use the **name configured in the Discord Developer Portal** for this application ID, which should be **Mayham Accounts**.

## To apply

Build and install this source update. Closing and reopening the old executable does **not** update its built-in Discord Application ID. Once the updated application is running, ensure Discord Desktop is open and `Discord Rich Presence` is enabled in the app's settings. Restart Discord if it has cached the old activity.

## Tests

Static checks confirm the new Application ID and absence of old RoALT assets/buttons in the RPC file. The updated Rust unit test confirms the activity payload fields. Actual Windows compilation and Discord runtime handshake were not performed in this environment.

The upstream RoALT credits and license are retained in the About/legal files.
