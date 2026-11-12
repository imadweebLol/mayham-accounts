
MAYHAM ACCOUNTS v0.1 -- OPENSSL WINDOWS BUILD FIX

Includes ALL application source files and the Windows build script.

What changed:
- scripts/build-mayham-windows.ps1 sets OPENSSL_RUST_USE_NASM=0
  before the Rust/Tauri build, avoiding the failing Windows OpenSSL
  assembly generation route shown in the supplied build log.
- No app account or theme code was replaced.

To build: extract ZIP, open Mayham-Accounts, double-click
BUILD_MAYHAM_WINDOWS.cmd. On success the app binary is in:
  Mayham-Accounts/src-tauri/target/release/mayham-accounts.exe

IMPORTANT: This is complete SOURCE, not a precompiled exe.
The archive and script change were verified, but the Windows Rust
build has NOT been run here. Rust may rebuild OpenSSL on the first run.
Keep the old project folder's src-tauri/target if preserving build cache.
