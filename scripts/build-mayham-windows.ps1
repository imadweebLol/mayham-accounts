$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$root = (Get-Location).Path
$log = Join-Path $root 'mayham-build.log'
Start-Transcript -Path $log -Append | Out-Null
function Test-Command([string]$name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
  $cargo = Join-Path $env:USERPROFILE '.cargo\bin'
  if (Test-Path $cargo) { $env:Path = "$cargo;$env:Path" }
}
function Install-Winget([string]$id, [string]$name, [string]$override='') {
  if (-not (Test-Command 'winget')) { throw "Missing $name. Install it manually, then run again. Windows Package Manager (winget) is required for automatic setup." }
  Write-Host "Installing $name (may open an installer)..." -ForegroundColor Cyan
  $args = @('install','--id',$id,'--exact','--accept-source-agreements','--accept-package-agreements','--silent')
  if ($override) { $args += @('--override',$override) }
  & winget @args
  if ($LASTEXITCODE -ne 0) { Write-Warning "$name installer exit code $LASTEXITCODE. Checking for installed command..." }
  Refresh-Path
}
try {
  Write-Host 'Mayham Accounts: Native Windows build' -ForegroundColor Magenta
  if (-not (Test-Command 'node') -or -not (Test-Command 'npm')) {
    Install-Winget 'OpenJS.NodeJS.LTS' 'Node.js LTS'
  }
  Refresh-Path
  if (-not (Test-Command 'npm')) { throw 'Node.js/npm is missing. Install Node.js LTS from nodejs.org, open a NEW terminal, then try again.' }
  # Windows PowerShell 5.1 can strip quotes from arguments passed to node -p.
  # Parse node --version instead, avoiding JavaScript evaluation entirely.
  $nodeVersion = (& node --version | Out-String).Trim()
  Write-Host "Detected Node.js: $nodeVersion" -ForegroundColor Cyan
  if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(?<major>\d+)\.') {
    throw "Unable to read Node.js version: $nodeVersion"
  }
  $major = [int]$Matches['major']
  if ($major -lt 22) { throw "Node.js 22+ required (found $nodeVersion). Upgrade Node.js and rerun." }
  if (-not (Test-Command 'rustc') -or -not (Test-Command 'cargo')) {
    Install-Winget 'Rustlang.Rustup' 'Rust toolchain'
  }
  Refresh-Path
  if (-not (Test-Command 'cargo')) { throw 'Rust/Cargo not found. Install from rustup.rs and rerun.' }
  # Reuse installed toolchain; only install Rust stable if it is absent.
  $stableToolchain = (& rustup toolchain list | Out-String)
  if ($stableToolchain -notmatch 'stable-x86_64-pc-windows-msvc') {
    & rustup toolchain install stable --profile minimal
    if ($LASTEXITCODE -ne 0) { throw 'Rust toolchain install failed.' }
  }
  & rustup default stable
  if ($LASTEXITCODE -ne 0) { throw 'Rust toolchain selection failed.' }
  $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  $vsOk = $false
  if (Test-Path $vswhere) {
    $vsPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    $vsOk = [bool]$vsPath
  }
  if (-not $vsOk) {
    Write-Host 'Microsoft C++ Build Tools are required for the Tauri/Rust backend.' -ForegroundColor Yellow
    Install-Winget 'Microsoft.VisualStudio.2022.BuildTools' 'Visual Studio Build Tools' '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
    Write-Host 'If the Build Tools installer requested a restart, restart Windows and run this file again.' -ForegroundColor Yellow
  }
  Write-Host 'Installing project dependencies...' -ForegroundColor Cyan
  if (-not (Test-Path (Join-Path $root 'node_modules\.package-lock.json'))) {
    & npm.cmd ci --prefer-offline --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Verify internet access or inspect mayham-build.log.' }
  } else {
    Write-Host 'Using already installed npm dependencies.' -ForegroundColor Cyan
  }
  # Keep native build outputs in a short, persistent path. OpenSSL builds can
  # exceed Windows legacy MAX_PATH when extracted inside long Downloads names.
  # The same directory also allows compatible Cargo artifacts to be reused
  # across later Mayham Accounts source ZIPs.
  $targetBase = Join-Path $env:LOCALAPPDATA 'MayhamBuild'
  $env:CARGO_TARGET_DIR = Join-Path $targetBase 'target'
  New-Item -ItemType Directory -Path $env:CARGO_TARGET_DIR -Force | Out-Null
  Write-Host "Rust build cache: $env:CARGO_TARGET_DIR" -ForegroundColor Cyan
  Write-Host 'Note: the initial short-path build may recompile dependencies once.' -ForegroundColor Yellow
  # OpenSSL assembly generation can fail on Windows with some Strawberry Perl/MSVC
  # combinations (including the AES CBC HMAC assembly build seen in the user's log).
  # openssl-src supports this switch on windows-msvc: it builds the portable C path.
  $env:OPENSSL_RUST_USE_NASM = '0'
  Write-Host 'OpenSSL fix enabled: portable C build (assembly disabled).' -ForegroundColor Cyan
  # Signed updater must be configured for the first 0.2.0 distribution.
  # Keys remain in %LOCALAPPDATA%, NEVER bundled into source or an installer.
  $py = if (Test-Command 'py') { 'py' } elseif (Test-Command 'python') { 'python' } else { $null }
  if (-not $py) { throw 'Python 3 is required for local update signing. Install Python 3 and rerun.' }
  # Install or reuse the Python package directly. pip exits 0 if already installed.
  # This avoids Windows PowerShell stripping quotes from nested Python -c commands.
  Write-Host 'Ensuring Python cryptography dependency is installed...' -ForegroundColor Cyan
  & $py -m pip install --user cryptography
  if ($LASTEXITCODE -ne 0) { throw 'Unable to install Python cryptography needed to sign updates. Check Python pip and network access.' }
  $conf = Join-Path $env:LOCALAPPDATA 'MayhamUpdateKeys\config.json'
  if (-not (Test-Path $conf)) {
    Write-Host 'First-time setup: create a PUBLIC Mayham Accounts repository on GitHub.' -ForegroundColor Yellow
    $env:MAYHAM_INITIAL_UPDATE_REPO = Read-Host 'Enter its owner/repo (NOT the macro catalog repo)'
  }
  $configLines = @(& $py (Join-Path $root 'scripts\configure-mayham-updates.py'))
  if ($LASTEXITCODE -ne 0) { throw 'Mayham updater configuration failed.' }
  foreach ($line in $configLines) {
    if ($line -match '^MAYHAM_UPDATE_REPO=(.+)$') { $env:MAYHAM_UPDATE_REPO = $Matches[1] }
    if ($line -match '^MAYHAM_UPDATE_PUBLIC_KEY=(.+)$') { $env:MAYHAM_UPDATE_PUBLIC_KEY = $Matches[1] }
    if ($line -match '^MAYHAM_SIGNING_KEY_PATH=(.+)$') { $mayhamPrivateKey = $Matches[1] }
  }
  if (-not $env:MAYHAM_UPDATE_REPO -or -not $env:MAYHAM_UPDATE_PUBLIC_KEY -or -not $mayhamPrivateKey) {
    throw 'Missing signing configuration. Review the GitHub repository name and Python setup.'
  }
  Write-Host "Signed updates: $env:MAYHAM_UPDATE_REPO (private key stays local)" -ForegroundColor Green
  Write-Host 'Building Windows application; prior Rust artifacts are reused where compatible...' -ForegroundColor Cyan
  & npm.cmd run tauri -- build --bundles nsis
  if ($LASTEXITCODE -ne 0) { throw 'Tauri build failed. Inspect mayham-build.log for the first error.' }
  $bundleDir = Join-Path $env:CARGO_TARGET_DIR 'release\bundle\nsis'
  $installer = Get-ChildItem -Path $bundleDir -Filter '*.exe' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $installer) { throw "Build finished without a Windows NSIS installer in $bundleDir" }
  $outDir = Join-Path $root 'Mayham Accounts Installer'
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  $out = Join-Path $outDir 'Mayham-Accounts-Setup.exe'
  # The updater requires precise versioned asset names and a matching ECDSA .sig.
  $version = (Get-Content -Raw (Join-Path $root 'package.json') | ConvertFrom-Json).version
  $releaseExe = Join-Path $outDir ("Mayham-Accounts-Setup-$version.exe")
  Copy-Item -LiteralPath $installer.FullName -Destination $releaseExe -Force
  & $py (Join-Path $root 'scripts\mayham-release-sign.py') sign $releaseExe --private-key $mayhamPrivateKey
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$releaseExe.sig")) {
    throw 'Unable to sign Mayham update installer; no release may be published.'
  }
  Copy-Item -LiteralPath $installer.FullName -Destination $out -Force
  Copy-Item (Join-Path $root 'LICENSE') $outDir -Force
  Copy-Item (Join-Path $root 'NOTICE.md') $outDir -Force
  Copy-Item (Join-Path $root 'MAYHAM_CREDITS.md') $outDir -Force
  Write-Host "`nINSTALLER READY: $out" -ForegroundColor Green
  Write-Host "UPLOAD TO GITHUB RELEASE v${version}: $releaseExe AND $releaseExe.sig" -ForegroundColor Cyan
  Write-Host 'The Mayham installer will open now. Confirm the installer prompts to update/install the app.' -ForegroundColor Yellow
  Start-Process -FilePath $out -WorkingDirectory $outDir
} catch {
  Write-Host "`nBUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "At: $($_.InvocationInfo.PositionMessage)" -ForegroundColor DarkYellow
  exit 1
} finally {
  Stop-Transcript | Out-Null
}
