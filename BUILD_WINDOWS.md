# Build Mayham Accounts (.exe)

This fork is based on RoALT 1.1.0. The Windows build requires Windows 10/11, Microsoft C++ Build Tools, WebView2, Node.js 22, Rust 1.95+ with the MSVC toolchain, and network access for dependencies.

## Easy build with GitHub Actions
1. Create a new GitHub repository for this fork and upload the entire source (including LICENSE and NOTICE.md).
2. Select **Actions → Build Mayham Accounts EXE → Run workflow**.
3. Download the **Mayham-Accounts-Windows-EXE** artifact and extract `Mayham Accounts.exe`.

## Local Windows build
Open PowerShell in the project folder and run:

```powershell
npm ci
npm run tauri -- build --no-bundle
Copy-Item .\src-tauri\target\release\mayham-accounts.exe '.\Mayham Accounts.exe'
```

The Rust crate retains the original package name for database/build compatibility, but its Windows binary target is mayham-accounts.exe and the window title is Mayham Accounts. The application uses the original RoALT data directory to preserve compatibility with the forked backend; back up your original data before launching this fork and do not run both at once. The self-update setting is intentionally hidden because upstream installers must not overwrite this fork.

**Important:** This checkout has not been successfully built or tested on Windows. Only run compiled binaries you trust, and preserve the original MIT licence and author notices.
