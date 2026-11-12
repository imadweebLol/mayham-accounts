# Mayham Accounts v0.1 — Short-Path OpenSSL Build Fix

The previous Windows build failed while compiling OpenSSL with Microsoft C++:
`fatal error C1083: Cannot open compiler generated file: '': Invalid argument`.

The compiler was working under a very long folder path inside Downloads.
This build changes the Cargo output path to:
`%LOCALAPPDATA%\MayhamBuild\target`

This mitigates Windows path-length problems and lets compatible Rust build outputs
be shared by future Mayham Accounts source folders. It does not alter the Roblox
account database or installed app settings.

## Use
1. Extract this ZIP, preferably to a short path such as `C:\MayhamSource`.
2. Double-click `BUILD_MAYHAM_WINDOWS.cmd` inside the Mayham-Accounts folder.
3. If the build succeeds, the Windows NSIS installer will open automatically.

The first run with a new cache may compile Rust dependencies again. Future runs
using the same target directory should reuse compatible outputs. If it still fails,
share the latest compiler error and not the full megabyte of C compilation commands.

Note: Windows compilation and the resulting installer were NOT tested in this Linux
environment; archive/script consistency and referenced build paths were verified.
