#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fps;
mod jendela;
mod joinlog;
mod klien;
mod singleton;
mod launcher;
mod roblox;
mod store;
mod hemat;
mod sumber;
mod percobaan;
mod unduh;
mod pembaruan;

use launcher::{SingletonGuard, Tujuan};
use rand::Rng;
use serde::Serialize;
use std::sync::Mutex;
use store::{Account, Riwayat, ServerTersimpan, Store, TargetLuncur};
use tauri::{Manager, State};

struct AppState {
    store: Mutex<Store>,
    singleton: Mutex<SingletonGuard>,
}

#[derive(Serialize)]
struct AkunView {
    id: String,
    alias: String,
    username: String,
    display_name: String,
    user_id: u64,
    robux: i64,
    premium: bool,
    avatar_url: String,
    last_launched: i64,
    last_refreshed: i64,
    fps_cap: u32,
    last_error: String,
    hemat: bool,
    hemat_minimize: bool,
    hemat_ram_mb: u32,
    hemat_fps: u32,
}

impl From<&Account> for AkunView {
    fn from(a: &Account) -> Self {
        Self {
            id: a.id.clone(),
            alias: a.alias.clone(),
            username: a.username.clone(),
            display_name: a.display_name.clone(),
            user_id: a.user_id,
            robux: a.robux,
            premium: a.premium,
            avatar_url: a.avatar_url.clone(),
            last_launched: a.last_launched,
            last_refreshed: a.last_refreshed,
            fps_cap: a.fps_cap,
            last_error: a.last_error.clone(),
            hemat: a.hemat,
            hemat_minimize: a.hemat_minimize,
            hemat_ram_mb: a.hemat_ram_mb,
            hemat_fps: a.hemat_fps,
        }
    }
}

#[tauri::command]
fn daftar_akun(state: State<AppState>) -> Vec<AkunView> {
    let s = state.store.lock().unwrap();
    s.accounts.iter().map(AkunView::from).collect()
}

#[tauri::command]
fn lokasi_penyimpanan() -> String {
    Store::storage_path()
}

#[tauri::command]
async fn tambah_akun(
    state: State<'_, AppState>,
    cookie: String,
    alias: String,
) -> Result<AkunView, String> {
    simpan_cookie(&state.store, cookie, alias, false).await.map(|(v, _)| v)
}

async fn simpan_cookie(
    store: &Mutex<Store>,
    cookie: String,
    alias: String,
    perbarui_ada: bool,
) -> Result<(AkunView, bool), String> {
    let cookie = cookie.trim().to_string();
    if cookie.is_empty() {
        return Err("Cookie is empty.".into());
    }

    let info = roblox::user_info(&cookie).await?;

    {
        let mut s = store.lock().unwrap();
        if let Some(lama) = s.accounts.iter_mut().find(|a| a.user_id == info.user_id) {
            if !perbarui_ada {
                return Err(format!(
                    "{} is already in the list (alias \"{}\"). Remove it first to \
                     update its cookie, or use Log in with browser.",
                    info.username, lama.alias
                ));
            }
            lama.cookie_enc = store::encrypt(&cookie)?;
            lama.last_error = String::new();
            lama.username = info.username.clone();
            lama.display_name = info.display_name.clone();
            lama.premium = info.premium;
            lama.avatar_url = info.avatar_url.clone();
            let view = AkunView::from(&*lama);
            s.save()?;
            return Ok((view, true));
        }
    }

    let akun = Account {
        id: uuid::Uuid::new_v4().to_string(),
        alias: if alias.trim().is_empty() {
            info.username.clone()
        } else {
            alias.trim().to_string()
        },
        username: info.username.clone(),
        display_name: info.display_name.clone(),
        user_id: info.user_id,
        robux: info.robux,
        premium: info.premium,
        avatar_url: info.avatar_url.clone(),
        last_launched: 0,
        last_refreshed: 0,
        fps_cap: 0,
        cookie_enc: store::encrypt(&cookie)?,
        browser_tracker_id: rand::thread_rng().gen_range(100_000..900_000_000),
        last_error: String::new(),
        hemat: false,
        hemat_minimize: false,
        hemat_ram_mb: 0,
        hemat_fps: 0,
    };

    let view = AkunView::from(&akun);
    let mut s = store.lock().unwrap();
    s.accounts.push(akun);
    s.save()?;
    Ok((view, false))
}

const LABEL_LOGIN: &str = "login-roblox";

#[tauri::command]
async fn login_browser(app: tauri::AppHandle, state: State<'_, AppState>, alias: String) -> Result<String, String> {
    if let Some(w) = app.get_webview_window(LABEL_LOGIN) {
        let _ = w.set_focus();
        return Err("A Roblox login window is already open.".into());
    }
    let url: tauri::Url = "https://www.roblox.com/login".parse().map_err(|_| "bad login URL")?;
    let jendela = tauri::WebviewWindowBuilder::new(&app, LABEL_LOGIN, tauri::WebviewUrl::External(url))
        .title("Log in to Roblox — Chudai Account Manager")
        .inner_size(480.0, 760.0)
        .incognito(true)
        .build()
        .map_err(|e| format!("could not open the login window: {e}"))?;

    let roblox: tauri::Url = "https://www.roblox.com".parse().map_err(|_| "bad URL")?;
    let mulai = std::time::Instant::now();
    let mut sudah_diuji = String::new();
    let cookie = loop {
        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
        if app.get_webview_window(LABEL_LOGIN).is_none() {
            return Err("The login window was closed before signing in.".into());
        }
        if mulai.elapsed() > std::time::Duration::from_secs(15 * 60) {
            let _ = jendela.destroy();
            return Err("Timed out waiting for the Roblox login (15 minutes).".into());
        }
        let (w, u) = (jendela.clone(), roblox.clone());
        let daftar = tauri::async_runtime::spawn_blocking(move || w.cookies_for_url(u))
            .await
            .ok()
            .and_then(|r| r.ok())
            .unwrap_or_default();
        let Some(nilai) = daftar
            .iter()
            .find(|c| c.name() == ".ROBLOSECURITY" && !c.value().is_empty())
            .map(|c| c.value().to_string())
        else {
            continue;
        };
        if nilai == sudah_diuji {
            continue;
        }
        sudah_diuji = nilai.clone();
        if roblox::user_info(&nilai).await.is_ok() {
            break nilai;
        }
    };
    let _ = jendela.destroy();

    let (view, diperbarui) = simpan_cookie(&state.store, cookie, alias, true).await?;
    Ok(if diperbarui {
        format!("{}: cookie renewed from the Roblox login. Settings kept.", view.alias)
    } else {
        format!("{} added from the Roblox login.", view.alias)
    })
}

#[tauri::command]
fn tutup_login_browser(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window(LABEL_LOGIN) {
        let _ = w.destroy();
    }
}

#[tauri::command]
fn ambil_cookie(state: State<AppState>, id: String) -> Result<String, String> {
    let s = state.store.lock().unwrap();
    let a = s.find(&id).ok_or("Account not found.")?;
    store::decrypt(&a.cookie_enc)
}

#[tauri::command]
fn hapus_akun(state: State<AppState>, id: String) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    s.accounts.retain(|a| a.id != id);
    s.save()
}

#[tauri::command]
fn ubah_alias(state: State<AppState>, id: String, alias: String) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.alias = alias.trim().to_string();
    s.save()
}

#[tauri::command]
async fn segarkan_akun(state: State<'_, AppState>, id: String) -> Result<AkunView, String> {
    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s.find(&id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };

    let hasil = roblox::user_info(&cookie).await;

    let mut s = state.store.lock().unwrap();
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    match hasil {
        Ok(info) => {
            a.username = info.username;
            a.display_name = info.display_name;
            a.user_id = info.user_id;
            a.robux = info.robux;
            a.premium = info.premium;
            if !info.avatar_url.is_empty() {
                a.avatar_url = info.avatar_url;
            }
            a.last_error = String::new();
        }
        Err(e) => {
            a.last_error = e;
        }
    }
    let view = AkunView::from(&*a);
    s.save()?;
    Ok(view)
}

#[tauri::command]
async fn cari_game(query: String) -> Result<Vec<roblox::GameHasil>, String> {
    roblox::cari_game(&query).await
}

#[tauri::command]
async fn perbarui_cookie(state: State<'_, AppState>, id: String) -> Result<AkunView, String> {
    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s.find(&id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };

    let baru = roblox::refresh_cookie(&cookie).await?;

    let info = roblox::user_info(&baru)
        .await
        .map_err(|e| format!("the new cookie was rejected, keeping the old one: {e}"))?;

    let enc = store::encrypt(&baru)?;
    let sekarang = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let mut s = state.store.lock().unwrap();
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.cookie_enc = enc;
    a.last_refreshed = sekarang;
    a.username = info.username;
    a.display_name = info.display_name;
    a.robux = info.robux;
    a.premium = info.premium;
    if !info.avatar_url.is_empty() {
        a.avatar_url = info.avatar_url;
    }
    a.last_error = String::new();
    let view = AkunView::from(&*a);
    s.save()?;
    Ok(view)
}

#[tauri::command]
fn set_fps_akun(state: State<AppState>, id: String, fps: u32) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.fps_cap = if fps == 0 { 0 } else { fps.clamp(10, 1000) };
    s.save()
}

#[tauri::command]
fn set_hemat_akun(state: State<AppState>, id: String, hemat: bool, minimize: bool, ram_mb: u32, fps: u32) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.hemat = hemat;
    a.hemat_minimize = minimize;
    a.hemat_ram_mb = if ram_mb == 0 { 0 } else { ram_mb.clamp(128, 4096) };
    a.hemat_fps = hemat::fps_hemat_sah(fps);
    s.save()
}

#[tauri::command]
async fn jendela_hemat(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let (btid, aktif) = {
        let s = state.store.lock().unwrap();
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.browser_tracker_id, a.hemat && a.hemat_minimize)
    };
    if !aktif || btid == 0 {
        return Ok(false);
    }
    for _ in 0..20 {
        let pid = launcher::klien_terperinci().into_iter().find(|k| k.btid == btid).map(|k| k.pid);
        if let Some(h) = pid.and_then(|p| jendela::daftar().into_iter().find(|j| j.pid == p)) {
            jendela::kecilkan(h.hwnd)?;
            return Ok(true);
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    Ok(false)
}

#[tauri::command]
async fn periksa_versi_hemat(state: State<'_, AppState>, id: String) -> Result<Option<String>, String> {
    let (btid, alias) = {
        let s = state.store.lock().unwrap();
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.browser_tracker_id, a.alias.clone())
    };
    periksa_versi_inti(&state.store, btid, &alias).await
}

async fn periksa_versi_inti(store: &Mutex<Store>, btid: u64, alias: &str) -> Result<Option<String>, String> {
    let Some((pid_dibuat, exe_dibuat)) = launcher::ambil_peluncuran(btid) else {
        return Ok(None);
    };
    for _ in 0..20 {
        if let Some(k) = launcher::klien_terperinci().into_iter().find(|k| k.btid == btid) {
            if k.pid == pid_dibuat {
                return Ok(None);
            }
            let folder = |p: &str| {
                std::path::Path::new(p).parent().and_then(|d| d.file_name()).map(|n| n.to_string_lossy().to_string()).unwrap_or_default()
            };
            if !k.exe.is_empty() && !k.exe.eq_ignore_ascii_case(&exe_dibuat) {
                let mut s = store.lock().unwrap();
                s.versi_alih = Some((exe_dibuat.clone(), k.exe.clone()));
                let _ = s.save();
                return Ok(Some(format!(
                    "Roblox restarted {alias}'s client in another installed version ({}), so resource saver's RAM limit and low priority did not apply this time. Next launches start that version directly.",
                    folder(&k.exe)
                )));
            }
            return Ok(Some(format!(
                "Roblox restarted {alias}'s client, so resource saver's RAM limit and low priority did not apply this time. Relaunch the account to apply them."
            )));
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    Ok(None)
}

#[tauri::command]
fn fps_terpasang() -> u32 {
    hemat::cap_terbaca().filter(|&c| c > 0).map(|c| c as u32).unwrap_or(0)
}

#[tauri::command]
fn daftar_versi_roblox(state: State<AppState>) -> Vec<klien::Klien> {
    let kustom = state.store.lock().unwrap().klien_kustom.clone();
    klien::semua(&kustom)
}

#[tauri::command]
fn tambah_klien_kustom(app: tauri::AppHandle, state: State<AppState>) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let Some(dipilih) = app.dialog().file().blocking_pick_folder() else {
        return Err("__BATAL__".into());
    };
    let teks = dipilih.to_string();

    let exe = klien::normalkan(&teks).ok_or_else(|| {
        format!(
            "That folder has no RobloxPlayerBeta.exe:
{teks}

Pick the              downloaded version folder that contains RobloxPlayerBeta.exe."
        )
    })?;
    let path = exe.to_string_lossy().to_string();

    let mut s = state.store.lock().unwrap();
    if s.klien_kustom.iter().any(|x| x == &path) {
        return Err("That version is already in the list.".into());
    }
    s.klien_kustom.push(path.clone());
    s.save()?;
    Ok(path)
}

#[tauri::command]
fn hapus_klien_kustom(state: State<AppState>, path: String) -> Result<(), String> {
    if let Some(folder) = std::path::Path::new(&path).parent() {
        if klien::milik_unduhan(folder) {
            let jalan = launcher::klien_berjalan()
                .iter()
                .any(|(_, exe)| exe.eq_ignore_ascii_case(&path));
            if jalan {
                return Err("That version is running. Close its Roblox client first.".into());
            }
            std::fs::remove_dir_all(folder)
                .map_err(|e| format!("could not delete the downloaded version: {e}"))?;
        }
    }
    let mut s = state.store.lock().unwrap();
    s.klien_kustom.retain(|x| x != &path);
    if s.klien_path == path {
        s.klien_path.clear();
    }
    s.save()
}

#[derive(Serialize)]
struct KlienAkun {
    pid: u32,
    exe: String,
    akun_id: String,
    alias: String,
}

#[tauri::command]
fn target_terakhir(state: State<AppState>) -> Option<TargetLuncur> {
    state.store.lock().unwrap().target_terakhir.clone()
}

#[tauri::command]
fn simpan_target_terakhir(state: State<AppState>, target: TargetLuncur) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    if s.target_terakhir.as_ref() == Some(&target) {
        return Ok(());
    }
    s.target_terakhir = Some(target);
    s.save()
}

#[tauri::command]
fn daftar_server_tersimpan(state: State<AppState>) -> Vec<ServerTersimpan> {
    state.store.lock().unwrap().server_tersimpan.clone()
}

#[tauri::command]
fn simpan_server_tersimpan(state: State<AppState>, server: ServerTersimpan) -> Result<(Vec<ServerTersimpan>, String), String> {
    if server.place_id.trim().is_empty() && server.link_code.trim().is_empty() {
        return Err("Pick a game or paste a private server link first.".into());
    }
    let sekarang = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
    let mut s = state.store.lock().unwrap();
    let id = store::upsert_server(&mut s.server_tersimpan, server, sekarang);
    s.save()?;
    Ok((s.server_tersimpan.clone(), id))
}

#[tauri::command]
fn ubah_nama_server_tersimpan(state: State<AppState>, id: String, nama: String) -> Result<Vec<ServerTersimpan>, String> {
    let nama: String = nama.trim().chars().take(80).collect();
    if nama.is_empty() {
        return Err("Name cannot be empty.".into());
    }
    let mut s = state.store.lock().unwrap();
    let x = s.server_tersimpan.iter_mut().find(|x| x.id == id).ok_or("Saved server not found.")?;
    x.nama = nama;
    s.save()?;
    Ok(s.server_tersimpan.clone())
}

#[tauri::command]
fn hapus_server_tersimpan(state: State<AppState>, id: String) -> Result<Vec<ServerTersimpan>, String> {
    let mut s = state.store.lock().unwrap();
    s.server_tersimpan.retain(|x| x.id != id);
    s.save()?;
    Ok(s.server_tersimpan.clone())
}

#[tauri::command]
fn sumber_klien() -> sumber::Laporan {
    sumber::ukur()
}

#[tauri::command]
fn klien_akun(state: State<AppState>) -> Vec<KlienAkun> {
    let s = state.store.lock().unwrap();
    launcher::klien_terperinci()
        .into_iter()
        .map(|k| {
            let akun = if k.btid == 0 {
                None
            } else {
                s.accounts.iter().find(|a| a.browser_tracker_id == k.btid)
            };
            KlienAkun {
                pid: k.pid,
                exe: k.exe,
                akun_id: akun.map(|a| a.id.clone()).unwrap_or_default(),
                alias: akun.map(|a| a.alias.clone()).unwrap_or_default(),
            }
        })
        .collect()
}

#[derive(Serialize)]
struct FflagView {
    kelola: fps::Flags,
    berkas: String,
    di_berkas: fps::Flags,
}

fn fflag_view(s: &Store) -> FflagView {
    let (berkas, di_berkas) = fps::isi_berkas(&s.klien_path);
    FflagView {
        kelola: s.fflags.clone(),
        berkas,
        di_berkas,
    }
}

#[tauri::command]
fn fflag_daftar(state: State<AppState>) -> FflagView {
    fflag_view(&state.store.lock().unwrap())
}

#[tauri::command]
fn fflag_simpan(state: State<AppState>, flags: fps::Flags) -> Result<FflagView, String> {
    for (k, v) in &flags {
        let sah = !k.is_empty()
            && k.len() <= 200
            && k.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
            && k.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
        if !sah {
            return Err(format!("\"{k}\" is not a valid flag name (letters, digits and _ only)."));
        }
        if !(v.is_string() || v.is_number() || v.is_boolean()) {
            return Err(format!("{k}: a flag value must be text, a number or true/false."));
        }
    }
    let mut s = state.store.lock().unwrap();
    let mut pernah: Vec<String> = s.fflags_pernah.clone();
    for k in s.fflags.keys().chain(flags.keys()) {
        if !pernah.contains(k) {
            pernah.push(k.clone());
        }
    }
    s.fflags = flags;
    s.fflags_pernah = pernah;
    s.save()?;
    fps::terapkan(None, &s.klien_path, &s.fflags, &s.fflags_pernah)?;
    Ok(fflag_view(&s))
}

#[derive(Serialize)]
struct VersiRoblox {
    hash: String,
    versi: String,
    paket: usize,
    ukuran: u64,
    terpasang: bool,
}

#[tauri::command]
async fn versi_roblox_terbaru() -> Result<VersiRoblox, String> {
    let (hash, versi) = unduh::terbaru().await?;
    let (paket, ukuran) = unduh::periksa(&hash).await?;
    let terpasang = unduh::folder_induk().join(&hash).join("RobloxPlayerBeta.exe").exists();
    Ok(VersiRoblox { hash, versi, paket, ukuran, terpasang })
}

#[tauri::command]
async fn periksa_versi_roblox(hash: String) -> Result<VersiRoblox, String> {
    let hash = unduh::normalkan_hash(&hash).ok_or(
        "A version looks like version-0123456789abcdef (16 hexadecimal characters).",
    )?;
    let (paket, ukuran) = unduh::periksa(&hash).await?;
    let terpasang = unduh::folder_induk().join(&hash).join("RobloxPlayerBeta.exe").exists();
    Ok(VersiRoblox { hash, versi: String::new(), paket, ukuran, terpasang })
}

#[tauri::command]
fn unduh_versi_roblox(app: tauri::AppHandle, hash: String) -> Result<(), String> {
    let hash = unduh::normalkan_hash(&hash).ok_or("That is not a valid version hash.")?;
    unduh::mulai(&hash)?;
    tauri::async_runtime::spawn(async move {
        let hasil = unduh::pasang(hash.clone()).await;
        match &hasil {
            Ok(exe) => {
                let state = app.state::<AppState>();
                let mut s = state.store.lock().unwrap();
                let p = exe.to_string_lossy().to_string();
                if !s.klien_kustom.iter().any(|x| x.eq_ignore_ascii_case(&p)) {
                    s.klien_kustom.push(p);
                    let _ = s.save();
                }
            }
            Err(_) => unduh::bersihkan_sisa(&hash),
        }
        unduh::selesai(hasil);
    });
    Ok(())
}

#[tauri::command]
fn status_unduh_roblox() -> unduh::Kemajuan {
    unduh::status()
}

#[tauri::command]
fn batal_unduh_roblox() {
    unduh::batalkan();
}

#[tauri::command]
fn jendela_aksi(window: tauri::WebviewWindow, aksi: String) -> Result<bool, String> {
    let hasil = match aksi.as_str() {
        "kecilkan" => window.minimize(),
        "maks" => {
            if window.is_maximized().unwrap_or(false) {
                window.unmaximize()
            } else {
                window.maximize()
            }
        }
        "tutup" => window.close(),
        "seret" => window.start_dragging(),
        _ => return Err(format!("unknown window action: {aksi}")),
    };
    hasil.map_err(|e| e.to_string())?;
    Ok(window.is_maximized().unwrap_or(false))
}

#[tauri::command]
fn jendela_maks(window: tauri::WebviewWindow) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn klien_path(state: State<AppState>) -> String {
    state.store.lock().unwrap().klien_path.clone()
}

#[tauri::command]
fn set_klien_path(state: State<AppState>, path: String) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    s.klien_path = path.trim().to_string();
    s.save()
}

#[tauri::command]
fn sembunyikan_username_status(state: State<AppState>) -> bool {
    state.store.lock().unwrap().sembunyikan_username
}

#[tauri::command]
fn set_sembunyikan_username(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut s = state.store.lock().unwrap();
    s.sembunyikan_username = aktif;
    s.save()?;
    Ok(aktif)
}

#[tauri::command]
fn auto_refresh_status(state: State<AppState>) -> bool {
    state.store.lock().unwrap().auto_refresh
}

#[tauri::command]
fn set_auto_refresh(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut s = state.store.lock().unwrap();
    s.auto_refresh = aktif;
    s.save()?;
    Ok(aktif)
}

#[tauri::command]
fn daftar_riwayat(state: State<AppState>) -> Vec<Riwayat> {
    state.store.lock().unwrap().riwayat.clone()
}

#[tauri::command]
fn hapus_riwayat(state: State<AppState>) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    s.riwayat.clear();
    s.save()
}

#[tauri::command]
async fn perbaiki_riwayat(state: State<'_, AppState>) -> Result<bool, String> {
    let places: Vec<u64> = {
        let s = state.store.lock().unwrap();
        if s.riwayat_diperbaiki {
            return Ok(false);
        }
        let mut v: Vec<u64> = s.riwayat.iter().map(|r| r.place_id).filter(|p| *p != 0).collect();
        v.sort_unstable();
        v.dedup();
        v
    };

    let mut info = std::collections::HashMap::new();
    for p in &places {
        let (n, i) = roblox::info_place(*p).await;
        if !n.is_empty() {
            info.insert(*p, (n, i));
        }
    }
    if !places.is_empty() && info.is_empty() {
        return Err("Roblox did not answer; history repair will retry next time.".into());
    }

    let mut s = state.store.lock().unwrap();
    let mut berubah = false;
    for r in s.riwayat.iter_mut() {
        if let Some((n, i)) = info.get(&r.place_id) {
            if r.game_name != *n || (!i.is_empty() && r.icon_url != *i) {
                r.game_name = n.clone();
                if !i.is_empty() {
                    r.icon_url = i.clone();
                }
                berubah = true;
            }
        }
    }
    s.riwayat_diperbaiki = true;
    s.save()?;
    Ok(berubah)
}

#[tauri::command]
fn jumlah_join_sejak(sejak: i64) -> usize {
    joinlog::jumlah_join_sejak(sejak)
}

#[tauri::command]
fn jumlah_klien_roblox() -> usize {
    launcher::jumlah_klien()
}

#[tauri::command]
fn multi_instance_status(state: State<AppState>) -> bool {
    state.singleton.lock().unwrap().aktif()
}

#[tauri::command]
fn set_multi_instance(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut g = state.singleton.lock().unwrap();
    if aktif {
        g.nyalakan()?;
    } else {
        g.matikan();
    }
    Ok(g.aktif())
}

#[tauri::command]
async fn luncurkan(
    state: State<'_, AppState>,
    id: String,
    place_id: u64,
    job_id: Option<String>,
    link_code: Option<String>,
    access_code: Option<String>,
    share_code: Option<String>,
    follow_user_id: Option<u64>,
    game_name: Option<String>,
    icon_url: Option<String>,
) -> Result<String, String> {
    luncurkan_inti(
        &state.store, id, place_id, job_id, link_code, access_code, share_code,
        follow_user_id, game_name, icon_url,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn luncurkan_inti(
    store: &Mutex<Store>,
    id: String,
    place_id: u64,
    job_id: Option<String>,
    link_code: Option<String>,
    access_code: Option<String>,
    share_code: Option<String>,
    follow_user_id: Option<u64>,
    game_name: Option<String>,
    icon_url: Option<String>,
) -> Result<String, String> {
    let share_code = share_code.as_deref().map(str::trim).unwrap_or("").to_string();
    let follow_user_id = follow_user_id.unwrap_or(0);
    if place_id == 0 && share_code.is_empty() && follow_user_id == 0 {
        return Err("No game selected.".into());
    }

    let (cookie, btid, nama, avatar, fps_cap, klien, fflags, fflags_pernah, hemat_akun, ram_mb, hemat_fps) = {
        let s = store.lock().unwrap();
        let a = s.find(&id).ok_or("Account not found.")?;
        (
            store::decrypt(&a.cookie_enc)?,
            a.browser_tracker_id,
            a.alias.clone(),
            a.avatar_url.clone(),
            a.fps_cap,
            s.klien_path.clone(),
            s.fflags.clone(),
            s.fflags_pernah.clone(),
            a.hemat,
            a.hemat_ram_mb,
            a.hemat_fps,
        )
    };

    let klien = if klien.trim().is_empty() {
        let alih = store.lock().unwrap().versi_alih.clone();
        launcher::exe_klien("")
            .and_then(|auto| launcher::pilih_alih(&auto, alih.as_ref(), |p| std::path::Path::new(p).exists()))
            .unwrap_or(klien)
    } else {
        klien
    };

    let ticket = roblox::auth_ticket(&cookie).await?;

    let place_ui = place_id;
    let mut place_id = place_id;
    let mut link_code = link_code;
    if !share_code.is_empty() {
        let v = roblox::resolve_share_link(&cookie, &share_code).await?;
        let d = v.get("privateServerInviteData").cloned().unwrap_or_default();
        let status = d.get("status").and_then(|x| x.as_str()).unwrap_or("");
        if status != "Valid" {
            return Err(format!(
                "This private server link is not usable ({}). It may have been revoked, or the account may not have access.",
                if status.is_empty() { "no invite data" } else { status }
            ));
        }
        if let Some(pid) = d.get("placeId").and_then(|x| x.as_u64()) {
            place_id = pid;
        }
        if let Some(lc) = d.get("linkCode").and_then(|x| x.as_str()) {
            link_code = Some(lc.to_string());
        }
    }
    if place_id == 0 && follow_user_id == 0 {
        return Err("No game selected.".into());
    }

    let tujuan = if follow_user_id != 0 {
        Tujuan::Ikuti {
            user_id: follow_user_id,
        }
    } else {
        match (
        job_id.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        link_code.as_deref().map(str::trim).filter(|s| !s.is_empty()),
    ) {
        (Some(j), _) => Tujuan::Server {
            place_id,
            job_id: j.to_string(),
        },
        (None, Some(l)) => {
            Tujuan::Pribadi {
                place_id,
                link_code: l.to_string(),
                access_code: access_code
                    .as_deref()
                    .map(str::trim)
                    .unwrap_or("")
                    .to_string(),
            }
        }
        _ => Tujuan::Publik { place_id },
        }
    };

    let tray_diakhiri = launcher::akhiri_tray_diam();

    let mut kelola = fflags.clone();
    let mut pernah = fflags_pernah.clone();
    for (k, v) in hemat::flag_hemat() {
        if !pernah.contains(&k) {
            pernah.push(k.clone());
        }
        if hemat_akun && !fflags.contains_key(&k) {
            kelola.insert(k, v);
        }
    }
    let _ = fps::terapkan(Some(0), &klien, &kelola, &pernah);

    let target_cap = hemat::target_cap(fps_cap, hemat_akun, hemat_fps);
    let galat_cap = {
        let mut s = store.lock().unwrap();
        let (mut asli, mut tulis) = (s.cap_asli, s.cap_tulis);
        let r = hemat::terapkan_cap(target_cap, &mut asli, &mut tulis);
        s.cap_asli = asli;
        s.cap_tulis = tulis;
        let _ = s.save();
        r.err()
    };

    let mut peringatan_hemat: Option<String> = None;
    let exe_pilihan = if klien.is_empty() { None } else { Some(klien.as_str()) };
    match (hemat_akun, launcher::exe_klien(&klien)) {
        (true, Some(exe)) => {
            let (pid_baru, w) = launcher::luncurkan_terbatas(
                &ticket,
                &tujuan,
                btid,
                &exe,
                launcher::OpsiProses {
                    batas_ws_mb: (ram_mb > 0).then_some(ram_mb as u64),
                    prioritas_rendah: true,
                    ..Default::default()
                },
            )?;
            launcher::catat_peluncuran(btid, pid_baru, &exe);
            peringatan_hemat = w;
        }
        _ => launcher::luncurkan(&ticket, &tujuan, btid, exe_pilihan)?,
    }

    let (mut g_nama, mut g_ikon) = if place_id == place_ui {
        (game_name.unwrap_or_default(), icon_url.unwrap_or_default())
    } else {
        (String::new(), String::new())
    };
    if place_id != 0 && (g_nama.is_empty() || g_ikon.is_empty()) {
        let (n, i) = roblox::info_place(place_id).await;
        if g_nama.is_empty() {
            g_nama = n;
        }
        if g_ikon.is_empty() {
            g_ikon = i;
        }
    }
    if g_nama.is_empty() {
        g_nama = if follow_user_id != 0 {
            "Followed a player".to_string()
        } else {
            format!("Place {place_id}")
        };
    }

    let sekarang = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    {
        let mut s = store.lock().unwrap();
        if let Some(a) = s.find_mut(&id) {
            a.last_launched = sekarang;
        }
        s.catat_riwayat(Riwayat {
            place_id,
            game_name: g_nama.clone(),
            icon_url: g_ikon,
            account_id: id.clone(),
            alias: nama.clone(),
            avatar_url: avatar,
            at: sekarang,
        });
        let _ = s.save();
    }

    let mut pesan = format!("{nama} joined {g_nama}.");
    if hemat_akun {
        pesan.push_str(" Resource saver on.");
    }
    if tray_diakhiri > 0 {
        pesan.push_str(" (Closed Roblox's idle tray process so this account's settings apply.)");
    }
    if let Some(w) = peringatan_hemat {
        pesan.push_str(&format!(" Warning: {w}."));
    }
    if let Some(e) = galat_cap.filter(|_| target_cap.is_some()) {
        pesan.push_str(&format!(" Warning: FPS limit not applied ({e})."));
    }
    Ok(pesan)
}

#[derive(Serialize)]
struct HalamanServer {
    servers: Vec<roblox::ServerInfo>,
    cursor: String,
}

#[tauri::command]
async fn daftar_server(place_id: u64, cursor: String) -> Result<HalamanServer, String> {
    let (servers, cursor) = roblox::daftar_server(place_id, &cursor).await?;
    Ok(HalamanServer { servers, cursor })
}

#[derive(Serialize)]
struct HasilCariUser {
    user_id: u64,
    username: String,
    place_id: u64,
    game_name: String,
}

#[tauri::command]
async fn cari_user(
    state: State<'_, AppState>,
    teks: String,
    akun_id: String,
) -> Result<HasilCariUser, String> {
    let teks = teks.trim();
    if teks.is_empty() {
        return Err("Enter a username or profile link.".into());
    }

    let (user_id, username) = if let Some(id) = teks
        .split("/users/")
        .nth(1)
        .and_then(|r| r.split('/').next())
        .and_then(|r| r.parse::<u64>().ok())
    {
        (id, String::new())
    } else if let Ok(id) = teks.parse::<u64>() {
        (id, String::new())
    } else {
        roblox::user_id_dari_username(teks).await?
    };

    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s.find(&akun_id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };

    let username = if username.is_empty() {
        roblox::nama_dari_user_id(user_id).await.unwrap_or_default()
    } else {
        username
    };

    let (place_id, game_name) = match roblox::kehadiran_pemain(&cookie, user_id).await {
        Some((p, _)) => {
            let (n, _) = roblox::info_place(p).await;
            (p, n)
        }
        None => (0, String::new()),
    };

    Ok(HasilCariUser {
        user_id,
        username,
        place_id,
        game_name,
    })
}

#[derive(Serialize)]
struct HasilMassal {
    berhasil: usize,
    gagal: Vec<String>,
}

async fn untuk_tiap_akun<F, Fut>(
    state: &State<'_, AppState>,
    akun_ids: Vec<String>,
    f: F,
) -> Result<HasilMassal, String>
where
    F: Fn(String, u64) -> Fut,
    Fut: std::future::Future<Output = Result<(), String>>,
{
    let sasaran: Vec<(String, String, u64)> = {
        let s = state.store.lock().unwrap();
        akun_ids
            .iter()
            .filter_map(|id| s.find(id))
            .filter_map(|a| {
                store::decrypt(&a.cookie_enc)
                    .ok()
                    .map(|c| (a.alias.clone(), c, a.user_id))
            })
            .collect()
    };
    if sasaran.is_empty() {
        return Err("No usable account selected.".into());
    }

    let mut hasil = HasilMassal {
        berhasil: 0,
        gagal: Vec::new(),
    };
    for (alias, cookie, uid) in sasaran {
        match f(cookie, uid).await {
            Ok(()) => hasil.berhasil += 1,
            Err(e) => hasil.gagal.push(format!("{alias}: {e}")),
        }
    }
    Ok(hasil)
}

#[tauri::command]
async fn blokir_user(
    state: State<'_, AppState>,
    akun_ids: Vec<String>,
    user_id: u64,
    buka: bool,
) -> Result<HasilMassal, String> {
    untuk_tiap_akun(&state, akun_ids, |cookie, _| async move {
        roblox::blokir(&cookie, user_id, buka).await
    })
    .await
}

#[tauri::command]
async fn tambah_teman(
    state: State<'_, AppState>,
    akun_ids: Vec<String>,
    user_id: u64,
) -> Result<HasilMassal, String> {
    untuk_tiap_akun(&state, akun_ids, |cookie, _| async move {
        roblox::minta_teman(&cookie, user_id).await
    })
    .await
}

#[tauri::command]
async fn ubah_display_name(
    state: State<'_, AppState>,
    akun_ids: Vec<String>,
    nama: String,
) -> Result<HasilMassal, String> {
    let nama = nama.trim().to_string();
    if nama.len() < 3 {
        return Err("Display name must be at least 3 characters.".into());
    }
    untuk_tiap_akun(&state, akun_ids, |cookie, uid| {
        let nama = nama.clone();
        async move { roblox::set_display_name(&cookie, uid, &nama).await }
    })
    .await
}

#[derive(Serialize)]
struct UserDiblokir {
    user_id: u64,
    nama: String,
}

#[tauri::command]
async fn daftar_blokir(
    state: State<'_, AppState>,
    akun_id: String,
) -> Result<Vec<UserDiblokir>, String> {
    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s.find(&akun_id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };
    Ok(roblox::daftar_diblokir(&cookie)
        .await?
        .into_iter()
        .map(|(user_id, nama)| UserDiblokir { user_id, nama })
        .collect())
}

#[tauri::command]
async fn buka_blokir_semua(state: State<'_, AppState>, akun_id: String) -> Result<usize, String> {
    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s.find(&akun_id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };
    let mut total = 0;
    for _ in 0..20 {
        let daftar = roblox::daftar_diblokir(&cookie).await?;
        if daftar.is_empty() {
            break;
        }
        let mut maju = 0;
        for (id, _) in daftar {
            if roblox::blokir(&cookie, id, true).await.is_ok() {
                maju += 1;
                total += 1;
            }
        }
        if maju == 0 {
            break;
        }
    }
    Ok(total)
}

#[tauri::command]
fn daftar_jendela() -> Vec<jendela::JendelaInfo> {
    jendela::daftar()
}

#[tauri::command]
fn susun_jendela(mode: String, kolom: u32) -> Result<usize, String> {
    if mode == "bertumpuk" {
        jendela::susun_bertumpuk()
    } else {
        jendela::susun_kisi(kolom)
    }
}

#[tauri::command]
fn pindah_jendela(hwnd: usize, x: i32, y: i32, w: i32, h: i32) -> Result<(), String> {
    jendela::pindah(hwnd, x, y, w, h)
}

#[tauri::command]
fn fokus_jendela(hwnd: usize) -> Result<(), String> {
    jendela::fokus(hwnd)
}

#[tauri::command]
fn tema(state: State<AppState>) -> store::Tema {
    state.store.lock().unwrap().tema.clone()
}

#[tauri::command]
fn set_tema(state: State<AppState>, tema: store::Tema) -> Result<(), String> {
    let mut s = state.store.lock().unwrap();
    s.tema = tema;
    s.save()
}


const HARI_NGANGGUR: i64 = 20 * 86400;
const HARI_JEDA_COBA: i64 = 7 * 86400;

#[derive(Serialize)]
struct LaporanJadwal {
    diperiksa: usize,
    diperbarui: usize,
    dilewati: usize,
    gagal: Vec<String>,
}

#[tauri::command]
async fn refresh_terjadwal(state: State<'_, AppState>) -> Result<LaporanJadwal, String> {
    let sekarang = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let semua: Vec<(String, String, i64, i64)> = {
        let s = state.store.lock().unwrap();
        s.accounts
            .iter()
            .map(|a| {
                (
                    a.id.clone(),
                    a.alias.clone(),
                    a.last_launched,
                    a.last_refreshed,
                )
            })
            .collect()
    };

    let mut lap = LaporanJadwal {
        diperiksa: semua.len(),
        diperbarui: 0,
        dilewati: 0,
        gagal: Vec::new(),
    };

    for (id, alias, terakhir_pakai, terakhir_segar) in semua {
        let nganggur = sekarang - terakhir_pakai >= HARI_NGANGGUR;
        let boleh_coba = sekarang - terakhir_segar >= HARI_JEDA_COBA;
        if !(nganggur && boleh_coba) {
            lap.dilewati += 1;
            continue;
        }
        match perbarui_cookie(state.clone(), id).await {
            Ok(_) => lap.diperbarui += 1,
            Err(e) => lap.gagal.push(format!("{alias}: {e}")),
        }
    }
    Ok(lap)
}

#[tauri::command]
fn jadwal_refresh(state: State<AppState>, id: String) -> Result<i64, String> {
    let sekarang = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let s = state.store.lock().unwrap();
    let a = s.find(&id).ok_or("Account not found.")?;
    let jatuh_tempo = (a.last_launched + HARI_NGANGGUR).max(a.last_refreshed + HARI_JEDA_COBA);
    Ok(jatuh_tempo - sekarang)
}


#[derive(Serialize)]
struct WilayahServer {
    job_id: String,
    wilayah: String,
}

const BATAS_WILAYAH: usize = 15;

const JEDA_WILAYAH_MS: u64 = 300;

#[tauri::command]
async fn wilayah_server_banyak(
    state: State<'_, AppState>,
    akun_id: String,
    place_id: u64,
    job_ids: Vec<String>,
) -> Result<Vec<WilayahServer>, String> {
    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s
            .find(&akun_id)
            .or_else(|| s.accounts.first())
            .ok_or("Add an account first.")?;
        store::decrypt(&a.cookie_enc)?
    };

    let token = roblox::csrf_token(&cookie).await?;
    let mut ip_per_job: Vec<(String, String)> = Vec::new();
    for (i, job) in job_ids.iter().take(BATAS_WILAYAH).enumerate() {
        if i > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(JEDA_WILAYAH_MS)).await;
        }
        let ip = roblox::alamat_server_token(&cookie, &token, place_id, job)
            .await
            .unwrap_or_default();
        ip_per_job.push((job.clone(), ip));
    }

    let ips: Vec<String> = ip_per_job
        .iter()
        .map(|(_, ip)| ip.clone())
        .filter(|ip| !ip.is_empty())
        .collect();
    let peta = roblox::wilayah_ip_banyak(&ips).await;

    Ok(ip_per_job
        .into_iter()
        .map(|(job_id, ip)| WilayahServer {
            job_id,
            wilayah: peta.get(&ip).cloned().unwrap_or_default(),
        })
        .collect())
}

#[derive(Serialize)]
struct PeriksaServer {
    bisa: bool,
    pesan: String,
}

#[tauri::command]
async fn periksa_server(
    state: State<'_, AppState>,
    akun_id: String,
    place_id: u64,
    job_id: String,
) -> Result<PeriksaServer, String> {
    let cookie = {
        let s = state.store.lock().unwrap();
        let a = s
            .find(&akun_id)
            .or_else(|| s.accounts.first())
            .ok_or("Add an account first.")?;
        store::decrypt(&a.cookie_enc)?
    };
    let (kode, pesan) = roblox::status_join(&cookie, place_id, &job_id).await;
    Ok(PeriksaServer {
        bisa: kode == 2,
        pesan: match kode {
            2 => String::new(),
            5 => "That server no longer exists.".into(),
            6 => "That server is full.".into(),
            -1 => "Could not reach Roblox to check the server.".into(),
            _ if !pesan.is_empty() => pesan,
            _ => format!("Roblox refused the join (status {kode})."),
        },
    })
}


fn main() {
    if std::env::args().any(|a| a == "--daftar-handle") {
        for n in singleton::daftar_nama_objek() {
            println!("{n}");
        }
        return;
    }

    let arg: Vec<String> = std::env::args().collect();
    if let Some(i) = arg.iter().position(|a| a == "--probe-share") {
        let kode = arg.get(i + 1).cloned().unwrap_or_default();
        let s = store::Store::load();
        let Some(ak) = s.accounts.first() else {
            println!("tidak ada akun tersimpan");
            return;
        };
        match store::decrypt(&ak.cookie_enc) {
            Ok(c) => {
                let r = tauri::async_runtime::block_on(roblox::resolve_share_link(&c, &kode));
                match r {
                    Ok(v) => println!("{}", serde_json::to_string_pretty(&v).unwrap_or_default()),
                    Err(e) => println!("GAGAL: {e}"),
                }
            }
            Err(e) => println!("cookie tak terbaca: {e}"),
        }
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-slot") {
        let place: u64 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(0);
        let st = store::Store::load();
        let Some(ak0) = st.accounts.first() else {
            println!("tidak ada akun");
            return;
        };
        let Ok(c0) = store::decrypt(&ak0.cookie_enc) else {
            println!("cookie tak terbaca");
            return;
        };

        let mut g = SingletonGuard::new();
        let _ = g.nyalakan();

        tauri::async_runtime::block_on(async {
            let butuh = st.accounts.len() as i64;
            let Ok((servers, _)) = roblox::daftar_server(place, "").await else {
                println!("daftar server gagal");
                return;
            };
            let Some(target) = servers
                .iter()
                .find(|s| s.max_players as i64 - s.playing as i64 == butuh)
                .or_else(|| {
                    servers
                        .iter()
                        .find(|s| s.max_players as i64 - s.playing as i64 >= butuh)
                })
            else {
                println!("tidak ada server yang muat {butuh} akun");
                return;
            };
            let job = target.job_id.clone();
            println!(
                "target {job} : daftar bilang {}/{} (sisa {})",
                target.playing,
                target.max_players,
                target.max_players - target.playing
            );

            for ak in &st.accounts {
                let Ok(c) = store::decrypt(&ak.cookie_enc) else { continue };
                let sejak = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                let t = launcher::Tujuan::Server {
                    place_id: place,
                    job_id: job.clone(),
                };
                let Ok(tk) = roblox::auth_ticket(&c).await else { continue };
                if launcher::luncurkan(&tk, &t, 1, None).is_err() {
                    println!("{}: peluncuran gagal", ak.alias);
                    continue;
                }
                let mut masuk = false;
                for _ in 0..60 {
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    if joinlog::jumlah_join_sejak(sejak) > 0 {
                        masuk = true;
                        break;
                    }
                }
                println!("{}: {}", ak.alias, if masuk { "MASUK" } else { "gagal masuk" });
            }

            let mulai = std::time::Instant::now();
            for _ in 0..24 {
                let (kode, pesan) = roblox::status_join(&c0, place, &job).await;
                let angka = match roblox::daftar_server(place, "").await {
                    Ok((v, _)) => v
                        .iter()
                        .find(|s| s.job_id == job)
                        .map(|s| format!("{}/{}", s.playing, s.max_players))
                        .unwrap_or_else(|| "tidak di halaman 1".into()),
                    Err(e) => format!("galat: {e}"),
                };
                println!(
                    "t+{:>3}s  daftar={angka}  gamejoin={kode} {pesan}",
                    mulai.elapsed().as_secs()
                );
                std::thread::sleep(std::time::Duration::from_secs(10));
            }
        });
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-wilayah") {
        let place: u64 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(0);
        let n: usize = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(20);
        let st = store::Store::load();
        let Some(ak) = st.accounts.first() else {
            println!("tidak ada akun");
            return;
        };
        let Ok(c) = store::decrypt(&ak.cookie_enc) else {
            println!("cookie tak terbaca");
            return;
        };
        tauri::async_runtime::block_on(async {
            let Ok((servers, _)) = roblox::daftar_server(place, "").await else {
                println!("daftar server gagal");
                return;
            };
            let jobs: Vec<String> =
                servers.iter().take(n).map(|s| s.job_id.clone()).collect();
            println!("server: {}", jobs.len());

            let t0 = std::time::Instant::now();
            let Ok(token) = roblox::csrf_token(&c).await else {
                println!("csrf gagal");
                return;
            };
            let mut ips = Vec::new();
            for j in &jobs {
                if let Some(ip) = roblox::alamat_server_token(&c, &token, place, j).await {
                    ips.push(ip);
                }
            }
            let t_ip = t0.elapsed();
            let t1 = std::time::Instant::now();
            let peta = roblox::wilayah_ip_banyak(&ips).await;
            println!(
                "alamat: {}/{} dalam {:.1}s ({:.0} ms/server) | geolokasi {} IP unik dalam {:.2}s",
                ips.len(),
                jobs.len(),
                t_ip.as_secs_f64(),
                t_ip.as_millis() as f64 / jobs.len().max(1) as f64,
                peta.len(),
                t1.elapsed().as_secs_f64()
            );
            let t2 = std::time::Instant::now();
            let _ = roblox::wilayah_ip_banyak(&ips).await;
            println!("geolokasi kedua (harus dari cache): {:.3}s", t2.elapsed().as_secs_f64());
        });
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-region") {
        let place: u64 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(0);
        let st = store::Store::load();
        let Some(ak) = st.accounts.first() else {
            println!("tidak ada akun");
            return;
        };
        let Ok(c) = store::decrypt(&ak.cookie_enc) else {
            println!("cookie tak terbaca");
            return;
        };
        tauri::async_runtime::block_on(async {
            if arg.iter().any(|a| a == "kontrol") {
                let palsu = "00000000-0000-0000-0000-000000000000";
                println!("jobId nol      -> {:?}", roblox::status_join(&c, place, palsu).await);
                let acak = uuid::Uuid::new_v4().to_string();
                println!("jobId acak     -> {:?}", roblox::status_join(&c, place, &acak).await);
                if let Ok((v, _)) = roblox::daftar_server(13772394625, "").await {
                    if let Some(s) = v.first() {
                        println!(
                            "jobId place lain -> {:?}",
                            roblox::status_join(&c, place, &s.job_id).await
                        );
                    }
                }
                if let Ok((v, _)) = roblox::daftar_server(place, "").await {
                    if let Some(s) = v.first() {
                        println!(
                            "jobId sah        -> {:?} (daftar {}/{})",
                            roblox::status_join(&c, place, &s.job_id).await,
                            s.playing,
                            s.max_players
                        );
                    }
                }
                return;
            }

            if arg.iter().any(|a| a == "penuh") {
                let mut semua = Vec::new();
                let mut kursor = String::new();
                for _ in 0..6 {
                    match roblox::daftar_server(place, &kursor).await {
                        Ok((v, k)) => {
                            semua.extend(v);
                            if k.is_empty() {
                                break;
                            }
                            kursor = k;
                        }
                        Err(e) => {
                            println!("halaman gagal: {e}");
                            break;
                        }
                    }
                }
                semua.sort_by_key(|s| s.max_players as i64 - s.playing as i64);
                println!("dipindai {} server", semua.len());
                {
                    let servers = semua;
                    let mut diuji = 0;
                    for s in &servers {
                        let sisa = s.max_players as i64 - s.playing as i64;
                        if sisa > 2 || diuji >= 6 {
                            continue;
                        }
                        diuji += 1;
                        let st = roblox::status_join(&c, place, &s.job_id).await;
                        println!(
                            "daftar {}/{} (sisa {sisa}) -> status gamejoin {st:?}",
                            s.playing, s.max_players
                        );
                    }
                    if diuji == 0 {
                        println!("tidak ada server hampir penuh di halaman pertama");
                    }
                }
                return;
            }
            match roblox::daftar_server(place, "").await {
                Ok((servers, _)) => {
                    for s in servers.iter().take(3) {
                        let ip = roblox::alamat_server(&c, place, &s.job_id).await;
                        match &ip {
                            Some(a) => {
                                let w = roblox::wilayah_ip(a).await;
                                println!("job={} ip={a} wilayah={:?}", &s.job_id[..8], w);
                            }
                            None => {
                                let m =
                                    roblox::alamat_server_mentah(&c, place, &s.job_id).await;
                                println!("job={} ip=TIDAK DAPAT :: {m}", &s.job_id[..8]);
                            }
                        }
                    }
                }
                Err(e) => println!("daftar server gagal: {e}"),
            }
        });
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-pid") {
        if let Some(pid) = arg.get(i + 1).and_then(|x| x.parse::<u32>().ok()) {
            match launcher::baris_perintah(pid) {
                Some(b) => {
                    println!("PID {pid}");
                    println!("  baris= {b}");
                    println!("  btid = {:?}", launcher::btid_dari_baris(&b));
                }
                None => println!("PID {pid}: baris perintah TIDAK TERBACA"),
            }
            return;
        }
        let s = store::Store::load();
        let daftar = launcher::klien_terperinci();
        if daftar.is_empty() {
            println!("tidak ada RobloxPlayerBeta.exe yang berjalan");
            return;
        }
        let sesudah_pertama = launcher::jumlah_bacaan();
        for k in daftar {
            let cocok = s
                .accounts
                .iter()
                .find(|a| k.btid != 0 && a.browser_tracker_id == k.btid)
                .map(|a| a.alias.clone())
                .unwrap_or_else(|| "(tidak dikenali)".into());
            println!("PID {} btid={} akun={}", k.pid, k.btid, cocok);
            println!("  exe  = {}", k.exe);
            match launcher::baris_perintah(k.pid) {
                Some(b) => println!("  baris= {b}"),
                None => println!("  baris= <TIDAK TERBACA>"),
            }
            println!();
        }

        for _ in 0..5 {
            let _ = launcher::klien_terperinci();
        }
        println!(
            "pembacaan baris perintah: {} sesudah pendataan pertama, {} sesudah 5 pendataan ulang",
            sesudah_pertama,
            launcher::jumlah_bacaan()
        );
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-sumber") {
        use std::io::Write;
        let detik: u64 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(30);
        let mut csv = arg.get(i + 2).and_then(|f| {
            let baru = !std::path::Path::new(f).exists();
            let mut b = std::fs::OpenOptions::new().create(true).append(true).open(f).ok()?;
            if baru {
                let _ = writeln!(b, "waktu,detik,pid,akun,cpu_persen,ram_mb,privat_mb,gpu_persen,vram_mb,kompresi_mb");
            }
            Some(b)
        });
        let s = store::Store::load();
        let alias = |pid: u32| -> String {
            launcher::klien_terperinci()
                .into_iter()
                .find(|k| k.pid == pid)
                .and_then(|k| s.accounts.iter().find(|a| k.btid != 0 && a.browser_tracker_id == k.btid).map(|a| a.alias.clone()))
                .unwrap_or_else(|| "(tak dikenali)".into())
        };
        let nama = std::env::var("SUMBER_NAMA").unwrap_or_else(|_| "RobloxPlayerBeta.exe".into());
        let _ = sumber::ukur_nama(&nama);
        let mulai = std::time::SystemTime::now();
        for t in 1..=detik {
            std::thread::sleep(std::time::Duration::from_secs(1));
            let l = sumber::ukur_nama(&nama);
            if l.klien.is_empty() {
                println!("t={t:>3}s  tidak ada {nama} yang berjalan");
            }
            for k in &l.klien {
                let a = alias(k.pid);
                let g = k.gpu.map(|x| format!("{x:5.1}%")).unwrap_or_else(|| "  n/a".into());
                let v = k.vram_mb.map(|x| format!("{x:6.0}")).unwrap_or_else(|| "   n/a".into());
                println!(
                    "t={t:>3}s  PID {:>6} {:<16} CPU {:5.1}%  RAM {:6.0} MB  privat {:6.0} MB  GPU {g}  VRAM {v} MB  | kompresi {:5.0} MB",
                    k.pid, a, k.cpu, k.ram_mb, k.privat_mb, l.kompresi_mb
                );
                if let Some(f) = csv.as_mut() {
                    let w = mulai.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) + t;
                    let _ = writeln!(
                        f, "{w},{t},{},{},{:.2},{:.1},{:.1},{},{},{:.1}",
                        k.pid, a.replace(',', " "), k.cpu, k.ram_mb, k.privat_mb,
                        k.gpu.map(|x| format!("{x:.2}")).unwrap_or_default(),
                        k.vram_mb.map(|x| format!("{x:.1}")).unwrap_or_default(),
                        l.kompresi_mb
                    );
                }
            }
        }
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-luncur") {
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let ram: u32 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(512);
        let store = Mutex::new(store::Store::load());
        let (id, semula, btid) = {
            let mut s = store.lock().unwrap();
            let Some(a) = s.accounts.iter_mut().find(|a| a.alias.eq_ignore_ascii_case(&alias)) else {
                println!("akun {alias} tidak ditemukan");
                return;
            };
            let semula = (a.hemat, a.hemat_minimize, a.hemat_ram_mb);
            a.hemat = true;
            a.hemat_minimize = false;
            a.hemat_ram_mb = ram;
            (a.id.clone(), semula, a.browser_tracker_id)
        };
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let sejak = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
        let hasil = tauri::async_runtime::block_on(luncurkan_inti(&store, id.clone(), place, None, None, None, None, None, None, None));
        println!("luncurkan_inti: {hasil:?}");
        let cap = hemat::cap_terbaca();
        let (_, flags) = fps::isi_berkas(&store.lock().unwrap().klien_path.clone());
        let hemat_ok = hemat::flag_hemat().keys().all(|k| flags.contains_key(k));
        println!("FramerateCap terbaca = {cap:?} (harus 10); flag hemat tertulis = {hemat_ok}; flag FPS lama ada = {}", flags.contains_key("DFIntTaskSchedulerTargetFps"));
        let mut pid = None;
        for _ in 0..90 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            pid = launcher::klien_terperinci().into_iter().find(|k| k.btid == btid).map(|k| k.pid);
            if pid.is_some() && joinlog::jumlah_join_sejak(sejak) > 0 {
                break;
            }
        }
        match pid {
            None => println!("GAGAL: klien akun tidak terdata"),
            Some(pid) => {
                println!("PID {pid}; prioritas dasar = {:?} (BELOW_NORMAL = 6)", launcher::prioritas_dasar(pid));
                let alias_p = alias.clone();
                match tauri::async_runtime::block_on(periksa_versi_inti(&store, btid, &alias_p)) {
                    Ok(Some(m)) => println!("periksa_versi: {m}"),
                    Ok(None) => println!("periksa_versi: game berjalan di proses buatan CAM (batas menempel)"),
                    Err(e) => println!("periksa_versi galat: {e}"),
                }
                println!("versi_alih tersimpan = {:?}", store.lock().unwrap().versi_alih);
                std::thread::sleep(std::time::Duration::from_secs(30));
                let _ = sumber::ukur();
                let (mut n, mut cpu, mut gpu, mut ws, mut maks) = (0.0, 0.0, 0.0, 0.0, 0.0f64);
                for _ in 0..90 {
                    std::thread::sleep(std::time::Duration::from_secs(1));
                    if let Some(k) = sumber::ukur().klien.into_iter().find(|k| k.pid == pid) {
                        n += 1.0; cpu += k.cpu; gpu += k.gpu.unwrap_or(0.0); ws += k.ram_mb; maks = maks.max(k.ram_mb);
                    }
                }
                if n > 0.0 {
                    println!("90 dtk: CPU {:.2}%  GPU {:.2}%  RAM rata {:.0} MB  maks {:.0} MB (batas {ram})", cpu / n, gpu / n, ws / n, maks);
                }
                for _ in 0..3 {
                    if let Some(j) = jendela::daftar().into_iter().find(|j| j.pid == pid) {
                        let _ = jendela::tutup(j.hwnd);
                    }
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    if !launcher::pid_klien().contains(&pid) { break; }
                }
            }
        }
        {
            let mut s = store.lock().unwrap();
            if let Some(a) = s.find_mut(&id) {
                (a.hemat, a.hemat_minimize, a.hemat_ram_mb) = semula;
            }
            let _ = s.save();
        }
        println!("Mode Hemat akun dikembalikan ke semula: {semula:?}");
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-join") {
        let sejak: i64 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(0);
        println!("join sejak {sejak}: {}", joinlog::jumlah_join_sejak(sejak));
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-hemat") {
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let detik: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(60);
        if alias.is_empty() || place == 0 {
            println!("pakai: --probe-hemat <alias> <placeId> [detik] [berkas.csv] [awal|fps]");
            return;
        }
        let set = arg.get(i + 5).cloned().unwrap_or_else(|| "awal".into());
        if let Err(e) = percobaan::jalankan(&alias, place, detik, arg.get(i + 4).cloned(), &set) {
            println!("GAGAL: {e}");
        }
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-jendela") {
        let mode = arg.get(i + 1).cloned().unwrap_or_default();
        for j in jendela::daftar() {
            println!("SEBELUM {} -> {}x{} @ {},{}", j.judul, j.w, j.h, j.x, j.y);
        }
        if !mode.is_empty() {
            match jendela::susun_jendela_uji(&mode) {
                Ok(n) => println!("ditata: {n}"),
                Err(e) => println!("GAGAL: {e}"),
            }
            for j in jendela::daftar() {
                println!("SESUDAH {} -> {}x{} @ {},{}", j.judul, j.w, j.h, j.x, j.y);
            }
        }
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-duo") {
        let kode = arg.get(i + 1).cloned().unwrap_or_default();
        let mut g = SingletonGuard::new();
        let _ = g.nyalakan();
        let st = store::Store::load();
        for ak in st.accounts.iter() {
            let Ok(c) = store::decrypt(&ak.cookie_enc) else { continue };
            let sejak = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            let r = tauri::async_runtime::block_on(async {
                let v = roblox::resolve_share_link(&c, &kode).await?;
                let d = v.get("privateServerInviteData").cloned().unwrap_or_default();
                let t = launcher::Tujuan::Pribadi {
                    place_id: d.get("placeId").and_then(|x| x.as_u64()).unwrap_or(0),
                    link_code: d
                        .get("linkCode")
                        .and_then(|x| x.as_str())
                        .unwrap_or("")
                        .to_string(),
                    access_code: String::new(),
                };
                let tk = roblox::auth_ticket(&c).await?;
                launcher::luncurkan(&tk, &t, 1, None)
            });
            if let Err(e) = r {
                println!("{}: GAGAL {e}", ak.alias);
                continue;
            }
            let mut masuk = false;
            for _ in 0..80 {
                std::thread::sleep(std::time::Duration::from_millis(1500));
                if joinlog::jumlah_join_sejak(sejak) > 0 {
                    masuk = true;
                    break;
                }
            }
            println!(
                "{}: {} (klien jalan: {})",
                ak.alias,
                if masuk { "MASUK" } else { "belum masuk (batas waktu)" },
                launcher::klien_berjalan().len()
            );
        }
        if arg.iter().any(|a| a == "tile") {
            std::thread::sleep(std::time::Duration::from_secs(6));
            let (pids, mentah) = jendela::daftar_mentah();
            println!("pid klien: {pids:?} total hwnd: {}", mentah.len());
            for j in jendela::daftar() {
                println!("SEBELUM {} -> {}x{} @ {},{}", j.judul, j.w, j.h, j.x, j.y);
            }
            match jendela::susun_jendela_uji("kisi") {
                Ok(n) => println!("ditata: {n}"),
                Err(e) => println!("GAGAL: {e}"),
            }
            for j in jendela::daftar() {
                println!("SESUDAH {} -> {}x{} @ {},{}", j.judul, j.w, j.h, j.x, j.y);
            }
        }
        println!("selesai");
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-unduh") {
        let minta = arg.get(i + 1).cloned().unwrap_or_else(|| "latest".into());
        tauri::async_runtime::block_on(async {
            let hash = if minta == "latest" {
                match unduh::terbaru().await {
                    Ok((h, v)) => {
                        println!("LIVE: {h} ({v})");
                        h
                    }
                    Err(e) => return println!("GAGAL: {e}"),
                }
            } else {
                match unduh::normalkan_hash(&minta) {
                    Some(h) => h,
                    None => return println!("hash tidak sah"),
                }
            };
            if let Err(e) = unduh::mulai(&hash) {
                return println!("GAGAL: {e}");
            }
            let pantau = std::thread::spawn(|| loop {
                let k = unduh::status();
                if !k.aktif {
                    break;
                }
                println!(
                    "  [{}/{}] {} {:.1}/{:.1} MB",
                    k.paket_ke,
                    k.jumlah_paket,
                    k.tahap,
                    k.byte_selesai as f64 / 1e6,
                    k.byte_total as f64 / 1e6
                );
                std::thread::sleep(std::time::Duration::from_secs(3));
            });
            let mulai = std::time::Instant::now();
            let hasil = unduh::pasang(hash.clone()).await;
            if hasil.is_err() {
                unduh::bersihkan_sisa(&hash);
            }
            unduh::selesai(hasil);
            let _ = pantau.join();
            let k = unduh::status();
            println!(
                "selesai dalam {:.0}s | hasil={} | galat={} | dilewati={:?}",
                mulai.elapsed().as_secs_f64(),
                k.hasil,
                k.galat,
                k.dilewati
            );
        });
        return;
    }

    if std::env::args().any(|a| a == "--tutup-singleton") {
        let n = singleton::tutup_handle_roblox();
        println!("handle singleton ditutup: {n}");
        return;
    }

    let singleton = SingletonGuard::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            store: Mutex::new(Store::load()),
            singleton: Mutex::new(singleton),
        })
        .invoke_handler(tauri::generate_handler![
            daftar_akun,
            lokasi_penyimpanan,
            tambah_akun,
            ambil_cookie,
            hapus_akun,
            ubah_alias,
            segarkan_akun,
            multi_instance_status,
            set_multi_instance,
            jumlah_klien_roblox,
            jumlah_join_sejak,
            cari_game,
            daftar_riwayat,
            hapus_riwayat,
            perbaiki_riwayat,
            perbarui_cookie,
            auto_refresh_status,
            set_auto_refresh,
            set_fps_akun,
            fps_terpasang,
            sembunyikan_username_status,
            set_sembunyikan_username,
            daftar_versi_roblox,
            klien_path,
            klien_akun,
            sumber_klien,
            target_terakhir,
            simpan_target_terakhir,
            daftar_server_tersimpan,
            simpan_server_tersimpan,
            ubah_nama_server_tersimpan,
            hapus_server_tersimpan,
            login_browser,
            tutup_login_browser,
            set_hemat_akun,
            jendela_hemat,
            periksa_versi_hemat,
            set_klien_path,
            tambah_klien_kustom,
            hapus_klien_kustom,
            fflag_daftar,
            jendela_aksi,
            jendela_maks,
            fflag_simpan,
            versi_roblox_terbaru,
            periksa_versi_roblox,
            unduh_versi_roblox,
            pembaruan::cek_update,
            pembaruan::pasang_update,
            pembaruan::status_update,
            status_unduh_roblox,
            batal_unduh_roblox,
            luncurkan,
            daftar_server,
            wilayah_server_banyak,
            periksa_server,
            cari_user,
            blokir_user,
            tambah_teman,
            ubah_display_name,
            daftar_blokir,
            buka_blokir_semua,
            daftar_jendela,
            susun_jendela,
            pindah_jendela,
            fokus_jendela,
            tema,
            set_tema,
            refresh_terjadwal,
            jadwal_refresh,
        ])
        .run(tauri::generate_context!())
        .expect("failed to start the application");
}
