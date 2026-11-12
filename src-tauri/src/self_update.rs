//! Mayham Accounts signed in-app updates (separate from upstream RoALT).
//! This update channel is inactive until the application is built with
//! MAYHAM_UPDATE_REPO=owner/repository and MAYHAM_UPDATE_PUBLIC_KEY=<P-256 X||Y hex>.
//! A user-confirmed update checks that release repo, downloads a versioned
//! NSIS installer and matching `.sig`, and verifies its SHA-256/ECDSA P-256
//! signature before running the installer. The private key is never embedded.
//! This fork must NEVER install upstream RoALT releases over Mayham Accounts.

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::os::windows::fs::OpenOptionsExt;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use reqwest::Url;
use reqwest::header::ACCEPT;
use reqwest::redirect::Policy;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::Security::Cryptography::{
    BCRYPT_ALG_HANDLE, BCRYPT_ECCPUBLIC_BLOB, BCRYPT_ECDSA_P256_ALGORITHM, BCRYPT_ECDSA_PUBLIC_P256_MAGIC, BCRYPT_FLAGS,
    BCRYPT_KEY_HANDLE, BCRYPT_OPEN_ALGORITHM_PROVIDER_FLAGS, BCRYPT_SHA256_ALG_HANDLE, BCryptHash, BCryptImportKeyPair,
    BCryptOpenAlgorithmProvider, BCryptVerifySignature,
};
use windows::core::{Owned, PCWSTR};

use crate::App;
use crate::error::{AppError, Result};
use crate::launcher::update::{FILE_SHARE_READ, TempDir, blocking};
use crate::model::AppUpdate;

pub const UPDATE_EVENT: &str = "app://update";
const CURRENT: &str = env!("CARGO_PKG_VERSION");
// Configure when publishing your first signed Macro Mayham release. Never use the
// original RoALT feed or signing key for an independent fork.
const MAYHAM_REPO: Option<&str> = option_env!("MAYHAM_UPDATE_REPO");
const MAYHAM_KEY: Option<&str> = option_env!("MAYHAM_UPDATE_PUBLIC_KEY");
fn update_configured() -> bool {
    MAYHAM_REPO.is_some_and(|r| {
        let parts: Vec<_> = r.split('/').collect();
        parts.len() == 2 && parts.iter().all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.'))
    }) && MAYHAM_KEY.is_some_and(|k| k.len() == 128 && k.bytes().all(|b| b.is_ascii_hexdigit()))
}

const CHECK_EVERY: Duration = Duration::from_secs(6 * 60 * 60);
const MAX_JSON: u64 = 1_000_000;
const MAX_INSTALLER: u64 = 200_000_000;
const MAX_SIG: u64 = 4_096;
/// Where release assets may come from: github.com, then GitHub's redirect to its storage.
const ASSET_HOSTS: [&str; 3] = ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"];
const TEMP_PREFIX: &str = "mayham-update-";
/// Inno Setup's silent install; `/RELAUNCH` is RoALT.iss's own: start RoALT when done.
const INSTALLER_ARGS: [&str; 1] = ["/S"]; // NSIS silent mode
/// The release signing key (P-256, uncompressed X‖Y): its private half is the `ROALT_UPDATE_KEY`
/// secret of the release workflow, never in this repository.


#[derive(Default)]
pub struct SelfUpdater {
    /// The newer version the last check found.
    available: Mutex<Option<String>>,
    installing: AtomicBool,
}

impl SelfUpdater {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn installing(&self) -> bool {
        self.installing.load(Ordering::SeqCst)
    }
}

/// A newer release and where its signed installer is.
#[derive(Debug, PartialEq)]
pub struct Release {
    pub version: String,
    pub exe: String,
    pub sig: String,
}

#[derive(Deserialize)]
struct Latest {
    tag_name: String,
    #[serde(default)]
    draft: bool,
    #[serde(default)]
    prerelease: bool,
    #[serde(default)]
    assets: Vec<Asset>,
}

#[derive(Deserialize)]
struct Asset {
    name: String,
    browser_download_url: String,
}

/// `X.Y.Z` (numbers without leading zeros), optionally `-prerelease`, as an ordering key: a
/// prerelease sorts before its release. None for anything else (build metadata included).
fn version_key(s: &str) -> Option<(u64, u64, u64, bool)> {
    let (core, pre) = match s.split_once('-') {
        Some((c, p)) => (c, Some(p)),
        None => (s, None),
    };
    if pre.is_some_and(|p| p.is_empty() || !p.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-')) {
        return None;
    }
    let num = |p: &str| {
        (!p.is_empty() && p.len() <= 9 && p.bytes().all(|b| b.is_ascii_digit()) && (p == "0" || !p.starts_with('0')))
            .then(|| p.parse().ok())
            .flatten()
    };
    let mut parts = core.split('.');
    let key = (num(parts.next()?)?, num(parts.next()?)?, num(parts.next()?)?, pre.is_none());
    parts.next().is_none().then_some(key)
}

/// The version of `tag` (`vX.Y.Z`, no prerelease) when it is newer than `current`; never the same
/// or an older one, nor anything when `current` can't be read.
pub fn newer(current: &str, tag: &str) -> Option<String> {
    let v = tag.strip_prefix('v')?;
    let new = version_key(v).filter(|k| k.3)?;
    (new > version_key(current)?).then(|| v.to_owned())
}

/// `url` is https on the default port, without credentials, on one of `hosts`.
fn allowed(url: &Url, hosts: &[&str]) -> bool {
    url.scheme() == "https"
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && url.host_str().is_some_and(|h| hosts.contains(&h))
}

/// The update in a releases/latest answer for a build at `current`: None when there is nothing
/// newer; Err when there is, but without its installer and signature on github.com.
pub fn pick(body: &[u8], current: &str) -> Result<Option<Release>> {
    let l: Latest = serde_json::from_slice(body).map_err(|e| {
        log::debug!("update: GitHub answer unreadable: {e}");
        failed(tr!("GitHub's answer couldn't be read."))
    })?;
    let Some(version) = newer(current, &l.tag_name).filter(|_| !l.draft && !l.prerelease) else {
        return Ok(None);
    };
    let url = |name: String| {
        l.assets
            .iter()
            .find(|a| a.name == name)
            .map(|a| a.browser_download_url.clone())
            .filter(|u| {
                let ok = Url::parse(u).is_ok_and(|u| allowed(&u, &ASSET_HOSTS[..1]));
                if !ok {
                    log::debug!("update: asset {name} has a URL that isn't allowed");
                }
                ok
            })
    };
    match (url(format!("Mayham-Accounts-Setup-{version}.exe")), url(format!("Mayham-Accounts-Setup-{version}.exe.sig"))) {
        (Some(exe), Some(sig)) => Ok(Some(Release { version, exe, sig })),
        _ => Err(failed(tr!("Mayham Accounts {version} is out, but without a signed installer. Get it from GitHub Releases.", version = version))),
    }
}

/// Standard base64 with `=` padding (surrounding whitespace ignored); None when malformed.
fn base64(text: &str) -> Option<Vec<u8>> {
    let s = text.trim().as_bytes();
    if !s.len().is_multiple_of(4) {
        return None;
    }
    let val = |c: u8| match c {
        b'A'..=b'Z' => Some(c - b'A'),
        b'a'..=b'z' => Some(c - b'a' + 26),
        b'0'..=b'9' => Some(c - b'0' + 52),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    };
    let mut out = Vec::with_capacity(s.len() / 4 * 3);
    let last = s.len() / 4;
    for (i, chunk) in s.chunks(4).enumerate() {
        let pad = chunk.iter().rev().take_while(|&&c| c == b'=').count();
        if pad > 2 || (pad > 0 && i + 1 != last) {
            return None;
        }
        let mut n = 0u32;
        for &c in &chunk[..4 - pad] {
            n = n << 6 | u32::from(val(c)?);
        }
        n <<= 6 * pad as u32;
        out.extend_from_slice(&n.to_be_bytes()[1..4 - pad]);
    }
    Some(out)
}

fn public_key() -> [u8; 64] {
    let mut k = [0; 64];
    for (i, b) in k.iter_mut().enumerate() {
        *b = u8::from_str_radix(&MAYHAM_KEY.unwrap_or("")[2 * i..2 * i + 2], 16).expect("Mayham update key must be 64 bytes of hex");
    }
    k
}

/// True only when `sig` (IEEE P1363 r‖s, 64 bytes) is a valid ECDSA P-256 signature of the
/// SHA-256 of `data` by `public` (uncompressed X‖Y), checked with Windows CNG.
fn verify(public: &[u8; 64], data: &[u8], sig: &[u8]) -> bool {
    if sig.len() != 64 {
        return false;
    }
    // BCRYPT_ECCKEY_BLOB { dwMagic, cbKey } and then X, Y.
    let mut blob = Vec::with_capacity(72);
    blob.extend_from_slice(&BCRYPT_ECDSA_PUBLIC_P256_MAGIC.to_le_bytes());
    blob.extend_from_slice(&32u32.to_le_bytes());
    blob.extend_from_slice(public);
    let mut hash = [0u8; 32];
    // SAFETY: every buffer is a live slice passed with its own length; the algorithm and key
    // handles are only used while their `Owned` wrappers (closed on drop, key first) live.
    unsafe {
        let st = BCryptHash(BCRYPT_SHA256_ALG_HANDLE, None, data, &mut hash);
        if st.is_err() {
            log::warn!("update signature: BCryptHash failed: {:#010x}", st.0);
            return false;
        }
        let mut alg = BCRYPT_ALG_HANDLE::default();
        let st = BCryptOpenAlgorithmProvider(&mut alg, BCRYPT_ECDSA_P256_ALGORITHM, PCWSTR::null(), BCRYPT_OPEN_ALGORITHM_PROVIDER_FLAGS(0));
        if st.is_err() {
            log::warn!("update signature: BCryptOpenAlgorithmProvider failed: {:#010x}", st.0);
            return false;
        }
        let alg = Owned::new(alg);
        let mut key = BCRYPT_KEY_HANDLE::default();
        let st = BCryptImportKeyPair(*alg, None, BCRYPT_ECCPUBLIC_BLOB, &mut key, &blob, 0);
        if st.is_err() {
            log::warn!("update signature: BCryptImportKeyPair failed: {:#010x}", st.0);
            return false;
        }
        let key = Owned::new(key);
        BCryptVerifySignature(*key, None, &hash, sig, BCRYPT_FLAGS(0)).is_ok()
    }
}

/// What the release workflow signs for `version`: its installer's name and a newline, then the
/// installer's bytes (appended by the caller).
fn signed_prefix(version: &str) -> Vec<u8> {
    format!("Mayham-Accounts-Setup-{version}.exe\n").into_bytes()
}

/// Writes `bytes` to the new file `path`, reopens it so nothing can write or delete it while the
/// handle lives, and checks the signature of `version` and what the file holds, read back through
/// that handle: the bytes checked are the bytes that run. The handle is returned to keep the lock.
fn write_verified(path: &Path, version: &str, bytes: &[u8], sig: &[u8], key: &[u8; 64]) -> Result<File> {
    File::create_new(path)?.write_all(bytes)?;
    let mut pinned = OpenOptions::new().read(true).share_mode(FILE_SHARE_READ).open(path)?;
    let mut signed = signed_prefix(version);
    signed.reserve(bytes.len());
    pinned.read_to_end(&mut signed)?;
    if !verify(key, &signed, sig) {
        return Err(AppError::Invalid(tr!("The downloaded Mayham Accounts installer was not run: its signature didn't check out.")));
    }
    Ok(pinned)
}

fn failed(why: String) -> AppError {
    AppError::Internal(why)
}

/// No path or query (asset URLs carry signed tokens): what went wrong, with the host.
fn network(e: reqwest::Error) -> AppError {
    let e = e.without_url();
    log::warn!("update: GitHub request failed: {e}");
    let what = if e.is_timeout() {
        tr!("timed out")
    } else if e.is_connect() {
        tr!("could not connect")
    } else {
        tr!("connection failed")
    };
    failed(tr!("Couldn't reach GitHub ({what}).", what = what))
}

fn http() -> Result<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(concat!("Mayham-Accounts/", env!("CARGO_PKG_VERSION")))
        .https_only(true)
        .redirect(Policy::custom(|a| {
            if a.previous().len() >= 5 {
                a.error("too many redirects")
            } else if allowed(a.url(), &ASSET_HOSTS) {
                a.follow()
            } else {
                a.stop()
            }
        }))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| {
            log::warn!("update: http client unavailable: {}", e.without_url());
            failed(tr!("Mayham Accounts HTTP client couldn't start."))
        })
}

/// GETs `url` within `timeout`; refused over `max` bytes (by `Content-Length`, or while reading).
async fn get(http: &reqwest::Client, url: &str, accept: &'static str, max: u64, timeout: Duration) -> Result<Vec<u8>> {
    let mut resp = http.get(url).header(ACCEPT, accept).timeout(timeout).send().await.map_err(network)?;
    if !resp.status().is_success() {
        log::warn!("update: GitHub answered HTTP {}", resp.status().as_u16());
        return Err(failed(tr!("GitHub answered HTTP {status}.", status = resp.status().as_u16())));
    }
    let too_big = || {
        log::warn!("update: GitHub sent more than {max} bytes");
        failed(tr!("GitHub sent more than {kb} KB.", kb = max / 1_000))
    };
    if resp.content_length().is_some_and(|t| t > max) {
        return Err(too_big());
    }
    let mut out = Vec::new();
    while let Some(chunk) = resp.chunk().await.map_err(network)? {
        if (out.len() + chunk.len()) as u64 > max {
            return Err(too_big());
        }
        out.extend_from_slice(&chunk);
    }
    Ok(out)
}

/// The newer release on GitHub, if any.
async fn latest(http: &reqwest::Client) -> Result<Option<Release>> {
    let repo = MAYHAM_REPO.ok_or_else(|| failed("Mayham Accounts updates are not configured yet.".into()))?;
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let body = get(http, &url, "application/vnd.github+json", MAX_JSON, Duration::from_secs(20)).await?;
    pick(&body, CURRENT)
}

/// This build's version and the newer one found last (no network).
pub fn status(s: &App) -> AppUpdate {
    AppUpdate { current: CURRENT.into(), available: lock(&s.self_update.available).clone() }
}

/// Asks GitHub now.
pub async fn check(app: &AppHandle) -> Result<AppUpdate> {
    if !update_configured() {
        let s = app.state::<App>();
        *lock(&s.self_update.available) = None;
        return Ok(status(&s));
    }
    let available = latest(&http()?).await?.map(|r| r.version);
    let s = app.state::<App>();
    *lock(&s.self_update.available) = available;
    Ok(status(&s))
}

/// After the switch changed: off forgets (and hides) what was found, on checks at once.
pub fn switched(app: &AppHandle, on: bool) {
    if !on {
        *lock(&app.state::<App>().self_update.available) = None;
        let _ = app.emit(UPDATE_EVENT, status(&app.state::<App>()));
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        match check(&app).await {
            Ok(u) => {
                let _ = app.emit(UPDATE_EVENT, &u);
            }
            Err(e) => log::info!("Mayham update check failed: {e}"),
        }
    });
}

/// Deletes what earlier updates left in %TEMP%, then checks at start and every 6 hours
/// while `settings.self_update` is on; `app://update` when there is a newer version.
pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // First thing at start: no delay before the first check.
        tauri::async_runtime::spawn_blocking(sweep);
        loop {
            let on = app
                .state::<App>()
                .db
                .settings()
                .inspect_err(|e| log::warn!("update check skipped, settings unreadable: {e}"))
                .is_ok_and(|v| v.self_update);
            if on {
                match check(&app).await {
                    Ok(u) if u.available.is_some() => {
                        let _ = app.emit(UPDATE_EVENT, &u);
                    }
                    Ok(_) => {}
                    Err(e) => log::info!("Mayham update check failed: {e}"),
                }
            }
            tokio::time::sleep(CHECK_EVERY).await;
        }
    });
}

fn sweep() {
    let dirs = match std::fs::read_dir(std::env::temp_dir()) {
        Ok(d) => d,
        Err(e) => {
            log::debug!("update: temp dir unreadable: {e}");
            return;
        }
    };
    for d in dirs.flatten().filter(|d| d.file_name().to_string_lossy().starts_with(TEMP_PREFIX)) {
        if let Err(e) = std::fs::remove_dir_all(d.path()) {
            log::info!("could not delete {}: {e}", d.path().display());
        }
    }
}

/// Downloads, verifies and runs the newer release's installer, then quits (see the module notes).
/// Refused while a launch, batch, auto-rejoin or Roblox install runs, and when nothing is newer.
pub async fn install(app: &AppHandle) -> Result<()> {
    if !update_configured() {
        return Err(AppError::Invalid("Mayham Accounts updates are not configured yet. Set your release repository and signing key when publishing.".into()));
    }
    let s = app.state::<App>();
    s.self_update
        .installing
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .map_err(|_| AppError::Invalid(tr!("Mayham Accounts is already being updated.")))?;
    let result = run_install(&s).await;
    match &result {
        Ok(()) => app.exit(0),
        Err(e) => {
            log::warn!("Mayham Accounts update failed: {e}");
            s.self_update.installing.store(false, Ordering::SeqCst);
        }
    }
    result
}

/// Refused while a launch, batch, auto-rejoin or Roblox install runs: RoALT quits for the installer.
fn idle(s: &App) -> Result<()> {
    if s.bulk.any_busy() {
        return Err(AppError::Invalid(tr!("Wait for the running launch, batch or auto-rejoin to finish, then update RoALT.")));
    }
    if s.update.installing() {
        return Err(AppError::Invalid(tr!("Wait for Roblox's installer to finish, then update RoALT.")));
    }
    Ok(())
}

async fn run_install(s: &App) -> Result<()> {
    idle(s)?;
    let http = http()?;
    let release = latest(&http).await?.ok_or_else(|| AppError::Invalid(tr!("Mayham Accounts is up to date.")))?;
    *lock(&s.self_update.available) = Some(release.version.clone());
    let refused = || AppError::Invalid(tr!("The downloaded Mayham Accounts installer was not run: its signature file is malformed."));
    let sig = get(&http, &release.sig, "application/octet-stream", MAX_SIG, Duration::from_secs(30)).await?;
    let sig = std::str::from_utf8(&sig).ok().and_then(base64).filter(|s| s.len() == 64).ok_or_else(refused)?;
    let bytes = get(&http, &release.exe, "application/octet-stream", MAX_INSTALLER, Duration::from_secs(600)).await?;

    let dir = TempDir::new(TEMP_PREFIX)?;
    let exe = dir.0.join(format!("Mayham-Accounts-Setup-{}.exe", release.version));
    let (checked, version) = (exe.clone(), release.version.clone());
    let pinned = blocking(move || write_verified(&checked, &version, &bytes, &sig, &public_key())).await?;
    // Again: one may have started during the download, and quitting now would cut it off.
    idle(s)?;
    log::info!("running Mayham Accounts {}'s installer (signature checked)", release.version);
    Command::new(&exe)
        .args(INSTALLER_ARGS)
        .current_dir(&dir.0)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| AppError::Internal(tr!("Could not start Mayham Accounts installer: {why}", why = e)))?;
    // The installer runs from the folder: kept (write-locked until RoALT exits) for the next start
    // to delete.
    std::mem::forget((pinned, dir));
    Ok(())
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn versions() {
        assert_eq!(newer("0.1.0", "v0.1.1"), Some("0.1.1".to_string()));
        assert_eq!(newer("0.1.0", "v0.1.0"), None);
        assert_eq!(newer("0.1.0", "v0.0.9"), None);
    }
    #[test]
    fn no_upstream_updates_without_configuration() {
        assert!(!update_configured() || MAYHAM_REPO != Some("inspectsoftware/RoALT"));
    }
}
