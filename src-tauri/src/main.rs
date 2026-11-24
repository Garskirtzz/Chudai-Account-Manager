#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fps;
mod jendela;
mod joinlog;
mod klien;
mod singleton;
mod launcher;
mod ikon_hantu;
mod bahasa;
mod roblox;
mod store;
mod hemat;
mod sumber;
mod anggaran;
mod kendali;
mod percobaan;
mod probe_tray;
mod unduh;
mod pembaruan;
mod login;
mod sesi;
mod papanklip;
mod ramfisik;
mod diagnosa;
mod pantau;
mod pengaman;
mod saring;
mod setelan_fps;
mod afk;
mod hello;
mod impor;
mod cadangan;
mod kecil;
mod pratinjau;
mod sisa;
mod autopsi;
mod profil;
mod discord;
mod kehadiran;
mod performa;
mod uji_job;
mod darurat;
mod baki;
mod jelajah;
mod rawat;
mod avatar3d;

use launcher::{SingletonGuard, Tujuan};
use rand::Rng;
use serde::Serialize;
use std::sync::Mutex;
use store::{Account, Riwayat, ServerTersimpan, Store, TargetLuncur};
use tauri::{Manager, State};

struct AppState {
    store: Mutex<Store>,
    singleton: Mutex<SingletonGuard>,
    proteksi: std::sync::Arc<sesi::Proteksi>,
    pelacak: pantau::Pelacak,
    impor: Mutex<Vec<impor::Entri>>,
}

struct Konteks<'a> {
    store: &'a Mutex<Store>,
    singleton: &'a Mutex<SingletonGuard>,
    proteksi: &'a sesi::Proteksi,
    pelacak: &'a pantau::Pelacak,
}

impl AppState {
    fn konteks(&self) -> Konteks<'_> {
        Konteks { store: &self.store, singleton: &self.singleton, proteksi: &self.proteksi, pelacak: &self.pelacak }
    }
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
    plus: bool,
    avatar_url: String,
    last_launched: i64,
    last_refreshed: i64,
    fps_cap: u32,
    last_error: String,
    hemat: bool,
    hemat_minimize: bool,
    hemat_ram_mb: u32,
    hemat_fps: u32,
    folder_id: Option<String>,
    auto_rejoin: bool,
    anti_afk: bool,
    catatan: String,
    favorit: bool,
    server_terakhir: Option<store::ServerTerakhir>,
    mulai_kecil: u32,
    banned: Option<bool>,
    email_ok: Option<bool>,
    dua_langkah: Option<Vec<String>>,
    argumen_luncur: Option<String>,
    utama: bool,
    kualitas_penuh: bool,
    pembatasan: Option<store::Pembatasan>,
    target_sendiri: Option<store::TargetLuncur>,
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
            plus: a.plus,
            avatar_url: a.avatar_url.clone(),
            last_launched: a.last_launched,
            last_refreshed: a.last_refreshed,
            fps_cap: a.fps_cap,
            last_error: a.last_error.clone(),
            hemat: a.hemat,
            hemat_minimize: a.hemat_minimize,
            hemat_ram_mb: a.hemat_ram_mb,
            hemat_fps: a.hemat_fps,
            folder_id: a.folder_id.clone(),
            auto_rejoin: a.auto_rejoin,
            anti_afk: a.anti_afk,
            catatan: a.catatan.clone(),
            favorit: a.favorit,
            server_terakhir: a.server_terakhir.clone(),
            mulai_kecil: a.mulai_kecil,
            banned: a.banned,
            email_ok: a.email_ok,
            dua_langkah: a.dua_langkah.clone(),
            argumen_luncur: a.argumen_luncur.clone(),
            utama: a.utama,
            kualitas_penuh: a.kualitas_penuh,
            pembatasan: a.pembatasan.clone(),
            target_sendiri: a.target_sendiri.clone(),
        }
    }
}

#[cfg(test)]
mod tes_akun_view {
    use super::*;

    #[test]
    fn kolom_yang_dibaca_ui_ikut_terkirim() {
        let v = serde_json::to_value(AkunView::from(&Account::default())).unwrap();
        for k in ["id", "alias", "username", "user_id", "premium", "plus", "last_error", "hemat", "hemat_minimize",
                  "hemat_ram_mb", "hemat_fps", "folder_id", "auto_rejoin", "anti_afk", "catatan", "favorit", "fps_cap", "server_terakhir", "mulai_kecil", "banned", "email_ok", "dua_langkah", "argumen_luncur", "utama", "kualitas_penuh", "pembatasan", "target_sendiri"] {
            assert!(v.get(k).is_some(), "AkunView tanpa kolom {k}");
        }
    }
}

#[tauri::command]
fn daftar_akun(state: State<AppState>) -> Vec<AkunView> {
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    folder_id: Option<String>,
) -> Result<AkunView, String> {
    let (v, _) = simpan_cookie(&state.store, cookie, alias, false).await?;
    masukkan_folder(&state.store, v, folder_id)
}

fn masukkan_folder(store: &Mutex<Store>, v: AkunView, folder_id: Option<String>) -> Result<AkunView, String> {
    let Some(f) = folder_id.filter(|f| !f.is_empty()) else { return Ok(v) };
    let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
    if s.pindah_akun(&[v.id.clone()], Some(&f)).is_err() {
        return Ok(v);
    }
    s.save()?;
    Ok(s.find(&v.id).map(AkunView::from).unwrap_or(v))
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
        let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
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
            lama.plus = info.plus;
            lama.pasang_status(info.banned, info.email_ok, info.dua_langkah.clone());
            lama.pasang_pembatasan_sehat(info.pembatasan.clone());
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
        plus: info.plus,
        banned: info.banned,
        pembatasan: info.pembatasan.clone().flatten(),
        email_ok: info.email_ok,
        dua_langkah: info.dua_langkah.clone(),
        avatar_url: info.avatar_url.clone(),
        last_launched: 0,
        last_refreshed: 0,
        fps_cap: 0,
        cookie_enc: store::encrypt(&cookie)?,
        browser_tracker_id: rand::thread_rng().gen_range(100_000..900_000_000),
        last_error: String::new(),
        auto_rejoin: false,
        anti_afk: false,
        catatan: String::new(),
        favorit: false,
        server_terakhir: None,
        mulai_kecil: 0,
        hemat: false,
        hemat_minimize: false,
        hemat_ram_mb: 0,
        hemat_fps: 0,
        folder_id: None,
        argumen_luncur: None,
        utama: false,
        kualitas_penuh: false,
        target_sendiri: None,
    };

    let view = AkunView::from(&akun);
    let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
    s.accounts.push(akun);
    s.save()?;
    Ok((view, false))
}

const LABEL_LOGIN: &str = "login-roblox";

#[tauri::command]
async fn login_browser(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    alias: String,
    folder_id: Option<String>,
    tanpa_gpu: Option<bool>,
) -> Result<String, String> {
    if let Some(w) = app.get_webview_window(LABEL_LOGIN) {
        let _ = w.set_focus();
        return Err("A Roblox login window is already open.".into());
    }
    let tanpa_gpu = tanpa_gpu.unwrap_or(false) || login::terputus_sebelumnya();
    let profil = login::mulai();
    struct Beres(Option<std::path::PathBuf>);
    impl Drop for Beres {
        fn drop(&mut self) {
            if let Some(p) = self.0.take() {
                login::selesai(p);
            }
        }
    }
    let _beres = Beres(Some(profil.clone()));
    let url: tauri::Url = "https://www.roblox.com/login".parse().map_err(|_| "bad login URL")?;
    let jendela = tauri::WebviewWindowBuilder::new(&app, LABEL_LOGIN, tauri::WebviewUrl::External(url))
        .title(judul_login(tanpa_gpu))
        .inner_size(480.0, 760.0)
        .incognito(true)
        .data_directory(profil.clone())
        .additional_browser_args(&login::argumen(tanpa_gpu))
        .on_navigation(pengaman::izin_login)
        .devtools(false)
        .build()
        .map_err(|e| format!("could not open the login window: {e}"))?;
    if let Err(e) = pengaman::keraskan_jendela(&jendela, pengaman::Jenis::Login, Some(profil.clone())).await {
        let _ = jendela.destroy();
        return Err(e);
    }

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
        let w = jendela.clone();
        let daftar = tauri::async_runtime::spawn_blocking(move || w.cookies())
            .await
            .ok()
            .and_then(|r| r.ok())
            .unwrap_or_default();
        let Some(nilai) = daftar
            .iter()
            .find(|c| {
                c.name() == ".ROBLOSECURITY"
                    && !c.value().is_empty()
                    && c.domain().is_some_and(|d| d == "roblox.com" || d.ends_with(".roblox.com"))
            })
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
    let view = if diperbarui { view } else { masukkan_folder(&state.store, view, folder_id)? };
    Ok(if diperbarui {
        format!("{}: cookie renewed from the Roblox login. Settings kept.", view.alias)
    } else {
        format!("{} added from the Roblox login.", view.alias)
    })
}

const AWALAN_SITUS: &str = "situs-";

fn label_situs(id: &str) -> String {
    let aman: String = id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').take(64).collect();
    format!("{AWALAN_SITUS}{aman}")
}

fn pilih_roblosecurity(daftar: Vec<tauri::webview::Cookie<'static>>) -> Option<String> {
    daftar
        .into_iter()
        .find(|c| {
            c.name() == ".ROBLOSECURITY"
                && !c.value().is_empty()
                && c.domain().is_some_and(|d| {
                    let d = d.trim_start_matches('.').to_ascii_lowercase();
                    d == "roblox.com" || d.ends_with(".roblox.com")
                })
        })
        .map(|c| c.value().to_string())
}

#[tauri::command]
async fn buka_situs(app: tauri::AppHandle, id: String, halaman: Option<String>) -> Result<(), String> {
    buka_situs_inti(app, id, halaman, Vec::new()).await
}

async fn buka_situs_inti(app: tauri::AppHandle, id: String, halaman: Option<String>, pola_uji: Vec<String>) -> Result<(), String> {
    let (alias, username, uid, cookie) = {
        let st = app.state::<AppState>();
        let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.alias.clone(), a.username.clone(), a.user_id, store::decrypt(&a.cookie_enc)?)
    };
    let tujuan: tauri::Url = match halaman.as_deref() {
        Some("profil") if uid > 0 => format!("https://www.roblox.com/users/{uid}/profile"),
        _ => "https://www.roblox.com/home".into(),
    }
    .parse()
    .map_err(|_| "bad Roblox address")?;
    let label = label_situs(&id);
    if let Some(w) = app.get_webview_window(&label) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.navigate(tujuan);
        return Ok(());
    }
    let profil = login::mulai_situs();
    let nama = if username.is_empty() { alias.clone() } else { format!("{alias} (@{username})") };
    let kosong: tauri::Url = "about:blank".parse().map_err(|_| "bad URL")?;
    let w = tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::External(kosong))
        .title(format!("{nama} — Roblox — Chudai Account Manager"))
        .inner_size(1180.0, 800.0)
        .center()
        .incognito(true)
        .data_directory(profil.clone())
        .additional_browser_args(&login::argumen(false))
        .on_navigation(pengaman::izin_login)
        .devtools(false)
        .build()
        .map_err(|e| {
            login::hapus_profil(profil.clone());
            format!("could not open the Roblox window: {e}")
        })?;
    if let Err(e) = pengaman::siapkan_situs_jendela(&w, profil.clone(), cookie.clone(), pola_uji).await {
        let _ = w.destroy();
        login::hapus_profil(profil);
        return Err(e);
    }
    let akhir = Mutex::new(Some({
        let (app, label) = (app.clone(), label.clone());
        move || akhiri_situs(&app, &label, &id, uid, &cookie, profil)
    }));
    w.on_window_event(move |e| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = e {
            api.prevent_close();
            if let Some(f) = akhir.lock().unwrap_or_else(|e| e.into_inner()).take() {
                tauri::async_runtime::spawn_blocking(f);
            }
        }
    });
    w.navigate(tujuan).map_err(|e| e.to_string())?;
    Ok(())
}

fn akhiri_situs(app: &tauri::AppHandle, label: &str, id: &str, uid: u64, lama: &str, profil: std::path::PathBuf) {
    let baru = app.get_webview_window(label).and_then(|w| {
        let _ = w.hide();
        let c = w.cookies().ok().and_then(pilih_roblosecurity);
        let _ = w.destroy();
        c
    });
    if let Some(baru) = baru.filter(|b| roblox::mentah(b) != roblox::mentah(lama)) {
        tauri::async_runtime::block_on(async {
            match roblox::user_info_cek(&baru).await {
                Ok(info) if info.user_id == uid && uid > 0 => {
                    let st = app.state::<AppState>();
                    let mut s = st.store.lock().unwrap_or_else(|e| e.into_inner());
                    if let Some(a) = s.find_mut(id).filter(|a| a.user_id == uid) {
                        if let Ok(enc) = store::encrypt(&baru) {
                            a.cookie_enc = enc;
                            a.last_error.clear();
                            a.pasang_status(info.banned, info.email_ok, info.dua_langkah.clone());
                            a.pasang_pembatasan_sehat(info.pembatasan.clone());
                            let _ = s.save();
                            store::catat_kejadian("The roblox.com window ended with a newer sign-in cookie; it was saved.");
                        }
                    }
                }
                Ok(_) => store::catat_kejadian("The roblox.com window ended signed in as another user; the stored cookie was kept."),
                Err((_, e)) => store::catat_kejadian(&format!("The roblox.com window ended with an unusable cookie; the stored one was kept ({e}).")),
            }
        });
    }
    login::hapus_profil(profil);
}

#[tauri::command]
fn salin_teks(teks: String) -> Result<(), String> {
    papanklip::salin(teks.chars().take(200).collect::<String>().as_str())
}

#[derive(Serialize)]
struct BarisImpor {
    label: String,
    lewati: Option<String>,
}

fn pasang_antrean(state: &State<'_, AppState>, e: Vec<impor::Entri>) -> Vec<BarisImpor> {
    let ringkas = e.iter().map(|x| BarisImpor { label: x.label.clone(), lewati: x.lewati.clone() }).collect();
    *state.impor.lock().unwrap_or_else(|e| e.into_inner()) = e;
    ringkas
}

#[tauri::command]
fn impor_siapkan_teks(state: State<'_, AppState>, teks: String) -> Result<Vec<BarisImpor>, String> {
    if teks.len() > 4 * 1024 * 1024 {
        return Err("That's too much text to import at once.".into());
    }
    let e = impor::urai_teks(&teks);
    if !e.iter().any(|x| x.cookie.is_some()) {
        return Err(format!("No .ROBLOSECURITY cookies found. Each starts with {}", impor::TANDA));
    }
    Ok(pasang_antrean(&state, e))
}

#[tauri::command]
async fn impor_siapkan_ram(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<Vec<BarisImpor>, String> {
    use tauri_plugin_dialog::DialogExt;
    let pilih = app
        .dialog()
        .file()
        .set_title(bahasa::pilih("Roblox Account Manager's AccountData.json", "AccountData.json dari Roblox Account Manager"))
        .add_filter("AccountData.json", &["json"]);
    let jalur = tauri::async_runtime::spawn_blocking(move || pilih.blocking_pick_file()).await.map_err(|e| e.to_string())?;
    let Some(jalur) = jalur.and_then(|j| j.into_path().ok()) else {
        return Err("__BATAL__".into());
    };
    if std::fs::metadata(&jalur).map(|m| m.len()).unwrap_or(0) > 32 * 1024 * 1024 {
        return Err("That file is too big to be an AccountData.json.".into());
    }
    let data = std::fs::read(&jalur).map_err(|e| format!("couldn't read that file: {e}"))?;
    let e = impor::urai_berkas_ram(&data)?;
    if e.is_empty() {
        return Err("That AccountData.json has no accounts.".into());
    }
    Ok(pasang_antrean(&state, e))
}

#[derive(Serialize)]
struct HasilImpor {
    status: &'static str,
    pesan: String,
}

#[tauri::command]
async fn impor_jalankan(state: State<'_, AppState>, i: usize, folder_id: Option<String>) -> Result<HasilImpor, String> {
    let e = {
        let mut q = state.impor.lock().unwrap_or_else(|e| e.into_inner());
        let x = q.get_mut(i).ok_or("The import list changed; start the import again.")?;
        let salin = impor::Entri { cookie: x.cookie.take(), ..x.clone() };
        salin
    };
    if let Some(alasan) = e.lewati {
        return Ok(HasilImpor { status: "dilewati", pesan: alasan });
    }
    let Some(cookie) = e.cookie else {
        return Ok(HasilImpor { status: "dilewati", pesan: "Already imported.".into() });
    };
    match simpan_cookie(&state.store, cookie, e.alias.clone(), true).await {
        Ok((v, true)) => Ok(HasilImpor { status: "diperbarui", pesan: format!("Already in the list as {}: cookie renewed.", v.alias) }),
        Ok((v, false)) => {
            let v = masukkan_folder(&state.store, v, folder_id)?;
            if !e.catatan.is_empty() {
                let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(a) = s.find_mut(&v.id) {
                    a.catatan = e.catatan.clone();
                    s.save()?;
                }
            }
            Ok(HasilImpor { status: "ditambah", pesan: format!("Added as {}.", v.alias) })
        }
        Err(pesan) => Ok(HasilImpor { status: "gagal", pesan: store::samarkan_cookie(&pesan) }),
    }
}

#[tauri::command]
async fn cadangan_buat(window: tauri::WebviewWindow, app: tauri::AppHandle, state: State<'_, AppState>, sandi: String) -> Result<(String, usize), String> {
    use tauri_plugin_dialog::DialogExt;
    if sandi.chars().count() < cadangan::SANDI_MIN {
        return Err(format!("Use at least {} characters for the backup password.", cadangan::SANDI_MIN));
    }
    let hello = state.store.lock().unwrap_or_else(|e| e.into_inner()).hello_salin;
    if hello {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
        let alasan = bahasa::pilih("Back up all accounts with their cookies", "Cadangkan semua akun beserta cookie-nya").to_string();
        tauri::async_runtime::spawn_blocking(move || hello::verifikasi(hwnd, &alasan))
            .await
            .map_err(|e| e.to_string())??;
    }
    let isi = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let mut akun = Vec::new();
        for a in &s.accounts {
            akun.push(cadangan::akun_ke_cadangan(a).map_err(|e| format!("{}: {e}", a.alias))?);
        }
        cadangan::Isi {
            versi: 1,
            dibuat: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0),
            akun,
            folder: s.folder.clone(),
            server: s.server_tersimpan.clone(),
        }
    };
    let n = isi.akun.len();
    if n == 0 {
        return Err("There are no accounts to back up.".into());
    }
    let data = tauri::async_runtime::spawn_blocking(move || cadangan::kunci_isi(&sandi, &isi)).await.map_err(|e| e.to_string())??;
    let pilih = app
        .dialog()
        .file()
        .set_title(bahasa::pilih("Save the backup", "Simpan cadangan"))
        .set_file_name(format!("{}.{}", bahasa::pilih("Chudai accounts backup", "Cadangan akun Chudai"), cadangan::EKSTENSI))
        .add_filter(bahasa::pilih("Chudai Account Manager backup", "Cadangan Chudai Account Manager"), &[cadangan::EKSTENSI]);
    let jalur = tauri::async_runtime::spawn_blocking(move || pilih.blocking_save_file()).await.map_err(|e| e.to_string())?;
    let Some(jalur) = jalur.and_then(|j| j.into_path().ok()) else {
        return Err("__BATAL__".into());
    };
    cadangan::tulis(&jalur, &data)?;
    Ok((jalur.display().to_string(), n))
}

#[tauri::command]
async fn cadangan_pilih(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let pilih = app
        .dialog()
        .file()
        .set_title(bahasa::pilih("Restore from a backup", "Pulihkan dari cadangan"))
        .add_filter(bahasa::pilih("Chudai Account Manager backup", "Cadangan Chudai Account Manager"), &[cadangan::EKSTENSI]);
    let jalur = tauri::async_runtime::spawn_blocking(move || pilih.blocking_pick_file()).await.map_err(|e| e.to_string())?;
    jalur.and_then(|j| j.into_path().ok()).map(|p| p.display().to_string()).ok_or_else(|| "__BATAL__".into())
}

#[derive(Serialize, Default)]
struct LaporanPulih {
    ditambah: usize,
    diganti: usize,
    dilewati: usize,
    gagal: usize,
    folder_baru: usize,
    server_baru: usize,
}

#[tauri::command]
async fn cadangan_pulihkan(state: State<'_, AppState>, jalur: String, sandi: String, ganti: bool) -> Result<LaporanPulih, String> {
    let p = std::path::PathBuf::from(&jalur);
    if std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0) > 64 * 1024 * 1024 {
        return Err(cadangan::Galat::BukanCadangan.pesan());
    }
    let data = std::fs::read(&p).map_err(|e| format!("couldn't read that file: {e}"))?;
    let isi = tauri::async_runtime::spawn_blocking(move || cadangan::buka_isi(&sandi, &data))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.pesan())?;
    let mut lap = LaporanPulih::default();
    let mut entri: Vec<(Account, String)> = Vec::new();
    for v in &isi.akun {
        match cadangan::akun_dari_cadangan(v) {
            Some(x) if !entri.iter().any(|(a, _)| a.user_id == x.0.user_id) => entri.push(x),
            Some(_) => lap.dilewati += 1,
            None => lap.gagal += 1,
        }
    }
    let ada: Vec<u64> = state.store.lock().unwrap_or_else(|e| e.into_inner()).accounts.iter().map(|a| a.user_id).collect();
    let mut boleh_ganti: Vec<u64> = Vec::new();
    if ganti {
        let mut pertama = true;
        for (a, c) in entri.iter().filter(|(a, _)| ada.contains(&a.user_id)) {
            if !pertama {
                tokio::time::sleep(std::time::Duration::from_millis(400)).await;
            }
            pertama = false;
            match roblox::user_info_cek(c).await {
                Ok(info) if info.user_id == a.user_id => boleh_ganti.push(a.user_id),
                _ => {}
            }
        }
    }
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    terapkan_pulih(&mut s, isi.folder, isi.server, entri, ganti, &boleh_ganti, &mut lap);
    s.save()?;
    Ok(lap)
}

fn terapkan_pulih(
    s: &mut Store,
    folder: Vec<store::Folder>,
    server: Vec<store::ServerTersimpan>,
    entri: Vec<(Account, String)>,
    ganti: bool,
    boleh_ganti: &[u64],
    lap: &mut LaporanPulih,
) {
    let mut peta: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for f in &folder {
        let Ok(nama) = store::nama_folder_sah(&f.nama) else { continue };
        if let Some(l) = s.folder.iter().find(|l| l.nama.eq_ignore_ascii_case(&nama)) {
            peta.insert(f.id.clone(), l.id.clone());
        } else {
            let baru = store::Folder { id: uuid::Uuid::new_v4().to_string(), nama, ..f.clone() };
            peta.insert(f.id.clone(), baru.id.clone());
            s.folder.push(baru);
            lap.folder_baru += 1;
        }
    }
    for (mut a, cookie) in entri {
        let Ok(enc) = store::encrypt(&cookie) else {
            lap.gagal += 1;
            continue;
        };
        a.cookie_enc = enc;
        a.folder_id = a.folder_id.as_ref().and_then(|f| peta.get(f).cloned());
        if let Some(lokal) = s.accounts.iter_mut().find(|x| x.user_id == a.user_id) {
            if !ganti {
                lap.dilewati += 1;
            } else if boleh_ganti.contains(&a.user_id) {
                a.id = lokal.id.clone();
                a.last_error.clear();
                a.browser_tracker_id = lokal.browser_tracker_id;
                *lokal = a;
                lap.diganti += 1;
            } else {
                lap.gagal += 1;
            }
        } else {
            a.id = uuid::Uuid::new_v4().to_string();
            while a.browser_tracker_id == 0 || s.accounts.iter().any(|x| x.browser_tracker_id == a.browser_tracker_id) {
                a.browser_tracker_id = rand::thread_rng().gen_range(100_000..900_000_000);
            }
            s.accounts.push(a);
            lap.ditambah += 1;
        }
    }
    for sv in server {
        if !s.server_tersimpan.iter().any(|x| cadangan::kunci_server(x) == cadangan::kunci_server(&sv)) {
            s.server_tersimpan.push(store::ServerTersimpan { id: uuid::Uuid::new_v4().to_string(), ..sv });
            lap.server_baru += 1;
        }
    }
}

#[cfg(test)]
mod tes_btid_hapus {
    use super::*;

    fn akun(id: &str, btid: u64) -> Account {
        Account { id: id.into(), browser_tracker_id: btid, ..Default::default() }
    }

    #[test]
    fn btid_kembar_milik_akun_lain_tidak_ditutup() {
        let semua = vec![akun("a", 111), akun("b", 222), akun("c", 222), akun("d", 0), akun("e", 333)];
        let ids = vec!["a".to_string(), "b".to_string(), "d".to_string()];
        let t = btid_untuk_ditutup(&semua, &ids);
        assert!(t.contains(&111), "only a has 111");
        assert!(!t.contains(&222), "c (kept) shares 222 with b: its client must stay");
        assert!(!t.contains(&0), "btid 0 is never matched");
        assert!(!t.contains(&333), "e is not being deleted");
        assert_eq!(t.len(), 1);
    }
}

fn harus_akhiri_tray(_resmi: bool, probe_biarkan: bool) -> bool {
    !probe_biarkan
}

#[cfg(test)]
mod tes_teks_batch {
    use super::teks_batch;

    #[test]
    fn pesan_batch_discord_dua_bahasa() {
        assert_eq!(teks_batch(1, 1, 0, false, false), "Launch finished: 1 of 1 account launched.");
        assert_eq!(teks_batch(5, 3, 2, true, false), "Launch finished: 3 of 5 accounts launched, 2 failed (cancelled).");
        assert_eq!(teks_batch(5, 3, 2, true, true), "Peluncuran selesai: 3 dari 5 akun diluncurkan, 2 gagal (dibatalkan).");
        assert_eq!(teks_batch(2, 2, 0, false, true), "Peluncuran selesai: 2 dari 2 akun diluncurkan.");
    }
}

#[cfg(test)]
mod tes_tray_luncur {
    use super::*;

    #[test]
    fn tray_diam_diakhiri_juga_lewat_peluncur_resmi() {
        assert!(harus_akhiri_tray(false, false));
        assert!(harus_akhiri_tray(true, false), "T-042: the official launcher path ends it too");
        assert!(!harus_akhiri_tray(false, true), "only the warm-start probe keeps it");
        assert!(!harus_akhiri_tray(true, true));
    }
}

#[cfg(test)]
mod tes_pulih {
    use super::*;

    fn akun(uid: u64, alias: &str, folder: Option<&str>) -> Account {
        Account { id: format!("lokal-{uid}"), alias: alias.into(), user_id: uid, folder_id: folder.map(str::to_string), ..Default::default() }
    }

    #[test]
    fn gabung_folder_akun_server() {
        let mut s = Store::default();
        s.folder.push(store::Folder { id: "lokal-f".into(), nama: "Farming".into(), ..Default::default() });
        s.accounts.push(akun(1, "Lama", None));
        s.accounts.push(akun(2, "Tetap", None));
        s.server_tersimpan.push(store::ServerTersimpan { id: "s1".into(), place_id: "10".into(), ..Default::default() });
        let folder = vec![
            store::Folder { id: "cb-f1".into(), nama: "farming".into(), ..Default::default() },
            store::Folder { id: "cb-f2".into(), nama: "Boosting".into(), warna: "biru".into(), ..Default::default() },
        ];
        let server = vec![
            store::ServerTersimpan { id: "x".into(), place_id: "10".into(), ..Default::default() },
            store::ServerTersimpan { id: "y".into(), place_id: "20".into(), ..Default::default() },
        ];
        let entri = vec![
            (akun(1, "Baru", Some("cb-f2")), "c1".to_string()),
            (akun(2, "Ganti?", None), "c2".to_string()),
            (akun(3, "Tambah", Some("cb-f1")), "c3".to_string()),
        ];
        let mut lap = LaporanPulih::default();
        terapkan_pulih(&mut s, folder, server, entri, true, &[1], &mut lap);
        assert_eq!((lap.ditambah, lap.diganti, lap.gagal, lap.dilewati, lap.folder_baru, lap.server_baru), (1, 1, 1, 0, 1, 1));
        let a1 = s.accounts.iter().find(|a| a.user_id == 1).unwrap();
        assert_eq!((a1.id.as_str(), a1.alias.as_str()), ("lokal-1", "Baru"), "id lokal dipertahankan");
        let boosting = s.folder.iter().find(|f| f.nama == "Boosting").unwrap();
        assert_eq!(a1.folder_id.as_deref(), Some(boosting.id.as_str()));
        assert_eq!(boosting.warna, "biru");
        assert_eq!(s.accounts.iter().find(|a| a.user_id == 2).unwrap().alias, "Tetap", "cookie tak terverifikasi -> tidak diganti");
        let a3 = s.accounts.iter().find(|a| a.user_id == 3).unwrap();
        assert_eq!(a3.folder_id.as_deref(), Some("lokal-f"), "folder dicocokkan lewat nama");
        assert_ne!(a3.id, "lokal-3");
        assert_eq!(store::decrypt(&a3.cookie_enc).unwrap(), "c3");
        assert_eq!(s.folder.len(), 2);

        let mut lap = LaporanPulih::default();
        terapkan_pulih(&mut s, Vec::new(), Vec::new(), vec![(akun(3, "X", None), "c".into())], false, &[], &mut lap);
        assert_eq!((lap.dilewati, lap.ditambah), (1, 0));
    }

    #[test]
    fn btid_cadangan_selalu_unik_dan_bukan_nol() {
        let mut s = Store::default();
        s.accounts.push(Account { browser_tracker_id: 500_000, ..akun(1, "Ada", None) });
        let entri = vec![
            (Account { browser_tracker_id: 0, ..akun(2, "Nol", None) }, "c2".to_string()),
            (Account { browser_tracker_id: 500_000, ..akun(3, "Kembar", None) }, "c3".to_string()),
            (Account { browser_tracker_id: 777_777, ..akun(4, "Sendiri", None) }, "c4".to_string()),
            (Account { browser_tracker_id: 999, ..akun(1, "Ganti", None) }, "c1".to_string()),
        ];
        let mut lap = LaporanPulih::default();
        terapkan_pulih(&mut s, Vec::new(), Vec::new(), entri, true, &[1], &mut lap);
        let b = |uid: u64| s.accounts.iter().find(|a| a.user_id == uid).unwrap().browser_tracker_id;
        assert_ne!(b(2), 0, "btid 0 replaced");
        assert_ne!(b(3), 500_000, "a btid another account uses is replaced");
        assert_eq!(b(4), 777_777, "a unique one is kept");
        assert_eq!(b(1), 500_000, "a replaced account keeps its local btid");
        let semua: std::collections::HashSet<u64> = s.accounts.iter().map(|a| a.browser_tracker_id).collect();
        assert_eq!(semua.len(), s.accounts.len(), "every btid unique");
    }
}

#[tauri::command]
fn impor_selesai(state: State<'_, AppState>) {
    state.impor.lock().unwrap_or_else(|e| e.into_inner()).clear();
}

#[tauri::command]
fn daftar_folder(state: State<AppState>) -> Vec<store::Folder> {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).folder.clone()
}

#[tauri::command]
fn buat_folder(state: State<AppState>, nama: String, warna: String, ikon: String) -> Result<store::Folder, String> {
    let nama = store::nama_folder_sah(&nama)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.folder.iter().any(|f| f.nama.eq_ignore_ascii_case(&nama)) {
        return Err(format!("A folder named \"{nama}\" already exists."));
    }
    let f = store::Folder { id: uuid::Uuid::new_v4().to_string(), nama, warna, ikon, preset: None };
    s.folder.push(f.clone());
    s.save()?;
    Ok(f)
}

#[tauri::command]
fn ubah_folder(state: State<AppState>, folder: store::Folder) -> Result<usize, String> {
    let nama = store::nama_folder_sah(&folder.nama)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.folder.iter().any(|f| f.id != folder.id && f.nama.eq_ignore_ascii_case(&nama)) {
        return Err(format!("A folder named \"{nama}\" already exists."));
    }
    let f = s.folder.iter_mut().find(|f| f.id == folder.id).ok_or("Folder not found.")?;
    *f = store::Folder { nama, ..folder.clone() };
    let n = s.terapkan_preset_folder(&folder.id);
    s.save()?;
    Ok(n)
}

#[tauri::command]
fn hapus_folder(state: State<AppState>, id: String) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let n = s.hapus_folder(&id)?;
    s.save()?;
    Ok(n)
}

#[tauri::command]
fn urutkan_folder(state: State<AppState>, ids: Vec<String>) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.urutkan_folder(&ids);
    s.save()
}

#[tauri::command]
fn pindah_akun(state: State<AppState>, ids: Vec<String>, folder_id: Option<String>) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let n = s.pindah_akun(&ids, folder_id.as_deref())?;
    s.save()?;
    Ok(n)
}

#[tauri::command]
fn taruh_akun(state: State<AppState>, ids: Vec<String>, sasaran: String, setelah: bool) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let n = s.taruh_akun(&ids, &sasaran, setelah)?;
    s.save()?;
    Ok(n)
}

#[tauri::command]
fn terapkan_preset_folder(state: State<AppState>, id: String) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let n = s.terapkan_preset_folder(&id);
    s.save()?;
    Ok(n)
}

#[tauri::command]
async fn diagnosa(state: State<'_, AppState>) -> Result<String, String> {
    let teks = laporan_diagnosa(&state).await;
    let salin = teks.clone();
    tauri::async_runtime::spawn_blocking(move || papanklip::salin(&salin))
        .await
        .map_err(|e| e.to_string())??;
    Ok(teks)
}

#[tauri::command]
async fn ekspor_profil(app: tauri::AppHandle, state: State<'_, AppState>, ids: Vec<String>) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let (teks, nama) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let pilih: Vec<&store::Folder> = s.folder.iter().filter(|f| ids.contains(&f.id)).collect();
        if pilih.is_empty() {
            return Err("Folder not found.".into());
        }
        let nama = if pilih.len() == 1 { pilih[0].nama.clone() } else { "Folders".into() };
        (profil::ekspor(&pilih), nama)
    };
    let nama: String = nama.chars().map(|c| if "<>:\"/\\|?*".contains(c) || c.is_control() { '_' } else { c }).collect();
    let pilih = app
        .dialog()
        .file()
        .set_title(bahasa::pilih("Export folder profile", "Ekspor profil folder"))
        .set_file_name(format!("{nama}.{}", profil::EKSTENSI))
        .add_filter(bahasa::pilih("Chudai folder profile", "Profil folder Chudai"), &[profil::EKSTENSI]);
    let jalur = tauri::async_runtime::spawn_blocking(move || pilih.blocking_save_file()).await.map_err(|e| e.to_string())?;
    let Some(jalur) = jalur.and_then(|j| j.into_path().ok()) else {
        return Err("__BATAL__".into());
    };
    cadangan::tulis(&jalur, teks.as_bytes())?;
    Ok(jalur.display().to_string())
}

#[derive(Serialize)]
struct HasilImporProfil {
    baru: usize,
    diperbarui: usize,
    akun_berubah: usize,
    nama: Vec<String>,
}

#[derive(Serialize)]
struct TimpaProfil {
    nama: String,
    akun: usize,
    preset_lama: Option<store::PresetHemat>,
    preset_baru: Option<store::PresetHemat>,
    tampilan_berubah: bool,
}

#[derive(Serialize)]
struct PratinjauProfil {
    teks: String,
    timpa: Vec<TimpaProfil>,
}

#[tauri::command]
async fn impor_profil_pilih(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<PratinjauProfil, String> {
    use tauri_plugin_dialog::DialogExt;
    let pilih = app
        .dialog()
        .file()
        .set_title(bahasa::pilih("Import folder profile", "Impor profil folder"))
        .add_filter(bahasa::pilih("Chudai folder profile", "Profil folder Chudai"), &[profil::EKSTENSI]);
    let jalur = tauri::async_runtime::spawn_blocking(move || pilih.blocking_pick_file()).await.map_err(|e| e.to_string())?;
    let Some(jalur) = jalur.and_then(|j| j.into_path().ok()) else {
        return Err("__BATAL__".into());
    };
    let data = std::fs::read(&jalur).map_err(|e| format!("could not read the file: {e}"))?;
    let teks = String::from_utf8_lossy(&data).into_owned();
    let daftar = profil::urai(&teks)?;
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let timpa = profil::akan_ditimpa(&s.folder, &daftar)
        .into_iter()
        .map(|(f, p)| TimpaProfil {
            nama: f.nama.clone(),
            akun: s.accounts.iter().filter(|a| a.folder_id.as_deref() == Some(f.id.as_str())).count(),
            preset_lama: f.preset.clone(),
            preset_baru: p.preset.clone(),
            tampilan_berubah: profil::tampilan_berubah(f, p),
        })
        .collect();
    drop(s);
    Ok(PratinjauProfil { teks, timpa })
}

#[tauri::command]
fn impor_profil_terapkan(state: State<AppState>, teks: String) -> Result<HasilImporProfil, String> {
    impor_profil_teks(&state.store, &teks)
}

fn impor_profil_teks(store: &Mutex<Store>, teks: &str) -> Result<HasilImporProfil, String> {
    let daftar = profil::urai(teks)?;
    let nama = daftar.iter().map(|p| p.nama.clone()).collect();
    let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
    let (baru, ids) = profil::gabung(&mut s.folder, daftar, || uuid::Uuid::new_v4().to_string());
    let akun_berubah = ids.iter().map(|id| s.terapkan_preset_folder(id)).sum();
    s.save()?;
    Ok(HasilImporProfil { baru, diperbarui: ids.len(), akun_berubah, nama })
}

#[derive(Serialize)]
struct StatusDiscord {
    terpasang: bool,
    samaran: String,
    acara: discord::Acara,
    kehadiran: bool,
}

fn status_discord(s: &Store) -> StatusDiscord {
    StatusDiscord {
        terpasang: !s.discord_webhook.is_empty(),
        samaran: if s.discord_webhook.is_empty() { String::new() } else { discord::samaran(&s.discord_id) },
        acara: s.discord_acara.clone(),
        kehadiran: !s.discord_kehadiran_mati,
    }
}

fn pasang_discord(s: &Store) {
    let url = (!s.discord_webhook.is_empty()).then(|| store::decrypt(&s.discord_webhook).ok()).flatten();
    discord::pasang(url, s.discord_acara.clone());
}

#[tauri::command]
fn discord_status(state: State<AppState>) -> StatusDiscord {
    status_discord(&state.store.lock().unwrap_or_else(|e| e.into_inner()))
}

#[tauri::command]
fn set_discord_webhook(state: State<AppState>, url: String) -> Result<StatusDiscord, String> {
    let (bersih, id) = discord::urai_webhook(&url)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.discord_webhook = store::encrypt(&bersih)?;
    s.discord_id = id;
    s.save()?;
    pasang_discord(&s);
    Ok(status_discord(&s))
}

#[tauri::command]
fn hapus_discord_webhook(state: State<AppState>) -> Result<StatusDiscord, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.discord_webhook.clear();
    s.discord_id.clear();
    s.save()?;
    pasang_discord(&s);
    Ok(status_discord(&s))
}

#[tauri::command]
fn set_discord_acara(state: State<AppState>, acara: discord::Acara) -> Result<StatusDiscord, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.discord_acara = acara;
    s.save()?;
    pasang_discord(&s);
    Ok(status_discord(&s))
}

#[tauri::command]
fn set_discord_kehadiran(state: State<AppState>, aktif: bool) -> Result<StatusDiscord, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.discord_kehadiran_mati = !aktif;
    s.save()?;
    Ok(status_discord(&s))
}

fn judul_login(tanpa_gpu: bool) -> &'static str {
    if tanpa_gpu {
        bahasa::pilih("Log in to Roblox — Chudai Account Manager (software rendering)", "Masuk ke Roblox — Chudai Account Manager (rendering perangkat lunak)")
    } else {
        bahasa::pilih("Log in to Roblox — Chudai Account Manager", "Masuk ke Roblox — Chudai Account Manager")
    }
}

#[tauri::command]
fn atur_bahasa(app: tauri::AppHandle, kode: String) {
    if bahasa::atur(&kode) {
        baki::segarkan_paksa(&app);
        if let Some(w) = app.get_webview_window(LABEL_LOGIN) {
            let lunak = w.title().is_ok_and(|t| t.contains("(software rendering)") || t.contains("(rendering perangkat lunak)"));
            let _ = w.set_title(judul_login(lunak));
        }
    }
}

#[tauri::command]
fn kehadiran_halaman(nama: String) {
    kehadiran::set_halaman(&nama);
}

#[tauri::command]
async fn uji_discord(state: State<'_, AppState>) -> Result<(), String> {
    let url = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        if s.discord_webhook.is_empty() {
            return Err("Paste a webhook URL first.".into());
        }
        store::decrypt(&s.discord_webhook)?
    };
    discord::kirim(&url, bahasa::pilih("✅ Test message from Chudai Account Manager. Notifications will arrive here.", "✅ Pesan uji dari Chudai Account Manager. Notifikasi akan masuk ke sini.")).await
}

#[tauri::command]
fn kabari_batch(total: usize, masuk: usize, gagal: usize, dihentikan: bool) {
    discord::kabar(discord::Jenis::Batch, &teks_batch(total, masuk, gagal, dihentikan, bahasa::indonesia()));
}

fn teks_batch(total: usize, masuk: usize, gagal: usize, dihentikan: bool, indonesia: bool) -> String {
    let mut t = if indonesia {
        format!("Peluncuran selesai: {masuk} dari {total} akun diluncurkan")
    } else {
        format!("Launch finished: {masuk} of {total} account{} launched", if total == 1 { "" } else { "s" })
    };
    if gagal > 0 {
        t += &if indonesia { format!(", {gagal} gagal") } else { format!(", {gagal} failed") };
    }
    if dihentikan {
        t += bahasa::pilih_untuk(indonesia, " (cancelled)", " (dibatalkan)");
    }
    t + "."
}

#[tauri::command]
async fn simpan_diagnosa(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let teks = laporan_diagnosa(&state).await;
    let pilih = app.dialog().file().set_file_name("CAM-diagnostics.txt").add_filter("Text", &["txt"]);
    let jalur = tauri::async_runtime::spawn_blocking(move || pilih.blocking_save_file())
        .await
        .map_err(|e| e.to_string())?;
    let Some(jalur) = jalur.and_then(|j| j.into_path().ok()) else {
        return Err("__BATAL__".into());
    };
    std::fs::write(&jalur, teks.replace("\r\n", "\n").replace('\n', "\r\n")).map_err(|e| format!("could not save the report: {e}"))?;
    Ok(jalur.display().to_string())
}

async fn laporan_diagnosa(state: &State<'_, AppState>) -> String {
    let (multi, ket_multi) = {
        let g = state.singleton.lock().unwrap_or_else(|e| e.into_inner());
        (g.aktif(), g.keterangan.clone())
    };
    let ket_multi = if ket_multi.is_empty() { "-".to_string() } else { ket_multi };
    let (aktif, n, total) = state.proteksi.status();
    diagnosa_inti(&state.store, Some(&state.pelacak), multi).await.replacen(
        "\nRoblox client:",
        &format!("\nMulti-instance lock: {ket_multi}\nSign-in protection active: {} ({n}/{total} files)\nRoblox client:", if aktif { "yes" } else { "no" }),
        1,
    )
}

async fn diagnosa_lanjut(store: &Mutex<Store>, pelacak: Option<&pantau::Pelacak>) -> String {
    use std::fmt::Write as _;
    let _ = sumber::ukur();
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    let lap = sumber::ukur();
    let icacls = tauri::async_runtime::spawn_blocking(|| {
        use std::os::windows::process::CommandExt;
        let mut jalur: Vec<std::path::PathBuf> = Vec::new();
        if let Ok(e) = std::env::current_exe() {
            if let Some(d) = e.parent() {
                jalur.push(d.to_path_buf());
            }
            jalur.push(e);
        }
        if let Some(d) = dirs::data_local_dir().map(|d| d.join("Chudai Account Manager")) {
            if !jalur.iter().any(|j| j == &d) {
                jalur.push(d);
            }
        }
        jalur
            .into_iter()
            .filter(|j| j.exists())
            .map(|j| {
                let out = std::process::Command::new("icacls")
                    .arg(&j)
                    .creation_flags(0x0800_0000)
                    .output()
                    .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                    .unwrap_or_default();
                format!("{}: {}", j.display(), diagnosa::label_integritas(&out))
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await
    .unwrap_or_default();

    let (klien, semua_roblox, snap, terpasang, proto, sisa_studio) = tauri::async_runtime::spawn_blocking(|| {
        let mut sisa = 0usize;
        let mut studio = 0usize;
        if let Some(dir) = klien::folder_versi() {
            for e in std::fs::read_dir(&dir).into_iter().flatten().flatten() {
                if e.file_name().to_string_lossy().starts_with("_cam-hapus-") {
                    sisa += 1;
                }
                if e.path().join("RobloxStudioBeta.exe").exists() {
                    studio += 1;
                }
            }
        }
        (launcher::klien_terperinci(), launcher::pid_roblox_mentah().len(), sumber::snapshot(), klien::terpasang(), klien::exe_protokol(), (sisa, studio))
    })
    .await
    .unwrap_or_default();
    let pantau_status = pelacak.map(|p| p.status_monitor()).unwrap_or_default();
    let btid: Vec<u64> = klien.iter().map(|k| k.btid).collect();
    let catatan = performa::catatan_hidup(&btid);
    let kini = pantau::kini();
    let s = store.lock().unwrap_or_else(|e| e.into_inner());
    let nama: Vec<String> = s.accounts.iter().flat_map(|a| [a.username.clone(), a.display_name.clone(), a.alias.clone()]).collect();
    let mut t = String::new();

    let ya = |b: bool| if b { "on" } else { "off" };
    let n_akun = |f: &dyn Fn(&store::Account) -> bool| s.accounts.iter().filter(|a| f(a)).count();
    let _ = writeln!(t, "\n==== CAM settings ====");
    let _ = writeln!(
        t,
        "Light graphics: {} | Trim background clients: {} | RAM budget: {} | Emergency hotkey: {} | Close to tray: {} | Auto refresh: {} | Windows Hello for cookie copy: {}",
        ya(s.grafis_ringan), ya(s.trim_latar),
        if s.anggaran_ram_mb > 0 { format!("{} MB", s.anggaran_ram_mb) } else { "off".into() },
        ya(s.hotkey_darurat), ya(s.tutup_ke_tray), ya(s.auto_refresh), ya(s.hello_salin)
    );
    let _ = writeln!(
        t,
        "Default launch arguments: {} | Discord: {} (events: disconnect {}, crash {}, sign-in {}, rejoin {}, batch {}) | Shutdown timer: {}",
        if s.argumen_luncur.trim().is_empty() { "none".to_string() } else { format!("set ({} chars)", s.argumen_luncur.trim().len()) },
        if s.discord_webhook.is_empty() { "not set" } else { "set" },
        ya(s.discord_acara.putus), ya(s.discord_acara.crash), ya(s.discord_acara.login), ya(s.discord_acara.rejoin), ya(s.discord_acara.batch),
        if s.matikan_pada.is_some() { "scheduled" } else { "off" }
    );
    let _ = writeln!(
        t,
        "Per account: resource saver {}, auto-rejoin {}, anti-AFK {}, main {}, full quality {}, start tiny {}, own FPS limit {}, own launch arguments {}",
        n_akun(&|a| a.hemat), n_akun(&|a| a.auto_rejoin), n_akun(&|a| a.anti_afk), n_akun(&|a| a.utama), n_akun(&|a| a.kualitas_penuh),
        n_akun(&|a| a.mulai_kecil > 0), n_akun(&|a| a.fps_cap > 0), n_akun(&|a| a.argumen_luncur.is_some())
    );
    let _ = writeln!(t, "Managed Fast Flags ({}): {}", s.fflags.len(), s.fflags.keys().take(30).cloned().collect::<Vec<_>>().join(", "));

    let _ = writeln!(t, "\n==== Account status (no names) ====");
    let _ = writeln!(t, "{}", diagnosa::ringkas_akun(&s.accounts, &diagnosa::iso_utc(kini)));
    let mut galat: std::collections::BTreeMap<String, usize> = Default::default();
    for a in s.accounts.iter().filter(|a| !a.last_error.is_empty()) {
        *galat.entry(diagnosa::samarkan_angka_panjang(&diagnosa::samarkan_nama(&a.last_error, &nama))).or_default() += 1;
    }
    for (g, n) in &galat {
        let _ = writeln!(t, "  cookie error x{n}: {g}");
    }

    let _ = writeln!(t, "\n==== Roblox versions ====");
    let folder_dari = |p: &std::path::Path| p.parent().and_then(|d| d.file_name()).map_or("(unknown)".to_string(), |n| n.to_string_lossy().to_string());
    let _ = writeln!(t, "Protocol (roblox-player:) opens: {}", proto.as_deref().map_or("(unreadable)".to_string(), folder_dari));
    for k in terpasang {
        let _ = writeln!(t, "  {} {} | {} MB{}", k.folder, k.versi, k.ukuran_mb, if k.protokol { " | current" } else { "" });
    }
    let hilang = s.klien_kustom.iter().filter(|p| !std::path::Path::new(p).exists()).count();
    let _ = writeln!(t, "Added/downloaded folders: {} (missing {})", s.klien_kustom.len(), hilang);
    let _ = writeln!(
        t,
        "Pinned for launching: {}",
        if s.klien_path.is_empty() { "automatic".to_string() } else if std::path::Path::new(&s.klien_path).exists() { "set, exists".into() } else { "set, MISSING (launch will fail)".into() }
    );
    let _ = writeln!(t, "Leftover CAM delete folders (_cam-hapus-*): {} | Roblox Studio folders: {}", sisa_studio.0, sisa_studio.1);

    let _ = writeln!(t, "\n==== Roblox processes ====");
    let _ = writeln!(
        t,
        "Game clients: {} | other RobloxPlayerBeta processes (tray / starting): {} | PC CPU: {}",
        klien.len(),
        semua_roblox.saturating_sub(klien.len()),
        lap.cpu_sistem.map_or("n/a".to_string(), |c| format!("{c:.1}%"))
    );
    for (i, k) in klien.iter().enumerate() {
        let akun = (k.btid != 0).then(|| s.accounts.iter().find(|a| a.browser_tracker_id == k.btid)).flatten();
        let versi = std::path::Path::new(&k.exe).parent().and_then(|d| d.file_name()).map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "(path unreadable)".into());
        let satu_klien = |id: &str| klien.iter().filter(|x| (x.btid != 0).then(|| s.accounts.iter().find(|a| a.browser_tracker_id == x.btid)).flatten().is_some_and(|a| a.id == id)).count() == 1;
        let status = akun
            .and_then(|a| pantau_status.iter().find(|p| p.akun_id == a.id && (p.pid == Some(k.pid) || (p.pid.is_none() && satu_klien(&a.id)))))
            .map(|p| format!("{} (rejoins {}){}", p.status, p.rejoin, if p.alasan.is_empty() { String::new() } else { format!(", last reason: {}", diagnosa::teks_aman(&p.alasan, &nama)) }))
            .unwrap_or_else(|| "not tracked".into());
        let batas = match (akun, snap.iter().find(|p| p.pid == k.pid)) {
            (Some(a), Some(p)) => {
                let kini_p = performa::ProsesKini { pid: p.pid, mulai: p.mulai, ws_mb: p.working_set as f64 / 1_048_576.0, prioritas: p.prioritas };
                let st = performa::status_klien(a, s.grafis_ringan, catatan.get(&k.btid), kini_p);
                format!("RAM limit {:?}, low priority {:?}, FPS {:?}", st.ws, st.prioritas, st.fps)
            }
            _ => "unknown (no matching account)".into(),
        };
        let mulai_k = snap.iter().find(|p| p.pid == k.pid).map(|p| sumber::filetime_ke_unix(p.mulai));
        let angka = lap.klien.iter().find(|x| x.pid == k.pid && Some(x.mulai_unix) == mulai_k).map_or("(no sample)".to_string(), |x| {
            format!(
                "CPU {:.1}% | WS {:.0} MB, private {:.0}, commit {:.0}, not in RAM {:.0}, physical est. {:.0} | GPU {} | VRAM {}",
                x.cpu, x.ram_mb, x.ram_privat_mb, x.privat_mb, x.di_luar_ram_mb, x.fisik_perkiraan_mb,
                x.gpu.map_or("n/a (no GPU counters)".to_string(), |g| format!("{g:.1}%")),
                x.vram_mb.map_or("n/a".to_string(), |v| format!("{v:.0} MB"))
            )
        });
        let _ = writeln!(
            t,
            "Client {}: {} | account matched: {} | {} | {}\n  {}",
            i + 1, versi, if akun.is_some() { "yes" } else { "no" }, status, batas, angka
        );
    }

    let _ = writeln!(t, "\n==== Memory ====");
    let m = sumber::memori_sistem(&snap);
    let mb = |v: Option<f64>| v.map_or("n/a".to_string(), |x| format!("{x:.0} MB"));
    let _ = writeln!(
        t,
        "PC RAM: {} total, {} available, load {}% | commit {} of {} | compressed (all programs) {} | Roblox physical est. (all clients) {:.0} MB",
        mb(m.total_mb), mb(m.tersedia_mb), m.beban_persen.map_or("n/a".into(), |b| b.to_string()), mb(m.commit_terpakai_mb), mb(m.commit_batas_mb), mb(m.kompresi_mb), lap.fisik_semua_perkiraan_mb.max(0.0)
    );
    let jml = |j: Option<u32>| j.map_or("?".to_string(), |x| x.to_string());
    let kap = anggaran::kapasitas(s.anggaran_ram_mb, ram_dipakai_mb(&s, &klien, &snap, None), klien.len(), m.tersedia_mb);
    let _ = writeln!(
        t,
        "RAM capacity: Roblox uses about {:.0} MB | budget {} | room for about {} Normal ({:.0} MB each), {} Balanced AFK ({:.0} MB), {} Deep AFK ({:.0} MB)",
        kap.dipakai_mb.max(0.0),
        kap.anggaran_mb.map_or("off".to_string(), |b| format!("{b} MB")),
        jml(kap.normal.jumlah), kap.normal.per_klien_mb, jml(kap.balanced_afk.jumlah), kap.balanced_afk.per_klien_mb, jml(kap.deep_afk.jumlah), kap.deep_afk.per_klien_mb
    );

    let _ = writeln!(t, "\n==== Recent disconnects and crashes (History, newest 15) ====");
    let mut masalah: Vec<&store::CatatanMasalah> = s.masalah.iter().collect();
    masalah.sort_by_key(|x| std::cmp::Reverse(x.at));
    if masalah.is_empty() {
        let _ = writeln!(t, "(none)");
    }
    for x in masalah.into_iter().take(15) {
        let _ = writeln!(
            t,
            "{} ({}) [{}] after {} | {}",
            diagnosa::iso_utc(x.at), diagnosa::lalu(kini - x.at), x.jenis, diagnosa::lalu(x.umur_dtk).trim_end_matches(" ago"),
            diagnosa::teks_aman(&x.teks, &nama)
        );
    }

    let _ = writeln!(t, "\n==== CAM folders (integrity) ====");
    let _ = write!(t, "{icacls}");
    t
}

async fn diagnosa_inti(store: &Mutex<Store>, pelacak: Option<&pantau::Pelacak>, multi: bool) -> String {
    let cam = {
        let s = store.lock().unwrap_or_else(|e| e.into_inner());
        let hemat = s.accounts.iter().filter(|a| a.hemat).count();
        let galat = s.accounts.iter().filter(|a| !a.last_error.is_empty()).count();
        let dibatasi = s.accounts.iter().filter(|a| a.pembatasan.is_some()).count();
        format!(
            "Accounts: {} (resource saver on: {hemat}, cookie rejected: {galat}, restricted by Roblox: {dibatasi}, folders: {})\n\
             Multi-instance: {}\n\
             Sign-in protection: {}\n\
             Roblox client: {}\n\
             Version redirect remembered: {}\n\
             Last sign-in unfinished: {}\n\
             Roblox clients running: {}",
            s.accounts.len(),
            s.folder.len(),
            if multi { "on" } else { "off" },
            if s.proteksi_sesi_mati { "off" } else { "on" },
            if s.klien_path.is_empty() {
                "automatic".to_string()
            } else {
                std::path::Path::new(&s.klien_path).parent().and_then(|d| d.file_name()).map_or("(pinned)".to_string(), |n| format!("pinned: {}", n.to_string_lossy()))
            },
            if s.versi_alih.is_some() { "yes" } else { "no" },
            if login::terputus_sebelumnya() { "yes" } else { "no" },
            launcher::pid_klien().len(),
        )
    };
    let windows = tauri::async_runtime::spawn_blocking(|| {
        use base64::Engine;
        use std::os::windows::process::CommandExt;
        let skrip = include_str!("diagnostik.ps1");
        let utf16: Vec<u8> = skrip.encode_utf16().flat_map(|c| c.to_le_bytes()).collect();
        let b64 = base64::engine::general_purpose::STANDARD.encode(utf16);
        use std::io::Read;
        let anak = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", &b64])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .creation_flags(0x0800_0000)
            .spawn();
        let mut anak = match anak {
            Ok(a) => a,
            Err(e) => return format!("(Windows part unavailable: {e})"),
        };
        let mut keluar = anak.stdout.take();
        let pembaca = std::thread::spawn(move || {
            let mut b = Vec::new();
            if let Some(k) = keluar.as_mut() {
                let _ = k.read_to_end(&mut b);
            }
            b
        });
        let mulai = std::time::Instant::now();
        let mut habis = false;
        loop {
            match anak.try_wait() {
                Ok(Some(_)) | Err(_) => break,
                Ok(None) if mulai.elapsed() > std::time::Duration::from_secs(60) => {
                    let _ = anak.kill();
                    let _ = anak.wait();
                    habis = true;
                    break;
                }
                Ok(None) => std::thread::sleep(std::time::Duration::from_millis(100)),
            }
        }
        let b = pembaca.join().unwrap_or_default();
        let mut s = String::from_utf8_lossy(&b).to_string();
        if habis {
            s.push_str("
(Windows part stopped after 60 seconds; the rest is missing.)");
        }
        s
    })
    .await
    .unwrap_or_default();
    let nama: Vec<String> = {
        let s = store.lock().unwrap_or_else(|e| e.into_inner());
        s.accounts.iter().flat_map(|a| [a.username.clone(), a.display_name.clone(), a.alias.clone()]).filter(|n| !n.trim().is_empty()).collect()
    };
    let log_roblox = tauri::async_runtime::spawn_blocking(move || match pantau::dir_log() {
        Some(d) => saring::ekor_log_roblox(&d, &nama, 3, 60),
        None => "(no Roblox log folder)".into(),
    })
    .await
    .unwrap_or_default();
    let detik = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let lanjut = diagnosa_lanjut(store, pelacak).await;
    let teks = format!(
        "Chudai Account Manager diagnostics\nCAM version: {}\nCreated (unix time): {detik}\n\n==== CAM ====\n{cam}\n{}\n{}\n\n==== Roblox client logs (newest 3, filtered: tickets, cookies, server codes, IPs, job IDs, user IDs and account names removed) ====\n{}",
        env!("CARGO_PKG_VERSION"),
        lanjut.trim_end(),
        windows.trim_end(),
        log_roblox.trim_end()
    );
    let user = std::env::var("USERNAME").unwrap_or_default();
    let teks = if user.len() >= 2 { teks.replace(&user, "<user>") } else { teks };
    let nama_semua: Vec<String> = {
        let s = store.lock().unwrap_or_else(|e| e.into_inner());
        s.accounts.iter().flat_map(|a| [a.username.clone(), a.display_name.clone(), a.alias.clone()]).filter(|n| n.trim().chars().count() >= 3).collect()
    };
    let teks = diagnosa::samarkan_nama(&teks, &nama_semua);
    let mesin = std::env::var("COMPUTERNAME").unwrap_or_default();
    let teks = if mesin.len() >= 2 { teks.replace(&mesin, "<pc>") } else { teks };
    store::samarkan_cookie(&teks)
}

#[tauri::command]
fn login_terputus() -> bool {
    login::terputus_sebelumnya()
}

#[tauri::command]
fn tutup_login_browser(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window(LABEL_LOGIN) {
        let _ = w.destroy();
    }
}

#[tauri::command]
async fn salin_cookie(window: tauri::WebviewWindow, state: State<'_, AppState>, id: String) -> Result<u64, String> {
    let (alias, hello) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.alias.clone(), s.hello_salin)
    };
    if hello {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
        let pesan = bahasa::pilih(&format!("Copy the sign-in cookie of {alias}"), &format!("Salin cookie sign-in {alias}")).to_string();
        tauri::async_runtime::spawn_blocking(move || hello::verifikasi(hwnd, &pesan))
            .await
            .map_err(|e| e.to_string())??;
    }
    let cookie = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };
    papanklip::salin_rahasia(&cookie, DETIK_HAPUS_COOKIE)?;
    Ok(DETIK_HAPUS_COOKIE)
}

const DETIK_HAPUS_COOKIE: u64 = 30;

#[tauri::command]
async fn hello_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let aktif = state.store.lock().unwrap_or_else(|e| e.into_inner()).hello_salin;
    let cek = tauri::async_runtime::spawn_blocking(hello::tersedia).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "aktif": aktif, "tersedia": cek.is_ok(), "alasan": cek.err() }))
}

#[tauri::command]
async fn set_hello_salin(window: tauri::WebviewWindow, state: State<'_, AppState>, aktif: bool) -> Result<bool, String> {
    let sekarang = state.store.lock().unwrap_or_else(|e| e.into_inner()).hello_salin;
    if sekarang == aktif {
        return Ok(aktif);
    }
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
    let pesan = if aktif {
        bahasa::pilih("Require Windows Hello before copying cookies", "Minta Windows Hello sebelum menyalin cookie")
    } else {
        bahasa::pilih("Stop requiring Windows Hello before copying cookies", "Berhenti meminta Windows Hello sebelum menyalin cookie")
    };
    tauri::async_runtime::spawn_blocking(move || hello::verifikasi(hwnd, pesan))
        .await
        .map_err(|e| e.to_string())??;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.hello_salin = aktif;
    s.save()?;
    Ok(aktif)
}

#[derive(Serialize)]
struct HasilHapus {
    dihapus: Vec<String>,
    gagal_keluar: Vec<String>,
}

fn hapus_lokal(state: &AppState, ids: &[String]) -> Result<Vec<String>, String> {
    let (hapus, uid_sisa) = {
        let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let hapus = s.hapus_akun_lalu(ids, |st| st.save())?;
        let uid_sisa: std::collections::HashSet<u64> = s.accounts.iter().map(|a| a.user_id).collect();
        (hapus, uid_sisa)
    };
    for a in &hapus {
        state.pelacak.lupakan(&a.id);
        if !uid_sisa.contains(&a.user_id) {
            avatar3d::hapus_cache(a.user_id);
        }
        roblox::lupakan_token(&store::decrypt(&a.cookie_enc).unwrap_or_default());
    }
    if !hapus.is_empty() {
        tulis_pelacak(&state.pelacak);
    }
    Ok(hapus.into_iter().map(|a| a.alias).collect())
}

fn btid_untuk_ditutup(akun: &[Account], ids: &[String]) -> std::collections::HashSet<u64> {
    let milik_lain: std::collections::HashSet<u64> = akun.iter().filter(|a| !ids.contains(&a.id)).map(|a| a.browser_tracker_id).collect();
    akun.iter()
        .filter(|a| ids.contains(&a.id))
        .map(|a| a.browser_tracker_id)
        .filter(|b| *b != 0 && !milik_lain.contains(b))
        .collect()
}

fn tutup_klien_btid_berulang(btid: &std::collections::HashSet<u64>, kali: u32) -> usize {
    let mut n = 0;
    for i in 0..kali {
        for k in launcher::klien_terperinci().into_iter().filter(|k| k.btid != 0 && btid.contains(&k.btid)) {
            tutup_klien(k.pid);
            n += 1;
        }
        if i + 1 < kali {
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    }
    n
}

fn tulis_pelacak(p: &pantau::Pelacak) {
    if let Ok(enc) = store::encrypt(&p.ekspor()) {
        let berkas = store::berkas_data(BERKAS_PELACAK);
        let tmp = berkas.with_extension("json.tmp");
        if let Err(e) = std::fs::write(&tmp, enc).and_then(|_| std::fs::rename(&tmp, &berkas)) {
            store::catat_kejadian(&format!("Could not write the client tracker file after deleting accounts: {e}"));
        }
    }
}

#[tauri::command]
async fn hapus_akun_banyak(state: State<'_, AppState>, ids: Vec<String>, keluar_roblox: bool) -> Result<HasilHapus, String> {
    state.pelacak.tahan(&ids);
    let hasil = hapus_akun_inti(&state, &ids, keluar_roblox).await;
    state.pelacak.lepas_tahan(&ids);
    hasil
}

async fn hapus_akun_inti(state: &AppState, ids: &[String], keluar_roblox: bool) -> Result<HasilHapus, String> {
    let (btid, daftar): (std::collections::HashSet<u64>, Vec<(String, String)>) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        (
            btid_untuk_ditutup(&s.accounts, ids),
            s.accounts.iter().filter(|a| ids.contains(&a.id)).map(|a| (a.alias.clone(), store::decrypt(&a.cookie_enc).unwrap_or_default())).collect(),
        )
    };
    let mut pid = state.pelacak.pid_akun(ids);
    for id in ids {
        state.pelacak.lupakan(id);
    }
    pid.extend(launcher::klien_terperinci().into_iter().filter(|k| btid.contains(&k.btid)).map(|k| k.pid));
    pid.sort_unstable();
    pid.dedup();
    if !pid.is_empty() {
        tauri::async_runtime::spawn_blocking(move || {
            for p in pid.into_iter().filter(|p| launcher::pid_klien().contains(p)) {
                tutup_klien(p);
            }
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    let mut gagal_keluar = Vec::new();
    if keluar_roblox {
        for kelompok in daftar.chunks(4) {
            let mut set = tokio::task::JoinSet::new();
            for (alias, cookie) in kelompok.iter().filter(|(_, c)| !c.is_empty()).cloned() {
                set.spawn(async move { (alias, roblox::keluar(&cookie).await) });
            }
            while let Some(r) = set.join_next().await {
                if let Ok((alias, Err(e))) = r {
                    gagal_keluar.push(format!("{alias} ({e})"));
                }
            }
        }
        gagal_keluar.sort();
    }
    let dihapus = hapus_lokal(state, ids)?;
    let ditutup = match tauri::async_runtime::spawn_blocking(move || tutup_klien_btid_berulang(&btid, 4)).await {
        Ok(n) => n,
        Err(e) => {
            store::catat_kejadian(&format!("Closing the clients of deleted accounts failed: {e}"));
            0
        }
    };
    if ditutup > 0 {
        for id in ids {
            state.pelacak.lupakan(id);
        }
        tulis_pelacak(&state.pelacak);
    }
    Ok(HasilHapus { dihapus, gagal_keluar })
}

#[tauri::command]
fn ubah_alias(state: State<AppState>, id: String, alias: String) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.alias = alias.trim().to_string();
    s.save()
}

#[tauri::command]
fn set_akun_utama(state: State<AppState>, id: String, aktif: bool) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.find_mut(&id).ok_or("Account not found.")?.utama = aktif;
    s.save()
}

#[tauri::command]
fn set_kualitas_penuh(state: State<AppState>, id: String, aktif: bool) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.find_mut(&id).ok_or("Account not found.")?.kualitas_penuh = aktif;
    s.save()
}

#[tauri::command]
fn grafis_ringan(state: State<AppState>) -> bool {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).grafis_ringan
}

#[tauri::command]
fn set_grafis_ringan(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.grafis_ringan = aktif;
    s.save()?;
    Ok(aktif)
}

#[tauri::command]
fn trim_latar(state: State<AppState>) -> kendali::StatusTrim {
    let aktif = state.store.lock().unwrap_or_else(|e| e.into_inner()).trim_latar;
    kendali::StatusTrim { aktif, ..kendali::status() }
}

#[tauri::command]
fn set_trim_latar(state: State<AppState>, aktif: bool) -> Result<kendali::StatusTrim, String> {
    {
        let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        s.trim_latar = aktif;
        s.save()?;
    }
    kendali::atur_aktif(aktif);
    Ok(kendali::StatusTrim { aktif, ..kendali::status() })
}

fn calon_trim(store: &Mutex<Store>) -> (bool, Vec<kendali::Calon>) {
    let akun: Vec<(u64, bool, Option<u32>)> = {
        let s = store.lock().unwrap_or_else(|e| e.into_inner());
        if !s.trim_latar {
            return (false, Vec::new());
        }
        s.accounts.iter().map(|a| (a.browser_tracker_id, a.dikecualikan_afk(), performa::kebijakan_akun(a, s.grafis_ringan).ws_mb.nilai)).collect()
    };
    let klien: Vec<(u32, u64, bool, Option<u32>)> = launcher::klien_terperinci_segar(std::time::Duration::from_secs(5))
        .into_iter()
        .filter(|k| k.btid != 0)
        .filter_map(|k| {
            let cocok: Vec<_> = akun.iter().filter(|a| a.0 == k.btid).collect();
            let pertama = cocok.first()?;
            let dikecualikan = cocok.iter().any(|a| a.1) || cocok.iter().any(|a| a.2 != pertama.2);
            Some((k.pid, k.btid, dikecualikan, pertama.2))
        })
        .collect();
    if klien.is_empty() {
        return (true, Vec::new());
    }
    let snap = sumber::snapshot();
    let macet = jendela::pid_macet();
    let depan = jendela::pid_depan();
    let calon = klien
        .iter()
        .filter_map(|&(pid, btid, dikecualikan, batas)| {
            let p = snap.iter().find(|p| p.pid == pid)?;
            let ws_mb = p.working_set as f64 / 1_048_576.0;
            Some(kendali::Calon {
                pid,
                mulai: p.mulai,
                btid,
                ws_mb,
                dikecualikan,
                berbatas: batas.is_some_and(|b| ws_mb <= f64::from(b) * 1.1 + 32.0),
                depan: pid == depan,
                macet: macet.contains(&pid),
            })
        })
        .collect();
    (true, calon)
}

fn putaran_trim(store: &Mutex<Store>, jadwal: &mut kendali::Penjadwal) -> Option<(u32, u64, Result<(), String>)> {
    let (aktif, calon) = calon_trim(store);
    kendali::atur_aktif(aktif);
    if calon.is_empty() {
        jadwal.kosongkan();
        return None;
    }
    let kini = pantau::kini();
    let (pid, mulai, btid) = jadwal.pilih(&calon, kini)?;
    let hasil = kendali::trim_klien(pid, mulai, btid);
    jadwal.tercatat(pid, mulai, kini);
    kendali::catat_hasil(hasil.clone(), kini);
    Some((pid, mulai, hasil))
}

pub(crate) fn cam_lain_berjalan() -> bool {
    let aku = std::process::id();
    sumber::snapshot().into_iter().any(|p| p.pid != aku && p.nama.to_ascii_lowercase().contains("chudai"))
}

pub(crate) fn cookie_tersimpan(btid: u64) -> Result<String, String> {
    let s = Store::load();
    let a = s.accounts.iter().find(|x| x.browser_tracker_id == btid).ok_or("akun hilang")?;
    store::decrypt(&a.cookie_enc)
}

pub(crate) fn pasang_rotasi_probe() {
    roblox::pasang_penerima_rotasi(|l, b| {
        let n = simpan_rotasi(&Mutex::new(Store::load()), l, b);
        println!("  (Roblox merotasi cookie; disimpan untuk {n} akun)");
    });
}

fn probe_trim(alias: [&str; 3], place_id: u64, menit: u64) {
    use std::time::Duration;
    const LABEL: [&str; 3] = ["A latar tanpa batas", "B depan tanpa batas", "C latar batas 512 MB"];
    if !launcher::pid_klien().is_empty() {
        println!("GAGAL: tutup dulu semua klien Roblox.");
        return;
    }
    if cam_lain_berjalan() {
        println!("GAGAL: tutup dulu CAM (termasuk exe di rilis\\).");
        return;
    }
    pasang_rotasi_probe();
    let mut s = Store::load();
    s.trim_latar = true;
    let mut btid = [0u64; 3];
    for (k, a) in alias.iter().enumerate() {
        let Some(x) = s.accounts.iter_mut().find(|x| x.alias.eq_ignore_ascii_case(a)) else {
            println!("GAGAL: akun {} tidak ditemukan.", LABEL[k]);
            return;
        };
        x.utama = false;
        x.kualitas_penuh = false;
        x.hemat = k == 2;
        x.hemat_ram_mb = if k == 2 { 512 } else { 0 };
        btid[k] = x.browser_tracker_id;
    }
    if btid[0] == btid[1] || btid[0] == btid[2] || btid[1] == btid[2] {
        println!("GAGAL: tiga akun harus berbeda.");
        return;
    }
    let tiket = |k: usize| cookie_tersimpan(btid[k]).and_then(|c| tauri::async_runtime::block_on(roblox::auth_ticket(&c)));
    for k in 0..3 {
        if let Err(e) = tiket(k) {
            println!("GAGAL: cookie {} ditolak sebelum peluncuran: {e}", LABEL[k]);
            return;
        }
    }
    let Some(exe) = launcher::exe_klien(&s.klien_path) else {
        println!("GAGAL: RobloxPlayerBeta.exe tidak ditemukan.");
        return;
    };
    let toko = Mutex::new(s);
    let mut multi = SingletonGuard::new();
    if let Err(e) = multi.nyalakan() {
        println!("GAGAL multi-instance: {e}");
        return;
    }
    let tutup_semua = || {
        for k in launcher::klien_terperinci() {
            if btid.contains(&k.btid) {
                tutup_klien(k.pid);
            }
        }
    };
    let gagal = |pesan: String| {
        println!("GAGAL: {pesan}");
        tutup_semua();
        std::thread::sleep(Duration::from_secs(3));
        println!("klien uji ditutup; sisa klien Roblox: {}", launcher::pid_klien().len());
    };
    let identitas = |k: usize| -> Option<(u32, u64)> {
        let pid = launcher::klien_terperinci().into_iter().find(|x| x.btid == btid[k])?.pid;
        let mulai = sumber::snapshot().into_iter().find(|p| p.pid == pid)?.mulai;
        Some((pid, mulai))
    };
    let tujuan = Tujuan::Publik { place_id };
    let mut id = [(0u32, 0u64); 3];
    for k in 0..3 {
        let ticket = match tiket(k) {
            Ok(t) => t,
            Err(e) => return gagal(format!("tiket {}: {e}", LABEL[k])),
        };
        let sejak = pantau::kini();
        let mut pid_dibuat = None;
        let r = if k == 2 {
            launcher::luncurkan_terbatas(&ticket, &tujuan, btid[k], &exe, launcher::OpsiProses { batas_ws_mb: Some(512), prioritas_rendah: true, ..Default::default() }).map(|d| {
                println!("  {}: batas WS terpasang saat dibuat = {}{}", LABEL[k], d.ws_terpasang, d.peringatan.map(|w| format!(" ({w})")).unwrap_or_default());
                pid_dibuat = d.ws_terpasang.then_some(d.pid);
            })
        } else {
            launcher::luncurkan(&ticket, &tujuan, btid[k], Some(&exe), &[])
        };
        if let Err(e) = r {
            return gagal(format!("luncur {}: {e}", LABEL[k]));
        }
        let mut join = false;
        for _ in 0..120 {
            std::thread::sleep(Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(sejak) > 0 {
                join = true;
                break;
            }
        }
        std::thread::sleep(Duration::from_secs(5));
        let Some(i) = identitas(k) else {
            return gagal(format!("klien {} tidak ditemukan.", LABEL[k]));
        };
        id[k] = i;
        println!("{}: join={join} pid={}", LABEL[k], i.0);
        if !join {
            return gagal(format!("{} tidak masuk game dalam 2 menit.", LABEL[k]));
        }
        if k == 2 && pid_dibuat != Some(i.0) {
            return gagal(format!("game C berjalan di PID {} tetapi batas 512 MB dipasang pada {pid_dibuat:?} (Roblox memulai ulang dirinya atau batas gagal).", i.0));
        }
        if k == 2 {
            match kendali::batas_ws_keras_mb(i.0, i.1) {
                Ok(Some(512)) => println!("  {}: batas keras terbaca dari proses = 512 MB", LABEL[k]),
                lain => return gagal(format!("batas keras C tidak terbaca sebagai 512 MB: {lain:?}")),
            }
        }
    }
    let hwnd_b = jendela::daftar().into_iter().find(|j| j.pid == id[1].0).map(|j| j.hwnd);
    let fokus = hwnd_b.is_some_and(|h| afk::ke_depan(h as _));
    if !fokus || jendela::pid_depan() != id[1].0 {
        return gagal("jendela B tidak bisa dibawa ke depan, jadi pengecualian klien depan tidak bisa diuji.".into());
    }
    println!("B di depan: terverifikasi (jendela depan milik PID {}).", id[1].0);

    let ws = |p: u32| sumber::snapshot().into_iter().find(|x| x.pid == p).map_or(0.0, |x| x.working_set as f64 / 1_048_576.0);
    let mut jadwal = kendali::Penjadwal::default();
    let putaran = menit * 6;
    let fase2 = putaran * 6 / 10;
    let mut trim = [[0u32; 2]; 3];
    let mut galat: Vec<String> = Vec::new();
    println!("\n{putaran} putaran tiap 10 dtk; mulai putaran {fase2} akun A ditandai Main (di memori).\n");
    println!("{:>3} {:>5} | {:>24} | {:>24} | {:>24} | aksi", "#", "fase", LABEL[0], LABEL[1], LABEL[2]);
    for n in 0..putaran {
        std::thread::sleep(Duration::from_secs(10));
        let f = usize::from(n >= fase2);
        if n == fase2 {
            if let Some(a) = toko.lock().unwrap_or_else(|e| e.into_inner()).accounts.iter_mut().find(|x| x.browser_tracker_id == btid[0]) {
                a.utama = true;
            }
        }
        for k in 0..3 {
            if identitas(k) != Some(id[k]) {
                return gagal(format!("klien {} berganti proses atau hilang di putaran {n}.", LABEL[k]));
            }
        }
        if jendela::pid_depan() != id[1].0 {
            return gagal(format!("B bukan lagi jendela depan di putaran {n} (mouse/keyboard dipakai?)."));
        }
        if kendali::batas_ws_keras_mb(id[2].0, id[2].1) != Ok(Some(512)) {
            return gagal(format!("batas keras 512 MB C tidak lagi berlaku di putaran {n}."));
        }
        let kini = pantau::kini();
        let (_, calon) = calon_trim(&toko);
        let sel: Vec<String> = (0..3)
            .map(|k| {
                let c = calon.iter().find(|c| (c.pid, c.mulai) == id[k]);
                let alasan = c.map_or("bukan calon".to_string(), |c| jadwal.alasan(c, kini).map_or("LAYAK".into(), |l| format!("{l:?}")));
                format!("{:>6.0} MB {alasan:>14}", c.map_or(ws(id[k].0), |c| c.ws_mb))
            })
            .collect();
        let mut aksi = String::new();
        if let Some((pid, mulai, hasil)) = putaran_trim(&toko, &mut jadwal) {
            let k = id.iter().position(|&x| x == (pid, mulai));
            std::thread::sleep(Duration::from_secs(1));
            match (k, hasil) {
                (Some(k), Ok(())) => {
                    trim[k][f] += 1;
                    aksi = format!("TRIM {} -> {:.0} MB", &LABEL[k][..1], ws(pid));
                }
                (Some(k), Err(e)) => {
                    aksi = format!("trim {} GAGAL: {e}", &LABEL[k][..1]);
                    galat.push(e);
                }
                (None, _) => {
                    aksi = format!("TRIM proses tak dikenal (PID {pid})!");
                    galat.push(aksi.clone());
                }
            }
        }
        println!("{n:>3} {:>5} | {} | {} | {} | {aksi}", if f == 0 { "1" } else { "2:A=M" }, sel[0], sel[1], sel[2]);
    }
    println!("\nRingkasan (fase 1 / fase 2):");
    for k in 0..3 {
        println!("  {}: trim {} / {}", LABEL[k], trim[k][0], trim[k][1]);
    }
    let lulus = [
        ("A di-trim di fase 1", trim[0][0] >= 1),
        ("A tidak di-trim sesudah ditandai Main", trim[0][1] == 0),
        ("B (depan) tidak pernah di-trim", trim[1] == [0, 0]),
        ("C (batas 512 MB) tidak pernah di-trim", trim[2] == [0, 0]),
        ("tanpa galat atau trim tak dikenal", galat.is_empty()),
    ];
    for (nama, ok) in lulus {
        println!("  [{}] {nama}", if ok { "LULUS" } else { "GAGAL" });
    }
    println!("  (setiap putaran: ketiga klien proses yang sama, B di depan, batas keras C 512 MB -- bila tidak, uji sudah berhenti GAGAL)");
    println!("  status: jumlah trim {} sesi ini, galat terakhir {:?}", kendali::status().jumlah, kendali::status().galat);
    tutup_semua();
    std::thread::sleep(Duration::from_secs(3));
    multi.matikan();
    println!("klien uji ditutup; sisa klien Roblox: {}", launcher::pid_klien().len());
}

#[tauri::command]
fn set_anggaran_ram(state: State<AppState>, mb: u32) -> Result<u32, String> {
    if !anggaran::anggaran_sah(mb) {
        return Err("The RAM budget must be at least 1 GB. Leave it empty to turn it off.".into());
    }
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.anggaran_ram_mb = mb;
    s.save()?;
    Ok(mb)
}

fn ram_dipakai_mb(s: &Store, klien: &[launcher::KlienProses], snap: &[sumber::Proses], kecuali: Option<u32>) -> f64 {
    let catatan = performa::catatan_salinan();
    klien
        .iter()
        .filter(|k| Some(k.pid) != kecuali)
        .filter_map(|k| {
            let p = snap.iter().find(|p| p.pid == k.pid)?;
            let ws_mb = p.working_set as f64 / 1_048_576.0;
            let kini = performa::ProsesKini { pid: p.pid, mulai: p.mulai, ws_mb, prioritas: p.prioritas };
            let batas = s.accounts.iter().find(|a| a.browser_tracker_id == k.btid).and_then(|a| performa::kebijakan_akun(a, s.grafis_ringan).ws_mb.nilai);
            let terpasang = performa::status_ws(batas, catatan.get(&k.btid), kini) == performa::StatusKolom::Terpasang;
            Some(anggaran::pakai_klien_mb(batas, terpasang, ws_mb))
        })
        .sum()
}

fn ram_akun_mb(s: &Store, a: &store::Account) -> f64 {
    anggaran::perkiraan_mb(performa::kebijakan_akun(a, s.grafis_ringan).ws_mb.nilai)
}

#[tauri::command]
async fn cek_anggaran(state: State<'_, AppState>, ids: Vec<String>) -> Result<anggaran::CekAnggaran, String> {
    if state.store.lock().unwrap_or_else(|e| e.into_inner()).anggaran_ram_mb == 0 {
        return Ok(anggaran::cek(0, 0.0, 0.0));
    }
    let klien = launcher::klien_terperinci();
    let snap = sumber::snapshot();
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let tambahan = ids
        .iter()
        .filter_map(|id| s.find(id))
        .filter(|a| !klien.iter().any(|k| k.btid == a.browser_tracker_id))
        .map(|a| ram_akun_mb(&s, a))
        .sum();
    Ok(anggaran::cek(s.anggaran_ram_mb, ram_dipakai_mb(&s, &klien, &snap, None), tambahan))
}

#[tauri::command]
async fn performance_policy_status(state: State<'_, AppState>) -> Result<performa::StatusPerforma, String> {
    let klien = launcher::klien_terperinci();
    let snap = sumber::snapshot();
    let btid: Vec<u64> = klien.iter().map(|k| k.btid).collect();
    let catatan = performa::catatan_hidup(&btid);
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let sistem = sumber::memori_sistem(&snap);
    let kapasitas = anggaran::kapasitas(s.anggaran_ram_mb, ram_dipakai_mb(&s, &klien, &snap, None), klien.len(), sistem.tersedia_mb);
    let hasil = klien
        .iter()
        .filter_map(|k| {
            let a = s.accounts.iter().find(|a| a.browser_tracker_id == k.btid)?;
            let p = snap.iter().find(|p| p.pid == k.pid)?;
            let kini = performa::ProsesKini { pid: p.pid, mulai: p.mulai, ws_mb: p.working_set as f64 / 1_048_576.0, prioritas: p.prioritas };
            Some(performa::status_klien(a, s.grafis_ringan, catatan.get(&k.btid), kini))
        })
        .collect();
    Ok(performa::StatusPerforma { sistem, klien: hasil, kapasitas, diukur_pada: pantau::kini() })
}

#[tauri::command]
fn set_catatan(state: State<AppState>, id: String, teks: String) -> Result<String, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.catatan = teks.trim_end().chars().take(2000).collect();
    let hasil = a.catatan.clone();
    s.save()?;
    Ok(hasil)
}

#[tauri::command]
fn argumen_luncur(state: State<AppState>) -> String {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).argumen_luncur.clone()
}

#[tauri::command]
fn set_argumen_luncur(state: State<AppState>, teks: String) -> Result<String, String> {
    let kata = launcher::argumen_luncur(&teks)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.argumen_luncur = kata.join(" ");
    s.save()?;
    Ok(s.argumen_luncur.clone())
}

#[tauri::command]
fn set_argumen_akun(state: State<AppState>, id: String, teks: String) -> Result<Option<String>, String> {
    let kata = launcher::argumen_luncur(&teks)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.argumen_luncur = (!kata.is_empty()).then(|| kata.join(" "));
    let hasil = a.argumen_luncur.clone();
    s.save()?;
    Ok(hasil)
}

#[tauri::command]
fn set_favorit(state: State<AppState>, ids: Vec<String>, aktif: bool) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let mut n = 0;
    for a in s.accounts.iter_mut().filter(|a| ids.contains(&a.id)) {
        a.favorit = aktif;
        n += 1;
    }
    s.save()?;
    Ok(n)
}

#[tauri::command]
async fn avatar_badan(user_id: u64) -> String {
    if user_id == 0 {
        return String::new();
    }
    roblox::avatar_badan_url(user_id).await
}

fn cookie_avatar(s: &Store, id: &str) -> Result<(Vec<String>, u64), String> {
    let a = s.find(id).ok_or("Account not found.")?;
    let sendiri = store::decrypt(&a.cookie_enc).ok();
    let sehat: Vec<&store::Account> = s
        .accounts
        .iter()
        .filter(|x| x.id != a.id && x.user_id > 0 && !x.utama && x.pembatasan.is_none() && x.last_error.is_empty())
        .collect();
    let cadangan: Vec<String> = avatar3d::pilih_cadangan(sehat.len(), a.user_id).into_iter().filter_map(|k| store::decrypt(&sehat[k].cookie_enc).ok()).collect();
    let urut = avatar3d::urutan_cookie(sendiri, cadangan, a.pembatasan.is_some() || !a.last_error.is_empty());
    if urut.is_empty() {
        return Err(roblox::AVATAR_3D_DITOLAK.into());
    }
    Ok((urut, a.user_id))
}

fn mulai_pemburu_avatar3d(h: tauri::AppHandle) {
    use std::time::{Duration, Instant};
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(8)).await;
        let mut hilang: std::collections::HashMap<u64, (Instant, Option<Instant>, Option<Instant>)> = Default::default();
        let mut semua_terakhir: Option<Instant> = None;
        let mut tunda_sampai: Option<Instant> = None;
        loop {
            if tunda_sampai.is_some_and(|t| Instant::now() < t) {
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
            let semua = semua_terakhir.is_none_or(|t| t.elapsed() >= Duration::from_secs(30 * 60));
            let akun: Vec<(String, u64)> = {
                let s = h.state::<AppState>().store.lock().unwrap_or_else(|e| e.into_inner()).accounts.iter().filter(|a| a.user_id > 0).map(|a| (a.id.clone(), a.user_id)).collect();
                s
            };
            let mut dibatasi = false;
            let mut sebelumnya_tanya = false;
            for (id, uid) in &akun {
                let ada = avatar3d::ada_model(*uid);
                let tanya = if semua {
                    true
                } else if ada {
                    hilang.remove(uid);
                    continue;
                } else {
                    let e = hilang.entry(*uid).or_insert((Instant::now(), None, None));
                    let (jeda_cek, jeda_tanya) = avatar3d::jadwal_buru(e.0.elapsed().as_secs());
                    if e.1.is_some_and(|t| t.elapsed().as_secs() < jeda_cek) {
                        continue;
                    }
                    e.2.is_none_or(|t| t.elapsed().as_secs() >= jeda_tanya)
                };
                if tanya && sebelumnya_tanya {
                    tokio::time::sleep(Duration::from_millis(150)).await;
                }
                sebelumnya_tanya = tanya;
                let cookies = {
                    let st = h.state::<AppState>();
                    let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
                    cookie_avatar(&s, id).ok().map(|c| c.0)
                };
                let Some(cookies) = cookies else { continue };
                let hasil = avatar3d::buru(&cookies, *uid, tanya).await;
                let kini = Instant::now();
                if avatar3d::ada_model(*uid) {
                    hilang.remove(uid);
                } else {
                    let e = hilang.entry(*uid).or_insert((kini, None, None));
                    e.1 = Some(kini);
                    if tanya {
                        e.2 = Some(kini);
                    }
                }
                if matches!(&hasil, Err(e) if e == roblox::AVATAR_3D_DIBATASI) {
                    dibatasi = true;
                    break;
                }
            }
            if dibatasi {
                tunda_sampai = Some(Instant::now() + Duration::from_secs(5 * 60));
            } else if semua {
                semua_terakhir = Some(Instant::now());
                let aktif: std::collections::HashSet<u64> = akun.iter().map(|(_, u)| *u).collect();
                avatar3d::bersihkan_terkunci(aktif, false).await;
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}

#[tauri::command]
async fn avatar_3d(state: State<'_, AppState>, id: String, segar: bool) -> Result<avatar3d::Avatar3d, String> {
    let (cookies, uid) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        cookie_avatar(&s, &id)?
    };
    if uid == 0 {
        return Err("Refresh this account first: its Roblox user ID isn't known yet.".into());
    }
    avatar3d::ambil(&cookies, uid, segar).await
}

#[derive(serde::Serialize)]
struct HasilPeriksa3d {
    id: String,
    versi: String,
    usang: bool,
    galat: Option<String>,
}

#[tauri::command]
async fn avatar_3d_periksa(state: State<'_, AppState>, ids: Vec<String>) -> Result<Vec<HasilPeriksa3d>, String> {
    let (akun, aktif): (Vec<(String, Vec<String>, u64)>, std::collections::HashSet<u64>) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        (
            ids.iter()
                .filter_map(|id| cookie_avatar(&s, id).ok().filter(|(_, uid)| *uid > 0).map(|(c, uid)| (id.clone(), c, uid)))
                .collect(),
            s.accounts.iter().map(|a| a.user_id).filter(|u| *u > 0).collect(),
        )
    };
    avatar3d::bersihkan_terkunci(aktif, false).await;
    let mut hasil = Vec::new();
    let mut dibatasi = false;
    for (i, (id, cookie, uid)) in akun.into_iter().enumerate() {
        if dibatasi {
            hasil.push(HasilPeriksa3d { id, versi: String::new(), usang: false, galat: Some(roblox::AVATAR_3D_DIBATASI.into()) });
            continue;
        }
        if i > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(150)).await;
        }
        hasil.push(match avatar3d::periksa(&cookie, uid).await {
            Ok(st) => HasilPeriksa3d { id, versi: st.versi, usang: st.usang, galat: None },
            Err(e) => {
                dibatasi = e == roblox::AVATAR_3D_DIBATASI;
                HasilPeriksa3d { id, versi: String::new(), usang: false, galat: Some(e) }
            }
        });
    }
    Ok(hasil)
}

#[tauri::command]
async fn segarkan_akun(state: State<'_, AppState>, id: String) -> Result<HasilCek, String> {
    let cookie = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        store::decrypt(&a.cookie_enc)?
    };

    let hasil = roblox::user_info_cek(&cookie).await;
    let batas = match &hasil {
        Err((roblox::Cek::Dibatasi, _)) => Some(roblox::baca_pembatasan(&cookie).await),
        _ => None,
    };

    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    let mut cek = HasilCek { cek: "ok", pesan: String::new() };
    match hasil {
        Ok(info) => {
            a.username = info.username;
            a.display_name = info.display_name;
            a.user_id = info.user_id;
            a.robux = info.robux;
            a.premium = info.premium;
            a.plus = info.plus;
            a.pasang_status(info.banned, info.email_ok, info.dua_langkah.clone());
            a.pasang_pembatasan_sehat(info.pembatasan.clone());
            if !info.avatar_url.is_empty() {
                a.avatar_url = info.avatar_url;
            }
            a.last_error = String::new();
        }
        Err((roblox::Cek::Sementara, e)) => {
            cek = HasilCek { cek: "sementara", pesan: e };
        }
        Err((roblox::Cek::Dibatasi, e)) => {
            a.last_error = String::new();
            match batas {
                Some(Ok(p)) => a.pembatasan = Some(p.unwrap_or_else(|| store::Pembatasan { jenis: "other".into(), ..Default::default() })),
                _ if a.pembatasan.is_some() => {}
                _ => a.pembatasan = Some(store::Pembatasan { jenis: "other".into(), ..Default::default() }),
            }
            cek = HasilCek { cek: "dibatasi", pesan: e };
        }
        Err((jenis, e)) => {
            a.last_error = e.clone();
            cek = HasilCek {
                cek: match jenis {
                    roblox::Cek::Verifikasi => "verifikasi",
                    roblox::Cek::Terikat => "terikat",
                    _ => "mati",
                },
                pesan: e,
            };
        }
    }
    s.save()?;
    Ok(cek)
}

#[derive(Serialize)]
struct HasilCek {
    cek: &'static str,
    pesan: String,
}

#[tauri::command]
async fn cari_game(query: String) -> Result<Vec<roblox::GameHasil>, String> {
    roblox::cari_game(&query).await
}

#[tauri::command]
async fn jelajah_game(perangkat: String, negara: String, token: String) -> Result<jelajah::HalamanJelajah, String> {
    jelajah::halaman(&perangkat, &negara, &token).await
}

#[tauri::command]
async fn detail_game(universe_id: u64) -> Result<jelajah::DetailGame, String> {
    jelajah::detail(universe_id).await
}

fn cookie_akun_sehat(state: &AppState) -> Option<String> {
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.accounts
        .iter()
        .find(|a| a.last_error.is_empty() && a.pembatasan.is_none())
        .and_then(|a| store::decrypt(&a.cookie_enc).ok())
}

#[tauri::command]
async fn info_server_pribadi(
    state: State<'_, AppState>,
    universe_id: u64,
    place_id: u64,
) -> Result<roblox::InfoPribadi, String> {
    let Some(cookie) = cookie_akun_sehat(&state) else {
        return Ok(roblox::InfoPribadi::default());
    };
    Ok(roblox::info_pribadi(&cookie, universe_id, place_id).await)
}

fn akun_cookie(state: &AppState, id: &str) -> Result<(String, u64), String> {
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find(id).ok_or("Account not found.")?;
    Ok((store::decrypt(&a.cookie_enc)?, a.user_id))
}

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
struct PribadiAkun {
    akun_id: String,
    status: String,
    vip_id: u64,
    nama: String,
    access_code: String,
    link: String,
    harga: Option<i64>,
    pesan: String,
}

#[derive(Serialize)]
struct SiapPribadi {
    universe_id: u64,
    info: roblox::InfoPribadi,
    akun: Vec<PribadiAkun>,
}

fn pilih_milik(daftar: &[roblox::ServerMilik], universe_id: u64, user_id: u64) -> Option<&roblox::ServerMilik> {
    daftar
        .iter()
        .filter(|s| s.universe_id == universe_id && s.pemilik_id != 0 && s.pemilik_id == user_id)
        .max_by_key(|s| s.aktif)
}

fn boleh_buat_gratis(info: &roblox::InfoPribadi) -> Result<(), String> {
    if info.diizinkan == Some(false) {
        return Err("This game does not allow private servers.".into());
    }
    match info.harga {
        Some(0) => {}
        Some(n) => return Err(format!("Private servers in this game cost {n} Robux; CAM never buys them.")),
        None => return Err("Roblox did not say what a private server costs in this game, so none was created.".into()),
    }
    if info.bisa_buat == Some(false) {
        return Err("Roblox says this account cannot create another private server in this game.".into());
    }
    Ok(())
}

async fn kode_akses(cookie: &str, place_id: u64, vip_id: u64) -> String {
    let mut cursor = String::new();
    for _ in 0..5 {
        let Ok((daftar, c)) = roblox::server_pribadi(cookie, place_id, &cursor).await else { break };
        if let Some(s) = daftar.iter().find(|s| s.vip_id == vip_id) {
            return s.access_code.clone();
        }
        if c.is_empty() {
            break;
        }
        cursor = c;
    }
    String::new()
}

fn boleh_nyalakan(d: &roblox::DetailVip, sekarang: i64) -> Result<(), String> {
    match d.harga {
        Some(0) => Ok(()),
        Some(n) if n > 0 && !d.lewat && detik_iso(&d.kedaluwarsa).is_some_and(|t| t > sekarang) => Ok(()),
        Some(n) if n > 0 => Err(format!("This private server's paid period has ended; turning it on could renew it for {n} Robux, and CAM never buys.")),
        _ => Err("Roblox did not say what this private server costs, so it was not turned on.".into()),
    }
}

fn detik_iso(s: &str) -> Option<i64> {
    let b = s.as_bytes();
    if b.len() < 20 || b[4] != b'-' || b[7] != b'-' || b[10] != b'T' || b[13] != b':' || b[16] != b':' || !s.ends_with('Z') {
        return None;
    }
    let digit = |a: usize, z: usize| b[a..z].iter().all(u8::is_ascii_digit);
    let ekor = &b[19..b.len() - 1];
    if !digit(0, 4) || !digit(5, 7) || !digit(8, 10) || !digit(11, 13) || !digit(14, 16) || !digit(17, 19)
        || !(ekor.is_empty() || (ekor.len() > 1 && ekor[0] == b'.' && ekor[1..].iter().all(u8::is_ascii_digit)))
    {
        return None;
    }
    let n = |a: usize, z: usize| s.get(a..z)?.parse::<i64>().ok();
    let (th, bl, hr) = (n(0, 4)?, n(5, 7)?, n(8, 10)?);
    let (j, m, dt) = (n(11, 13)?, n(14, 16)?, n(17, 19)?);
    let kabisat = (th % 4 == 0 && th % 100 != 0) || th % 400 == 0;
    let panjang = match bl {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if kabisat => 29,
        2 => 28,
        _ => return None,
    };
    if !(1..=panjang).contains(&hr) || j > 23 || m > 59 || dt > 59 {
        return None;
    }
    let y = if bl <= 2 { th - 1 } else { th };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (bl + 9) % 12;
    let doy = (153 * mp + 2) / 5 + hr - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let hari = era * 146097 + doe - 719468;
    Some(hari * 86400 + j * 3600 + m * 60 + dt)
}

fn sekarang_detik() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

async fn status_pribadi_akun(cookie: &str, user_id: u64, akun_id: &str, universe_id: u64, place_id: u64) -> PribadiAkun {
    let dasar = PribadiAkun { akun_id: akun_id.to_string(), ..Default::default() };
    let daftar = match roblox::pribadi_milik(cookie).await {
        Ok(d) => d,
        Err(e) => return PribadiAkun { status: "galat".into(), pesan: e, ..dasar },
    };
    let Some(s) = pilih_milik(&daftar, universe_id, user_id) else {
        return PribadiAkun { status: "tidak_ada".into(), ..dasar };
    };
    match roblox::detail_vip(cookie, s.vip_id).await {
        Ok(d) if d.aktif && !d.lewat => {
            let kode = if d.access_code.is_empty() { kode_akses(cookie, place_id, d.vip_id).await } else { d.access_code };
            if kode.is_empty() && d.link.is_empty() {
                return PribadiAkun { status: "galat".into(), vip_id: d.vip_id, nama: d.nama, pesan: "Roblox gave no way to join this private server.".into(), ..dasar };
            }
            PribadiAkun { status: "siap".into(), vip_id: d.vip_id, nama: d.nama, access_code: kode, link: d.link, harga: d.harga, ..dasar }
        }
        Ok(d) => PribadiAkun { status: "mati".into(), vip_id: d.vip_id, nama: d.nama, harga: d.harga, ..dasar },
        Err(e) => PribadiAkun { status: "galat".into(), pesan: e, ..dasar },
    }
}

#[tauri::command]
async fn siapkan_pribadi_sendiri(state: State<'_, AppState>, place_id: u64, akun_ids: Vec<String>) -> Result<SiapPribadi, String> {
    let universe_id = roblox::universe_dari_place(place_id).await;
    if universe_id == 0 {
        return Err("Roblox did not say which game that place belongs to.".into());
    }
    let mut akun = Vec::new();
    let mut info: Option<roblox::InfoPribadi> = None;
    for (i, id) in akun_ids.iter().enumerate() {
        if i > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        }
        let (cookie, user_id) = match akun_cookie(&state, id) {
            Ok(x) => x,
            Err(e) => {
                akun.push(PribadiAkun { akun_id: id.clone(), status: "galat".into(), pesan: e, ..Default::default() });
                continue;
            }
        };
        if info.is_none() {
            info = Some(roblox::info_pribadi(&cookie, universe_id, place_id).await);
        }
        akun.push(status_pribadi_akun(&cookie, user_id, id, universe_id, place_id).await);
    }
    Ok(SiapPribadi { universe_id, info: info.unwrap_or_default(), akun })
}

#[tauri::command]
async fn buat_server_gratis(state: State<'_, AppState>, akun_id: String, universe_id: u64, place_id: u64, nama: String) -> Result<PribadiAkun, String> {
    let (cookie, _) = akun_cookie(&state, &akun_id)?;
    let info = roblox::info_pribadi(&cookie, universe_id, place_id).await;
    boleh_buat_gratis(&info)?;
    let nama: String = nama.trim().chars().take(50).collect();
    let nama = if nama.is_empty() { "CAM server".to_string() } else { nama };
    let (vip_id, kode) = roblox::buat_vip_gratis(&cookie, universe_id, &nama).await?;
    let d = roblox::detail_vip(&cookie, vip_id).await?;
    let kode = if kode.is_empty() { kode_akses(&cookie, place_id, vip_id).await } else { kode };
    Ok(PribadiAkun {
        akun_id,
        status: if d.aktif && !(kode.is_empty() && d.link.is_empty()) { "siap" } else { "mati" }.into(),
        vip_id,
        nama: d.nama,
        access_code: kode,
        link: d.link,
        harga: d.harga,
        pesan: String::new(),
    })
}

#[derive(Serialize)]
struct MilikAkun {
    akun_id: String,
    servers: Vec<roblox::ServerMilik>,
}

#[derive(Serialize)]
struct MilikSemua {
    akun: Vec<MilikAkun>,
    diperiksa: usize,
    gagal: Vec<String>,
}

#[tauri::command]
async fn daftar_pribadi_milik_semua(state: State<'_, AppState>) -> Result<MilikSemua, String> {
    let pakai: Vec<(String, String, String)> = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        s.accounts
            .iter()
            .filter(|a| a.last_error.is_empty() && a.pembatasan.is_none())
            .filter_map(|a| store::decrypt(&a.cookie_enc).ok().map(|c| (a.id.clone(), a.alias.clone(), c)))
            .collect()
    };
    if pakai.is_empty() {
        return Err("No usable account: every account is signed out or restricted by Roblox.".into());
    }
    let mut akun = Vec::new();
    let mut gagal = Vec::new();
    for (i, (id, alias, cookie)) in pakai.iter().enumerate() {
        if i > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        }
        match roblox::pribadi_milik(cookie).await {
            Ok(servers) => akun.push(MilikAkun { akun_id: id.clone(), servers }),
            Err(e) => gagal.push(format!("{alias}: {e}")),
        }
    }
    if akun.is_empty() {
        return Err(gagal.first().cloned().unwrap_or_else(|| "Could not read any private server list.".into()));
    }
    Ok(MilikSemua { akun, diperiksa: pakai.len(), gagal })
}

#[tauri::command]
async fn detail_server_pribadi(state: State<'_, AppState>, akun_id: String, vip_id: u64) -> Result<roblox::DetailVip, String> {
    let (cookie, _) = akun_cookie(&state, &akun_id)?;
    roblox::detail_vip(&cookie, vip_id).await
}

#[derive(serde::Deserialize, Default, Debug)]
struct PerubahanVip {
    #[serde(default)]
    nama: Option<String>,
    #[serde(default)]
    aktif: Option<bool>,
    #[serde(default)]
    teman: Option<bool>,
    #[serde(default)]
    link_baru: Option<bool>,
    #[serde(default)]
    henti_langganan: Option<bool>,
}

#[tauri::command]
async fn ubah_server_pribadi(state: State<'_, AppState>, akun_id: String, vip_id: u64, ubah: PerubahanVip) -> Result<roblox::DetailVip, String> {
    let (cookie, _) = akun_cookie(&state, &akun_id)?;
    if let Some(n) = ubah.nama.as_deref() {
        let n = n.trim();
        if n.is_empty() || n.chars().count() > 50 {
            return Err("A private server name needs 1 to 50 characters.".into());
        }
        roblox::ubah_vip(&cookie, vip_id, serde_json::json!({ "name": n })).await?;
    }
    if let Some(a) = ubah.aktif {
        if a {
            boleh_nyalakan(&roblox::detail_vip(&cookie, vip_id).await?, sekarang_detik())?;
        }
        roblox::ubah_vip(&cookie, vip_id, serde_json::json!({ "active": a })).await?;
    }
    if let Some(t) = ubah.teman {
        roblox::izin_teman_vip(&cookie, vip_id, t).await?;
    }
    if ubah.link_baru == Some(true) {
        roblox::ubah_vip(&cookie, vip_id, serde_json::json!({ "newJoinCode": true })).await?;
    }
    if ubah.henti_langganan == Some(true) {
        roblox::henti_langganan_vip(&cookie, vip_id).await?;
    }
    roblox::detail_vip(&cookie, vip_id).await
}

#[cfg(test)]
mod tes_t045_pribadi {
    use super::*;

    fn info(diizinkan: Option<bool>, harga: Option<i64>, bisa: Option<bool>) -> roblox::InfoPribadi {
        roblox::InfoPribadi { diizinkan, harga, bisa_buat: bisa, batas: None }
    }

    #[test]
    fn hanya_harga_nol_yang_dibuat() {
        assert!(boleh_buat_gratis(&info(Some(true), Some(0), Some(true))).is_ok());
        assert!(boleh_buat_gratis(&info(None, Some(0), None)).is_ok());
        assert!(boleh_buat_gratis(&info(Some(true), Some(40), Some(true))).unwrap_err().contains("40 Robux"));
        assert!(boleh_buat_gratis(&info(Some(true), None, Some(true))).is_err(), "harga tidak diketahui = tidak dibuat");
        assert!(boleh_buat_gratis(&info(Some(false), Some(0), Some(true))).is_err());
        assert!(boleh_buat_gratis(&info(Some(true), Some(0), Some(false))).is_err());
    }

    #[test]
    fn server_aktif_dipilih_lebih_dulu() {
        let s = |id: u64, uni: u64, aktif: bool, pemilik: u64| roblox::ServerMilik { vip_id: id, universe_id: uni, aktif, pemilik_id: pemilik, ..Default::default() };
        let d = vec![s(1, 9, false, 7), s(2, 9, true, 7), s(3, 8, true, 7), s(4, 9, true, 99)];
        assert_eq!(pilih_milik(&d, 9, 7).map(|x| x.vip_id), Some(2));
        assert_eq!(pilih_milik(&d, 5, 7), None);
        assert_eq!(pilih_milik(&[s(1, 9, false, 7)], 9, 7).map(|x| x.aktif), Some(false));
        assert_eq!(pilih_milik(&[s(5, 9, true, 0)], 9, 7), None);
    }

    #[test]
    fn menyalakan_dijaga_harga_server() {
        let kini = detik_iso("2026-11-24T00:00:00Z").unwrap();
        let d = |harga: Option<i64>, lewat: bool, tgl: &str| roblox::DetailVip { harga, lewat, kedaluwarsa: tgl.into(), ..Default::default() };
        let depan = "2026-12-20T08:00:00.000Z";
        let lalu = "2026-01-01T00:00:00Z";
        assert!(boleh_nyalakan(&d(Some(0), false, ""), kini).is_ok(), "free");
        assert!(boleh_nyalakan(&d(Some(0), true, lalu), kini).is_ok(), "free never renews for Robux");
        assert!(boleh_nyalakan(&d(Some(40), false, depan), kini).is_ok(), "paid period still running: nothing bought");
        assert!(boleh_nyalakan(&d(Some(40), true, depan), kini).unwrap_err().contains("40 Robux"), "paid and marked expired");
        assert!(boleh_nyalakan(&d(Some(40), false, lalu), kini).unwrap_err().contains("40 Robux"));
        assert!(boleh_nyalakan(&d(Some(40), false, ""), kini).is_err());
        assert!(boleh_nyalakan(&d(Some(40), false, "next week"), kini).is_err());
        assert!(boleh_nyalakan(&d(Some(40), false, "2026-11-31T00:00:00Z"), kini).is_err());
        assert!(boleh_nyalakan(&d(Some(-1), false, depan), kini).is_err(), "T45-17");
        assert!(boleh_nyalakan(&d(None, false, depan), kini).is_err(), "unknown price");
    }

    #[test]
    fn tanggal_iso_roblox() {
        assert_eq!(detik_iso("1970-01-01T00:00:00Z"), Some(0));
        assert_eq!(detik_iso("2000-03-01T00:00:00Z"), Some(951868800));
        assert_eq!(detik_iso("2126-11-24T10:05:42.317Z"), Some(4951188342));
        assert_eq!(detik_iso("2026-11-24"), None);
        assert_eq!(detik_iso("2026-13-01T00:00:00Z"), None);
        assert_eq!(detik_iso("2026-11-24T10:05:42+07:00"), None);
        for mustahil in ["2026-02-31T00:00:00Z", "2026-02-29T00:00:00Z", "2026-04-31T00:00:00Z", "2026-11-31T00:00:00Z", "2100-02-29T00:00:00Z", "2026-11-00T00:00:00Z"] {
            assert_eq!(detik_iso(mustahil), None, "{mustahil}");
        }
        assert_eq!(detik_iso("2028-02-29T00:00:00Z"), Some(1835395200), "leap day exists");
        assert_eq!(detik_iso("2000-02-29T00:00:00Z"), Some(951782400), "2000 is a leap year");
        for aneh in ["2026-11-24T-1:05:42Z", "2026-11-24T10:-5:42Z", "2026-11-24T10:05:-2Z", "+026-11-24T10:05:42Z", "2026-11-24T10:05:60Z", "2026-11-24T10:05:42.Z", "2026-11-24T10:05:42.3x7Z", "2026-11-24T10:05:42XZ"] {
            assert_eq!(detik_iso(aneh), None, "{aneh}");
        }
        assert_eq!(detik_iso("2026-11-24T10:05:42.3Z"), detik_iso("2026-11-24T10:05:42Z"));
    }
}

#[tauri::command]
async fn perbarui_cookie(state: State<'_, AppState>, id: String) -> Result<AkunView, String> {
    let cookie = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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

    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.cookie_enc = enc;
    a.last_refreshed = sekarang;
    a.username = info.username;
    a.display_name = info.display_name;
    a.robux = info.robux;
    a.premium = info.premium;
    a.plus = info.plus;
    a.pasang_status(info.banned, info.email_ok, info.dua_langkah.clone());
    a.pasang_pembatasan_sehat(info.pembatasan.clone());
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
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.fps_cap = hemat::fps_akun_sah(fps);
    s.save()
}

#[tauri::command]
fn set_hemat_akun(state: State<AppState>, id: String, hemat: bool, minimize: bool, ram_mb: u32, fps: u32) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find_mut(&id).ok_or("Account not found.")?;
    a.mulai_kecil = store::kecil_saat_hemat(a.hemat, hemat, a.mulai_kecil);
    a.hemat = hemat;
    a.hemat_minimize = minimize;
    a.hemat_ram_mb = if ram_mb == 0 { 0 } else { ram_mb.clamp(128, 4096) };
    a.hemat_fps = hemat::fps_hemat_sah(fps);
    s.save()
}

#[tauri::command]
async fn jendela_hemat(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let (btid, lebar, minim) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.browser_tracker_id, a.mulai_kecil, a.hemat && a.hemat_minimize)
    };
    tauri::async_runtime::spawn_blocking(move || atur_jendela_setelah_join(btid, lebar, minim)).await.map_err(|e| e.to_string())
}

fn atur_jendela_setelah_join(btid: u64, lebar: u32, minim: bool) -> bool {
    if btid == 0 || (lebar == 0 && !minim) {
        return false;
    }
    for _ in 0..60 {
        let pid = launcher::klien_terperinci().into_iter().find(|k| k.btid == btid).map(|k| k.pid);
        if let Some(h) = pid.and_then(|p| jendela::daftar().into_iter().find(|j| j.pid == p)) {
            if lebar > 0 {
                let _ = kecil::kecilkan(h.hwnd, lebar, store::tinggi_kecil(lebar));
            }
            if minim {
                let _ = jendela::kecilkan(h.hwnd);
            }
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    false
}

#[tauri::command]
async fn periksa_versi_hemat(state: State<'_, AppState>, id: String) -> Result<Option<String>, String> {
    let (btid, alias) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
                let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
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
    let kustom = state.store.lock().unwrap_or_else(|e| e.into_inner()).klien_kustom.clone();
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

Pick the downloaded version folder that contains RobloxPlayerBeta.exe."
        )
    })?;
    let path = exe.to_string_lossy().to_string();

    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.klien_kustom.iter().any(|x| x == &path) {
        return Err("That version is already in the list.".into());
    }
    s.klien_kustom.push(path.clone());
    s.save()?;
    Ok(path)
}

#[derive(Serialize)]
struct HasilHapusVersi {
    dihapus: u32,
    mb: u64,
    dilewati: Vec<String>,
}

#[tauri::command]
fn hapus_versi_roblox(state: State<AppState>, path: String) -> Result<HasilHapusVersi, String> {
    let b = klien::hapus_terpasang(std::path::Path::new(&path))?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.klien_path.eq_ignore_ascii_case(&path) {
        s.klien_path.clear();
        s.save()?;
    }
    Ok(HasilHapusVersi { dihapus: 1, mb: b / (1024 * 1024), dilewati: Vec::new() })
}

#[tauri::command]
fn hapus_versi_roblox_lama(state: State<AppState>) -> Result<HasilHapusVersi, String> {
    let dipin = state.store.lock().unwrap_or_else(|e| e.into_inner()).klien_path.clone();
    let mut h = HasilHapusVersi { dihapus: 0, mb: 0, dilewati: Vec::new() };
    for k in klien::terpasang().into_iter().filter(|k| !k.protokol) {
        let label = if k.versi.is_empty() { k.folder.clone() } else { k.versi.clone() };
        if k.path.eq_ignore_ascii_case(&dipin) {
            h.dilewati.push(format!("{label}: pinned for launching"));
            continue;
        }
        match klien::hapus_terpasang(std::path::Path::new(&k.path)) {
            Ok(b) => {
                h.dihapus += 1;
                h.mb += b / (1024 * 1024);
            }
            Err(e) => h.dilewati.push(format!("{label}: {e}")),
        }
    }
    Ok(h)
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
            if klien::adalah_reparse(folder) {
                return Err("That version folder is a link to another location; CAM leaves it alone.".into());
            }
            std::fs::remove_dir_all(folder)
                .map_err(|e| format!("could not delete the downloaded version: {e}"))?;
        }
    }
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    state.store.lock().unwrap_or_else(|e| e.into_inner()).target_terakhir.clone()
}

#[tauri::command]
fn simpan_target_terakhir(state: State<AppState>, target: TargetLuncur) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.target_terakhir.as_ref() == Some(&target) {
        return Ok(());
    }
    s.target_terakhir = Some(target);
    s.save()
}

fn rapikan_target_sendiri(t: Option<TargetLuncur>) -> Result<Option<TargetLuncur>, String> {
    let Some(t) = t else { return Ok(None) };
    let place_id: String = t.place_id.chars().filter(|c| c.is_ascii_digit()).collect();
    let link_code = t.link_code.trim().to_string();
    if place_id.is_empty() && link_code.is_empty() {
        return Ok(None);
    }
    if place_id.len() > 20 || link_code.len() > 600 || t.job_id.len() > 80 {
        return Err("That launch target is not valid.".into());
    }
    Ok(Some(TargetLuncur {
        place_id,
        game_name: t.game_name.chars().take(200).collect(),
        game_icon: t.game_icon.chars().take(600).collect(),
        job_id: t.job_id.trim().to_string(),
        link_code,
        ..Default::default()
    }))
}

#[tauri::command]
fn atur_target_akun(state: State<AppState>, ids: Vec<String>, target: Option<TargetLuncur>) -> Result<Vec<AkunView>, String> {
    let t = rapikan_target_sendiri(target)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let lama: Vec<(String, Option<TargetLuncur>)> = s
        .accounts
        .iter()
        .filter(|a| ids.contains(&a.id))
        .map(|a| (a.id.clone(), a.target_sendiri.clone()))
        .collect();
    if lama.is_empty() {
        return Err("Account not found.".into());
    }
    for a in s.accounts.iter_mut().filter(|a| ids.contains(&a.id)) {
        a.target_sendiri = t.clone();
    }
    if let Err(e) = s.save() {
        for (id, l) in lama {
            if let Some(a) = s.accounts.iter_mut().find(|a| a.id == id) {
                a.target_sendiri = l;
            }
        }
        return Err(e);
    }
    Ok(s.accounts.iter().filter(|a| ids.contains(&a.id)).map(AkunView::from).collect())
}

#[cfg(test)]
mod tes_target_sendiri {
    use super::*;

    #[test]
    fn hanya_game_dan_server_yang_disimpan() {
        let t = rapikan_target_sendiri(Some(TargetLuncur { place_id: " 121864768012064 ".into(), game_name: "Fish".into(), job_id: " abc ".into(), ikuti: "someone".into(), jeda: "9".into(), sama: "sepi".into(), fps: "30".into(), ..Default::default() })).unwrap().unwrap();
        assert_eq!((t.place_id.as_str(), t.job_id.as_str()), ("121864768012064", "abc"));
        assert!(t.ikuti.is_empty() && t.jeda.is_empty() && t.sama.is_empty() && t.fps.is_empty());
    }

    #[test]
    fn kosong_berarti_dihapus() {
        assert_eq!(rapikan_target_sendiri(Some(TargetLuncur::default())).unwrap(), None);
        assert_eq!(rapikan_target_sendiri(None).unwrap(), None);
        assert!(rapikan_target_sendiri(Some(TargetLuncur { link_code: "https://www.roblox.com/share?code=abc&type=Server".into(), ..Default::default() })).unwrap().is_some());
    }
}

#[tauri::command]
fn daftar_server_tersimpan(state: State<AppState>) -> Vec<ServerTersimpan> {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).server_tersimpan.clone()
}

#[tauri::command]
fn simpan_server_tersimpan(state: State<AppState>, server: ServerTersimpan) -> Result<(Vec<ServerTersimpan>, String), String> {
    if server.place_id.trim().is_empty() && server.link_code.trim().is_empty() {
        return Err("Pick a game or paste a private server link first.".into());
    }
    let sekarang = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let x = s.server_tersimpan.iter_mut().find(|x| x.id == id).ok_or("Saved server not found.")?;
    x.nama = nama;
    s.save()?;
    Ok(s.server_tersimpan.clone())
}

#[tauri::command]
fn hapus_server_tersimpan(state: State<AppState>, id: String) -> Result<Vec<ServerTersimpan>, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.server_tersimpan.retain(|x| x.id != id);
    s.save()?;
    Ok(s.server_tersimpan.clone())
}

#[tauri::command]
fn status_pantau(state: State<AppState>) -> Vec<pantau::StatusMonitor> {
    state.pelacak.status_monitor()
}

#[tauri::command]
fn sumber_klien() -> sumber::Laporan {
    let mut l = sumber::ukur();
    let kelompok: std::collections::HashMap<u32, String> = launcher::klien_berjalan()
        .into_iter()
        .map(|(pid, exe)| (pid, std::path::Path::new(&exe).parent().map(|d| d.to_string_lossy().to_string()).unwrap_or_default()))
        .collect();
    l.fisik_semua_perkiraan_mb = sumber::fisik_per_kelompok(&mut l.klien, &kelompok);
    l
}

#[tauri::command]
fn klien_akun(state: State<AppState>) -> Vec<KlienAkun> {
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    fflag_view(&state.store.lock().unwrap_or_else(|e| e.into_inner()))
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
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
                let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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

fn pusatkan_jendela_utama(w: &tauri::WebviewWindow) {
    let monitor = w
        .cursor_position()
        .ok()
        .and_then(|p| w.monitor_from_point(p.x, p.y).ok().flatten())
        .or_else(|| w.current_monitor().ok().flatten())
        .or_else(|| w.primary_monitor().ok().flatten());
    let Some(monitor) = monitor else { return };
    let area = *monitor.work_area();
    if w.current_monitor().ok().flatten().map(|m| *m.position() != *monitor.position()).unwrap_or(true) {
        if let Err(e) = w.set_position(area.position) {
            store::catat_kejadian(&format!("Main window: could not move it to the monitor under the pointer: {e}"));
        }
    }
    let skala = monitor.scale_factor();
    let (aw, ah) = (area.size.width as f64, area.size.height as f64);
    if let Ok(luar) = w.outer_size() {
        let (lw, lh) = (luar.width as f64, luar.height as f64);
        if lw > aw * 0.96 || lh > ah * 0.96 {
            let bw = (aw * 0.96).min(lw).max(960.0 * skala);
            let bh = (ah * 0.96).min(lh).max(600.0 * skala);
            if let Err(e) = w.set_size(tauri::PhysicalSize::new(bw.round() as u32, bh.round() as u32)) {
                store::catat_kejadian(&format!("Main window: could not resize to fit the screen: {e}"));
            }
        }
    }
    let Ok(luar) = w.outer_size() else { return };
    let lebih = luar.width as f64 - aw;
    let x = area.position.x as f64 + if lebih > 0.0 { -lebih } else { -lebih / 2.0 };
    let y = area.position.y as f64 + ((ah - luar.height as f64) / 2.0).max(0.0);
    if let Err(e) = w.set_position(tauri::PhysicalPosition::new(x.round() as i32, y.round() as i32)) {
        store::catat_kejadian(&format!("Main window: could not centre it on the screen: {e}"));
    }
}

#[repr(C)]
struct MarginDwm {
    kiri: i32,
    kanan: i32,
    atas: i32,
    bawah: i32,
}

#[link(name = "dwmapi")]
extern "system" {
    fn DwmExtendFrameIntoClientArea(hwnd: isize, margin: *const MarginDwm) -> i32;
}

static PROBE_BIARKAN_TRAY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static BAYANGAN_AKTIF: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

fn pasang_bayangan(window: &tauri::WebviewWindow) -> bool {
    let Ok(h) = window.hwnd() else { return false };
    let rand = MarginDwm { kiri: 0, kanan: 0, atas: 0, bawah: 1 };
    let hr = unsafe { DwmExtendFrameIntoClientArea(h.0 as isize, &rand) };
    if hr < 0 {
        store::catat_kejadian(&format!("Main window: could not turn the window shadow on (0x{hr:08X})"));
        return false;
    }
    true
}

#[tauri::command]
fn jendela_aksi(window: tauri::WebviewWindow, aksi: String) -> Result<bool, String> {
    match aksi.as_str() {
        "terlihat" => return Ok(window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false)),
        "bayangan" => {
            BAYANGAN_AKTIF.store(true, std::sync::atomic::Ordering::SeqCst);
            return Ok(pasang_bayangan(&window));
        }
        _ => {}
    }
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
        "layar_penuh" => {
            static MAKS_SEBELUM_PENUH: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
            if !window.is_fullscreen().unwrap_or(false) {
                let maks = window.is_maximized().unwrap_or(false);
                MAKS_SEBELUM_PENUH.store(maks, std::sync::atomic::Ordering::SeqCst);
                if maks {
                    let _ = window.unmaximize();
                }
                window.set_fullscreen(true)
            } else {
                let hasil = window.set_fullscreen(false);
                if hasil.is_ok() && BAYANGAN_AKTIF.load(std::sync::atomic::Ordering::SeqCst) {
                    pasang_bayangan(&window);
                }
                if hasil.is_ok() && MAKS_SEBELUM_PENUH.swap(false, std::sync::atomic::Ordering::SeqCst) && !window.is_maximized().unwrap_or(false) {
                    window.maximize()
                } else {
                    hasil
                }
            }
        }
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
fn jendela_penuh(window: tauri::WebviewWindow) -> bool {
    window.is_fullscreen().unwrap_or(false)
}

#[tauri::command]
fn klien_path(state: State<AppState>) -> String {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).klien_path.clone()
}

#[tauri::command]
fn set_klien_path(state: State<AppState>, path: String) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.klien_path = path.trim().to_string();
    s.save()
}

#[tauri::command]
fn sembunyikan_username_status(state: State<AppState>) -> bool {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).sembunyikan_username
}

#[tauri::command]
fn set_sembunyikan_username(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.sembunyikan_username = aktif;
    s.save()?;
    Ok(aktif)
}

#[tauri::command]
fn auto_refresh_status(state: State<AppState>) -> bool {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).auto_refresh
}

#[tauri::command]
fn set_auto_refresh(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.auto_refresh = aktif;
    s.save()?;
    Ok(aktif)
}

#[tauri::command]
fn daftar_riwayat(state: State<AppState>) -> Vec<Riwayat> {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).riwayat.clone()
}

#[tauri::command]
fn hapus_riwayat(state: State<AppState>) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.riwayat.clear();
    s.save()
}

#[tauri::command]
async fn perbaiki_riwayat(state: State<'_, AppState>) -> Result<bool, String> {
    let places: Vec<u64> = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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

    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    state.singleton.lock().unwrap_or_else(|e| e.into_inner()).aktif()
}

#[tauri::command]
fn set_multi_instance(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut g = state.singleton.lock().unwrap_or_else(|e| e.into_inner());
    if aktif {
        g.nyalakan()?;
    } else {
        g.matikan();
    }
    Ok(g.aktif())
}

#[tauri::command]
async fn ambil_alih_multi(state: State<'_, AppState>) -> Result<bool, String> {
    let n = tauri::async_runtime::spawn_blocking(singleton::ambil_alih).await.map_err(|e| e.to_string())?;
    let mut g = state.singleton.lock().unwrap_or_else(|e| e.into_inner());
    g.nyalakan().map_err(|e| {
        if n == 0 {
            "Couldn't take over: no running Roblox client would hand over its lock. Close Roblox, then turn multi-instance on.".to_string()
        } else {
            e
        }
    })?;
    store::catat_kejadian(&format!("Multi-instance take-over: closed {n} single-instance handle(s) in running Roblox clients"));
    Ok(g.aktif())
}

#[derive(Serialize)]
struct ProteksiView {
    setelan: bool,
    aktif: bool,
    berkas: usize,
    total: usize,
    catatan: Vec<pantau::Catatan>,
}

fn proteksi_view(state: &AppState) -> ProteksiView {
    let setelan = !state.store.lock().unwrap_or_else(|e| e.into_inner()).proteksi_sesi_mati;
    let (aktif, berkas, total) = state.proteksi.status();
    ProteksiView { setelan, aktif, berkas, total, catatan: state.pelacak.ambil_catatan() }
}

#[tauri::command]
fn status_muat(state: State<AppState>) -> store::StatusMuat {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).muat.clone()
}

#[tauri::command]
fn akui_status_muat(state: State<AppState>) -> store::StatusMuat {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.muat = store::StatusMuat::Baik;
    s.muat.clone()
}

#[tauri::command]
fn status_proteksi(state: State<AppState>) -> ProteksiView {
    proteksi_view(&state)
}

#[tauri::command]
fn set_proteksi_sesi(state: State<AppState>, aktif: bool) -> Result<ProteksiView, String> {
    {
        let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        s.proteksi_sesi_mati = !aktif;
        s.save()?;
    }
    if !aktif {
        state.proteksi.lepas();
    } else if state.singleton.lock().unwrap_or_else(|e| e.into_inner()).aktif() && !launcher::pid_klien().is_empty() {
        state.proteksi.pasang();
    }
    Ok(proteksi_view(&state))
}

#[tauri::command]
async fn periksa_akun_join(state: State<'_, AppState>, id: String, sejak: i64) -> Result<Option<String>, String> {
    let (harapan, btid, alias) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.user_id, a.browser_tracker_id, a.alias.clone())
    };
    if harapan == 0 {
        return Ok(None);
    }
    for _ in 0..10 {
        let terbaca = tauri::async_runtime::spawn_blocking(move || sesi::userid_log_sejak(sejak))
            .await
            .unwrap_or_default();
        match sesi::cek_akun(&terbaca, harapan) {
            sesi::CekAkun::Cocok => return Ok(None),
            sesi::CekAkun::Salah(lain) => {
                let pid: Vec<u32> = launcher::klien_terperinci().into_iter().filter(|k| k.btid == btid).map(|k| k.pid).collect();
                let mut ditutup = 0;
                for j in jendela::daftar() {
                    if pid.contains(&j.pid) && jendela::tutup(j.hwnd).is_ok() {
                        ditutup += 1;
                    }
                }
                return Ok(Some(if ditutup > 0 {
                    format!("Sign-in check: {alias}'s client signed in as another account (user ID {lain}), so it was closed. Launch {alias} again.")
                } else {
                    format!("Sign-in check: {alias}'s client signed in as another account (user ID {lain}). Close that client and launch {alias} again.")
                }));
            }
            sesi::CekAkun::BelumTerbaca => tokio::time::sleep(std::time::Duration::from_secs(1)).await,
        }
    }
    Ok(None)
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
    fps_sekali: Option<u32>,
) -> Result<String, String> {
    let tujuan = pantau::Tujuan {
        place_id,
        job_id,
        link_code,
        access_code,
        share_code,
        follow_user_id,
        game_name,
        icon_url,
        fps_sekali: hemat::fps_sekali_sah(fps_sekali),
    };
    luncurkan_terlacak(&state.konteks(), id, tujuan).await
}

async fn luncurkan_terlacak(k: &Konteks<'_>, id: String, t: pantau::Tujuan) -> Result<String, String> {
    if k.pelacak.ditahan(&id) {
        return Err("This account is being deleted, so it can't be launched.".into());
    }
    let multi = k.singleton.lock().unwrap_or_else(|e| e.into_inner()).aktif();
    let (lindung, btid, alias, uid) = {
        let s = k.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        (!s.proteksi_sesi_mati && multi, a.browser_tracker_id, a.alias.clone(), a.user_id)
    };
    if btid != 0 && launcher::klien_terperinci().iter().any(|x| x.btid == btid) {
        return Err(format!(
            "{alias} already has a Roblox client open. A second one would sign it out of the first; close that client first."
        ));
    }
    let sejak = pantau::kini();
    let pesan = luncurkan_inti_fps(
        k.store,
        id.clone(),
        t.place_id,
        t.job_id.clone(),
        t.link_code.clone(),
        t.access_code.clone(),
        t.share_code.clone(),
        t.follow_user_id,
        t.game_name.clone(),
        t.icon_url.clone(),
        lindung.then_some(k.proteksi),
        t.fps_sekali,
    )
    .await?;
    let terhapus = k.pelacak.ditahan(&id) || k.store.lock().unwrap_or_else(|e| e.into_inner()).find(&id).is_none();
    if terhapus {
        let milik_lain = k.store.lock().unwrap_or_else(|e| e.into_inner()).accounts.iter().any(|a| a.id != id && a.browser_tracker_id == btid);
        let btid: std::collections::HashSet<u64> = if btid != 0 && !milik_lain { std::collections::HashSet::from([btid]) } else { std::collections::HashSet::new() };
        if let Err(e) = tauri::async_runtime::spawn_blocking(move || tutup_klien_btid_berulang(&btid, 10)).await {
            store::catat_kejadian(&format!("Closing a deleted account's new client failed: {e}"));
        }
        return Err(format!("{alias} was deleted while it was launching, so its new client was closed."));
    }
    k.pelacak.daftar(&id, &alias, uid, btid, t, sejak);
    Ok(pesan)
}

#[tauri::command]
fn set_rejoin_akun(state: State<AppState>, ids: Vec<String>, aktif: bool) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let mut n = 0;
    for a in s.accounts.iter_mut().filter(|a| ids.contains(&a.id)) {
        a.auto_rejoin = aktif;
        n += 1;
    }
    s.save()?;
    Ok(n)
}

#[tauri::command]
fn set_afk_akun(state: State<AppState>, ids: Vec<String>, aktif: bool) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let mut n = 0;
    for a in s.accounts.iter_mut().filter(|a| ids.contains(&a.id)) {
        a.anti_afk = aktif;
        n += 1;
    }
    s.save()?;
    Ok(n)
}

#[tauri::command]
fn afk_menit(state: State<AppState>) -> u32 {
    afk::menit_sah(state.store.lock().unwrap_or_else(|e| e.into_inner()).afk_menit)
}

#[tauri::command]
fn set_afk_menit(state: State<AppState>, menit: u32) -> Result<u32, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.afk_menit = afk::menit_sah(menit);
    s.save()?;
    Ok(s.afk_menit)
}

fn putaran_afk(k: &Konteks<'_>) -> std::time::Duration {
    let (menit, aktif): (u32, Vec<String>) = {
        let s = k.store.lock().unwrap_or_else(|e| e.into_inner());
        (s.afk_menit, s.accounts.iter().filter(|a| a.anti_afk).map(|a| a.id.clone()).collect())
    };
    if aktif.is_empty() {
        return afk::PUTARAN;
    }
    let macet = jendela::pid_macet();
    let klien: Vec<afk::KlienAfk> = k
        .pelacak
        .klien_afk()
        .into_iter()
        .filter(|c| aktif.contains(&c.0) && !macet.contains(&c.2))
        .collect();
    let jatuh = match afk::rencana(&klien, pantau::kini(), menit, afk::diam_ms(), afk::layar_penuh()) {
        afk::Rencana::Tunggu => return afk::PUTARAN,
        afk::Rencana::Ulang => return afk::ULANG,
        afk::Rencana::Tekan(ids) => ids,
    };
    let jendela_klien = jendela::daftar();
    let mut gagal = false;
    let mut milik_kita = afk::jejak_input();
    for c in klien.iter().filter(|c| jatuh.contains(&c.0)) {
        if afk::jejak_input() != milik_kita {
            gagal = true;
            break;
        }
        let Some(j) = jendela_klien.iter().find(|j| j.pid == c.2) else { continue };
        let h = afk::tekan(j.hwnd);
        milik_kita = afk::jejak_input();
        match h {
            afk::Hasil::Ya => {
                if k.pelacak.tandai_afk(&c.0, pantau::kini()) {
                    k.pelacak.catat(
                        format!("Anti-AFK is keeping {} active (one F13 key press every {} minutes while you're away).", c.1, afk::menit_sah(menit)),
                        "info",
                    );
                }
            }
            afk::Hasil::Tidak => gagal = true,
            afk::Hasil::Terputus => {
                gagal = true;
                break;
            }
        }
        afk::antara();
    }
    if gagal { afk::ULANG } else { afk::PUTARAN }
}

#[tauri::command]
fn set_antrean_luncur(state: State<AppState>, aktif: bool) {
    state.pelacak.antrean_ui.store(aktif, std::sync::atomic::Ordering::SeqCst);
}

fn simpan_rotasi(store: &Mutex<Store>, lama: &str, baru: &str) -> usize {
    let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
    let mut n = 0;
    for a in s.accounts.iter_mut() {
        if store::decrypt(&a.cookie_enc).map(|c| roblox::mentah(&c) == lama).unwrap_or(false) {
            if let Ok(enc) = store::encrypt(baru) {
                a.cookie_enc = enc;
                n += 1;
            }
        }
    }
    if n > 0 {
        let _ = s.save();
        store::catat_kejadian(&format!("Roblox rotated the sign-in cookie of {n} account(s); the new one was saved."));
    }
    n
}

async fn probe_situs(app: tauri::AppHandle, alias: String) {
    let out = std::env::temp_dir().join("cam-probe-situs.txt");
    let mut log = String::new();
    macro_rules! catat { ($($t:tt)*) => {{ let b = format!($($t)*); log.push_str(&b); log.push('\n'); let _ = std::fs::write(&out, &log); }} }
    let (id, uid, cookie) = {
        let st = app.state::<AppState>();
        let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
        match s.accounts.iter().find(|a| a.alias.eq_ignore_ascii_case(&alias)) {
            Some(a) => (a.id.clone(), a.user_id, store::decrypt(&a.cookie_enc).unwrap_or_default()),
            None => { catat!("akun tidak ada"); return; }
        }
    };
    let crash = store::berkas_data("crash.log");
    let panjang_awal = std::fs::metadata(&crash).map(|m| m.len()).unwrap_or(0);
    catat!("buka: {:?}", buka_situs_inti(app.clone(), id.clone(), None, Vec::new()).await);
    let label = label_situs(&id);
    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
    let Some(w) = app.get_webview_window(&label) else { catat!("jendela hilang"); return };
    catat!("url setelah muat: {:?}", w.url().map(|u| format!("{}{}", u.host_str().unwrap_or(""), u.path())));
    let _ = w.eval("fetch('https://users.roblox.com/v1/users/authenticated',{credentials:'include'}).then(r=>r.json()).then(j=>{location.href='https://www.roblox.com/users/'+j.id+'/profile'}).catch(()=>{location.href='https://www.roblox.com/users/0/profile'})");
    tokio::time::sleep(std::time::Duration::from_secs(6)).await;
    let jalur = w.url().map(|u| u.path().to_string()).unwrap_or_default();
    catat!("sesi halaman = akun ini: {} (jalur akhir: {})", jalur.ends_with(&format!("/users/{uid}/profile")), jalur.replace(&uid.to_string(), "<uid>"));
    let _ = w.eval("fetch('https://auth.roblox.com/v2/logout',{method:'POST',credentials:'include'}).catch(()=>{})");
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    let isi = std::fs::read(&crash).unwrap_or_default();
    let baru = String::from_utf8_lossy(&isi[(panjang_awal as usize).min(isi.len())..]).to_string();
    catat!("logout diblokir (crash.log): {}", baru.contains("Blocked a Roblox sign-out"));
    catat!("cookie tersimpan masih hidup: {:?}", roblox::user_info_cek(&cookie).await.map(|i| i.user_id == uid).map_err(|(k, _)| k));
    catat!("buka lagi: {:?}, jumlah jendela situs: {}", buka_situs_inti(app.clone(), id.clone(), Some("profil".into()), Vec::new()).await,
        app.webview_windows().keys().filter(|l| l.starts_with(AWALAN_SITUS)).count());
    let profil_ada = || std::fs::read_dir(dirs::data_local_dir().unwrap_or_default().join("ChudaiAccountManager").join("login"))
        .map(|d| d.flatten().filter(|e| e.file_name().to_string_lossy().starts_with("situs-")).count()).unwrap_or(0);
    catat!("profil situs sebelum tutup: {}", profil_ada());
    let _ = w.close();
    tokio::time::sleep(std::time::Duration::from_secs(12)).await;
    catat!("jendela setelah tutup: {}", app.get_webview_window(&label).is_some());
    catat!("profil situs setelah tutup: {}", profil_ada());
    catat!("selesai");
    app.exit(0);
}

async fn probe_situs_tutup(app: tauri::AppHandle, alias: String, alias_lain: String) {
    let out = std::env::temp_dir().join("cam-probe-situs-tutup.txt");
    let mut log = String::new();
    macro_rules! catat { ($($t:tt)*) => {{ let b = format!($($t)*); log.push_str(&b); log.push('\n'); let _ = std::fs::write(&out, &log); }} }
    let ambil = |nama: &str| {
        let st = app.state::<AppState>();
        let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
        s.accounts.iter().find(|a| a.alias.eq_ignore_ascii_case(nama)).map(|a| (a.id.clone(), a.user_id, store::decrypt(&a.cookie_enc).unwrap_or_default()))
    };
    let (Some((id, uid, lama)), Some((_, uid_lain, cookie_lain))) = (ambil(&alias), ambil(&alias_lain)) else { catat!("akun tidak ada"); app.exit(0); return };
    catat!("dua akun berbeda: {}", uid != uid_lain);
    let baru = match roblox::refresh_cookie(&lama).await {
        Ok(c) => c,
        Err(e) => { catat!("refresh gagal: {}", store::samarkan_cookie(&e)); app.exit(0); return }
    };
    catat!("cookie baru berbeda: {}, valid untuk akun ini: {:?}", roblox::mentah(&baru) != roblox::mentah(&lama), roblox::user_info_cek(&baru).await.map(|i| i.user_id == uid).map_err(|(k, _)| k));
    let tersimpan = || ambil(&alias).map(|x| x.2).unwrap_or_default();
    let crash = store::berkas_data("crash.log");
    let label = label_situs(&id);
    for (nama, sisip, harap_disimpan) in [("akun sama", baru.clone(), true), ("akun lain", cookie_lain, false)] {
        let sebelum = tersimpan();
        let awal = std::fs::metadata(&crash).map(|m| m.len()).unwrap_or(0) as usize;
        catat!("[{nama}] buka: {:?}", buka_situs_inti(app.clone(), id.clone(), None, Vec::new()).await);
        tokio::time::sleep(std::time::Duration::from_secs(6)).await;
        let Some(w) = app.get_webview_window(&label) else { catat!("[{nama}] jendela hilang"); break };
        catat!("[{nama}] cookie jendela diganti: {:?}", pengaman::ganti_cookie_uji(&w, sisip.clone()).await);
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        let _ = w.close();
        tokio::time::sleep(std::time::Duration::from_secs(8)).await;
        let kini = tersimpan();
        let disimpan = roblox::mentah(&kini) == roblox::mentah(&sisip);
        let isi = std::fs::read(&crash).unwrap_or_default();
        let baris = String::from_utf8_lossy(&isi[awal.min(isi.len())..]).to_string();
        catat!("[{nama}] tersimpan berubah: {}, cookie jendela disimpan: {disimpan} (harap {harap_disimpan}), jendela masih ada: {}", roblox::mentah(&kini) != roblox::mentah(&sebelum), app.get_webview_window(&label).is_some());
        catat!("[{nama}] catatan: disimpan={} akun-lain={}", baris.contains("newer sign-in cookie"), baris.contains("signed in as another user"));
        catat!("[{nama}] cookie tersimpan valid: {:?}", roblox::user_info_cek(&kini).await.map(|i| i.user_id == uid).map_err(|(k, _)| k));
    }
    catat!("selesai");
    app.exit(0);
}

fn catat_masalah(store: &Mutex<Store>, daftar: &[pantau::Rejoin]) {
    let rincian: Vec<String> = daftar
        .iter()
        .map(|r| match r.masalah {
            pantau::Masalah::Crash => autopsi::periksa("crash", r.pid_terakhir, r.sejak, (r.terdeteksi - r.sejak).max(0), r.log.is_some()),
            pantau::Masalah::Macet => autopsi::periksa("macet", r.pid_terakhir, r.sejak, (r.terdeteksi - r.sejak).max(0), r.log.is_some()),
            _ => String::new(),
        })
        .collect();
    let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
    for (r, rincian) in daftar.iter().zip(rincian) {
        let jenis = match r.masalah {
            pantau::Masalah::Putus(_) => "putus",
            pantau::Masalah::Crash => "crash",
            pantau::Masalah::Macet => "macet",
            pantau::Masalah::Login(_) => "login",
        };
        let place_id = r.fakta.place.unwrap_or(r.tujuan.place_id);
        let game_name = if place_id == r.tujuan.place_id { r.tujuan.game_name.clone().unwrap_or_default() } else { String::new() };
        let jenis_kabar = match r.masalah {
            pantau::Masalah::Putus(_) => discord::Jenis::Putus,
            pantau::Masalah::Login(_) => discord::Jenis::Login,
            _ => discord::Jenis::Crash,
        };
        let id = bahasa::indonesia();
        let di_game = if game_name.is_empty() { String::new() } else { format!("{}{}", bahasa::pilih_untuk(id, " in ", " di "), discord::aman(&game_name)) };
        discord::kabar(jenis_kabar, &format!("**{}** {}{di_game}.", discord::aman(&r.alias), discord::aman(&r.masalah.teks_untuk(id))));
        s.masalah.push(store::CatatanMasalah {
            akun_id: r.akun_id.clone(),
            alias: r.alias.clone(),
            at: r.terdeteksi,
            jenis: jenis.into(),
            teks: r.masalah.teks(),
            place_id,
            game_name,
            umur_dtk: (r.terdeteksi - r.sejak).max(0),
            rincian,
        });
    }
    let lebih = s.masalah.len().saturating_sub(store::MAKS_MASALAH);
    s.masalah.drain(..lebih);
    let _ = s.save();
}

#[tauri::command]
fn daftar_masalah(state: State<AppState>) -> Vec<store::CatatanMasalah> {
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.masalah.iter().rev().cloned().collect()
}

#[tauri::command]
fn hapus_masalah(state: State<AppState>) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.masalah.clear();
    s.save()
}

fn catat_server_terakhir(store: &Mutex<Store>, kini: &[pantau::ServerKlien]) {
    catat_server_terakhir_di(store, kini, true)
}

fn catat_server_terakhir_di(store: &Mutex<Store>, kini: &[pantau::ServerKlien], simpan: bool) {
    if kini.is_empty() {
        return;
    }
    let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
    let mut ubah = false;
    for k in kini {
        let nama = if k.game_name.is_empty() {
            s.riwayat.iter().rev().find(|r| r.place_id == k.place_id && !r.game_name.starts_with("Place ")).map(|r| r.game_name.clone()).unwrap_or_default()
        } else {
            k.game_name.clone()
        };
        let Some(a) = s.find_mut(&k.akun_id) else { continue };
        let sama = a.server_terakhir.as_ref().is_some_and(|t| t.job_id == k.job_id && t.place_id == k.place_id && (nama.is_empty() || t.game_name == nama));
        if !sama {
            a.server_terakhir = Some(store::ServerTerakhir {
                place_id: k.place_id,
                job_id: k.job_id.clone(),
                game_name: nama,
                pribadi: k.pribadi,
                at: pantau::kini(),
            });
            ubah = true;
        }
    }
    if ubah && simpan {
        let _ = s.save();
    }
}

const BERKAS_PELACAK: &str = "pelacak.json";

fn tutup_klien(pid: u32) {
    let hidup = || launcher::pid_klien().contains(&pid);
    if jendela::tutup_game_milik(pid) > 0 {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        if hidup() {
            jendela::tutup_game_milik(pid);
            std::thread::sleep(std::time::Duration::from_millis(1500));
        }
    }
    if hidup() {
        jendela::tutup_semua_milik(pid);
    }
    std::thread::sleep(std::time::Duration::from_millis(400));
    if hidup() {
        jendela::tutup_semua_milik(pid);
    }
    let batas = std::time::Instant::now() + std::time::Duration::from_secs(5);
    while hidup() && std::time::Instant::now() < batas {
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    if hidup() {
        launcher::akhiri_klien(pid);
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
}

fn tutup_semua_klien_inti(pelacak: &pantau::Pelacak, paksa: bool) -> usize {
    pelacak.lepas_semua();
    pelacak.batal_rejoin.store(true, std::sync::atomic::Ordering::SeqCst);
    let pids = launcher::pid_klien();
    let n = pids.len();
    std::thread::scope(|sc| {
        for pid in pids {
            sc.spawn(move || {
                if paksa {
                    launcher::akhiri_klien(pid);
                } else {
                    tutup_klien(pid);
                }
            });
        }
    });
    if paksa {
        launcher::akhiri_tray_diam();
    }
    n
}

#[tauri::command]
async fn tutup_semua_klien(app: tauri::AppHandle, paksa: bool) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let st = app.state::<AppState>();
        let n = tutup_semua_klien_inti(&st.pelacak, paksa);
        st.pelacak.catat(
            format!("{} {n} Roblox client{}; pending rejoins cancelled.", if paksa { "Ended" } else { "Closed" }, if n == 1 { "" } else { "s" }),
            "info",
        );
        n
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn tutup_satu_klien(app: tauri::AppHandle, pid: u32) -> Result<(), String> {
    if !launcher::pid_klien().contains(&pid) {
        return Err("That client has already closed.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<AppState>().pelacak.lepas_pid(pid);
        tutup_klien(pid);
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn info_log_roblox() -> Result<rawat::InfoLog, String> {
    tauri::async_runtime::spawn_blocking(rawat::info_log).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn bersihkan_log_roblox() -> Result<(usize, f64), String> {
    tauri::async_runtime::spawn_blocking(rawat::bersihkan_log).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn jadwal_matikan(app: tauri::AppHandle, state: State<AppState>, menit: u32, tutup_klien: bool) -> Result<i64, String> {
    let detik = rawat::detik_sah(menit)?;
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.matikan_pada.take().is_some() {
        let _ = rawat::shutdown_exe(&["/a"]);
    }
    let (kode, teks) = rawat::shutdown_exe(&["/s", "/t", &detik.to_string()])?;
    if kode != 0 {
        return Err(format!("Windows wouldn't schedule the shutdown ({kode}): {teks}"));
    }
    let tenggat = pantau::kini() + detik as i64;
    s.matikan_pada = Some(tenggat);
    s.save()?;
    if tutup_klien {
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(u64::from(detik.saturating_sub(30))));
            let st = app.state::<AppState>();
            let masih = st.store.lock().unwrap_or_else(|e| e.into_inner()).matikan_pada == Some(tenggat);
            if masih {
                let n = tutup_semua_klien_inti(&st.pelacak, false);
                st.pelacak.catat(format!("Shutdown in 30 s: closed {n} Roblox client{}.", if n == 1 { "" } else { "s" }), "info");
            }
        });
    }
    Ok(tenggat)
}

#[tauri::command]
fn batal_matikan(state: State<AppState>) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    if s.matikan_pada.is_some() {
        let (kode, teks) = rawat::shutdown_exe(&["/a"])?;
        if kode != 0 && kode != 1116 {
            return Err(format!("Windows wouldn't call off the shutdown ({kode}): {teks}"));
        }
    }
    s.matikan_pada = None;
    s.save()
}

#[tauri::command]
fn status_matikan(state: State<AppState>) -> Option<i64> {
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.matikan_pada.filter(|&t| t > pantau::kini())
}

#[tauri::command]
async fn masalah_masuk(state: State<'_, AppState>, id: String, sejak: i64) -> Result<Option<&'static str>, String> {
    let btid = state.store.lock().unwrap_or_else(|e| e.into_inner()).find(&id).map(|a| a.browser_tracker_id).ok_or("Account not found.")?;
    tauri::async_runtime::spawn_blocking(move || {
        let f = pantau::dir_log().and_then(|d| pantau::cari_log(&d, btid, sejak)).map(|p| pantau::fakta_log(&p))?;
        if f.verifikasi {
            return Some("verifikasi");
        }
        if f.tolak_masuk && !f.di_game {
            for k in launcher::klien_terperinci().into_iter().filter(|k| k.btid == btid) {
                tutup_klien(k.pid);
            }
            return Some("tolak");
        }
        None
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn tutup_ke_tray(state: State<AppState>) -> bool {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).tutup_ke_tray
}

#[tauri::command]
fn set_tutup_ke_tray(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    s.tutup_ke_tray = aktif;
    s.save()?;
    Ok(aktif)
}

#[tauri::command]
fn hotkey_darurat(state: State<AppState>) -> bool {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).hotkey_darurat
}

#[tauri::command]
fn set_hotkey_darurat(state: State<AppState>, aktif: bool) -> Result<bool, String> {
    {
        let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        s.hotkey_darurat = aktif;
        s.save()?;
    }
    darurat::atur(aktif)?;
    Ok(aktif)
}

fn jalankan_pantau(k: &Konteks<'_>, sampai: Option<std::time::Instant>) {
    struct Antre {
        r: pantau::Rejoin,
        coba: u32,
        pada: i64,
        gagal_sejak: Option<i64>,
        kabar: i64,
    }
    struct Tunggu {
        akun_id: String,
        alias: String,
        uid: u64,
        sejak: i64,
    }
    let mut antre: std::collections::VecDeque<Antre> = std::collections::VecDeque::new();
    let mut tunggu: Option<Tunggu> = None;
    let dir = pantau::dir_log();
    let mut simpanan_terakhir = String::new();
    let mut putaran: u64 = 0;
    loop {
        if sampai.is_some_and(|s| std::time::Instant::now() >= s) {
            return;
        }
        std::thread::sleep(std::time::Duration::from_secs(pantau::PUTARAN_DTK as u64));
        putaran += 1;
        if k.pelacak.batal_rejoin.swap(false, std::sync::atomic::Ordering::SeqCst) {
            let n = antre.len() + usize::from(tunggu.is_some());
            antre.clear();
            tunggu = None;
            if n > 0 {
                k.pelacak.catat(format!("Cancelled {n} pending rejoin{}.", if n == 1 { "" } else { "s" }), "info");
            }
        }
        if sampai.is_none() && putaran % 5 == 0 {
            let json = k.pelacak.ekspor();
            if json != simpanan_terakhir {
                if let Ok(enc) = store::encrypt(&json) {
                    let berkas = store::berkas_data(BERKAS_PELACAK);
                    let tmp = berkas.with_extension("json.tmp");
                    if std::fs::write(&tmp, enc).and_then(|_| std::fs::rename(&tmp, &berkas)).is_ok() {
                        simpanan_terakhir = json;
                    }
                }
            }
        }

        if k.pelacak.jumlah_diikuti() > 0 {
            let proses: Vec<(u32, u64)> = launcher::klien_terperinci().into_iter().map(|x| (x.pid, x.btid)).collect();
            let macet = jendela::pid_macet();
            let rejoin = k.pelacak.periksa(&proses, &macet, dir.as_deref());
            if sampai.is_none() {
                catat_server_terakhir(k.store, &k.pelacak.server_terkini());
            }
            if sampai.is_none() && !rejoin.is_empty() {
                catat_masalah(k.store, &rejoin);
            }
            for r in rejoin {
                if let pantau::Masalah::Login(_) = r.masalah {
                    k.pelacak.catat(
                        format!(
                            "{} {}. Not rejoined: a new client would hit the same problem. Sign in to {} again (Add Account → Log in with browser) or check the account on roblox.com.",
                            r.alias,
                            r.masalah.teks(),
                            r.alias
                        ),
                        "salah",
                    );
                    continue;
                }
                let aktif = {
                    let s = k.store.lock().unwrap_or_else(|e| e.into_inner());
                    match s.find(&r.akun_id) {
                        Some(a) => a.auto_rejoin,
                        None => continue,
                    }
                };
                if !aktif {
                    k.pelacak.catat(format!("{} {}. Auto-rejoin is off for this account.", r.alias, r.masalah.teks()), "salah");
                    continue;
                }
                let (boleh, n) = k.pelacak.boleh_rejoin(&r.akun_id);
                if !boleh {
                    discord::kabar(
                        discord::Jenis::Crash,
                        &bahasa::pilih(
                            &format!("**{}**: auto-rejoin gave up after {} relaunches in 15 minutes.", discord::aman(&r.alias), pantau::MAKS_REJOIN),
                            &format!("**{}**: gabung ulang otomatis menyerah setelah {} kali diluncurkan ulang dalam 15 menit.", discord::aman(&r.alias), pantau::MAKS_REJOIN),
                        ),
                    );
                    k.pelacak.catat(
                        format!(
                            "{} {}. Auto-rejoin stopped: it relaunched {} times in 15 minutes. Check the account or the game, then launch it again.",
                            r.alias,
                            r.masalah.teks(),
                            pantau::MAKS_REJOIN
                        ),
                        "salah",
                    );
                    continue;
                }
                let jeda = pantau::jeda_rejoin(n) as i64;
                k.pelacak.catat(format!("{} {}. Rejoining in {jeda} s.", r.alias, r.masalah.teks()), "salah");
                antre.push_back(Antre { r, coba: 0, pada: pantau::kini() + jeda, gagal_sejak: None, kabar: 0 });
            }
        }

        if let Some(w) = &tunggu {
            if joinlog::jumlah_join_sejak(w.sejak) > 0 {
                std::thread::sleep(std::time::Duration::from_secs(2));
                let terbaca = sesi::userid_log_sejak(w.sejak);
                match sesi::cek_akun(&terbaca, w.uid) {
                    sesi::CekAkun::Salah(lain) => {
                        let btid = k.store.lock().unwrap_or_else(|e| e.into_inner()).find(&w.akun_id).map(|a| a.browser_tracker_id).unwrap_or(0);
                        for x in launcher::klien_terperinci().into_iter().filter(|x| x.btid == btid) {
                            tutup_klien(x.pid);
                        }
                        k.pelacak.catat(
                            format!("Sign-in check: {}'s rejoined client signed in as another account (user ID {lain}), so it was closed.", w.alias),
                            "salah",
                        );
                    }
                    _ => {
                        k.pelacak.catat(format!("{} rejoined.", w.alias), "benar");
                        discord::kabar(
                            discord::Jenis::Rejoin,
                            &bahasa::pilih(&format!("**{}** rejoined.", discord::aman(&w.alias)), &format!("**{}** bergabung ulang.", discord::aman(&w.alias))),
                        );
                        let (btid, lebar, minim) = {
                            let s = k.store.lock().unwrap_or_else(|e| e.into_inner());
                            s.find(&w.akun_id).map(|a| (a.browser_tracker_id, a.mulai_kecil, a.hemat && a.hemat_minimize)).unwrap_or((0, 0, false))
                        };
                        std::thread::spawn(move || atur_jendela_setelah_join(btid, lebar, minim));
                    }
                }
                tunggu = None;
            } else if pantau::kini() - w.sejak > 120 {
                k.pelacak.catat(format!("{} did not finish joining within 2 minutes after the rejoin.", w.alias), "salah");
                tunggu = None;
            } else {
                continue;
            }
        }

        if k.pelacak.antrean_ui.load(std::sync::atomic::Ordering::SeqCst) {
            continue;
        }
        let Some(pos) = antre.iter().position(|a| a.pada <= pantau::kini()) else { continue };
        let Some(mut a) = antre.remove(pos) else { continue };
        let (masih, uid, btid_akun) = {
            let s = k.store.lock().unwrap_or_else(|e| e.into_inner());
            s.find(&a.r.akun_id).map(|x| (x.auto_rejoin && !k.pelacak.ditahan(&a.r.akun_id), x.user_id, x.browser_tracker_id)).unwrap_or((false, 0, 0))
        };
        if !masih {
            continue;
        }
        let proses: Vec<(u32, u64)> = launcher::klien_terperinci().into_iter().map(|x| (x.pid, x.btid)).collect();
        if a.coba == 0 {
            if let Some(alasan) = k.pelacak.cek_ulang(&mut a.r, &proses, &jendela::pid_macet()) {
                k.pelacak.catat(format!("{}: rejoin cancelled, {alasan}.", a.r.alias), "info");
                continue;
            }
        }
        let multi = k.singleton.lock().unwrap_or_else(|e| e.into_inner()).aktif();
        if !multi && proses.iter().any(|(pid, b)| *b != btid_akun && Some(*pid) != a.r.pid_lama) {
            k.pelacak.catat(
                format!(
                    "Auto-rejoin skipped for {}: multi-instance is off and other Roblox clients are open, so a new client would close them. Turn multi-instance on, then launch {} again.",
                    a.r.alias, a.r.alias
                ),
                "salah",
            );
            continue;
        }
        if !k.pelacak.boleh_rejoin(&a.r.akun_id).0 {
            k.pelacak.catat(
                format!(
                    "Auto-rejoin stopped for {}: it relaunched {} times in 15 minutes. Check the account or the game, then launch it again.",
                    a.r.alias,
                    pantau::MAKS_REJOIN
                ),
                "salah",
            );
            continue;
        }
        let anggaran_mb = k.store.lock().unwrap_or_else(|e| e.into_inner()).anggaran_ram_mb;
        if anggaran_mb > 0 {
            let klien = launcher::klien_terperinci();
            let snap = sumber::snapshot();
            let s = k.store.lock().unwrap_or_else(|e| e.into_inner());
            let tambahan = s.find(&a.r.akun_id).map_or(0.0, |x| ram_akun_mb(&s, x));
            let c = anggaran::cek(anggaran_mb, ram_dipakai_mb(&s, &klien, &snap, a.r.pid_lama), tambahan);
            drop(s);
            if c.lewat {
                let kini = pantau::kini();
                a.pada = kini + 30;
                if kini - a.kabar >= 5 * 60 {
                    a.kabar = kini;
                    k.pelacak.catat(
                        format!(
                            "Rejoining {} is waiting for RAM: clients use about {:.1} GB of the {:.1} GB budget and this one needs about {:.1} GB. CAM rejoins it when there is room.",
                            a.r.alias,
                            c.dipakai_mb / 1024.0,
                            f64::from(anggaran_mb) / 1024.0,
                            c.tambahan_mb / 1024.0
                        ),
                        "salah",
                    );
                }
                antre.push_back(a);
                continue;
            }
        }
        if let Some(pid) = a.r.pid_lama.take() {
            tutup_klien(pid);
        }
        let mut t = a.r.tujuan.clone();
        if a.coba > 0 {
            t.job_id = None;
        }
        let sejak = pantau::kini();
        match tauri::async_runtime::block_on(luncurkan_terlacak(k, a.r.akun_id.clone(), t)) {
            Ok(catatan) => {
                if !catatan.is_empty() {
                    k.pelacak.catat(format!("{}: {catatan}", a.r.alias), "info");
                }
                k.pelacak.catat_rejoin(&a.r.akun_id);
                tunggu = Some(Tunggu { akun_id: a.r.akun_id.clone(), alias: a.r.alias.clone(), uid, sejak });
            }
            Err(e) if pantau::galat_sementara(&e) => {
                let kini = pantau::kini();
                let awal = *a.gagal_sejak.get_or_insert(kini);
                a.coba += 1;
                if kini - awal > 60 * 60 {
                    k.pelacak.catat(format!("Auto-rejoin gave up on {} after an hour of failed tries: {e}", a.r.alias), "salah");
                } else {
                    let j = (15i64 << (a.coba - 1).min(3)).min(120);
                    if kini - a.kabar >= 5 * 60 {
                        a.kabar = kini;
                        k.pelacak.catat(
                            format!("Rejoining {} is waiting: {e}. CAM keeps trying for up to an hour (next try in {j} s).", a.r.alias),
                            "salah",
                        );
                    }
                    a.pada = kini + j;
                    antre.push_back(a);
                }
            }
            Err(e) => {
                k.pelacak.catat(format!("Auto-rejoin stopped for {}: {e}", a.r.alias), "salah");
            }
        }
    }
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
    proteksi: Option<&sesi::Proteksi>,
) -> Result<String, String> {
    luncurkan_inti_fps(store, id, place_id, job_id, link_code, access_code, share_code, follow_user_id, game_name, icon_url, proteksi, None).await
}

#[allow(clippy::too_many_arguments)]
async fn luncurkan_inti_fps(
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
    proteksi: Option<&sesi::Proteksi>,
    fps_sekali: Option<u32>,
) -> Result<String, String> {
    let share_code = share_code.as_deref().map(str::trim).unwrap_or("").to_string();
    let follow_user_id = follow_user_id.unwrap_or(0);
    if place_id == 0 && share_code.is_empty() && follow_user_id == 0 {
        return Err("No game selected.".into());
    }

    let (cookie, btid, nama, avatar, fps_cap, klien, fflags, fflags_pernah, hemat_akun, grafis_akun, ram_mb, hemat_fps, argumen) = {
        let s = store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        let argumen = launcher::argumen_untuk(a.argumen_luncur.as_deref(), &s.argumen_luncur)?;
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
            performa::kebijakan_akun(a, s.grafis_ringan).grafis_rendah.nilai,
            a.hemat_ram_mb,
            a.hemat_fps,
            argumen,
        )
    };

    let klien = if klien.trim().is_empty() {
        let alih = store.lock().unwrap_or_else(|e| e.into_inner()).versi_alih.clone();
        launcher::exe_klien("")
            .and_then(|auto| launcher::pilih_alih(&auto, alih.as_ref(), |p| std::path::Path::new(p).exists()))
            .unwrap_or(klien)
    } else {
        klien
    };

    let versi_dipin = !store.lock().unwrap_or_else(|e| e.into_inner()).klien_path.trim().is_empty();
    let ada_klien = !launcher::klien_terperinci().is_empty();
    if ada_klien && !versi_dipin {
        let live = unduh::versi_live().await;
        if unduh::tahan_update(ada_klien, versi_dipin, live.as_deref(), unduh::terpasang) {
            return Err(unduh::PESAN_TAHAN_UPDATE.into());
        }
    }
    let resmi = {
        let langsung = hemat_akun || !argumen.is_empty();
        let live = if langsung && !versi_dipin { unduh::versi_live().await } else { None };
        unduh::lewat_peluncur_resmi(versi_dipin, langsung, live.as_deref(), unduh::terpasang)
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
        (None, None) if access_code.as_deref().is_some_and(|a| !a.trim().is_empty()) => Tujuan::Pribadi {
            place_id,
            link_code: String::new(),
            access_code: access_code.as_deref().unwrap_or("").trim().to_string(),
        },
        _ => Tujuan::Publik { place_id },
        }
    };

    if harus_akhiri_tray(resmi, PROBE_BIARKAN_TRAY.load(std::sync::atomic::Ordering::Relaxed)) {
        launcher::akhiri_tray_diam();
    }

    let mut kelola = fflags.clone();
    let mut pernah = fflags_pernah.clone();
    for (k, v) in hemat::flag_hemat() {
        if !pernah.contains(&k) {
            pernah.push(k.clone());
        }
        if grafis_akun && !fflags.contains_key(&k) {
            kelola.insert(k, v);
        }
    }
    let kunci_setelan = setelan_fps::KUNCI.lock().await;
    let _ = fps::terapkan(Some(0), &klien, &kelola, &pernah);

    let target_cap = match fps_sekali.filter(|&f| f > 0) {
        Some(f) => Some(f as i32),
        None => hemat::target_cap(fps_cap, hemat_akun, hemat_fps),
    };
    let (galat_cap, cap_asli, cap_kami) = {
        let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
        let (mut asli, mut kami) = (s.cap_asli, s.cap_kami.clone());
        let r = setelan_fps::tulis_peluncuran(target_cap, &mut asli, &mut kami);
        s.cap_asli = asli;
        s.cap_kami = kami.clone();
        let _ = s.save();
        (r.err(), asli, kami)
    };
    let pulih_flag = {
        let (k, f, p) = (klien.clone(), fflags.clone(), pernah.clone());
        move || {
            if let Err(e) = fps::terapkan(Some(0), &k, &f, &p) {
                store::catat_kejadian(&format!("Couldn't remove this launch's graphics flags: {e}. CAM clears them at its next start."));
            }
        }
    };
    let detik_luncur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let _luncur = proteksi.map(|p| p.mulai_luncur());
    let proteksi_kurang = proteksi.map(|p| p.status()).filter(|&(_, n, total)| n < total);

    let mut peringatan_hemat: Option<String> = None;
    let exe_pilihan = if klien.is_empty() { None } else { Some(klien.as_str()) };
    let hasil_luncur: Result<(), String> = (|| {
    if resmi {
        return launcher::luncurkan(&ticket, &tujuan, btid, None, &[]);
    }
    match (hemat_akun, launcher::exe_klien(&klien)) {
        (true, Some(exe)) => {
            let dibuat = launcher::luncurkan_terbatas(
                &ticket,
                &tujuan,
                btid,
                &exe,
                launcher::OpsiProses {
                    batas_ws_mb: (ram_mb > 0).then_some(ram_mb as u64),
                    prioritas_rendah: true,
                    argumen: argumen.clone(),
                    ..Default::default()
                },
            )?;
            launcher::catat_peluncuran(btid, dibuat.pid, &exe);
            performa::catat(btid, performa::CatatanKebijakan {
                pid: dibuat.pid,
                mulai: dibuat.mulai,
                ws_mb: (ram_mb > 0).then_some(ram_mb),
                ws_terpasang: dibuat.ws_terpasang,
                prioritas_rendah: true,
            });
            peringatan_hemat = dibuat.peringatan;
        }
        _ => launcher::luncurkan(&ticket, &tujuan, btid, exe_pilihan, &argumen)?,
    }
    Ok(())
    })();
    if let Err(e) = hasil_luncur {
        setelan_fps::pulihkan(cap_asli, &cap_kami);
        pulih_flag();
        return Err(e);
    }
    if grafis_akun || target_cap.is_some() {
        tauri::async_runtime::spawn(setelan_fps::tunggu_lalu_pulihkan(
            kunci_setelan, btid, detik_luncur, target_cap, cap_asli, cap_kami, pulih_flag,
        ));
    } else {
        drop(kunci_setelan);
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
        let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
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

    let mut catatan: Vec<String> = Vec::new();
    if resmi {
        catatan.push(format!("Note: {}", unduh::PESAN_PELUNCUR_RESMI));
    }
    if let Some(w) = peringatan_hemat {
        catatan.push(format!("Warning: {w}."));
    }
    if let Some(e) = galat_cap.filter(|_| target_cap.is_some()) {
        catatan.push(format!("Warning: FPS limit not applied ({e})."));
    }
    if let Some((_, n, total)) = proteksi_kurang {
        catatan.push(format!("Warning: sign-in protection locked only {n} of {total} Roblox sign-in files (another program is using them)."));
    }
    Ok(catatan.join(" "))
}

#[derive(Serialize)]
struct HalamanServer {
    servers: Vec<roblox::ServerInfo>,
    cursor: String,
}

#[tauri::command]
async fn daftar_server(place_id: u64, cursor: String, penuh_dulu: Option<bool>, tanpa_penuh: Option<bool>) -> Result<HalamanServer, String> {
    let (servers, cursor) = roblox::daftar_server_urut(place_id, &cursor, penuh_dulu.unwrap_or(false), tanpa_penuh.unwrap_or(false), None).await?;
    Ok(HalamanServer { servers, cursor })
}

fn bagi_server_sepi(servers: &[roblox::ServerInfo], n: usize) -> Vec<String> {
    let mut calon: Vec<&roblox::ServerInfo> = servers.iter().filter(|s| pantau::adalah_uuid(&s.job_id) && s.max_players > 0 && s.playing < s.max_players).collect();
    calon.sort_by_key(|s| s.playing);
    let mut dikirim = vec![0u32; calon.len()];
    (0..n)
        .map(|i| {
            let k = if i < calon.len() {
                Some(i)
            } else {
                (0..calon.len()).filter(|&k| calon[k].playing + dikirim[k] < calon[k].max_players).min_by_key(|&k| calon[k].playing + dikirim[k])
            };
            match k {
                Some(k) => {
                    dikirim[k] += 1;
                    calon[k].job_id.clone()
                }
                None => String::new(),
            }
        })
        .collect()
}

#[tauri::command]
async fn server_sepi(place_id: u64, n: u32) -> Result<Vec<String>, String> {
    let (servers, _) = roblox::daftar_server_urut(place_id, "", false, true, None).await?;
    Ok(bagi_server_sepi(&servers, n as usize))
}

fn pilih_server_muat(servers: &[roblox::ServerInfo], n: u32) -> Option<String> {
    let terpenuh = |sisa: u32| {
        servers
            .iter()
            .filter(|s| pantau::adalah_uuid(&s.job_id) && s.max_players > 0)
            .filter(|s| s.playing + n + sisa <= s.max_players)
            .max_by_key(|s| s.playing)
    };
    terpenuh(1).or_else(|| terpenuh(0)).map(|s| s.job_id.clone())
}

#[tauri::command]
async fn pilih_server_bersama(state: State<'_, AppState>, id: String, place_id: u64, n: u32) -> Result<Option<String>, String> {
    let cookie = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        store::decrypt(&s.find(&id).ok_or("Account not found.")?.cookie_enc)?
    };
    pilih_server_dengan(&cookie, place_id, n).await
}

async fn pilih_server_dengan(cookie: &str, place_id: u64, n: u32) -> Result<Option<String>, String> {
    let mut kursor = String::new();
    for _ in 0..5 {
        let (servers, lanjut) = roblox::daftar_server_urut(place_id, &kursor, true, true, Some(cookie)).await?;
        if let Some(j) = pilih_server_muat(&servers, n) {
            return Ok(Some(j));
        }
        if lanjut.is_empty() {
            break;
        }
        kursor = lanjut;
    }
    let (servers, _) = roblox::daftar_server_urut(place_id, "", false, true, Some(cookie)).await?;
    Ok(pilih_server_muat(&servers, n))
}

#[derive(Serialize, Clone, Debug, PartialEq)]
struct ServerJoin {
    place_id: u64,
    job_id: String,
}

#[tauri::command]
async fn server_join_akun(state: State<'_, AppState>, id: String, sejak: i64) -> Result<Option<ServerJoin>, String> {
    let (btid, uid, cookie) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        (a.browser_tracker_id, a.user_id, store::decrypt(&a.cookie_enc)?)
    };
    let dari_log = tauri::async_runtime::spawn_blocking(move || {
        let dir = pantau::dir_log()?;
        let f = pantau::fakta_log(&pantau::cari_log(&dir, btid, sejak)?);
        Some(ServerJoin { place_id: f.place.filter(|&p| p > 0)?, job_id: f.job.filter(|j| pantau::adalah_uuid(j))? })
    })
    .await
    .ok()
    .flatten();
    if dari_log.is_some() {
        return Ok(dari_log);
    }
    Ok(roblox::kehadiran_pemain(&cookie, uid)
        .await
        .filter(|(p, j)| *p > 0 && pantau::adalah_uuid(j))
        .map(|(place_id, job_id)| ServerJoin { place_id, job_id }))
}

#[derive(Serialize)]
struct CalonIkuti {
    user_id: u64,
    username: String,
    display_name: String,
    status: String,
    lokasi: String,
    place_id: u64,
    job_id: String,
    akun_cam: bool,
}

#[tauri::command]
async fn calon_ikuti(state: State<'_, AppState>, id: String) -> Result<Vec<CalonIkuti>, String> {
    let (cookie, uid, akun) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&id).ok_or("Account not found.")?;
        let akun: Vec<(String, String, String)> = s.accounts.iter().map(|x| (x.id.clone(), x.username.clone(), x.display_name.clone())).collect();
        (store::decrypt(&a.cookie_enc)?, a.user_id, akun)
    };
    let mut hasil: Vec<CalonIkuti> = Vec::new();
    for k in state.pelacak.server_terkini().into_iter().filter(|k| k.akun_id != id && !k.pribadi) {
        let (un, dn) = akun.iter().find(|a| a.0 == k.akun_id).map(|a| (a.1.clone(), a.2.clone())).unwrap_or((k.alias.clone(), String::new()));
        hasil.push(CalonIkuti {
            user_id: k.uid,
            username: if un.is_empty() { k.alias.clone() } else { un },
            display_name: dn,
            status: "InGame".into(),
            lokasi: if k.game_name.is_empty() { format!("Place {}", k.place_id) } else { k.game_name },
            place_id: k.place_id,
            job_id: k.job_id,
            akun_cam: true,
        });
    }
    let teman = roblox::teman_online(&cookie, uid).await?;
    let cam: Vec<u64> = hasil.iter().map(|h| h.user_id).collect();
    for t in teman.into_iter().filter(|t| !cam.contains(&t.user_id)) {
        hasil.push(CalonIkuti {
            user_id: t.user_id,
            username: t.username,
            display_name: t.display_name,
            status: t.status,
            lokasi: t.lokasi,
            place_id: t.place_id,
            job_id: String::new(),
            akun_cam: false,
        });
    }
    Ok(hasil)
}

#[derive(Serialize, Debug, PartialEq)]
struct ServerPribadiGabungan {
    #[serde(flatten)]
    server: roblox::ServerPribadi,
    akses: Vec<String>,
    terlihat: Vec<String>,
}

#[derive(Serialize)]
struct PribadiSemua {
    servers: Vec<ServerPribadiGabungan>,
    diperiksa: usize,
    gagal: Vec<String>,
}

fn gabung_pribadi(per_akun: Vec<(String, Vec<roblox::ServerPribadi>)>) -> Vec<ServerPribadiGabungan> {
    let mut hasil: Vec<ServerPribadiGabungan> = Vec::new();
    for (id, daftar) in per_akun {
        for s in daftar {
            let i = match hasil.iter().position(|x| s.vip_id != 0 && x.server.vip_id == s.vip_id) {
                Some(i) => i,
                None => {
                    hasil.push(ServerPribadiGabungan { server: roblox::ServerPribadi { access_code: String::new(), ..s.clone() }, akses: Vec::new(), terlihat: Vec::new() });
                    hasil.len() - 1
                }
            };
            let g = &mut hasil[i];
            if !g.terlihat.contains(&id) {
                g.terlihat.push(id.clone());
            }
            if !s.access_code.is_empty() {
                if g.server.access_code.is_empty() {
                    g.server.access_code = s.access_code.clone();
                }
                if s.access_code == g.server.access_code && !g.akses.contains(&id) {
                    g.akses.push(id.clone());
                }
            }
            if g.server.job_id.is_empty() && !s.job_id.is_empty() {
                (g.server.job_id, g.server.playing) = (s.job_id.clone(), s.playing);
            }
        }
    }
    hasil
}

#[tauri::command]
async fn daftar_server_pribadi_semua(state: State<'_, AppState>, place_id: u64) -> Result<PribadiSemua, String> {
    let akun: Vec<(String, String, String)> = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        s.accounts
            .iter()
            .filter(|a| a.last_error.is_empty() && a.pembatasan.is_none())
            .filter_map(|a| store::decrypt(&a.cookie_enc).ok().filter(|c| !c.is_empty()).map(|c| (a.id.clone(), a.alias.clone(), c)))
            .collect()
    };
    if akun.is_empty() {
        return Err("No usable account: every account is signed out or restricted by Roblox.".into());
    }
    let diperiksa = akun.len();
    let mut per_akun = Vec::new();
    let mut gagal = Vec::new();
    for (k, (id, alias, cookie)) in akun.into_iter().enumerate() {
        if k > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        }
        let mut daftar = Vec::new();
        let mut cursor = String::new();
        for _ in 0..5 {
            match roblox::server_pribadi(&cookie, place_id, &cursor).await {
                Ok((d, c)) => {
                    daftar.extend(d);
                    if c.is_empty() {
                        break;
                    }
                    cursor = c;
                }
                Err(e) => {
                    gagal.push(format!("{alias}: {e}"));
                    break;
                }
            }
        }
        per_akun.push((id, daftar));
    }
    if gagal.len() == diperiksa {
        return Err(gagal.join(" "));
    }
    Ok(PribadiSemua { servers: gabung_pribadi(per_akun), diperiksa, gagal })
}

#[cfg(test)]
mod tes_server_sepi {
    use super::*;

    fn s(c: char, playing: u32, max: u32) -> roblox::ServerInfo {
        roblox::ServerInfo { job_id: format!("{}-d9f8-497a-b266-7bd9d7060a4c", c.to_string().repeat(8)), playing, max_players: max, fps: 60.0, ping: 50 }
    }

    #[test]
    fn tiap_akun_server_sendiri_paling_sepi_dulu() {
        let daftar = [s('c', 9, 12), s('a', 1, 12), s('b', 3, 12), s('d', 12, 12)];
        let j = bagi_server_sepi(&daftar, 3);
        assert_eq!(j, [daftar[1].job_id.clone(), daftar[2].job_id.clone(), daftar[0].job_id.clone()], "fewest players first, one each; full one left out");
    }

    #[test]
    fn lebih_banyak_akun_dari_server_dibagi_ke_yang_masih_muat() {
        let daftar = [s('a', 1, 4), s('b', 2, 4)];
        let j = bagi_server_sepi(&daftar, 5);
        assert_eq!(j[0], daftar[0].job_id);
        assert_eq!(j[1], daftar[1].job_id);
        assert_eq!(j[2], daftar[0].job_id);
        assert_eq!(j.iter().filter(|x| **x == daftar[0].job_id).count(), 3, "a fills up to 4");
        assert_eq!(j.iter().filter(|x| **x == daftar[1].job_id).count(), 2, "b to 4");
        assert_eq!(bagi_server_sepi(&daftar, 6)[5], "", "no room left: Roblox picks");
        assert_eq!(bagi_server_sepi(&[], 2), ["", ""]);
    }
}

#[cfg(test)]
mod tes_pribadi_gabung {
    use super::*;

    fn s(vip: u64, nama: &str, kode: &str, job: &str) -> roblox::ServerPribadi {
        roblox::ServerPribadi { vip_id: vip, nama: nama.into(), pemilik: "o".into(), playing: if job.is_empty() { 0 } else { 3 }, max_players: 20, job_id: job.into(), access_code: kode.into() }
    }

    #[test]
    fn server_sama_dari_dua_akun_jadi_satu_dengan_daftar_akses() {
        let g = gabung_pribadi(vec![
            ("a".into(), vec![s(1, "R1", "kode1", ""), s(2, "Farm", "", "")]),
            ("b".into(), vec![s(1, "R1", "kode1", "job1"), s(3, "Event", "kode3", "")]),
            ("c".into(), vec![s(2, "Farm", "kode2", "")]),
        ]);
        assert_eq!(g.iter().map(|x| x.server.nama.as_str()).collect::<Vec<_>>(), ["R1", "Farm", "Event"], "no duplicates, first-seen order");
        assert_eq!(g[0].akses, ["a", "b"]);
        assert_eq!(g[0].terlihat, ["a", "b"]);
        assert_eq!((g[0].server.job_id.as_str(), g[0].server.playing), ("job1", 3), "running state from whoever sees it");
        assert_eq!(g[1].akses, ["c"], "a sees Farm but can't join it");
        assert_eq!(g[1].server.access_code, "kode2", "the code comes from an account that has it");
        assert_eq!(g[1].terlihat, ["a", "c"]);
        assert!(gabung_pribadi(vec![("a".into(), vec![])]).is_empty());
    }

    #[test]
    fn vip_id_nol_tidak_pernah_digabung_dan_kode_lain_tidak_dianggap_akses() {
        let g = gabung_pribadi(vec![("a".into(), vec![s(0, "X", "kx", ""), s(0, "Y", "ky", "")])]);
        assert_eq!(g.iter().map(|x| x.server.nama.as_str()).collect::<Vec<_>>(), ["X", "Y"]);
        let g = gabung_pribadi(vec![("a".into(), vec![s(7, "R", "kode-a", "")]), ("b".into(), vec![s(7, "R", "kode-b", "")])]);
        assert_eq!((g[0].server.access_code.as_str(), g[0].akses.clone()), ("kode-a", vec!["a".to_string()]));
        assert_eq!(g[0].terlihat, ["a", "b"]);
    }
}

#[cfg(test)]
mod tes_d1 {
    use super::*;

    fn s(job: &str, playing: u32, max: u32) -> roblox::ServerInfo {
        roblox::ServerInfo { job_id: job.into(), playing, max_players: max, fps: 60.0, ping: 50 }
    }
    const A: &str = "aaaaaaaa-d9f8-497a-b266-7bd9d7060a4c";
    const B: &str = "bbbbbbbb-d9f8-497a-b266-7bd9d7060a4c";
    const C: &str = "cccccccc-d9f8-497a-b266-7bd9d7060a4c";

    #[test]
    fn server_terakhir_memakai_nama_dari_riwayat() {
        let mut s = Store::default();
        s.accounts.push(Account { id: "x".into(), ..Default::default() });
        s.riwayat.push(store::Riwayat { place_id: 189707, game_name: "Natural Disaster Survival".into(), ..Default::default() });
        let m = Mutex::new(s);
        let k = pantau::ServerKlien { akun_id: "x".into(), alias: "x".into(), uid: 1, place_id: 189707, job_id: A.into(), pribadi: false, game_name: String::new() };
        catat_server_terakhir_di(&m, &[k.clone()], false);
        catat_server_terakhir_di(&m, &[k], false);
        let st = m.lock().unwrap().find("x").unwrap().server_terakhir.clone().unwrap();
        assert_eq!((st.game_name.as_str(), st.job_id.as_str()), ("Natural Disaster Survival", A));
    }

    #[test]
    fn pilih_yang_terpenuh_dengan_kursi_sisa() {
        assert_eq!(pilih_server_muat(&[s(C, 2, 12), s(A, 8, 12), s(B, 9, 12)], 3).as_deref(), Some(A));
        assert_eq!(pilih_server_muat(&[s(B, 9, 12)], 3).as_deref(), Some(B));
        assert_eq!(pilih_server_muat(&[s(B, 10, 12)], 3), None);
        assert_eq!(pilih_server_muat(&[s("bukan-guid", 1, 50)], 3), None);
    }
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
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    F: Fn(String, u64, u64) -> Fut,
    Fut: std::future::Future<Output = Result<(), String>>,
{
    let sasaran: Vec<(String, String, u64, u64)> = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        akun_ids
            .iter()
            .filter_map(|id| s.find(id))
            .filter_map(|a| {
                store::decrypt(&a.cookie_enc)
                    .ok()
                    .map(|c| (a.alias.clone(), c, a.user_id, a.browser_tracker_id))
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
    for (alias, cookie, uid, btid) in sasaran {
        match f(cookie, uid, btid).await {
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
    untuk_tiap_akun(&state, akun_ids, |cookie, uid, btid| async move {
        roblox::blokir(&cookie, btid, uid, user_id, buka).await
    })
    .await
}

#[tauri::command]
async fn tambah_teman(
    state: State<'_, AppState>,
    akun_ids: Vec<String>,
    user_id: u64,
) -> Result<HasilMassal, String> {
    untuk_tiap_akun(&state, akun_ids, |cookie, _, _| async move {
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
    untuk_tiap_akun(&state, akun_ids, |cookie, uid, _| {
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
    let (cookie, btid, uid) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&akun_id).ok_or("Account not found.")?;
        (store::decrypt(&a.cookie_enc)?, a.browser_tracker_id, a.user_id)
    };
    Ok(roblox::daftar_diblokir(&cookie, btid, uid)
        .await?
        .into_iter()
        .map(|(user_id, nama)| UserDiblokir { user_id, nama })
        .collect())
}

#[tauri::command]
async fn buka_blokir_semua(state: State<'_, AppState>, akun_id: String) -> Result<usize, String> {
    let (cookie, btid, uid) = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s.find(&akun_id).ok_or("Account not found.")?;
        (store::decrypt(&a.cookie_enc)?, a.browser_tracker_id, a.user_id)
    };
    let mut total = 0;
    for _ in 0..20 {
        let daftar = roblox::daftar_diblokir(&cookie, btid, uid).await?;
        if daftar.is_empty() {
            break;
        }
        let mut maju = 0;
        for (id, _) in daftar {
            if roblox::blokir(&cookie, btid, uid, id, true).await.is_ok() {
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

#[derive(Serialize)]
struct JendelaView {
    #[serde(flatten)]
    info: jendela::JendelaInfo,
    alias: String,
    klien_w: u32,
    klien_h: u32,
    kecil: bool,
    minimize: bool,
}

#[tauri::command]
fn daftar_jendela(state: State<AppState>) -> Vec<JendelaView> {
    let proses = launcher::klien_terperinci();
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    jendela::daftar()
        .into_iter()
        .map(|info| {
            let btid = proses.iter().find(|p| p.pid == info.pid).map(|p| p.btid).unwrap_or(0);
            let alias = s.accounts.iter().find(|a| btid != 0 && a.browser_tracker_id == btid).map(|a| a.alias.clone()).unwrap_or_default();
            let (klien_w, klien_h) = kecil::ukuran_klien(info.hwnd).unwrap_or((0, 0));
            let kecil_ = kecil::ukuran_kecil(info.hwnd).is_some();
            let minimize = kecil::minimize(info.hwnd);
            JendelaView { info, alias, klien_w, klien_h, kecil: kecil_, minimize }
        })
        .collect()
}

#[tauri::command]
async fn jendela_kecil(hwnd: usize, lebar: u32) -> Result<(u32, u32), String> {
    let w = store::lebar_kecil_sah(lebar).max(160);
    tauri::async_runtime::spawn_blocking(move || kecil::kecilkan(hwnd, w, store::tinggi_kecil(w))).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn jendela_normal(hwnd: usize) -> Result<(u32, u32), String> {
    tauri::async_runtime::spawn_blocking(move || kecil::ukuran_normal(hwnd)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn susun_kecil(lebar: u32) -> Result<usize, String> {
    let w = store::lebar_kecil_sah(lebar).max(160);
    tauri::async_runtime::spawn_blocking(move || {
        let daftar = jendela::daftar();
        if daftar.is_empty() {
            return Err("No Roblox windows are open.".to_string());
        }
        let mut ok: Vec<usize> = Vec::new();
        for j in &daftar {
            if kecil::kecilkan(j.hwnd, w, store::tinggi_kecil(w)).is_ok() {
                ok.push(j.hwnd);
            }
        }
        let sel = ok.first().and_then(|&h| kecil::kotak(h)).map(|r| (r.right - r.left, r.bottom - r.top)).unwrap_or((w as i32, store::tinggi_kecil(w) as i32));
        let a = jendela::area_kerja_xywh();
        for (&h, (x, y)) in ok.iter().zip(kecil::kisi(ok.len(), a, sel)) {
            kecil::pindahkan(h, x, y);
        }
        Ok(ok.len())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn semua_jendela(aksi: String) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let daftar = jendela::daftar();
        for j in &daftar {
            if aksi == "minimize" {
                let _ = jendela::kecilkan(j.hwnd);
            } else {
                kecil::normalkan(j.hwnd);
                if let Some((w, t)) = kecil::ukuran_kecil(j.hwnd) {
                    let _ = kecil::kecilkan(j.hwnd, w, t);
                }
            }
        }
        Ok(daftar.len())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn pratinjau_tampil(window: tauri::WebviewWindow, hwnd: usize, x: i32, y: i32, w: i32, h: i32) -> Result<(), String> {
    let tujuan = window.hwnd().map_err(|e| e.to_string())?.0 as usize;
    pratinjau::tampilkan(tujuan, hwnd, x, y, w, h)
}

#[tauri::command]
fn pratinjau_tutup() {
    pratinjau::tutup();
}

#[tauri::command]
fn set_kecil_akun(state: State<AppState>, ids: Vec<String>, lebar: u32) -> Result<usize, String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let mut n = 0;
    for a in s.accounts.iter_mut().filter(|a| ids.contains(&a.id)) {
        a.mulai_kecil = store::lebar_kecil_sah(lebar);
        n += 1;
    }
    s.save()?;
    Ok(n)
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
    if !kecil::ada(hwnd) {
        return Err("Invalid window.".into());
    }
    kecil::normalkan(hwnd);
    kecil::ubah_bebas(hwnd, x, y, w.max(120), h.max(80), false);
    Ok(())
}

#[tauri::command]
fn fokus_jendela(hwnd: usize) -> Result<(), String> {
    jendela::fokus(hwnd)
}

#[tauri::command]
fn tema(state: State<AppState>) -> store::Tema {
    state.store.lock().unwrap_or_else(|e| e.into_inner()).tema.clone()
}

#[tauri::command]
fn set_tema(state: State<AppState>, tema: store::Tema) -> Result<(), String> {
    let mut s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
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
    let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
    let a = s.find(&id).ok_or("Account not found.")?;
    let jatuh_tempo = (a.last_launched + HARI_NGANGGUR).max(a.last_refreshed + HARI_JEDA_COBA);
    Ok(jatuh_tempo - sekarang)
}


#[derive(Serialize)]
struct WilayahServer {
    job_id: String,
    wilayah: String,
    mulai_ms: i64,
    versi: i64,
    status: i64,
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
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s
            .find(&akun_id)
            .or_else(|| s.accounts.first())
            .ok_or("Add an account first.")?;
        store::decrypt(&a.cookie_enc)?
    };

    let mut ip_per_job: Vec<(String, String, roblox::InfoServer)> = Vec::new();
    for (i, job) in job_ids.iter().take(BATAS_WILAYAH).enumerate() {
        if i > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(JEDA_WILAYAH_MS)).await;
        }
        let info = roblox::info_server(&cookie, place_id, job).await;
        let ip = info.alamat.clone().unwrap_or_default();
        ip_per_job.push((job.clone(), ip, info));
    }

    let ips: Vec<String> = ip_per_job
        .iter()
        .map(|(_, ip, _)| ip.clone())
        .filter(|ip| !ip.is_empty())
        .collect();
    let peta = roblox::wilayah_ip_banyak(&ips).await;

    Ok(ip_per_job
        .into_iter()
        .map(|(job_id, ip, info)| WilayahServer {
            job_id,
            wilayah: peta.get(&ip).cloned().unwrap_or_default(),
            mulai_ms: info.mulai_ms,
            versi: info.versi,
            status: info.status,
        })
        .collect())
}

#[derive(Serialize)]
struct PeriksaServer {
    bisa: bool,
    pesan: String,
    versi: i64,
}

#[tauri::command]
async fn periksa_server(
    state: State<'_, AppState>,
    akun_id: String,
    place_id: u64,
    job_id: String,
) -> Result<PeriksaServer, String> {
    let cookie = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s
            .find(&akun_id)
            .or_else(|| s.accounts.first())
            .ok_or("Add an account first.")?;
        store::decrypt(&a.cookie_enc)?
    };
    let info = roblox::info_server(&cookie, place_id, &job_id).await;
    let (kode, pesan) = (info.status, info.pesan);
    Ok(PeriksaServer {
        bisa: kode == 2,
        versi: info.versi,
        pesan: match kode {
            2 => String::new(),
            5 => "That server no longer exists.".into(),
            6 | 22 => "That server is full.".into(),
            -1 => "Could not reach Roblox to check the server.".into(),
            _ if !pesan.is_empty() => pesan,
            _ => format!("Roblox refused the join (status {kode})."),
        },
    })
}


#[tauri::command]
async fn versi_place_terbaru(state: State<'_, AppState>, akun_id: String, place_id: u64) -> Result<i64, String> {
    let cookie = {
        let s = state.store.lock().unwrap_or_else(|e| e.into_inner());
        let a = s
            .find(&akun_id)
            .or_else(|| s.accounts.first())
            .ok_or("Add an account first.")?;
        store::decrypt(&a.cookie_enc)?
    };
    Ok(roblox::versi_terbaru(&cookie, place_id).await)
}

async fn probe_pengaman(app: tauri::AppHandle) {
    use tauri::Manager;
    let tidur = |s: u64| tokio::time::sleep(std::time::Duration::from_secs(s));
    let mut hasil: Vec<String> = Vec::new();
    let h2 = app.clone();
    let login = tauri::async_runtime::spawn(async move {
        let st = h2.state::<AppState>();
        login_browser(h2.clone(), st, "probe".into(), None, None).await
    });
    let mut w = None;
    for _ in 0..40 {
        if let Some(x) = app.get_webview_window(LABEL_LOGIN) {
            w = Some(x);
            break;
        }
        tidur(1).await;
    }
    match w {
        None => hasil.push("GAGAL: jendela login tidak terbuka".into()),
        Some(w) => {
            tidur(8).await;
            hasil.push(format!("login awal: {}", w.url().map(|u| u.to_string()).unwrap_or_default()));
            for (tuju, harus_boleh) in [
                ("https://example.com/", false),
                ("http://www.roblox.com/", false),
                ("https://www.roblox.com.evil.example/", false),
                ("https://www.roblox.com/home", true),
            ] {
                let _ = w.eval(&format!("location.href = {tuju:?};"));
                tidur(6).await;
                let kini = w.url().map(|u| u.to_string()).unwrap_or_default();
                let host_kini = kini.parse::<tauri::Url>().ok().and_then(|u| u.host_str().map(str::to_string)).unwrap_or_default();
                let tujuan_host = tuju.parse::<tauri::Url>().ok().and_then(|u| u.host_str().map(str::to_string)).unwrap_or_default();
                let sampai = host_kini == tujuan_host && kini.starts_with(&tuju[..5]);
                let ok = if harus_boleh { host_kini.ends_with("roblox.com") } else { !sampai };
                hasil.push(format!("{} login -> {tuju}: sekarang {kini}", if ok { "OK" } else { "GAGAL" }));
            }
            let w2 = w.clone();
            let kue = tauri::async_runtime::spawn_blocking(move || w2.cookies()).await;
            match kue {
                Ok(Ok(daftar)) => {
                    let rb: Vec<String> = daftar
                        .iter()
                        .filter(|c| c.domain().is_some_and(|d| d == "roblox.com" || d.ends_with(".roblox.com")))
                        .map(|c| format!("{}@{}", c.name(), c.domain().unwrap_or("")))
                        .collect();
                    hasil.push(format!("{} cookies(): {} cookie, {} cocok saringan roblox: {}", if rb.is_empty() { "GAGAL" } else { "OK" }, daftar.len(), rb.len(), rb.join(", ")));
                }
                Ok(Err(e)) => hasil.push(format!("GAGAL cookies(): {e}")),
                Err(e) => hasil.push(format!("GAGAL cookies() panic: {e}")),
            }
            let _ = w.destroy();
            tidur(2).await;
            let w3 = w.clone();
            let lagi = tauri::async_runtime::spawn_blocking(move || w3.cookies().map(|d| d.len())).await;
            hasil.push(match lagi {
                Err(_) => "GAGAL cookies() setelah jendela ditutup: panic".into(),
                Ok(r) => format!("OK cookies() setelah jendela ditutup tidak panic: {r:?}"),
            });
        }
    }
    let _ = login.await;
    if let Some(m) = app.get_webview_window("main") {
        let awal = m.url().map(|u| u.to_string()).unwrap_or_default();
        let _ = m.eval("location.href = 'https://example.com/';");
        tidur(4).await;
        let kini = m.url().map(|u| u.to_string()).unwrap_or_default();
        hasil.push(format!("{} utama -> https://example.com/: awal {awal}, sekarang {kini}", if kini == awal { "OK" } else { "GAGAL" }));
    }
    let log = std::fs::read_to_string(dirs::data_dir().unwrap_or_default().join("RobloxAccountManager").join("crash.log")).unwrap_or_default();
    let galat: Vec<&str> = log.lines().filter(|l| l.contains("WebView2")).collect();
    hasil.push(format!("baris WebView2 di crash.log: {}", galat.len()));
    for l in galat.iter().rev().take(3) {
        hasil.push(format!("  {l}"));
    }
    let _ = std::fs::write(std::env::temp_dir().join("cam-probe-pengaman.txt"), hasil.join("\n"));
    app.exit(0);
}

fn main() {
    store::pasang_catatan_crash(env!("CARGO_PKG_VERSION"));
    let env_dibuang = pengaman::bersihkan_env();
    if !env_dibuang.is_empty() {
        store::catat_kejadian(&format!("Ignored WebView2 overrides from the environment: {}", env_dibuang.join(", ")));
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-sesi") {
        let arg: Vec<String> = std::env::args().collect();
        let alias: Vec<String> = arg.get(i + 1).map(|s| s.split(',').map(|x| x.trim().to_string()).collect()).unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let mode = arg.get(i + 3).cloned().unwrap_or_default();
        let pakai_kunci = mode == "kunci";
        let amati: u64 = arg.get(i + 4).and_then(|x| x.parse().ok()).unwrap_or(60);
        let opsi = arg.get(i + 5).cloned().unwrap_or_default();
        let ada_klien = opsi.contains("ada-klien");
        let jangan_tutup = opsi.contains("jangan-tutup");
        let klien_awal = launcher::pid_klien();
        println!("klien sebelum uji: {}", klien_awal.len());
        if !ada_klien && !klien_awal.is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let store = Mutex::new(store::Store::load());
        let mut multi = SingletonGuard::new();
        if !opsi.contains("tanpa-multi") {
            if let Err(e) = multi.nyalakan() {
                println!("GAGAL multi-instance: {e}");
                return;
            }
        }
        println!("multi-instance: {}", multi.keterangan);
        let detik = || std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
        let awal = detik();
        let kunci_penuh = if mode == "penuh" { Some(sesi::kunci_penuh()) } else { None };
        let proteksi = sesi::Proteksi::default();
        let sidik_mula = sesi::sidik();
        println!(
            "mode: {}",
            match mode.as_str() {
                "kunci" => "KUNCI berkas sesi selama peluncuran->join".to_string(),
                "penuh" => format!("PENUH (dikunci sepanjang sesi), berkas dikunci: {}", kunci_penuh.as_ref().map(|k| k.jumlah).unwrap_or(0)),
                "cam" => "CAM (sesi::Proteksi di luncurkan_inti)".to_string(),
                _ => "TANPA kunci".to_string(),
            }
        );
        let mut benar = 0;
        for a in &alias {
            let (id, uid) = {
                let s = store.lock().unwrap_or_else(|e| e.into_inner());
                match s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(a)) {
                    Some(x) => (x.id.clone(), x.user_id),
                    None => { println!("akun {a} tidak ada"); continue; }
                }
            };
            let sidik_awal = sesi::sidik();
            let kunci = if pakai_kunci { Some(sesi::kunci()) } else { None };
            let sejak = detik();
            let hasil = tauri::async_runtime::block_on(luncurkan_inti(
                &store, id, place, None, None, None, None, None, None, None,
                (mode == "cam").then_some(&proteksi),
            ));
            if let Err(e) = &hasil { println!("  galat luncur: {e}"); }
            if mode == "cam" { println!("  proteksi: {:?}", proteksi.status()); }
            let mut join = false;
            for _ in 0..120 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if joinlog::jumlah_join_sejak(sejak) > 0 { join = true; break; }
            }
            let n_kunci = kunci.as_ref().map(|k| k.jumlah).unwrap_or(0);
            drop(kunci);
            std::thread::sleep(std::time::Duration::from_secs(3));
            let masuk = sesi::userid_log_sejak(sejak);
            let cocok = masuk.contains(&uid) && masuk.iter().all(|&m| m == uid);
            if cocok { benar += 1; }
            println!(
                "{a}: luncur={} join={join} berkas_dikunci={n_kunci} sesi_ditulis_ulang={} userid_log={:?} harapan={uid} -> {}",
                hasil.is_ok(), sesi::sidik() != sidik_awal, masuk, if cocok { "BENAR" } else { "SALAH/TAK TERBACA" }
            );
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        println!("klien: {:?}", launcher::pid_klien());
        println!("AMATI {amati} dtk...");
        for _ in 0..amati.div_ceil(15) {
            std::thread::sleep(std::time::Duration::from_secs(15));
        }
        let hidup = launcher::pid_klien().len();
        let awal_hidup = klien_awal.iter().filter(|p| launcher::pid_klien().contains(p)).count();
        println!("klien lama (sebelum uji) masih hidup: {awal_hidup}/{}", klien_awal.len());
        let putus = percobaan::baris_putus_sejak(awal);
        println!("RINGKAS: akun benar {benar}/{}; klien masih hidup {hidup}; baris putus/773: {:?}", alias.len(), putus);
        for _ in 0..4 {
            if jangan_tutup { break; }
            for j in jendela::daftar() {
                if launcher::pid_klien().contains(&j.pid) { let _ = jendela::tutup(j.hwnd); }
            }
            std::thread::sleep(std::time::Duration::from_secs(4));
            if launcher::pid_klien().is_empty() { break; }
        }
        println!("klien tersisa setelah ditutup: {}", launcher::pid_klien().len());
        println!("berkas sesi ditulis ulang selama uji: {}", sesi::sidik() != sidik_mula);
        if mode == "cam" {
            for d in 0..30 {
                proteksi.rawat(|| !launcher::pid_klien().is_empty());
                if !proteksi.status().0 { println!("proteksi dilepas setelah ~{} dtk", d * 5); break; }
                std::thread::sleep(std::time::Duration::from_secs(5));
            }
            println!("proteksi akhir: {:?}", proteksi.status());
        }
        drop(kunci_penuh);
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-fps") {
        let arg: Vec<String> = std::env::args().collect();
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let mut multi = SingletonGuard::new();
        let _ = multi.nyalakan();
        let store = Mutex::new(store::Store::load());
        let (id, asal) = {
            let s = store.lock().unwrap_or_else(|e| e.into_inner());
            match s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) {
                Some(x) => (x.id.clone(), (x.hemat, x.hemat_fps, x.hemat_minimize, x.hemat_ram_mb, x.fps_cap)),
                None => { println!("akun {alias} tidak ada"); return; }
            }
        };
        let atur = |hemat: bool| {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(a) = s.find_mut(&id) {
                a.hemat = hemat;
                a.hemat_fps = 10;
                a.hemat_minimize = false;
                a.hemat_ram_mb = 0;
                a.fps_cap = 0;
            }
            let _ = s.save();
        };
        let cap = || hemat::cap_terbaca();
        println!("FramerateCap pemakai sebelum uji: {:?}", cap());
        let detik = || std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
        let ukur = |label: &str| {
            let _ = sumber::ukur();
            std::thread::sleep(std::time::Duration::from_secs(15));
            let l = sumber::ukur();
            for k in &l.klien {
                println!("  {label}: pid {} CPU {:.1}% GPU {:?}%", k.pid, k.cpu, k.gpu.map(|g| (g * 10.0).round() / 10.0));
            }
        };
        let tutup = || {
            for _ in 0..4 {
                for j in jendela::daftar() {
                    if launcher::pid_klien().contains(&j.pid) { let _ = jendela::tutup(j.hwnd); }
                }
                std::thread::sleep(std::time::Duration::from_secs(4));
                if launcher::pid_klien().is_empty() { break; }
            }
        };
        for (putaran, hemat_on) in [("SAVER 10 FPS", true), ("KONTROL tanpa saver", false)] {
            println!("== {putaran}");
            atur(hemat_on);
            let berhenti = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
            let b2 = berhenti.clone();
            let mulai = std::time::Instant::now();
            let rekam = std::thread::spawn(move || {
                let mut garis: Vec<(u128, Option<i32>)> = Vec::new();
                while !b2.load(std::sync::atomic::Ordering::Relaxed) {
                    let v = hemat::cap_terbaca();
                    if garis.last().map(|x| x.1) != Some(v) {
                        garis.push((mulai.elapsed().as_millis(), v));
                    }
                    std::thread::sleep(std::time::Duration::from_millis(250));
                }
                garis
            });
            let sejak = detik();
            let hasil = tauri::async_runtime::block_on(luncurkan_inti(&store, id.clone(), place, None, None, None, None, None, None, None, None));
            if let Err(e) = &hasil { println!("  galat luncur: {e}"); }
            let mut join = false;
            for _ in 0..120 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if joinlog::jumlah_join_sejak(sejak) > 0 { join = true; break; }
            }
            println!("  join={join} ({} dtk)", mulai.elapsed().as_secs());
            std::thread::sleep(std::time::Duration::from_secs(10));
            println!("  FramerateCap di berkas saat klien bermain: {:?}", cap());
            ukur(putaran);
            berhenti.store(true, std::sync::atomic::Ordering::Relaxed);
            let garis = rekam.join().unwrap_or_default();
            println!("  linimasa berkas (ms sejak luncur, nilai): {garis:?}");
            tutup();
            std::thread::sleep(std::time::Duration::from_secs(3));
            println!("  setelah klien ditutup, berkas: {:?}", cap());
            let (asli, kami) = {
                let s = store.lock().unwrap_or_else(|e| e.into_inner());
                (s.cap_asli, s.cap_kami.clone())
            };
            let tulis = setelan_fps::pulihkan(asli, &kami);
            println!("  pengawas (pulihkan): menulis={tulis} -> berkas {:?} (cap_asli {asli:?}, cap_kami {kami:?})", cap());
        }
        {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(a) = s.find_mut(&id) {
                (a.hemat, a.hemat_fps, a.hemat_minimize, a.hemat_ram_mb, a.fps_cap) = asal;
            }
            let _ = s.save();
        }
        println!("setelan akun dikembalikan; klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-csrf") {
        let arg: Vec<String> = std::env::args().collect();
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let s = store::Store::load();
        let Some(a) = s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else { println!("akun tidak ada"); return };
        let cookie = store::decrypt(&a.cookie_enc).unwrap_or_default();
        roblox::pasang_penerima_rotasi(|_, _| println!("  (Roblox mengirim cookie hasil rotasi)"));
        tauri::async_runtime::block_on(async {
            let t0 = std::time::Instant::now();
            println!("tiket 1: {}", roblox::auth_ticket(&cookie).await.map(|t| format!("OK, {} karakter", t.len())).unwrap_or_else(|e| e));
            println!("  ({} ms)", t0.elapsed().as_millis());
            let t1 = std::time::Instant::now();
            println!("tiket 2 (token tersimpan): {}", roblox::auth_ticket(&cookie).await.map(|t| format!("OK, {} karakter", t.len())).unwrap_or_else(|e| e));
            println!("  ({} ms)", t1.elapsed().as_millis());
            match roblox::user_info(&cookie).await {
                Ok(u) => println!("user_info: OK, user id cocok = {}", u.user_id == a.user_id),
                Err(e) => println!("user_info: {e}"),
            }
            println!("daftar blokir: {:?}", roblox::daftar_diblokir(&cookie, a.browser_tracker_id, a.user_id).await.map(|v| v.len()));
            if let Ok((servers, _)) = roblox::daftar_server(place, "").await {
                if let Some(sv) = servers.first() {
                    println!("alamat server (gamejoin): {}", roblox::alamat_server(&cookie, place, &sv.job_id).await.map(|_| "OK, alamat publik didapat").unwrap_or("tidak ada"));
                }
            }
            match roblox::refresh_cookie(&cookie).await {
                Ok(baru) => match roblox::user_info(&baru).await {
                    Ok(u) => println!("refresh_cookie: OK, cookie baru valid, user id cocok = {} (tidak disimpan)", u.user_id == a.user_id),
                    Err(e) => println!("refresh_cookie: cookie baru tidak valid: {e}"),
                },
                Err(e) => println!("refresh_cookie: {e}"),
            }
        });
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-rotasi") {
        let alias = std::env::args().nth(i + 1).unwrap_or_default();
        let s = store::Store::load();
        let Some(a) = s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else { println!("akun tidak ada"); return };
        let lama = store::decrypt(&a.cookie_enc).unwrap_or_default();
        let terima: std::sync::Arc<Mutex<Vec<(String, String)>>> = Default::default();
        let t2 = terima.clone();
        roblox::pasang_penerima_rotasi(move |l, b| t2.lock().unwrap().push((l.to_string(), b.to_string())));
        let sidik = |c: &str| { use std::hash::{Hash, Hasher}; let mut h = std::collections::hash_map::DefaultHasher::new(); c.hash(&mut h); format!("{:016x}", h.finish()) };
        let awal_format = |c: &str| c.chars().take(12).collect::<String>().replace(|ch: char| ch.is_ascii_alphanumeric(), "x");
        println!("cookie tersimpan: panjang {}, sidik {}, awalan {}", roblox::mentah(&lama).len(), sidik(&roblox::mentah(&lama)), awal_format(&roblox::mentah(&lama)));
        tauri::async_runtime::block_on(async {
            for n in 0..3 {
                let _ = roblox::user_info(&lama).await;
                let _ = n;
            }
            let v = terima.lock().unwrap().clone();
            println!("3x user_info dengan cookie lama -> {} rotasi", v.len());
            for (_, b) in &v {
                println!("  baru: panjang {}, sidik {}, awalan {}", b.len(), sidik(b), awal_format(b));
            }
            let Some((_, baru)) = v.first().cloned() else { return };
            match roblox::user_info(&baru).await {
                Ok(u) => println!("cookie baru valid: user id cocok = {}", u.user_id == a.user_id),
                Err(e) => println!("cookie baru TIDAK valid: {e}"),
            }
            terima.lock().unwrap().clear();
            for _ in 0..3 {
                let _ = roblox::user_info(&baru).await;
            }
            println!("3x user_info dengan cookie BARU -> {} rotasi lagi", terima.lock().unwrap().len());
            match roblox::user_info(&lama).await {
                Ok(_) => println!("cookie lama masih valid (masa tenggang)"),
                Err(e) => println!("cookie lama sudah tidak valid: {e}"),
            }
        });
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-rotasi-simpan") {
        let alias = std::env::args().nth(i + 1).unwrap_or_default();
        let store: &'static Mutex<Store> = Box::leak(Box::new(Mutex::new(store::Store::load())));
        let (id, uid, lama) = {
            let s = store.lock().unwrap();
            let Some(a) = s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else { println!("akun tidak ada"); return };
            (a.id.clone(), a.user_id, store::decrypt(&a.cookie_enc).unwrap_or_default())
        };
        roblox::pasang_penerima_rotasi(move |l, b| println!("simpan_rotasi -> {} akun", simpan_rotasi(store, l, b)));
        tauri::async_runtime::block_on(async {
            let _ = roblox::user_info(&lama).await;
            let disk = store::Store::load();
            let kini = disk.find(&id).and_then(|a| store::decrypt(&a.cookie_enc).ok()).unwrap_or_default();
            println!("cookie di accounts.json berubah: {}", roblox::mentah(&kini) != roblox::mentah(&lama));
            match roblox::user_info(&kini).await {
                Ok(u) => println!("cookie tersimpan valid: user id cocok = {}", u.user_id == uid),
                Err(e) => println!("cookie tersimpan TIDAK valid: {e}"),
            }
        });
        return;
    }

    if std::env::args().any(|a| a == "--probe-versi") {
        for k in klien::terpasang() {
            let d = std::path::Path::new(&k.path).parent().unwrap().to_path_buf();
            println!("{} {} | {} MB | protokol={} | proses={}", k.folder, k.versi, k.ukuran_mb, k.protokol, launcher::proses_dalam_folder(&d).len());
            if k.protokol {
                println!("  hapus versi saat ini -> {:?}", klien::hapus_terpasang(std::path::Path::new(&k.path)));
            }
        }
        let palsu = klien::folder_versi().unwrap().join("version-camuji");
        let _ = std::fs::create_dir_all(palsu.join("sub"));
        let _ = std::fs::write(palsu.join("RobloxPlayerBeta.exe"), b"bukan exe");
        let _ = std::fs::write(palsu.join("sub").join("x.dat"), vec![0u8; 3 * 1024 * 1024]);
        println!("palsu terdaftar: {}", klien::terpasang().iter().any(|k| k.folder == "version-camuji"));
        println!("hapus palsu -> {:?}, folder masih ada: {}", klien::hapus_terpasang(&palsu.join("RobloxPlayerBeta.exe")), palsu.exists());
        let sisa = std::fs::read_dir(klien::folder_versi().unwrap()).map(|r| r.flatten().filter(|e| e.file_name().to_string_lossy().starts_with("_cam-hapus-")).count()).unwrap_or(0);
        println!("sisa _cam-hapus-: {sisa}");
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-emote") {
        let args: Vec<String> = std::env::args().skip(i + 1).collect();
        let alias = args.iter().find(|x| x.parse::<u64>().is_err()).cloned();
        let ids: Vec<u64> = args.iter().filter_map(|x| x.parse().ok()).collect();
        let store: &'static Mutex<Store> = Box::leak(Box::new(Mutex::new(store::Store::load())));
        roblox::pasang_penerima_rotasi(move |l, b| println!("  (rotasi cookie disimpan -> {} akun)", simpan_rotasi(store, l, b)));
        let pilih = {
            let s = store.lock().unwrap();
            s.accounts
                .iter()
                .find(|x| match &alias { Some(a) => x.alias.eq_ignore_ascii_case(a) || x.username.eq_ignore_ascii_case(a), None => !x.utama && x.user_id > 0 && x.pembatasan.is_none() && x.last_error.is_empty() })
                .and_then(|a| store::decrypt(&a.cookie_enc).ok().map(|c| (c, a.user_id, a.alias.clone(), a.utama)))
        };
        let Some((cookie, uid, nama, utama)) = pilih else { println!("tidak ada akun yang cocok"); return };
        if utama { println!("akun utama tidak dipakai untuk probe"); return }
        println!("akun probe: {nama}");
        for b in tauri::async_runtime::block_on(roblox::probe_emote(&cookie, uid, &ids)) { println!("{b}") }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-avatar3d") {
        let alias = std::env::args().nth(i + 1).unwrap_or_default();
        let segar = std::env::args().nth(i + 2).is_some_and(|x| x == "segar");
        let store: &'static Mutex<Store> = Box::leak(Box::new(Mutex::new(store::Store::load())));
        roblox::pasang_penerima_rotasi(move |l, b| println!("  (rotasi cookie disimpan -> {} akun)", simpan_rotasi(store, l, b)));
        let akun = {
            let s = store.lock().unwrap();
            s.accounts
                .iter()
                .find(|x| x.alias.eq_ignore_ascii_case(&alias) || x.username.eq_ignore_ascii_case(&alias))
                .map(|a| a.id.clone())
                .and_then(|id| cookie_avatar(&s, &id).ok())
        };
        let Some((cookie, uid)) = akun else {
            println!("{alias}: akun tidak ada");
            return;
        };
        println!("  cookie dicoba: {}", cookie.len());
        let t0 = std::time::Instant::now();
        if std::env::args().any(|a| a == "periksa") {
            let aktif = store.lock().unwrap().accounts.iter().map(|a| a.user_id).filter(|u| *u > 0).collect();
            println!("bersihkan: {} folder dihapus", tauri::async_runtime::block_on(avatar3d::bersihkan_terkunci(aktif, true)));
            match tauri::async_runtime::block_on(avatar3d::periksa(&cookie, uid)) {
                Ok(st) => println!("periksa dalam {} ms: versi {} usang={}", t0.elapsed().as_millis(), st.versi, st.usang),
                Err(e) => println!("periksa galat: {e}"),
            }
            return;
        }
        match tauri::async_runtime::block_on(avatar3d::ambil(&cookie, uid, segar)) {
            Ok(a) => println!(
                "ok dalam {} ms: obj {} KB, mtl {} B, {} tekstur ({} KB data URL), dari_cache={}, aabb {:?}..{:?}",
                t0.elapsed().as_millis(), a.obj.len() / 1024, a.mtl.len(), a.tekstur.len(), a.tekstur.iter().map(|x| x.len()).sum::<usize>() / 1024, a.dari_cache, a.aabb_min, a.aabb_max
            ),
            Err(e) => println!("galat: {e}"),
        }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-avatar3d-diag") {
        let alias = std::env::args().nth(i + 1).unwrap_or_default();
        let store: &'static Mutex<Store> = Box::leak(Box::new(Mutex::new(store::Store::load())));
        roblox::pasang_penerima_rotasi(move |l, b| println!("  (rotasi cookie disimpan -> {} akun)", simpan_rotasi(store, l, b)));
        let akun = {
            let s = store.lock().unwrap();
            s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias) || x.username.eq_ignore_ascii_case(&alias)).map(|a| (a.user_id, store::decrypt(&a.cookie_enc).unwrap_or_default()))
        };
        let Some((uid, cookie)) = akun else {
            println!("{alias}: akun tidak ada");
            return;
        };
        if std::env::args().any(|a| a == "semua") {
            let daftar: Vec<(String, u64)> = store.lock().unwrap().accounts.iter().filter(|a| a.user_id > 0).map(|a| (a.alias.clone(), a.user_id)).collect();
            for l in tauri::async_runtime::block_on(roblox::diagnosa_avatar_3d_banyak(&cookie, &daftar)) {
                println!("{l}");
            }
            return;
        }
        for l in tauri::async_runtime::block_on(roblox::diagnosa_avatar_3d(&cookie, uid)) {
            println!("{l}");
        }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-status") {
        let alias: Vec<String> = std::env::args().skip(i + 1).collect();
        let store: &'static Mutex<Store> = Box::leak(Box::new(Mutex::new(store::Store::load())));
        roblox::pasang_penerima_rotasi(move |l, b| println!("  (rotasi cookie disimpan -> {} akun)", simpan_rotasi(store, l, b)));
        let akun: Vec<(String, u64, String)> = {
            let s = store.lock().unwrap();
            alias
                .iter()
                .filter_map(|n| {
                    let a = s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(n) || x.username.eq_ignore_ascii_case(n));
                    if a.is_none() {
                        println!("{n}: akun tidak ada");
                    }
                    a.map(|a| (a.alias.clone(), a.user_id, store::decrypt(&a.cookie_enc).unwrap_or_default()))
                })
                .collect()
        };
        tauri::async_runtime::block_on(async {
            for (nama, uid, cookie) in &akun {
                println!("{nama}:");
                if std::env::var("PROBE_RINGKAS").is_ok() {
                    match roblox::user_info_cek(cookie).await {
                        Ok(i) => println!("  cek: ok, pembatasan={:?}", i.pembatasan),
                        Err((k, m)) => {
                            println!("  cek: {k:?} -- {m}");
                            if k == roblox::Cek::Dibatasi {
                                println!("  baca_pembatasan: {:?}", roblox::baca_pembatasan(cookie).await);
                            }
                        }
                    }
                    continue;
                }
                for l in roblox::probe_status(cookie, *uid).await {
                    println!("{l}");
                }
            }
        });
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-kehadiran") {
        let detik = std::env::args().nth(i + 1).and_then(|d| d.parse().ok()).unwrap_or(8);
        kehadiran::probe(detik);
        return;
    }
    if let Some(i) = std::env::args().position(|a| a == "--probe-cek") {
        let alias = std::env::args().nth(i + 1).unwrap_or_default();
        let s = store::Store::load();
        let Some(a) = s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else { println!("akun tidak ada"); return };
        let asli = store::decrypt(&a.cookie_enc).unwrap_or_default();
        let palsu = format!("_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_{}", "A1B2".repeat(150));
        tauri::async_runtime::block_on(async {
            for (label, c) in [("cookie asli", asli.as_str()), ("cookie palsu", palsu.as_str())] {
                match roblox::user_info_cek(c).await {
                    Ok(u) => println!("{label}: ok (plus={}, premium={}, banned={:?}, email={:?}, 2fa={:?})", u.plus, u.premium, u.banned, u.email_ok, u.dua_langkah),
                    Err((k, m)) => println!("{label}: {k:?} -- {m}"),
                }
            }
        });
            let live = tauri::async_runtime::block_on(unduh::versi_live());
            println!("versi live: {:?}, terpasang: {:?}", live, live.as_deref().map(unduh::terpasang));
            let xml = autopsi::event_galat(30 * 24 * 3600 * 1000);
            println!("wevtutil: {} byte, event Application Error 30 hari: {}, milik Roblox: {}", xml.len(), xml.matches("<Event ").count(), xml.matches("RobloxPlayerBeta.exe").count());
            println!("autopsi contoh (pid mati, 20 dtk): {}", autopsi::periksa("crash", Some(1), pantau::kini() - 20, 20, true));
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-blokir") {
        let arg: Vec<String> = std::env::args().collect();
        let s = store::Store::load();
        let cari = |n: &str| s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(n)).cloned();
        let (Some(a), Some(b)) = (cari(arg.get(i + 1).map(String::as_str).unwrap_or("")), cari(arg.get(i + 2).map(String::as_str).unwrap_or(""))) else { println!("akun tidak ada"); return };
        let cookie = store::decrypt(&a.cookie_enc).unwrap_or_default();
        let (btid, uid) = (a.browser_tracker_id, a.user_id);
        tauri::async_runtime::block_on(async {
            println!("daftar awal: {:?}", roblox::daftar_diblokir(&cookie, btid, uid).await);
            println!("blokir {}: {:?}", b.alias, roblox::blokir(&cookie, btid, uid, b.user_id, false).await);
            println!("daftar: {:?}", roblox::daftar_diblokir(&cookie, btid, uid).await);
            println!("buka blokir: {:?}", roblox::blokir(&cookie, btid, uid, b.user_id, true).await);
            println!("daftar akhir: {:?}", roblox::daftar_diblokir(&cookie, btid, uid).await);
        });
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-f") {
        #[repr(C)]
        struct Kunci { tipe: u32, _p: u32, vk: u16, scan: u16, flags: u32, time: u32, extra: usize, _isi: [u8; 8] }
        #[allow(clashing_extern_declarations)]
        #[link(name = "user32")]
        extern "system" {
            #[link_name = "SendInput"]
            fn KirimTombol(n: u32, i: *const Kunci, cb: i32) -> u32;
        }
        let arg: Vec<String> = std::env::args().collect();
        let (u1, u2) = (arg.get(i + 1).cloned().unwrap_or_default(), arg.get(i + 2).cloned().unwrap_or_default());
        let place: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(189707);
        let _ = launcher::akhiri_tray_diam();
        std::thread::sleep(std::time::Duration::from_secs(2));
        if !launcher::pid_klien().is_empty() { println!("GAGAL: masih ada klien Roblox."); return; }
        println!("F5 info log (baca saja): {:?}", rawat::info_log());
        let store = Mutex::new(store::Store::load());
        let akun = |u: &str| store.lock().unwrap().accounts.iter().find(|x| x.username.eq_ignore_ascii_case(u)).map(|a| (a.id.clone(), a.browser_tracker_id));
        let (Some((id1, _)), Some((id2, b2))) = (akun(&u1), akun(&u2)) else { println!("akun tidak ada"); return };
        let mut g = SingletonGuard::new();
        if let Err(e) = g.nyalakan() { println!("GAGAL multi-instance: {e}"); return; }
        let singleton = Mutex::new(g);
        let proteksi = sesi::Proteksi::default();
        let pelacak = pantau::Pelacak::default();
        let k = Konteks { store: &store, singleton: &singleton, proteksi: &proteksi, pelacak: &pelacak };
        for id in [&id1, &id2] {
            let sejak = pantau::kini();
            let r = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id.clone(), pantau::Tujuan { place_id: place, ..Default::default() }));
            println!("luncur: {}", r.is_ok());
            for _ in 0..120 { std::thread::sleep(std::time::Duration::from_secs(1)); if joinlog::jumlah_join_sejak(sejak) > 0 { break; } }
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        let dir = pantau::dir_log();
        let periksa = || {
            let proses: Vec<(u32, u64)> = launcher::klien_terperinci().into_iter().map(|x| (x.pid, x.btid)).collect();
            pelacak.periksa(&proses, &jendela::pid_macet(), dir.as_deref())
        };
        let _ = periksa();
        let pid2 = launcher::klien_terperinci().into_iter().find(|x| x.btid == b2).map(|x| x.pid).unwrap_or(0);
        launcher::akhiri_klien(pid2);
        let mut masalah = Vec::new();
        for _ in 0..20 {
            std::thread::sleep(std::time::Duration::from_secs(2));
            masalah = periksa();
            if !masalah.is_empty() { break; }
        }
        catat_masalah(&store, &masalah);
        let m = store.lock().unwrap().masalah.last().cloned();
        println!("F2 crash tercatat: {:?}", m.map(|x| (x.alias, x.jenis, x.teks, x.place_id, x.umur_dtk)));
        println!("diikuti sebelum Close all: {}", pelacak.jumlah_diikuti());
        let t0 = std::time::Instant::now();
        let n = tutup_semua_klien_inti(&pelacak, false);
        println!("F3 Close all: {n} klien, {} ms; tersisa {}; diikuti {}; batal_rejoin={}", t0.elapsed().as_millis(), launcher::pid_klien().len(), pelacak.jumlah_diikuti(), pelacak.batal_rejoin.load(std::sync::atomic::Ordering::SeqCst));
        let (tx, rx) = std::sync::mpsc::channel();
        darurat::mulai(move || { let _ = tx.send(()); });
        let atur = darurat::atur(true);
        println!("F3 hotkey didaftarkan: {atur:?}");
        if atur.is_ok() {
            let tekan = |vk: u16, lepas: bool| unsafe {
                let k = Kunci { tipe: 1, _p: 0, vk, scan: 0, flags: if lepas { 0x0002 } else { 0 } | if vk == 0x23 { 0x0001 } else { 0 }, time: 0, extra: 0, _isi: [0; 8] };
                KirimTombol(1, &k, std::mem::size_of::<Kunci>() as i32)
            };
            for (vk, l) in [(0x11, false), (0x12, false), (0x23, false), (0x23, true), (0x12, true), (0x11, true)] {
                tekan(vk, l);
                std::thread::sleep(std::time::Duration::from_millis(30));
            }
            println!("F3 hotkey memicu aksi: {}", rx.recv_timeout(std::time::Duration::from_secs(3)).is_ok());
            println!("F3 hotkey dimatikan: {:?}", darurat::atur(false));
        }
        let jadwal = rawat::shutdown_exe(&["/s", "/t", "3600"]);
        let batal = rawat::shutdown_exe(&["/a"]);
        let batal2 = rawat::shutdown_exe(&["/a"]);
        println!("F6 jadwal {jadwal:?}; batal {batal:?}; batal lagi (harap 1116) {batal2:?}");
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-ram") {
        let nama = std::env::args().nth(i + 1).unwrap_or_else(|| "explorer.exe".into());
        for p in sumber::snapshot().into_iter().filter(|p| p.nama.eq_ignore_ascii_case(&nama)) {
            println!("pid {} ws {} KB, privat_ram {} KB, commit {} KB, di luar RAM {} KB", p.pid, p.working_set >> 10, p.privat_ram >> 10, p.privat >> 10, sumber::di_luar_ram(p.privat, p.privat_ram) >> 10);
        }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-trim") {
        let arg: Vec<String> = std::env::args().collect();
        let place = arg.get(i + 4).and_then(|x| x.parse::<u64>().ok());
        match (arg.get(i + 1), arg.get(i + 2), arg.get(i + 3), place) {
            (Some(a), Some(b), Some(c), Some(p)) => {
                let menit = arg.get(i + 5).and_then(|x| x.parse::<u64>().ok()).unwrap_or(10).max(4);
                probe_trim([a.as_str(), b.as_str(), c.as_str()], p, menit);
            }
            _ => println!("pakai: --probe-trim <aliasA> <aliasB> <aliasC> <placeId> [menit]"),
        }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-biaya") {
        let arg: Vec<String> = std::env::args().collect();
        let ukur = |label: &str| {
            let n = 300;
            let mut tanpa = std::collections::HashMap::new();
            let t = std::time::Instant::now();
            for _ in 0..n { let _ = sisa::periksa(&mut tanpa, pantau::kini()); }
            let a = t.elapsed().as_micros() as f64 / n as f64;
            let t2 = std::time::Instant::now();
            for _ in 0..30 { std::thread::sleep(std::time::Duration::from_millis(0)); let _ = launcher::klien_terperinci(); let _ = jendela::pid_berjendela_game(); }
            println!("{label}: tanpa cache (snapshot + EnumWindows) {:.0} us/periksa", t2.elapsed().as_micros() as f64 / 30.0);
            let t = std::time::Instant::now();
            for _ in 0..n { let _ = launcher::klien_terperinci(); }
            let b = t.elapsed().as_micros() as f64 / n as f64;
            let t = std::time::Instant::now();
            for _ in 0..n { let _ = jendela::pid_berjendela_game(); }
            let c = t.elapsed().as_micros() as f64 / n as f64;
            let t = std::time::Instant::now();
            for _ in 0..n { kecil::jaga(); }
            let d = t.elapsed().as_micros() as f64 / n as f64;
            println!("{label}: sisa::periksa {a:.0} us | klien_terperinci {b:.0} us | EnumWindows game {c:.0} us | kecil::jaga {d:.1} us");
            println!("  -> beban rata-rata: sisa tiap 10 dtk = {:.4}% satu inti; jaga tiap 3 dtk = {:.5}% satu inti", a / 10_000_000.0 * 100.0, d / 3_000_000.0 * 100.0);
            let toko = Mutex::new(Store { trim_latar: true, ..Store::load() });
            let mut jadwal = kendali::Penjadwal::default();
            let t = std::time::Instant::now();
            for _ in 0..n {
                let _ = jadwal.pilih(&calon_trim(&toko).1, pantau::kini());
            }
            let e = t.elapsed().as_micros() as f64 / n as f64;
            println!("{label}: putaran trim (tanpa trim) {e:.0} us -> tiap 10 dtk = {:.4}% satu inti", e / 10_000_000.0 * 100.0);
        };
        ukur("tanpa klien");
        if let (Some(u), Some(place)) = (arg.get(i + 1), arg.get(i + 2).and_then(|x| x.parse::<u64>().ok())) {
            let _ = launcher::akhiri_tray_diam();
            let store = Mutex::new(store::Store::load());
            let Some(id) = store.lock().unwrap().accounts.iter().find(|x| x.username.eq_ignore_ascii_case(u)).map(|a| a.id.clone()) else { println!("akun tidak ada"); return };
            let sejak = pantau::kini();
            let _ = tauri::async_runtime::block_on(luncurkan_inti(&store, id, place, None, None, None, None, None, None, None, None));
            for _ in 0..120 { std::thread::sleep(std::time::Duration::from_secs(1)); if joinlog::jumlah_join_sejak(sejak) > 0 { break; } }
            std::thread::sleep(std::time::Duration::from_secs(10));
            ukur("1 klien di game");
            for p in launcher::pid_klien() { tutup_klien(p); }
        }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-sisa") {
        let arg: Vec<String> = std::env::args().collect();
        let u = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(189707);
        let _ = launcher::akhiri_tray_diam();
        std::thread::sleep(std::time::Duration::from_secs(2));
        if !launcher::pid_klien().is_empty() { println!("GAGAL: masih ada klien Roblox."); return; }
        let store = Mutex::new(store::Store::load());
        let Some((id, btid)) = store.lock().unwrap().accounts.iter().find(|x| x.username.eq_ignore_ascii_case(&u)).map(|a| (a.id.clone(), a.browser_tracker_id)) else { println!("akun tidak ada"); return };
        let mut g = SingletonGuard::new();
        if arg.get(i + 3).is_some_and(|m| m == "multi") {
            println!("multi-instance: {:?}", g.nyalakan());
        }
        let sejak = pantau::kini();
        let r = tauri::async_runtime::block_on(luncurkan_inti(&store, id, place, None, None, None, None, None, None, None, None));
        println!("luncur: {}", r.is_ok());
        for _ in 0..120 { std::thread::sleep(std::time::Duration::from_secs(1)); if joinlog::jumlah_join_sejak(sejak) > 0 { break; } }
        std::thread::sleep(std::time::Duration::from_secs(20));
        let Some(pid) = launcher::klien_terperinci().into_iter().find(|x| x.btid == btid).map(|x| x.pid) else { println!("klien tidak ada"); return };
        #[link(name = "user32")]
        extern "system" {
            fn PostMessageW(h: *mut std::ffi::c_void, m: u32, w: usize, l: isize) -> i32;
        }
        let Some(hw) = jendela::daftar().into_iter().find(|j| j.pid == pid).map(|j| j.hwnd) else { println!("jendela tidak ada"); return };
        println!("klien pid {pid}; tombol X (SC_CLOSE)");
        unsafe { PostMessageW(hw as *mut std::ffi::c_void, 0x0112, 0xF060, 0) };
        std::thread::sleep(std::time::Duration::from_secs(3));
        if jendela::pid_berjendela_game().contains(&pid) {
            println!("  jendela masih ada setelah 3 dtk: SC_CLOSE kedua (konfirmasi)");
            unsafe { PostMessageW(hw as *mut std::ffi::c_void, 0x0112, 0xF060, 0) };
        }
        let t0 = pantau::kini();
        let mut tanpa = std::collections::HashMap::new();
        loop {
            std::thread::sleep(std::time::Duration::from_secs(5));
            let n = pantau::kini() - t0;
            let hidup = launcher::pid_klien().contains(&pid);
            let jendela_game = jendela::pid_berjendela_game().contains(&pid);
            let lain: Vec<u32> = launcher::pid_klien().into_iter().filter(|p| *p != pid).collect();
            println!("  +{n:>3} dtk: proses hidup={hidup} jendela game={jendela_game} proses Roblox lain={lain:?}");
            if !hidup { println!("BERAKHIR SENDIRI setelah ~{n} dtk: tidak tertinggal kali ini"); break; }
            let akhiri = sisa::periksa(&mut tanpa, pantau::kini());
            if akhiri.iter().any(|(p, _)| *p == pid) {
                println!("SISA TERDETEKSI setelah ~{n} dtk -> diakhiri");
                tutup_klien(pid);
                std::thread::sleep(std::time::Duration::from_secs(2));
                println!("  proses masih hidup: {}", launcher::pid_klien().contains(&pid));
                break;
            }
            if n > 150 { println!("150 dtk tanpa keputusan"); break; }
        }
        let _ = launcher::akhiri_tray_diam();
        std::thread::sleep(std::time::Duration::from_secs(2));
        for p in launcher::pid_klien() { tutup_klien(p); }
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-e2") {
        #[repr(C)]
        struct MouseInput { tipe: u32, _pad: u32, dx: i32, dy: i32, data: u32, flags: u32, time: u32, extra: usize }
        #[repr(C)]
        struct Lii { cb: u32, t: u32 }
        #[repr(C)]
        struct Titik { x: i32, y: i32 }
        #[allow(clashing_extern_declarations)]
        #[link(name = "user32")]
        extern "system" {
            fn ShowWindow(hwnd: *mut std::ffi::c_void, cmd: i32) -> i32;
            fn SetWindowPos(hwnd: *mut std::ffi::c_void, after: *mut std::ffi::c_void, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> i32;
            fn SetCursorPos(x: i32, y: i32) -> i32;
            #[link_name = "SendInput"]
            fn KirimMouse(n: u32, i: *const MouseInput, cb: i32) -> u32;
            fn GetLastInputInfo(p: *mut Lii) -> i32;
            fn GetTickCount() -> u32;
            fn CreateWindowExW(ex: u32, kelas: *const u16, judul: *const u16, gaya: u32, x: i32, y: i32, w: i32, h: i32, induk: *mut std::ffi::c_void, menu: *mut std::ffi::c_void, inst: *mut std::ffi::c_void, p: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
            fn DestroyWindow(h: *mut std::ffi::c_void) -> i32;
            fn WindowFromPoint(p: Titik) -> *mut std::ffi::c_void;
            fn GetAncestor(h: *mut std::ffi::c_void, f: u32) -> *mut std::ffi::c_void;
        }
        let arg: Vec<String> = std::env::args().collect();
        let (u1, u2) = (arg.get(i + 1).cloned().unwrap_or_default(), arg.get(i + 2).cloned().unwrap_or_default());
        let place: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(189707);
        let _ = launcher::akhiri_tray_diam();
        std::thread::sleep(std::time::Duration::from_secs(2));
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: masih ada klien Roblox.");
            return;
        }
        kecil::mulai_pengawas();
        let store = Mutex::new(store::Store::load());
        let akun = |u: &str| store.lock().unwrap().accounts.iter().find(|x| x.username.eq_ignore_ascii_case(u)).map(|a| (a.id.clone(), a.browser_tracker_id));
        let (Some((id1, b1)), Some((id2, b2))) = (akun(&u1), akun(&u2)) else { println!("akun tidak ada"); return };
        let mut g = SingletonGuard::new();
        if let Err(e) = g.nyalakan() { println!("GAGAL multi-instance: {e}"); return; }
        let singleton = Mutex::new(g);
        let proteksi = sesi::Proteksi::default();
        let pelacak = pantau::Pelacak::default();
        let k = Konteks { store: &store, singleton: &singleton, proteksi: &proteksi, pelacak: &pelacak };
        let jendela_akun = |btid: u64| launcher::klien_terperinci().into_iter().find(|x| x.btid == btid).and_then(|x| jendela::daftar().into_iter().find(|j| j.pid == x.pid)).map(|j| j.hwnd);
        for (id, btid, kecil_w) in [(&id1, b1, 320u32), (&id2, b2, 0)] {
            let sejak = pantau::kini();
            let r = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id.clone(), pantau::Tujuan { place_id: place, ..Default::default() }));
            println!("luncur: {}", r.is_ok());
            for _ in 0..120 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if joinlog::jumlah_join_sejak(sejak) > 0 { break; }
            }
            if kecil_w > 0 {
                let ok = atur_jendela_setelah_join(btid, kecil_w, false);
                std::thread::sleep(std::time::Duration::from_millis(500));
                println!("E2 Start tiny dipasang={ok}: klien {:?}", jendela_akun(btid).and_then(kecil::ukuran_klien));
            }
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        let (Some(h1), Some(h2)) = (jendela_akun(b1), jendela_akun(b2)) else { println!("jendela tidak ada"); return };
        let w = 400u32;
        let hw = [h1, h2];
        for &h in &hw { let _ = kecil::kecilkan(h, w, store::tinggi_kecil(w)); }
        let sel = kecil::kotak(h1).map(|r| (r.right - r.left, r.bottom - r.top)).unwrap();
        for (&h, (x, y)) in hw.iter().zip(kecil::kisi(2, jendela::area_kerja_xywh(), sel)) { kecil::pindahkan(h, x, y); }
        std::thread::sleep(std::time::Duration::from_millis(800));
        println!("Tile tiny 400: {:?}", hw.iter().map(|&h| (kecil::ukuran_klien(h), kecil::kotak(h).map(|r| (r.left, r.top)))).collect::<Vec<_>>());
        for &h in &hw { let _ = jendela::kecilkan(h); }
        std::thread::sleep(std::time::Duration::from_secs(2));
        for &h in &hw {
            kecil::normalkan(h);
            if let Some((a, b)) = kecil::ukuran_kecil(h) { let _ = kecil::kecilkan(h, a, b); }
        }
        std::thread::sleep(std::time::Duration::from_millis(800));
        println!("setelah Minimize all + Restore all: {:?}", hw.iter().map(|&h| kecil::ukuran_klien(h)).collect::<Vec<_>>());
        let kelas: Vec<u16> = "Static\0".encode_utf16().collect();
        let judul: Vec<u16> = "CAM uji pratinjau\0".encode_utf16().collect();
        let uji = unsafe { CreateWindowExW(0, kelas.as_ptr(), judul.as_ptr(), 0x10CF_0000, 50, 50, 400, 300, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut()) };
        println!("E4 thumbnail DWM: {:?}", pratinjau::tampilkan(uji as usize, h1, 10, 10, 320, 180));
        std::thread::sleep(std::time::Duration::from_secs(2));
        pratinjau::tutup();
        unsafe { DestroyWindow(uji) };
        let detik_diam = || {
            let mut l = Lii { cb: 8, t: 0 };
            unsafe { GetLastInputInfo(&mut l); GetTickCount().wrapping_sub(l.t) / 1000 }
        };
        let batas_tunggu = std::time::Instant::now() + std::time::Duration::from_secs(180);
        while detik_diam() < 60 && std::time::Instant::now() < batas_tunggu {
            std::thread::sleep(std::time::Duration::from_secs(2));
        }
        let diam = detik_diam();
        let atur_atas = |nilai: isize| unsafe { SetWindowPos(h1 as *mut std::ffi::c_void, nilai as *mut std::ffi::c_void, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010) };
        atur_atas(-1);
        let _ = jendela::fokus(h1);
        std::thread::sleep(std::time::Duration::from_millis(600));
        let r = kecil::kotak(h1).unwrap();
        let (sx, sy) = (r.left + 80, r.top + 15);
        let di_bawah = unsafe { GetAncestor(WindowFromPoint(Titik { x: sx, y: sy }), 2) } as usize;
        if diam >= 60 && di_bawah != h1 {
            println!("seret judul DILEWATI: jendela lain ada di titik tekan");
        } else if diam >= 60 {
            let kirim = |f: u32| unsafe { KirimMouse(1, &MouseInput { tipe: 0, _pad: 0, dx: 0, dy: 0, data: 0, flags: f, time: 0, extra: 0 }, std::mem::size_of::<MouseInput>() as i32) };
            unsafe { SetCursorPos(sx, sy) };
            std::thread::sleep(std::time::Duration::from_millis(200));
            kirim(0x0002);
            for s in 1..=20 {
                std::thread::sleep(std::time::Duration::from_millis(30));
                unsafe { SetCursorPos(sx + s * 10, sy + s * 5) };
            }
            std::thread::sleep(std::time::Duration::from_millis(200));
            kirim(0x0004);
            std::thread::sleep(std::time::Duration::from_secs(2));
            let r2 = kecil::kotak(h1).unwrap();
            println!("seret judul: pindah={} ukuran klien {:?} (harap 400x225)", r2.left != r.left, kecil::ukuran_klien(h1));
        } else {
            println!("seret judul DILEWATI: pemakai aktif ({diam} dtk diam)");
        }
        atur_atas(-2);
        unsafe { ShowWindow(h2 as *mut std::ffi::c_void, 6); }
        std::thread::sleep(std::time::Duration::from_secs(2));
        unsafe { ShowWindow(h2 as *mut std::ffi::c_void, 4); }
        std::thread::sleep(std::time::Duration::from_secs(2));
        println!("restore dari luar: {:?}", kecil::ukuran_klien(h2));
        std::thread::sleep(std::time::Duration::from_secs(62));
        kecil::jaga();
        std::thread::sleep(std::time::Duration::from_millis(800));
        println!("setelah penjaga: {:?} (harap 400x225, kecuali jendela di depan)", kecil::ukuran_klien(h2));
        for x in launcher::klien_terperinci() { tutup_klien(x.pid); }
        std::thread::sleep(std::time::Duration::from_secs(5));
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-e") {
        #[link(name = "user32")]
        extern "system" {
            fn ShowWindow(hwnd: *mut std::ffi::c_void, cmd: i32) -> i32;
            fn SetWindowPos(hwnd: *mut std::ffi::c_void, after: *mut std::ffi::c_void, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> i32;
            fn IsWindowVisible(hwnd: *mut std::ffi::c_void) -> i32;
        }
        let arg: Vec<String> = std::env::args().collect();
        let u = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(189707);
        let _ = launcher::akhiri_tray_diam();
        std::thread::sleep(std::time::Duration::from_secs(2));
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: masih ada klien Roblox.");
            return;
        }
        let store = Mutex::new(store::Store::load());
        let Some((id, btid)) = store.lock().unwrap().accounts.iter().find(|x| x.username.eq_ignore_ascii_case(&u)).map(|a| (a.id.clone(), a.browser_tracker_id)) else { println!("akun tidak ada"); return };
        let sejak = pantau::kini();
        let r = tauri::async_runtime::block_on(luncurkan_inti(&store, id, place, None, None, None, None, None, None, None, None));
        println!("luncur: {}", r.is_ok());
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(sejak) > 0 { break; }
        }
        std::thread::sleep(std::time::Duration::from_secs(15));
        let Some(pid) = launcher::klien_terperinci().into_iter().find(|x| x.btid == btid).map(|x| x.pid) else { println!("klien tidak ada"); return };
        let Some(hw) = jendela::daftar().into_iter().find(|j| j.pid == pid).map(|j| j.hwnd) else { println!("jendela tidak ada"); return };
        let hp = hw as *mut std::ffi::c_void;
        let lihat = |label: &str| println!("  {label:<38} klien {:?} jendela {:?} bingkai {:?}", kecil::ukuran_klien(hw), kecil::kotak(hw).map(|r| (r.right - r.left, r.bottom - r.top)), kecil::bingkai(hw));
        lihat("awal");
        unsafe { SetWindowPos(hp, std::ptr::null_mut(), 0, 0, 320, 180, kecil::SWP_NOMOVE | kecil::SWP_NOZORDER | kecil::SWP_NOACTIVATE) };
        std::thread::sleep(std::time::Duration::from_millis(800));
        lihat("M1 SetWindowPos biasa 320x180");
        println!("  M2 kecilkan: {:?}", kecil::kecilkan(hw, 320, 180));
        lihat("M2 segera");
        std::thread::sleep(std::time::Duration::from_secs(3));
        lihat("M2 +3 dtk");
        std::thread::sleep(std::time::Duration::from_secs(10));
        lihat("M2 +13 dtk");
        unsafe { SetWindowPos(hp, std::ptr::null_mut(), 120, 120, 0, 0, kecil::SWP_NOSIZE | kecil::SWP_NOZORDER | kecil::SWP_NOACTIVATE) };
        std::thread::sleep(std::time::Duration::from_millis(800));
        lihat("M3 dipindah (SWP_NOSIZE)");
        unsafe { ShowWindow(hp, 6) };
        std::thread::sleep(std::time::Duration::from_secs(2));
        unsafe { ShowWindow(hp, 4) };
        std::thread::sleep(std::time::Duration::from_secs(2));
        lihat("M4 setelah minimize->restore");
        let ukur = |label: &str| {
            std::thread::sleep(std::time::Duration::from_secs(5));
            let _ = sumber::ukur();
            std::thread::sleep(std::time::Duration::from_secs(20));
            match sumber::ukur().klien.iter().find(|k| k.pid == pid) {
                Some(k) => println!("  M5 {label:<16} CPU {:>5.2}%  GPU {:>5.1}%  RAM {:>5.0} MB", k.cpu, k.gpu.unwrap_or(-1.0), k.ram_mb),
                None => println!("  M5 {label:<16} klien hilang!"),
            }
        };
        let _ = kecil::ukuran_normal(hw);
        lihat("Normal size (penempatan asli)");
        ukur("normal");
        let _ = kecil::kecilkan(hw, 320, 180);
        ukur("kecil 320x180");
        unsafe { ShowWindow(hp, 6) };
        ukur("minimize");
        unsafe { ShowWindow(hp, 4) };
        std::thread::sleep(std::time::Duration::from_secs(1));
        unsafe { ShowWindow(hp, 0) };
        println!("  tersembunyi: terlihat={}", unsafe { IsWindowVisible(hp) } != 0);
        ukur("tersembunyi");
        std::thread::sleep(std::time::Duration::from_secs(35));
        let f = pantau::dir_log().and_then(|d| pantau::cari_log(&d, btid, sejak)).map(|p| pantau::fakta_log(&p)).unwrap_or_default();
        println!("  setelah ~60 dtk tersembunyi: di_game={} putus={} alasan={:?}", f.di_game, f.putus, f.alasan);
        unsafe { ShowWindow(hp, 4) };
        std::thread::sleep(std::time::Duration::from_secs(2));
        println!("  ditampilkan lagi: terlihat={}", unsafe { IsWindowVisible(hp) } != 0);
        lihat("setelah tampil lagi");
        tutup_klien(pid);
        std::thread::sleep(std::time::Duration::from_secs(4));
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-teman") {
        let arg: Vec<String> = std::env::args().collect();
        let (dari, main_u) = (arg.get(i + 1).cloned().unwrap_or_default(), arg.get(i + 2).cloned().unwrap_or_default());
        let place: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(189707);
        let s = store::Store::load();
        let cari = |u: &str| s.accounts.iter().find(|x| x.username.eq_ignore_ascii_case(u)).cloned();
        let (Some(a), Some(b)) = (cari(&dari), cari(&main_u)) else { println!("akun tidak ada"); return };
        let ca = store::decrypt(&a.cookie_enc).unwrap_or_default();
        let c = reqwest::Client::new();
        let ringkas = |teks: &str| -> String { teks.chars().take(400).collect() };
        let tanya = |url: String| {
            let (c, ca) = (c.clone(), ca.clone());
            async move {
                match c.get(&url).header("Cookie", format!(".ROBLOSECURITY={}", roblox::mentah(&ca))).send().await {
                    Ok(r) => (r.status().as_u16(), r.text().await.unwrap_or_default()),
                    Err(e) => (0, e.without_url().to_string()),
                }
            }
        };
        let tahap = |label: &str| {
            let rt = tauri::async_runtime::block_on(async {
                let (s1, t1) = tanya(format!("https://friends.roblox.com/v1/users/{}/friends/count", a.user_id)).await;
                let (s2, t2) = tanya(format!("https://friends.roblox.com/v1/users/{}/friends/online", a.user_id)).await;
                let (s3, t3) = tanya(format!("https://friends.roblox.com/v1/users/{}/friends?userSort=StatusFrequents", a.user_id)).await;
                (s1, t1, s2, t2, s3, t3)
            });
            println!("[{label}] friends/count {} {}", rt.0, ringkas(&rt.1));
            println!("[{label}] friends/online {} {}", rt.2, ringkas(&rt.3));
            let ada_b = rt.5.contains(&b.user_id.to_string());
            println!("[{label}] friends list {} (memuat {}: {ada_b}) {}", rt.4, b.username, ringkas(&rt.5).replace('\n', " "));
            let pres = tauri::async_runtime::block_on(roblox::kehadiran_pemain(&ca, b.user_id));
            println!("[{label}] presence {} dilihat {}: {:?}", b.username, a.username, pres.map(|(p, j)| (p, j.chars().take(8).collect::<String>())));
            let calon = tauri::async_runtime::block_on(roblox::teman_online(&ca, a.user_id));
            println!("[{label}] teman_online CAM: {:?}", calon.map(|v| v.into_iter().map(|x| (x.username, x.status, x.lokasi, x.place_id)).collect::<Vec<_>>()));
            let mentah = tauri::async_runtime::block_on(async {
                let r = c.post("https://presence.roblox.com/v1/presence/users").header("Cookie", format!(".ROBLOSECURITY={}", roblox::mentah(&ca))).json(&serde_json::json!({ "userIds": [b.user_id] })).send().await.ok()?;
                Some((r.status().as_u16(), r.text().await.ok()?))
            });
            println!("[{label}] presence mentah: {:?}", mentah.map(|(s, t)| (s, t.chars().take(300).collect::<String>())));
        };
        tahap("sebelum");
        let _ = launcher::akhiri_tray_diam();
        let store2 = Mutex::new(store::Store::load());
        let mut g = SingletonGuard::new();
        let _ = g.nyalakan();
        let singleton = Mutex::new(g);
        let proteksi = sesi::Proteksi::default();
        let pelacak = pantau::Pelacak::default();
        let k = Konteks { store: &store2, singleton: &singleton, proteksi: &proteksi, pelacak: &pelacak };
        let sejak = pantau::kini();
        let r = tauri::async_runtime::block_on(luncurkan_terlacak(&k, b.id.clone(), pantau::Tujuan { place_id: place, ..Default::default() }));
        println!("luncur {}: {}", b.username, r.is_ok());
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(sejak) > 0 {
                break;
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(20));
        tahap("teman di game");
        let job_b = pantau::dir_log().and_then(|d| pantau::cari_log(&d, b.browser_tracker_id, sejak)).map(|p| pantau::fakta_log(&p)).and_then(|f| f.job);
        let sejak2 = pantau::kini();
        let r2 = tauri::async_runtime::block_on(luncurkan_terlacak(&k, a.id.clone(), pantau::Tujuan { follow_user_id: Some(b.user_id), ..Default::default() }));
        println!("ikuti {} -> {}: {}", a.username, b.username, r2.is_ok());
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(sejak2) > 0 {
                break;
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(4));
        let job_a = pantau::dir_log().and_then(|d| pantau::cari_log(&d, a.browser_tracker_id, sejak2)).map(|p| pantau::fakta_log(&p)).and_then(|f| f.job);
        println!("SERVER SAMA dengan teman: {} ({:?} vs {:?})", job_a.is_some() && job_a == job_b, job_a.map(|j| j[..8].to_string()), job_b.map(|j| j[..8].to_string()));
        for x in launcher::klien_terperinci() {
            tutup_klien(x.pid);
        }
        std::thread::sleep(std::time::Duration::from_secs(6));
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-d2") {
        let arg: Vec<String> = std::env::args().collect();
        let place: u64 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(189707);
        let vd: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(93978595733734);
        println!("tray diam diakhiri: {}", launcher::akhiri_tray_diam());
        std::thread::sleep(std::time::Duration::from_secs(2));
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: masih ada klien Roblox.");
            return;
        }
        let store = Mutex::new(store::Store::load());
        let akun = |u: &str| {
            let s = store.lock().unwrap_or_else(|e| e.into_inner());
            s.accounts.iter().find(|x| x.username.eq_ignore_ascii_case(u)).map(|a| (a.id.clone(), a.browser_tracker_id, a.user_id, store::decrypt(&a.cookie_enc).unwrap_or_default()))
        };
        let mut g = SingletonGuard::new();
        if let Err(e) = g.nyalakan() {
            println!("GAGAL multi-instance: {e}");
            return;
        }
        let singleton = Mutex::new(g);
        let proteksi = sesi::Proteksi::default();
        let pelacak = pantau::Pelacak::default();
        let k = Konteks { store: &store, singleton: &singleton, proteksi: &proteksi, pelacak: &pelacak };
        let tunggu_join = |sejak: i64| -> bool {
            for _ in 0..120 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if joinlog::jumlah_join_sejak(sejak) > 0 {
                    return true;
                }
            }
            false
        };
        let server_log = |btid: u64, sejak: i64| -> Option<(u64, String)> {
            for _ in 0..10 {
                if let Some(f) = pantau::dir_log().and_then(|d| pantau::cari_log(&d, btid, sejak)).map(|p| pantau::fakta_log(&p)) {
                    if let (Some(p), Some(j)) = (f.place, f.job.filter(|j| pantau::adalah_uuid(j))) {
                        return Some((p, j));
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(1500));
            }
            None
        };
        let luncur = |id: &str, btid: u64, t: pantau::Tujuan| -> (bool, Option<(u64, String)>) {
            let sejak = pantau::kini();
            let r = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id.to_string(), t));
            if let Err(e) = &r {
                println!("  galat luncur: {e}");
                return (false, None);
            }
            let j = tunggu_join(sejak);
            (j, server_log(btid, sejak))
        };
        let pendek = |j: &str| j.chars().take(8).collect::<String>();

        println!("== UJI 1: Pick one with room for all ==");
        let nama: Vec<String> = arg.iter().skip(i + 3).cloned().collect();
        if nama.len() < 5 { println!("pakai: --probe-d2 <place> <place_pribadi> <u1> <u2> <u3> <teman1> <teman2>"); return; }
        let tiga: Vec<_> = nama[..3].iter().filter_map(|u| akun(u).map(|a| (u.to_string(), a))).collect();
        let pilihan = tauri::async_runtime::block_on(pilih_server_dengan(&tiga[0].1 .3, place, 3));
        println!("server dipilih: {:?}", pilihan.as_ref().map(|o| o.as_deref().map(pendek)));
        let Ok(Some(job)) = pilihan else { return };
        if let Ok((v, _)) = tauri::async_runtime::block_on(roblox::daftar_server_urut(place, "", true, true, Some(&tiga[0].1 .3))) {
            if let Some(x) = v.iter().find(|x| x.job_id == job) {
                println!("  isi menurut daftar: {}/{}", x.playing, x.max_players);
            }
        }
        let mut hasil1 = Vec::new();
        for (u, (id, btid, _, _)) in &tiga {
            let (j, s) = luncur(id, *btid, pantau::Tujuan { place_id: place, job_id: Some(job.clone()), ..Default::default() });
            let sama = s.as_ref().is_some_and(|x| x.1 == job);
            println!("  {u}: join={j} server={:?} SAMA={sama}", s.as_ref().map(|x| pendek(&x.1)));
            hasil1.push(sama);
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        println!("UJI 1: {}/{} masuk server pilihan", hasil1.iter().filter(|x| **x).count(), hasil1.len());

        println!("== UJI 3: teman online ==");
        std::thread::sleep(std::time::Duration::from_secs(5));
        for u in nama[3..5].iter().map(String::as_str) {
            let Some((_, _, uid, c)) = akun(u) else { println!("{u} tidak ada"); continue };
            match tauri::async_runtime::block_on(roblox::teman_online(&c, uid)) {
                Ok(t) => {
                    println!("dari {u}: {} teman online", t.len());
                    for x in &t {
                        println!("  @{} status={} lokasi={:?} place={} ", x.username, x.status, x.lokasi, x.place_id);
                    }
                }
                Err(e) => println!("dari {u}: galat {e}"),
            }
        }
        let proses: Vec<(u32, u64)> = launcher::klien_terperinci().into_iter().map(|x| (x.pid, x.btid)).collect();
        let _ = pelacak.periksa(&proses, &[], pantau::dir_log().as_deref());
        println!("akun CAM sendiri di game (pelacak): {:?}", pelacak.server_terkini().iter().map(|x| (x.alias.clone(), pendek(&x.job_id))).collect::<Vec<_>>());

        println!("== UJI 2: Rejoin last server ==");
        catat_server_terakhir(&store, &pelacak.server_terkini());
        let (u2, (id2, btid2, _, c2)) = tiga[2].clone();
        let st = store.lock().unwrap_or_else(|e| e.into_inner()).find(&id2).and_then(|a| a.server_terakhir.clone());
        println!("server terakhir {u2}: {:?}", st.as_ref().map(|x| (x.place_id, pendek(&x.job_id), x.game_name.clone())));
        for x in launcher::klien_terperinci().into_iter().filter(|x| x.btid == btid2) {
            tutup_klien(x.pid);
        }
        std::thread::sleep(std::time::Duration::from_secs(8));
        println!("klien {u2} tertutup: {}", !launcher::klien_terperinci().iter().any(|x| x.btid == btid2));
        if let Some(st) = st {
            let cek = tauri::async_runtime::block_on(roblox::status_join(&c2, st.place_id, &st.job_id));
            println!("periksa server sebelum rejoin: status {} (2 = bisa masuk)", cek.0);
            let (j, s) = luncur(&id2, btid2, pantau::Tujuan { place_id: st.place_id, job_id: Some(st.job_id.clone()), game_name: Some(st.game_name.clone()), ..Default::default() });
            println!("rejoin: join={j} SAMA dengan server terakhir={}", s.as_ref().is_some_and(|x| x.1 == st.job_id));
        }
        let palsu = "0badc0de-0000-4000-8000-000000000000";
        let cek = tauri::async_runtime::block_on(roblox::status_join(&c2, place, palsu));
        println!("server yang sudah tutup/tidak ada: status {} ({})", cek.0, if cek.0 == 5 { "That server no longer exists." } else { "lain" });
        for x in launcher::klien_terperinci() {
            tutup_klien(x.pid);
        }
        std::thread::sleep(std::time::Duration::from_secs(8));
        println!("klien tersisa setelah uji 1-3: {}", launcher::pid_klien().len());

        println!("== UJI 4: server pribadi place {vd} ==");
        let mut calon: Option<(String, String, u64, String, String)> = None;
        for u in nama.iter().map(String::as_str) {
            let Some((id, btid, _, c)) = akun(u) else { continue };
            match tauri::async_runtime::block_on(roblox::server_pribadi(&c, vd, "")) {
                Ok((v, _)) => {
                    println!("{u}: {} server pribadi", v.len());
                    for s in &v {
                        println!("  nama={:?} pemilik={:?} {}/{} berjalan={} berkode={}", s.nama, s.pemilik, s.playing, s.max_players, !s.job_id.is_empty(), !s.access_code.is_empty());
                        if calon.is_none() && !s.access_code.is_empty() {
                            calon = Some((u.to_string(), id.clone(), btid, s.access_code.clone(), s.nama.clone()));
                        }
                    }
                }
                Err(e) => println!("{u}: galat {e}"),
            }
        }
        if let Some((u, id, btid, kode, nama)) = calon {
            println!("masuk {nama:?} sebagai {u} lewat kode akses saja (seperti tombol Use)");
            let (j, s) = luncur(&id, btid, pantau::Tujuan { place_id: vd, access_code: Some(kode), ..Default::default() });
            println!("join={j} server={:?}", s.as_ref().map(|x| (x.0, pendek(&x.1))));
            std::thread::sleep(std::time::Duration::from_secs(5));
            let c = akun(&u).map(|a| a.3).unwrap_or_default();
            if let (Some((_, job)), Ok((v, _))) = (s, tauri::async_runtime::block_on(roblox::server_pribadi(&c, vd, ""))) {
                let di = v.iter().find(|x| x.job_id == job);
                println!("DI SERVER PRIBADI: {} ({:?})", di.is_some(), di.map(|x| (x.nama.clone(), x.playing)));
            }
            for x in launcher::klien_terperinci() {
                tutup_klien(x.pid);
            }
            std::thread::sleep(std::time::Duration::from_secs(8));
        } else {
            println!("tidak ada server pribadi berkode akses yang terlihat");
        }
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-d-luncur") {
        let arg: Vec<String> = std::env::args().collect();
        let (a1, a2) = (arg.get(i + 1).cloned().unwrap_or_default(), arg.get(i + 2).cloned().unwrap_or_default());
        let place: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(0);
        let fps: u32 = arg.get(i + 4).and_then(|x| x.parse().ok()).unwrap_or(30);
        println!("tray diam diakhiri: {}", launcher::akhiri_tray_diam());
        std::thread::sleep(std::time::Duration::from_secs(2));
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: masih ada klien Roblox.");
            return;
        }
        let store = Mutex::new(store::Store::load());
        let cari = |n: &str| {
            let s = store.lock().unwrap_or_else(|e| e.into_inner());
            s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(n)).map(|a| (a.id.clone(), a.browser_tracker_id, a.user_id))
        };
        let (Some((id1, btid1, _)), Some((id2, btid2, _))) = (cari(&a1), cari(&a2)) else { println!("akun tidak ada"); return };
        let mut g = SingletonGuard::new();
        if let Err(e) = g.nyalakan() {
            println!("GAGAL multi-instance: {e}");
            return;
        }
        let singleton = Mutex::new(g);
        let proteksi = sesi::Proteksi::default();
        let pelacak = pantau::Pelacak::default();
        let k = Konteks { store: &store, singleton: &singleton, proteksi: &proteksi, pelacak: &pelacak };
        let cap = || setelan_fps::cap_sekarang().map(|x| x.2);
        let cap_awal = cap();
        let tunggu_join = |sejak: i64| -> bool {
            for _ in 0..120 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if joinlog::jumlah_join_sejak(sejak) > 0 {
                    return true;
                }
            }
            false
        };
        let server_log = |btid: u64, sejak: i64| -> Option<(u64, String)> {
            for _ in 0..10 {
                if let Some(f) = pantau::dir_log().and_then(|d| pantau::cari_log(&d, btid, sejak)).map(|p| pantau::fakta_log(&p)) {
                    if let (Some(p), Some(j)) = (f.place, f.job.filter(|j| pantau::adalah_uuid(j))) {
                        return Some((p, j));
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(1500));
            }
            None
        };
        let t1 = pantau::kini();
        let r1 = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id1.clone(), pantau::Tujuan { place_id: place, fps_sekali: Some(fps), ..Default::default() }));
        let cap_saat = cap();
        println!("akun1 luncur: {}; FramerateCap awal {cap_awal:?}, saat luncur {cap_saat:?} (harap {fps})", r1.is_ok());
        let j1 = tunggu_join(t1);
        let s1 = server_log(btid1, t1);
        println!("akun1 join={j1} server dari log: {:?}", s1.as_ref().map(|(p, j)| (p, &j[..8])));
        let Some((p1, job1)) = s1 else { return };
        std::thread::sleep(std::time::Duration::from_secs(5));
        let t2 = pantau::kini();
        let r2 = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id2.clone(), pantau::Tujuan { place_id: p1, job_id: Some(job1.clone()), ..Default::default() }));
        println!("akun2 luncur: {r2:?}");
        let j2 = tunggu_join(t2);
        let s2 = server_log(btid2, t2);
        println!("akun2 join={j2} SERVER SAMA: {}", s2.as_ref().is_some_and(|(_, j)| *j == job1));
        let dir = pantau::dir_log();
        for _ in 0..4 {
            let proses: Vec<(u32, u64)> = launcher::klien_terperinci().into_iter().map(|x| (x.pid, x.btid)).collect();
            let _ = pelacak.periksa(&proses, &[], dir.as_deref());
            std::thread::sleep(std::time::Duration::from_secs(2));
        }
        let kini = pelacak.server_terkini();
        println!("server_terkini: {} klien, semua job sama: {}", kini.len(), kini.iter().all(|x| x.job_id == job1));
        catat_server_terakhir(&store, &kini);
        {
            let s = store.lock().unwrap_or_else(|e| e.into_inner());
            for id in [&id1, &id2] {
                let st = s.find(id).and_then(|a| a.server_terakhir.clone());
                println!("server_terakhir tersimpan: {:?}", st.map(|x| (x.place_id, x.job_id == job1, x.pribadi, x.game_name)));
            }
        }
        println!("FramerateCap setelah klien membaca: {:?} (harap kembali ke {cap_awal:?})", cap());
        for x in launcher::klien_terperinci().into_iter().filter(|x| x.btid == btid1 || x.btid == btid2) {
            tutup_klien(x.pid);
        }
        std::thread::sleep(std::time::Duration::from_secs(3));
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-d") {
        let alias = std::env::args().nth(i + 1).unwrap_or_default();
        let s = store::Store::load();
        let Some(a) = s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else { println!("akun tidak ada"); return };
        let cookie = store::decrypt(&a.cookie_enc).unwrap_or_default();
        let place: u64 = 920587237;
        tauri::async_runtime::block_on(async {
            for (turun, nama) in [(false, "Asc"), (true, "Desc")] {
                match roblox::daftar_server_urut(place, "", turun, true, Some(&cookie)).await {
                    Ok((v, _)) => println!("{nama}: {} server, playing 5 pertama {:?}, maks {:?}", v.len(), v.iter().take(5).map(|x| x.playing).collect::<Vec<_>>(), v.first().map(|x| x.max_players)),
                    Err(e) => println!("{nama}: galat {e}"),
                }
            }
            let t0 = std::time::Instant::now();
            let j = pilih_server_dengan(&cookie, place, 3).await;
            println!("pilih untuk 3: {:?} dalam {} ms", j.as_ref().map(|o| o.as_ref().map(|s| s.len())), t0.elapsed().as_millis());
            if let Ok(Some(j)) = &j {
                for turun in [true, false] {
                    if let Ok((v, _)) = roblox::daftar_server_urut(place, "", turun, true, Some(&cookie)).await {
                        if let Some(x) = v.iter().find(|x| &x.job_id == j) { println!("  server terpilih: {}/{}", x.playing, x.max_players); }
                    }
                }
            }
            match roblox::teman_online(&cookie, a.user_id).await {
                Ok(t) => println!("teman online: {} (di game {})", t.len(), t.iter().filter(|x| x.status == "InGame").count()),
                Err(e) => println!("teman online: galat {e}"),
            }
            let mut tempat: Vec<u64> = s.server_tersimpan.iter().filter_map(|x| x.place_id.trim().parse().ok()).collect();
            tempat.push(place);
            for pl in tempat {
                match roblox::server_pribadi(&cookie, pl, "").await {
                    Ok((v, k)) => println!("pribadi place {pl}: {} server, berkode {}, berjalan {}, kursor lanjut {}", v.len(), v.iter().filter(|x| !x.access_code.is_empty()).count(), v.iter().filter(|x| !x.job_id.is_empty()).count(), !k.is_empty()),
                    Err(e) => println!("pribadi place {pl}: galat {e}"),
                }
            }
        });
        return;
    }

    if std::env::args().any(|a| a == "--probe-cadangan") {
        let s = store::Store::load();
        let isi = cadangan::Isi {
            versi: 1,
            dibuat: 0,
            akun: s.accounts.iter().map(|a| cadangan::akun_ke_cadangan(a).unwrap()).collect(),
            folder: s.folder.clone(),
            server: s.server_tersimpan.clone(),
        };
        let t0 = std::time::Instant::now();
        let data = cadangan::kunci_isi("sandi-uji-panjang", &isi).unwrap();
        println!("kunci: {} ms, {} byte, {} akun, {} folder, {} server", t0.elapsed().as_millis(), data.len(), isi.akun.len(), isi.folder.len(), isi.server.len());
        let jalur = std::env::temp_dir().join("cam-probe.cambak");
        cadangan::tulis(&jalur, &data).unwrap();
        let dibaca = std::fs::read(&jalur).unwrap();
        let _ = std::fs::remove_file(&jalur);
        let t1 = std::time::Instant::now();
        let b = cadangan::buka_isi("sandi-uji-panjang", &dibaca).unwrap();
        println!("buka: {} ms; sandi salah: {:?}", t1.elapsed().as_millis(), cadangan::buka_isi("salah-salah", &dibaca).err());
        let cocok = s.accounts.iter().zip(&b.akun).all(|(a, v)| {
            cadangan::akun_dari_cadangan(v).is_some_and(|(x, c)| x.user_id == a.user_id && x.alias == a.alias && Some(c) == store::decrypt(&a.cookie_enc).ok())
        });
        println!("semua akun + cookie sama: {cocok}");
        let entri: Vec<(Account, String)> = b.akun.iter().filter_map(cadangan::akun_dari_cadangan).collect();
        let c0 = entri.first().map(|(a, c)| (a.user_id, c.clone()));
        let mut kosong = Store::default();
        let mut lap = LaporanPulih::default();
        terapkan_pulih(&mut kosong, b.folder, b.server, entri, false, &[], &mut lap);
        println!("pulih ke Store kosong: +{} akun, +{} folder, +{} server; link_code utuh: {}", lap.ditambah, lap.folder_baru, lap.server_baru,
            kosong.server_tersimpan.iter().map(|x| x.link_code.clone()).collect::<Vec<_>>() == s.server_tersimpan.iter().map(|x| x.link_code.clone()).collect::<Vec<_>>());
        if let Some((uid, c)) = c0 {
            println!("cookie pulihan akun pertama masuk: {:?}", tauri::async_runtime::block_on(roblox::user_info_cek(&c)).map(|i| i.user_id == uid).map_err(|(k, _)| k));
        }
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-impor") {
        let arg: Vec<String> = std::env::args().collect();
        let (n1, n2) = (arg.get(i + 1).cloned().unwrap_or_default(), arg.get(i + 2).cloned().unwrap_or_default());
        let s = store::Store::load();
        let ck = |n: &str| s.accounts.iter().find(|a| a.alias.eq_ignore_ascii_case(n)).and_then(|a| store::decrypt(&a.cookie_enc).ok()).unwrap_or_default();
        let palsu = format!("{}--Sharing-this-will-allow-someone-to-log-in-as-you.|_{}", impor::TANDA, "0F".repeat(300));
        let teks = format!("pemakai:sandi:{}\n{}\nsampah tanpa cookie\n\"{}\"\nx:y:{}\n", ck(&n1), ck(&n2), ck(&n1), palsu);
        drop(s);
        let toko = Mutex::new(store::Store::load());
        tauri::async_runtime::block_on(async {
            for e in impor::urai_teks(&teks) {
                let hasil = match (e.lewati, e.cookie) {
                    (Some(l), _) => format!("dilewati: {l}"),
                    (None, Some(c)) => match simpan_cookie(&toko, c, String::new(), true).await {
                        Ok((v, true)) => format!("diperbarui ({})", v.alias),
                        Ok((v, false)) => format!("ditambah ({})", v.alias),
                        Err(m) => format!("gagal: {}", store::samarkan_cookie(&m)),
                    },
                    _ => "?".into(),
                };
                println!("{}: {hasil}", e.label);
                tokio::time::sleep(std::time::Duration::from_millis(400)).await;
            }
        });
        return;
    }

    if std::env::args().any(|a| a == "--probe-hello") {
        println!("hello tersedia: {:?}", hello::tersedia());
        return;
    }

    if std::env::args().any(|a| a == "--probe-papanklip") {
        #[link(name = "user32")]
        extern "system" {
            fn OpenClipboard(h: *mut std::ffi::c_void) -> i32;
            fn CloseClipboard() -> i32;
            fn EnumClipboardFormats(f: u32) -> u32;
            fn GetClipboardFormatNameW(f: u32, buf: *mut u16, n: i32) -> i32;
            fn CountClipboardFormats() -> i32;
        }
        let format = || -> Vec<String> {
            let mut v = Vec::new();
            unsafe {
                if OpenClipboard(std::ptr::null_mut()) == 0 { return v; }
                let mut f = EnumClipboardFormats(0);
                while f != 0 {
                    let mut b = [0u16; 128];
                    let n = GetClipboardFormatNameW(f, b.as_mut_ptr(), 128);
                    v.push(if n > 0 { String::from_utf16_lossy(&b[..n as usize]) } else { format!("#{f}") });
                    f = EnumClipboardFormats(f);
                }
                CloseClipboard();
            }
            v
        };
        let jumlah = || unsafe { CountClipboardFormats() };
        println!("salin_rahasia: {:?}", papanklip::salin_rahasia("CAM-UJI-RAHASIA", 3));
        println!("format: {:?}", format());
        std::thread::sleep(std::time::Duration::from_secs(4));
        println!("setelah 4 dtk, jumlah format: {} (0 = dikosongkan)", jumlah());
        let _ = papanklip::salin_rahasia("CAM-UJI-RAHASIA-2", 3);
        std::thread::sleep(std::time::Duration::from_millis(500));
        let _ = papanklip::salin("salinan pemakai");
        std::thread::sleep(std::time::Duration::from_secs(4));
        println!("salinan pemakai sesudahnya, jumlah format: {} (>0 = tidak ikut dihapus)", jumlah());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-afk") {
        #[link(name = "user32")]
        extern "system" {
            fn GetForegroundWindow() -> *mut std::ffi::c_void;
            fn IsIconic(h: *mut std::ffi::c_void) -> i32;
        }
        let arg: Vec<String> = std::env::args().collect();
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let mut multi = SingletonGuard::new();
        let _ = multi.nyalakan();
        let store = Mutex::new(store::Store::load());
        let (id, btid) = {
            let s = store.lock().unwrap_or_else(|e| e.into_inner());
            match s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) {
                Some(a) => (a.id.clone(), a.browser_tracker_id),
                None => { println!("akun tidak ada"); return; }
            }
        };
        println!("diam_ms sekarang: {} ; layar penuh: {}", afk::diam_ms(), afk::layar_penuh());
        let awal = pantau::kini();
        let r = tauri::async_runtime::block_on(luncurkan_inti(&store, id, place, None, None, None, None, None, None, None, None));
        println!("luncur: {}", r.is_ok());
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(awal) > 0 { break; }
        }
        std::thread::sleep(std::time::Duration::from_secs(8));
        let Some(pid) = launcher::klien_terperinci().into_iter().find(|x| x.btid == btid).map(|x| x.pid) else { println!("klien tidak ada"); return };
        let Some(j) = jendela::daftar().into_iter().find(|j| j.pid == pid) else { println!("jendela tidak ada"); return };
        let depan_sebelum = unsafe { GetForegroundWindow() } as usize;
        for (label, kecilkan) in [("jendela biasa", false), ("diminimize", true)] {
            if kecilkan {
                let _ = jendela::kecilkan(j.hwnd);
                std::thread::sleep(std::time::Duration::from_secs(1));
            }
            let sebelum = unsafe { GetForegroundWindow() } as usize;
            let mulai = std::time::Instant::now();
            let h = afk::tekan(j.hwnd);
            let ms = mulai.elapsed().as_millis();
            std::thread::sleep(std::time::Duration::from_millis(300));
            let sesudah = unsafe { GetForegroundWindow() } as usize;
            let ikon = unsafe { IsIconic(j.hwnd as *mut std::ffi::c_void) } != 0;
            println!(
                "{label}: hasil {h:?} ({ms} ms); fokus kembali: {}; klien diminimize sesudahnya: {ikon}",
                sebelum == sesudah
            );
        }
        println!("jendela depan awal == akhir: {}", depan_sebelum == unsafe { GetForegroundWindow() } as usize);
        println!("baris putus: {:?}; klien hidup: {}", percobaan::baris_putus_sejak(awal), launcher::pid_klien().contains(&pid));
        tutup_klien(pid);
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-b2") {
        let arg: Vec<String> = std::env::args().collect();
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let mut multi = SingletonGuard::new();
        let _ = multi.nyalakan();
        let store = Mutex::new(store::Store::load());
        let (id, btid, asal) = {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            let Some(a) = s.accounts.iter_mut().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else { println!("akun tidak ada"); return };
            let asal = (a.hemat, a.fps_cap);
            a.hemat = false;
            a.fps_cap = 0;
            (a.id.clone(), a.browser_tracker_id, asal)
        };
        println!("inti logis: {}; FramerateCap pemakai: {:?}", std::thread::available_parallelism().map(|n| n.get()).unwrap_or(0), hemat::cap_terbaca());
        let awal = pantau::kini();
        let r = tauri::async_runtime::block_on(luncurkan_inti(&store, id.clone(), place, None, None, None, None, None, None, None, None));
        println!("luncur: {}", r.is_ok());
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(awal) > 0 { break; }
        }
        std::thread::sleep(std::time::Duration::from_secs(20));
        let Some(pid) = launcher::klien_terperinci().into_iter().find(|x| x.btid == btid).map(|x| x.pid) else { println!("klien tidak ada"); return };
        let ukur = |label: &str| {
            std::thread::sleep(std::time::Duration::from_secs(5));
            let _ = sumber::ukur();
            std::thread::sleep(std::time::Duration::from_secs(20));
            let l = sumber::ukur();
            match l.klien.iter().find(|k| k.pid == pid) {
                Some(k) => println!("  {label:<22} CPU {:>5.2}%  GPU {:>5.1}%  RAM {:>6.0} MB", k.cpu, k.gpu.unwrap_or(-1.0), k.ram_mb),
                None => println!("  {label:<22} klien hilang!"),
            }
        };
        ukur("baseline");
        println!("  eco: {:?}", launcher::eco_hidup(pid));
        ukur("eco");
        for (label, rate) in [("eco + cap 25%", 2500), ("eco + cap 5%", 500), ("eco + cap 2%", 200)] {
            println!("  {label}: {:?}", launcher::cap_hidup(pid, rate));
            ukur(label);
        }
        println!("baris putus sejak luncur: {:?}", percobaan::baris_putus_sejak(awal));
        println!("klien masih hidup: {}", launcher::pid_klien().contains(&pid));
        tutup_klien(pid);
        {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(a) = s.find_mut(&id) {
                (a.hemat, a.fps_cap) = asal;
            }
            let _ = s.save();
        }
        println!("setelan akun dikembalikan; klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-ambil-alih") {
        let arg: Vec<String> = std::env::args().collect();
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let amati: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(60);
        let detik = || std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
        let awal = detik();
        let lama = launcher::pid_klien();
        println!("klien lama: {lama:?}");
        if lama.is_empty() {
            println!("GAGAL: buka dulu satu game tanpa multi-instance.");
            return;
        }
        let mut multi = SingletonGuard::new();
        match multi.nyalakan() {
            Ok(()) => println!("CATATAN: penjaga langsung menyala tanpa take-over ({})", multi.keterangan),
            Err(e) => println!("OK penjaga ditolak sebelum take-over: {e}"),
        }
        multi.matikan();
        let n = singleton::ambil_alih();
        println!("take-over: {n} handle ditutup");
        std::thread::sleep(std::time::Duration::from_secs(2));
        let hidup_setelah = lama.iter().filter(|p| launcher::pid_klien().contains(p)).count();
        println!("klien lama hidup setelah take-over: {hidup_setelah}/{}", lama.len());
        if let Err(e) = multi.nyalakan() {
            println!("GAGAL penjaga setelah take-over: {e}");
            return;
        }
        println!("OK penjaga menyala: {}", multi.keterangan);
        let store = Mutex::new(store::Store::load());
        let id = {
            let s = store.lock().unwrap_or_else(|e| e.into_inner());
            match s.accounts.iter().find(|x| x.alias.eq_ignore_ascii_case(&alias)) {
                Some(x) => x.id.clone(),
                None => { println!("akun {alias} tidak ada"); return; }
            }
        };
        let sejak = detik();
        let hasil = tauri::async_runtime::block_on(luncurkan_inti(&store, id, place, None, None, None, None, None, None, None, None));
        if let Err(e) = &hasil { println!("  galat luncur: {e}"); }
        let mut join = false;
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(sejak) > 0 { join = true; break; }
        }
        println!("{alias}: luncur={} join={join}", hasil.is_ok());
        println!("AMATI {amati} dtk...");
        std::thread::sleep(std::time::Duration::from_secs(amati));
        let kini = launcher::pid_klien();
        let lama_hidup = lama.iter().filter(|p| kini.contains(p)).count();
        let putus = percobaan::baris_putus_sejak(awal);
        println!("RINGKAS: klien lama hidup {lama_hidup}/{}; klien total {}; baris putus: {:?}", lama.len(), kini.len(), putus);
        for _ in 0..4 {
            for j in jendela::daftar() {
                if launcher::pid_klien().contains(&j.pid) { let _ = jendela::tutup(j.hwnd); }
            }
            std::thread::sleep(std::time::Duration::from_secs(4));
            if launcher::pid_klien().is_empty() { break; }
        }
        println!("klien tersisa setelah ditutup: {}", launcher::pid_klien().len());
        return;
    }

    if let Some(i) = std::env::args().position(|a| a == "--probe-rejoin") {
        #[link(name = "ntdll")]
        extern "system" {
            fn NtSuspendProcess(h: *mut std::ffi::c_void) -> i32;
        }
        #[link(name = "kernel32")]
        extern "system" {
            fn OpenProcess(akses: u32, warisi: i32, pid: u32) -> *mut std::ffi::c_void;
            fn CloseHandle(h: *mut std::ffi::c_void) -> i32;
        }
        let arg: Vec<String> = std::env::args().collect();
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let skenario = arg.get(i + 3).cloned().unwrap_or_default();
        let detik: u64 = arg.get(i + 4).and_then(|x| x.parse().ok()).unwrap_or(150);
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let store = Mutex::new(store::Store::load());
        let (id, btid, asli) = {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            let Some(a) = s.accounts.iter_mut().find(|x| x.alias.eq_ignore_ascii_case(&alias)) else {
                println!("akun {alias} tidak ada");
                return;
            };
            let asli = a.auto_rejoin;
            a.auto_rejoin = skenario != "mati";
            (a.id.clone(), a.browser_tracker_id, asli)
        };
        let mut g = SingletonGuard::new();
        if let Err(e) = g.nyalakan() {
            println!("GAGAL multi-instance: {e}");
            return;
        }
        let singleton = Mutex::new(g);
        let proteksi = sesi::Proteksi::default();
        let pelacak = pantau::Pelacak::default();
        let k = Konteks { store: &store, singleton: &singleton, proteksi: &proteksi, pelacak: &pelacak };
        let sejak = pantau::kini();
        let r = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id.clone(), pantau::Tujuan { place_id: place, ..Default::default() }));
        println!("luncur: {r:?}");
        let mut join = false;
        for _ in 0..120 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if joinlog::jumlah_join_sejak(sejak) > 0 {
                join = true;
                break;
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(5));
        let pid = launcher::klien_terperinci().into_iter().find(|x| x.btid == btid).map(|x| x.pid);
        println!("join={join} pid={pid:?}");
        let Some(pid) = pid else { return };
        let klaim = tauri::async_runtime::block_on(luncurkan_terlacak(&k, id.clone(), pantau::Tujuan { place_id: place, ..Default::default() }));
        println!("klaim (harus ditolak): {klaim:?}; klien akun ini: {}", launcher::klien_terperinci().iter().filter(|x| x.btid == btid).count());
        if skenario == "simpan" {
            {
                let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(a) = s.find_mut(&id) {
                    a.auto_rejoin = true;
                }
                let _ = s.save();
            }
            let enc = store::encrypt(&pelacak.ekspor()).unwrap_or_default();
            let _ = std::fs::write(store::berkas_data(BERKAS_PELACAK), enc);
            println!("pelacak.json ditulis; auto_rejoin asli={asli}; klien {pid} dibiarkan hidup");
            return;
        }
        let t0 = std::time::Instant::now();
        match skenario.as_str() {
            "crash" | "mati" => println!("akhiri proses: {}", launcher::akhiri_klien(pid)),
            "macet" => unsafe {
                let h = OpenProcess(0x0800, 0, pid);
                println!("bekukan proses: {}", !h.is_null() && NtSuspendProcess(h) == 0);
                CloseHandle(h);
            },
            "tutup" => {
                for n in 1..=6 {
                    for j in jendela::daftar().into_iter().filter(|j| j.pid == pid) {
                        let _ = jendela::tutup(j.hwnd);
                    }
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    if !launcher::pid_klien().contains(&pid) {
                        println!("ditutup setelah {n} WM_CLOSE");
                        break;
                    }
                }
            }
            _ => println!("skenario tak dikenal"),
        }
        std::thread::scope(|sc| {
            sc.spawn(|| jalankan_pantau(&k, Some(std::time::Instant::now() + std::time::Duration::from_secs(detik))));
            let akhir = std::time::Instant::now() + std::time::Duration::from_secs(detik + 1);
            while std::time::Instant::now() < akhir {
                std::thread::sleep(std::time::Duration::from_secs(2));
                for c in pelacak.ambil_catatan() {
                    println!("[{:>3}s] {}: {}", t0.elapsed().as_secs(), c.jenis, c.teks);
                }
            }
        });
        let baru: Vec<u32> = launcher::klien_terperinci().into_iter().filter(|x| x.btid == btid).map(|x| x.pid).collect();
        println!("RINGKAS: klien akun ini sekarang {baru:?} (lama {pid}); join baru sejak skenario: {}", joinlog::jumlah_join_sejak(sejak + 10));
        {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(a) = s.find_mut(&id) {
                a.auto_rejoin = asli;
            }
            let _ = s.save();
        }
        for x in launcher::klien_terperinci() {
            tutup_klien(x.pid);
        }
        println!("klien tersisa: {}", launcher::pid_klien().len());
        return;
    }

    if std::env::args().any(|a| a == "--probe-diagnosa") {
        let store = Mutex::new(store::Store::load());
        let teks = tauri::async_runtime::block_on(diagnosa_inti(&store, None, false));
        println!("{teks}");
        if std::env::var("PROBE_TANPA_PAPAN").is_err() {
            if let Err(e) = papanklip::salin(&teks) {
                eprintln!("clipboard: {e}");
            }
        }
        return;
    }
    if std::env::args().any(|a| a == "--daftar-handle") {
        for n in singleton::daftar_nama_objek() {
            println!("{n}");
        }
        return;
    }

    let arg: Vec<String> = std::env::args().collect();
    if let Some(i) = arg.iter().position(|a| a == "--probe-pribadi") {
        let cari = arg.get(i + 1).cloned().unwrap_or_default().to_lowercase();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let hidupkan = arg.get(i + 3).map(|x| x == "hidupkan").unwrap_or(false);
        let s = store::Store::load();
        let Some(ak) = s.accounts.iter().find(|a| a.alias.to_lowercase() == cari || a.username.to_lowercase() == cari) else {
            println!("akun tidak ditemukan");
            return;
        };
        let Ok(c) = store::decrypt(&ak.cookie_enc) else {
            println!("cookie tak terbaca");
            return;
        };
        let (id, user) = (ak.id.clone(), ak.user_id);
        tauri::async_runtime::block_on(async {
            let uid = roblox::universe_dari_place(place).await;
            let info = roblox::info_pribadi(&c, uid, place).await;
            println!("universe {uid}: {info:?} -> boleh buat gratis: {:?}", boleh_buat_gratis(&info));
            let cetak = |p: &PribadiAkun| println!("status={} vip={} nama={:?} kode_akses={} link={} pesan={:?}", p.status, p.vip_id, p.nama, if p.access_code.is_empty() { "kosong" } else { "ada" }, if p.link.is_empty() { "kosong" } else { "ada" }, p.pesan);
            let st = status_pribadi_akun(&c, user, &id, uid, place).await;
            cetak(&st);
            if hidupkan && st.status == "mati" {
                let d = roblox::ubah_vip(&c, st.vip_id, serde_json::json!({ "active": true })).await;
                println!("hidupkan: {:?}", d.map(|d| d.aktif));
                cetak(&status_pribadi_akun(&c, user, &id, uid, place).await);
                let d = roblox::ubah_vip(&c, st.vip_id, serde_json::json!({ "active": false })).await;
                println!("matikan lagi: {:?}", d.map(|d| d.aktif));
                cetak(&status_pribadi_akun(&c, user, &id, uid, place).await);
            }
        });
        return;
    }
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
                if launcher::luncurkan(&tk, &t, 1, None, &[]).is_err() {
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
            let mut ips = Vec::new();
            for j in &jobs {
                if let Some(ip) = roblox::alamat_server(&c, place, j).await {
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
                println!(
                    "        fisik~ {:6.0} MB = privat-RAM {:6.0} + bersama {:5.0}/{} + kompresi~ {:5.0} | baca {:?} tulis {:?} B/s | mulai {} | CPU PC {:?} | fisik semua~ {:.0}",
                    k.fisik_perkiraan_mb, k.ram_privat_mb, k.ram_bersama_mb, l.klien.len(), k.kompresi_perkiraan_mb,
                    k.baca_bps.map(|x| x.round()), k.tulis_bps.map(|x| x.round()), k.mulai_unix, l.cpu_sistem.map(|x| (x * 10.0).round() / 10.0), l.fisik_semua_perkiraan_mb
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

    if let Some(i) = arg.iter().position(|a| a == "--probe-kecil") {
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let lebar: Vec<u32> = arg.get(i + 3).map(|s| s.split(',').filter_map(|x| x.trim().parse().ok()).collect()).unwrap_or_else(|| vec![160, 240, 320]);
        let store = Mutex::new(store::Store::load());
        let (id, semula, btid) = {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            let Some(a) = s.accounts.iter_mut().find(|a| a.alias.eq_ignore_ascii_case(&alias)) else {
                println!("akun {alias} tidak ditemukan");
                return;
            };
            let semula = (a.hemat, a.hemat_minimize, a.hemat_ram_mb, a.mulai_kecil);
            a.hemat = true;
            a.hemat_minimize = false;
            a.hemat_ram_mb = 512;
            a.mulai_kecil = 0;
            (a.id.clone(), semula, a.browser_tracker_id)
        };
        if !launcher::pid_klien().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        let sejak = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
        let hasil = tauri::async_runtime::block_on(luncurkan_inti(&store, id.clone(), place, None, None, None, None, None, None, None, None));
        println!("luncurkan_inti: {}", if hasil.is_ok() { "ok" } else { "GAGAL" });
        let mut pid = None;
        for _ in 0..90 {
            std::thread::sleep(std::time::Duration::from_secs(1));
            pid = launcher::klien_terperinci().into_iter().find(|k| k.btid == btid).map(|k| k.pid);
            if pid.is_some() && joinlog::jumlah_join_sejak(sejak) > 0 {
                break;
            }
        }
        if let Some(pid) = pid {
            std::thread::sleep(std::time::Duration::from_secs(15));
            let hwnd = jendela::daftar().into_iter().find(|j| j.pid == pid).map(|j| j.hwnd);
            match hwnd {
                None => println!("GAGAL: jendela klien tidak ditemukan"),
                Some(h) => {
                    let _ = sumber::ukur();
                    for &w in &lebar {
                        let t = store::tinggi_kecil(w);
                        let r = kecil::kecilkan(h, w, t);
                        let mut ukuran = Vec::new();
                        let (mut n, mut cpu, mut gpu) = (0.0, 0.0, 0.0);
                        for _ in 0..15 {
                            std::thread::sleep(std::time::Duration::from_secs(2));
                            if let Some((cw, ch)) = kecil::ukuran_klien(h) {
                                ukuran.push(format!("{cw}x{ch}"));
                            }
                            if let Some(k) = sumber::ukur().klien.into_iter().find(|k| k.pid == pid) {
                                n += 1.0; cpu += k.cpu; gpu += k.gpu.unwrap_or(0.0);
                            }
                        }
                        ukuran.dedup();
                        let stabil = ukuran.len() == 1;
                        println!(
                            "lebar {w} (minta {w}x{t}): kecilkan={} | area game: {} | {} | CPU {:.2}% GPU {:.2}%",
                            if r.is_ok() { "ok" } else { "GAGAL" },
                            ukuran.join(" -> "),
                            if stabil { "STABIL" } else { "BERUBAH" },
                            if n > 0.0 { cpu / n } else { 0.0 },
                            if n > 0.0 { gpu / n } else { 0.0 },
                        );
                    }
                    for _ in 0..3 {
                        let _ = jendela::tutup(h);
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        if !launcher::pid_klien().contains(&pid) { break; }
                    }
                }
            }
        } else {
            println!("GAGAL: klien akun tidak terdata");
        }
        {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(a) = s.find_mut(&id) {
                (a.hemat, a.hemat_minimize, a.hemat_ram_mb, a.mulai_kecil) = semula;
            }
            let _ = s.save();
        }
        println!("pengaturan akun dikembalikan: {semula:?}");
        return;
    }
    if let Some(i) = arg.iter().position(|a| a == "--probe-gaya") {
        let nama = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let lebar: u32 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(320);
        let sesudah: u64 = arg.get(i + 4).and_then(|x| x.parse().ok()).unwrap_or(30);
        let hangat = arg.get(i + 5).is_some_and(|x| x == "hangat");
        PROBE_BIARKAN_TRAY.store(hangat, std::sync::atomic::Ordering::Relaxed);
        println!("mode: {}", if hangat { "HANGAT (tray diam dibiarkan)" } else { "dingin (tray diam diakhiri)" });
        let store = Mutex::new(store::Store::load());
        let (id, semula, btid) = {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            let Some(a) = s.accounts.iter_mut().find(|a| a.alias.eq_ignore_ascii_case(&nama) || a.username.eq_ignore_ascii_case(&nama)) else {
                println!("akun {nama} tidak ditemukan");
                return;
            };
            let semula = (a.hemat, a.hemat_minimize, a.mulai_kecil);
            a.hemat = true;
            a.hemat_minimize = false;
            a.mulai_kecil = lebar;
            (a.id.clone(), semula, a.browser_tracker_id)
        };
        if !launcher::klien_terperinci().is_empty() {
            println!("GAGAL: tutup dulu semua klien Roblox.");
            return;
        }
        println!("tray diam sebelum luncur: {:?}", launcher::tray_diam());
        let gbs = dirs::data_local_dir().map(|d| d.join("Roblox").join("GlobalBasicSettings_13.xml"));
        let baca_gbs = || {
            gbs.as_ref()
                .and_then(|p| std::fs::read_to_string(p).ok())
                .map(|t| {
                    t.lines()
                        .filter(|l| l.contains("\"Fullscreen\"") || l.contains("\"StartMaximized\"") || l.contains("\"SavedQualityLevel\"") || l.contains("\"GraphicsQualityLevel\""))
                        .map(|l| l.trim().to_string())
                        .collect::<Vec<_>>()
                        .join(" ")
                })
                .unwrap_or_else(|| "(tidak terbaca)".into())
        };
        println!("GlobalBasicSettings sebelum: {}", baca_gbs());
        let t0 = std::time::Instant::now();
        let sejak = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
        let hasil = tauri::async_runtime::block_on(luncurkan_inti(&store, id.clone(), place, None, None, None, None, None, None, None, None));
        println!("[{:>6.1}s] luncurkan_inti: {}", t0.elapsed().as_secs_f64(), if hasil.is_ok() { "ok" } else { "GAGAL" });
        let mut terakhir: std::collections::HashMap<usize, String> = std::collections::HashMap::new();
        let mut catat = |label: &str| {
            for pid in launcher::pid_roblox_mentah() {
                for (hw, lihat, kelas, judul, g, (x, y, w, t)) in jendela::semua_milik(pid) {
                    if !lihat && judul.is_empty() {
                        continue;
                    }
                    let judul_ada = g & 0x00C0_0000 == 0x00C0_0000;
                    let klien = kecil::ukuran_klien(hw).map(|(a, b)| format!("{a}x{b}")).unwrap_or_default();
                    let baris = format!(
                        "pid {pid} hwnd {hw:#x} {} kelas={kelas} judul={judul:?} gaya={g:#010x} [{}{}{}{}] kotak {x},{y} {w}x{t} klien {klien}{}",
                        if lihat { "TERLIHAT" } else { "tersembunyi" },
                        if judul_ada { "CAPTION " } else { "tanpa-caption " },
                        if g & 0x0004_0000 != 0 { "THICKFRAME " } else { "" },
                        if g & 0x8000_0000 != 0 { "POPUP " } else { "" },
                        if g & 0x0008_0000 != 0 { "SYSMENU" } else { "" },
                        if kecil::maksimal(hw) { " MAKS" } else if kecil::minimize(hw) { " MIN" } else { "" },
                    );
                    if terakhir.get(&hw) != Some(&baris) {
                        println!("[{:>6.1}s] {label}: {baris}", t0.elapsed().as_secs_f64());
                        terakhir.insert(hw, baris);
                    }
                }
            }
        };
        let mut join = false;
        while t0.elapsed() < std::time::Duration::from_secs(120) {
            catat("sebelum join");
            if joinlog::jumlah_join_sejak(sejak) > 0 && launcher::klien_terperinci().iter().any(|k| k.btid == btid) {
                join = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        println!("[{:>6.1}s] join terdeteksi: {join}", t0.elapsed().as_secs_f64());
        if join {
            let ok = atur_jendela_setelah_join(btid, lebar, false);
            println!("[{:>6.1}s] atur_jendela_setelah_join({lebar}) = {ok}", t0.elapsed().as_secs_f64());
            let batas = t0.elapsed() + std::time::Duration::from_secs(sesudah);
            while t0.elapsed() < batas {
                catat("sesudah kecil");
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
        }
        println!("GlobalBasicSettings sesudah: {}", baca_gbs());
        println!("tray diam sesudah: {:?}; klien: {:?}", launcher::tray_diam(), launcher::klien_terperinci().iter().map(|k| k.pid).collect::<Vec<_>>());
        if hangat {
            {
                let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(a) = s.find_mut(&id) {
                    (a.hemat, a.hemat_minimize, a.mulai_kecil) = semula;
                }
                let _ = s.save();
            }
            println!("pengaturan akun dikembalikan: {semula:?} (klien dibiarkan terbuka)");
            return;
        }
        for pid in launcher::pid_klien() {
            if let Some(h) = jendela::daftar().into_iter().find(|j| j.pid == pid) {
                let _ = jendela::tutup(h.hwnd);
            }
        }
        for _ in 0..20 {
            if launcher::pid_klien().is_empty() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
        println!("klien tersisa: {:?}", launcher::pid_klien());
        {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(a) = s.find_mut(&id) {
                (a.hemat, a.hemat_minimize, a.mulai_kecil) = semula;
            }
            let _ = s.save();
        }
        println!("pengaturan akun dikembalikan: {semula:?}");
        return;
    }
    if let Some(i) = arg.iter().position(|a| a == "--probe-gaya-uji") {
        let lebar: u32 = arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(320);
        let cara = arg.get(i + 2).cloned().unwrap_or_else(|| "asli".into());
        let Some(k) = launcher::klien_terperinci().into_iter().next() else {
            println!("GAGAL: tidak ada klien");
            return;
        };
        let Some((hw, ..)) = jendela::semua_milik(k.pid).into_iter().find(|j| j.1 && j.2 == "WINDOWSCLIENT") else {
            println!("GAGAL: jendela game tidak terlihat");
            return;
        };
        let t0 = std::time::Instant::now();
        let mut terakhir = String::new();
        let mut cetak = |label: &str| {
            let g = kecil::gaya(hw);
            let r = kecil::kotak(hw).unwrap_or_default();
            let b = format!(
                "gaya={g:#010x} caption={} kotak {},{} {}x{} klien {:?}",
                g & 0x00C0_0000 == 0x00C0_0000,
                r.left, r.top, r.right - r.left, r.bottom - r.top,
                kecil::ukuran_klien(hw)
            );
            if b != terakhir {
                println!("[{:>5.1}s] {label}: {b}", t0.elapsed().as_secs_f64());
                terakhir = b;
            }
        };
        cetak("awal");
        match cara.as_str() {
            "bingkai" => {
                println!("pasang_bingkai = {}", kecil::pasang_bingkai(hw));
                println!("kecilkan = {:?}", kecil::kecilkan(hw, lebar, store::tinggi_kecil(lebar)));
            }
            "f11" => {
                const WM_KEYDOWN: u32 = 0x0100;
                const WM_KEYUP: u32 = 0x0101;
                const VK_F11: usize = 0x7A;
                #[link(name = "user32")]
                extern "system" {
                    fn PostMessageW(h: *mut std::ffi::c_void, m: u32, w: usize, l: isize) -> i32;
                }
                unsafe {
                    PostMessageW(hw as _, WM_KEYDOWN, VK_F11, 0x0057_0001);
                    PostMessageW(hw as _, WM_KEYUP, VK_F11, 0xC057_0001u32 as i32 as isize);
                }
                for _ in 0..20 {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    cetak("sesudah F11");
                }
                println!("kecilkan = {:?}", kecil::kecilkan(hw, lebar, store::tinggi_kecil(lebar)));
            }
            "normal" => {
                println!("kecilkan = {:?}", kecil::kecilkan(hw, lebar, store::tinggi_kecil(lebar)));
                for _ in 0..30 {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    cetak("kecil");
                }
                println!("ukuran_normal = {:?}", kecil::ukuran_normal(hw));
            }
            _ => println!("kecilkan = {:?}", kecil::kecilkan(hw, lebar, store::tinggi_kecil(lebar))),
        }
        while t0.elapsed() < std::time::Duration::from_secs(20) {
            cetak(&cara);
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        return;
    }
    if let Some(i) = arg.iter().position(|a| a == "--probe-luncur") {
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let ram: u32 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(512);
        let store = Mutex::new(store::Store::load());
        let (id, semula, btid) = {
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
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
        let hasil = tauri::async_runtime::block_on(luncurkan_inti(&store, id.clone(), place, None, None, None, None, None, None, None, None));
        println!("luncurkan_inti: {hasil:?}");
        let cap = hemat::cap_terbaca();
        let (_, flags) = fps::isi_berkas(&store.lock().unwrap_or_else(|e| e.into_inner()).klien_path.clone());
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
                println!("versi_alih tersimpan = {:?}", store.lock().unwrap_or_else(|e| e.into_inner()).versi_alih);
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
            let mut s = store.lock().unwrap_or_else(|e| e.into_inner());
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

    if let Some(i) = arg.iter().position(|a| a == "--probe-berkas-ram") {
        match std::fs::read(arg.get(i + 1).cloned().unwrap_or_default()).map_err(|e| e.to_string()).and_then(|d| impor::urai_berkas_ram(&d)) {
            Ok(e) => {
                println!("{} entri", e.len());
                for x in e {
                    println!("{}: cookie={} alias={:?} catatan={} lewati={:?}", x.label, x.cookie.is_some(), x.alias, !x.catatan.is_empty(), x.lewati);
                }
            }
            Err(e) => println!("GAGAL: {e}"),
        }
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-job-anak") {
        uji_job::anak(arg.get(i + 1).and_then(|x| x.parse().ok()).unwrap_or(700));
        return;
    }
    if arg.iter().any(|a| a == "--probe-job-ws") {
        if let Err(e) = uji_job::jalankan() {
            println!("GAGAL: {e}");
        }
        return;
    }

    if let Some(i) = arg.iter().position(|a| a == "--probe-hemat") {
        let alias = arg.get(i + 1).cloned().unwrap_or_default();
        let place: u64 = arg.get(i + 2).and_then(|x| x.parse().ok()).unwrap_or(0);
        let detik: u64 = arg.get(i + 3).and_then(|x| x.parse().ok()).unwrap_or(60);
        if alias.is_empty() || place == 0 {
            println!("pakai: --probe-hemat <alias> <placeId> [detik] [berkas.csv] [awal|fps|pilot|geometri|grafis|proses|hidup|cpusibuk|cpusilang|kalibrasi]  (env: PROBE_BLOK, PROBE_STABIL, PROBE_BUANG, PROBE_BENIH)");
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
                launcher::luncurkan(&tk, &t, 1, None, &[])
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

    let proteksi = std::sync::Arc::new(sesi::Proteksi::default());
    {
        let p = proteksi.clone();
        std::thread::spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_secs(5));
            p.rawat(|| !launcher::pid_klien().is_empty());
        });
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            baki::tampilkan(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            store: Mutex::new(Store::load()),
            singleton: Mutex::new(singleton),
            proteksi,
            pelacak: pantau::Pelacak::default(),
            impor: Mutex::new(Vec::new()),
        })
        .setup(|app| {
            {
                let h = app.handle().clone();
                roblox::pasang_penerima_rotasi(move |lama, baru| {
                    simpan_rotasi(&h.state::<AppState>().store, lama, baru);
                });
            }
            login::sapu_situs();
            kecil::mulai_pengawas();
            let _ = std::thread::Builder::new().name("cam-kecil".into()).spawn(|| loop {
                std::thread::sleep(std::time::Duration::from_secs(3));
                kecil::jaga();
            });
            {
                let h = app.handle().clone();
                let _ = std::thread::Builder::new().name("cam-trim".into()).spawn(move || {
                    let mut jadwal = kendali::Penjadwal::default();
                    loop {
                        std::thread::sleep(std::time::Duration::from_secs(10));
                        putaran_trim(&h.state::<AppState>().store, &mut jadwal);
                    }
                });
            }
            mulai_pemburu_avatar3d(app.handle().clone());
            pasang_discord(&app.state::<AppState>().store.lock().unwrap_or_else(|e| e.into_inner()));
            {
                let h = app.handle().clone();
                darurat::mulai(move || {
                    let st = h.state::<AppState>();
                    let n = tutup_semua_klien_inti(&st.pelacak, true);
                    st.pelacak.catat(format!("Emergency hotkey: ended {n} Roblox client{}.", if n == 1 { "" } else { "s" }), "salah");
                });
                let aktif = app.state::<AppState>().store.lock().unwrap_or_else(|e| e.into_inner()).hotkey_darurat;
                if aktif {
                    if let Err(e) = darurat::atur(true) {
                        store::catat_kejadian(&e);
                    }
                }
            }
            {
                let h = app.handle().clone();
                let _ = std::thread::Builder::new().name("cam-sisa".into()).spawn(move || {
                    let mut tanpa = std::collections::HashMap::new();
                    loop {
                        std::thread::sleep(std::time::Duration::from_secs(10));
                        for (pid, btid) in sisa::periksa(&mut tanpa, pantau::kini()) {
                            if !launcher::klien_terperinci().iter().any(|k| k.pid == pid && k.btid == btid) {
                                continue;
                            }
                            let st = h.state::<AppState>();
                            let alias = st.store.lock().unwrap_or_else(|e| e.into_inner()).accounts.iter().find(|a| a.browser_tracker_id == btid).map(|a| a.alias.clone());
                            tutup_klien(pid);
                            st.pelacak.catat(
                                format!(
                                    "{}: the game was closed but its Roblox process stayed in memory without a window (PID {pid}), so it was ended.",
                                    alias.unwrap_or_else(|| "A Roblox client".into())
                                ),
                                "info",
                            );
                        }
                    }
                });
            }
            if let Err(e) = baki::pasang(app.handle()) {
                store::catat_kejadian(&format!("Tray icon unavailable: {e}"));
            }
            kehadiran::mulai(app.handle().clone());
            if let Some(w) = app.get_webview_window("main") {
                pusatkan_jendela_utama(&w);
                if let Err(e) = w.show() {
                    store::catat_kejadian(&format!("Main window: could not show it: {e}; trying again"));
                    let w = w.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        if let Err(e) = w.show() {
                            store::catat_kejadian(&format!("Main window: could not show it again: {e}"));
                        }
                    });
                }
            }
            if let Some(w) = app.get_webview_window("main") {
                let h = app.handle().clone();
                let w2 = w.clone();
                w.on_window_event(move |e| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = e {
                        let ke_tray = h.state::<AppState>().store.lock().unwrap_or_else(|e| e.into_inner()).tutup_ke_tray;
                        if ke_tray {
                            api.prevent_close();
                            if w2.hide().is_ok() {
                                pengaman::target_memori(&w2, true);
                            }
                        }
                    }
                    if let tauri::WindowEvent::ScaleFactorChanged { .. } = e {
                        if BAYANGAN_AKTIF.load(std::sync::atomic::Ordering::SeqCst) {
                            pasang_bayangan(&w2);
                        }
                    }
                    if let tauri::WindowEvent::Destroyed = e {
                        for (label, w) in h.webview_windows() {
                            if label.starts_with(AWALAN_SITUS) {
                                let _ = w.close();
                            }
                        }
                    }
                });
            }
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.with_webview(|pv| {
                    if let Err(e) = pengaman::keraskan(&pv, pengaman::Jenis::Utama, None) {
                        store::catat_kejadian(&e);
                    }
                });
            }
            if let Some(i) = std::env::args().position(|a| a == "--probe-situs-tutup") {
                let (a, b) = (std::env::args().nth(i + 1).unwrap_or_default(), std::env::args().nth(i + 2).unwrap_or_default());
                let h = app.handle().clone();
                tauri::async_runtime::spawn(async move { probe_situs_tutup(h, a, b).await });
            }
            if let Some(i) = std::env::args().position(|a| a == "--probe-situs") {
                let alias = std::env::args().nth(i + 1).unwrap_or_default();
                let h = app.handle().clone();
                tauri::async_runtime::spawn(async move { probe_situs(h, alias).await });
            }
            if let Some(i) = std::env::args().position(|a| a == "--probe-tray-segar") {
                let (csv, mode) = (std::env::args().nth(i + 1).unwrap_or_default(), std::env::args().nth(i + 2).unwrap_or_default());
                let ulang = std::env::args().nth(i + 3).and_then(|x| x.parse().ok()).unwrap_or(1);
                let h = app.handle().clone();
                tauri::async_runtime::spawn(async move { probe_tray::segar(h, csv, mode, ulang).await });
            }
            if let Some(i) = std::env::args().position(|a| a == "--probe-tray") {
                let csv = std::env::args().nth(i + 1).unwrap_or_default();
                let h = app.handle().clone();
                tauri::async_runtime::spawn(async move { probe_tray::jalankan(h, csv).await });
            }
            if std::env::args().any(|a| a == "--probe-pengaman") {
                let h = app.handle().clone();
                tauri::async_runtime::spawn(async move { probe_pengaman(h).await });
            }
            let h = app.handle().clone();
            std::thread::Builder::new().name("cam-setelan".into()).spawn(move || {
                {
                    let st = h.state::<AppState>();
                    let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
                    let mut pernah = s.fflags_pernah.clone();
                    for k in hemat::flag_hemat().keys() {
                        if !pernah.contains(k) {
                            pernah.push(k.clone());
                        }
                    }
                    if setelan_fps::KUNCI.try_lock().is_ok() {
                        let _ = fps::terapkan(Some(0), &s.klien_path, &s.fflags, &pernah);
                        let n = setelan_fps::sapu_flag_hemat(&s.fflags);
                        if n > 0 {
                            store::catat_kejadian(&format!("Removed leftover resource-saver flags from {n} Roblox version folder(s)."));
                        }
                    }
                }
                loop {
                    if let Ok(_g) = setelan_fps::KUNCI.try_lock() {
                        let (asli, kami) = {
                            let st = h.state::<AppState>();
                            let s = st.store.lock().unwrap_or_else(|e| e.into_inner());
                            (s.cap_asli, s.cap_kami.clone())
                        };
                        if setelan_fps::pulihkan(asli, &kami) {
                            store::catat_kejadian("Put the user's Roblox frame-rate cap back (a resource saver client had saved its own).");
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
            })?;
            {
                let st = app.state::<AppState>();
                let teks = std::fs::read_to_string(store::berkas_data(BERKAS_PELACAK)).unwrap_or_default();
                if let Ok(json) = store::decrypt(teks.trim()) {
                    let proses: Vec<(u32, u64)> = launcher::klien_terperinci().into_iter().map(|x| (x.pid, x.btid)).collect();
                    let n = st.pelacak.impor(&json, &proses);
                    if n > 0 {
                        st.pelacak.catat(format!("Following {n} Roblox client(s) from before CAM restarted (auto-rejoin keeps working for them)."), "info");
                    }
                }
            }
            let h = app.handle().clone();
            std::thread::Builder::new().name("cam-afk".into()).spawn(move || loop {
                let st = h.state::<AppState>();
                let jeda = putaran_afk(&st.konteks());
                std::thread::sleep(jeda);
            })?;
            let h = app.handle().clone();
            std::thread::Builder::new().name("cam-pantau".into()).spawn(move || {
                let st = h.state::<AppState>();
                jalankan_pantau(&st.konteks(), None);
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            daftar_akun,
            lokasi_penyimpanan,
            tambah_akun,
            salin_cookie,
            hello_status,
            buka_situs,
            pilih_server_bersama,
            server_join_akun,
            calon_ikuti,
            daftar_server_pribadi_semua,
            server_sepi,
            impor_siapkan_teks,
            impor_siapkan_ram,
            impor_jalankan,
            impor_selesai,
            daftar_masalah,
            hapus_masalah,
            tutup_semua_klien,
            masalah_masuk,
            info_log_roblox,
            bersihkan_log_roblox,
            jadwal_matikan,
            batal_matikan,
            status_matikan,
            tutup_ke_tray,
            set_tutup_ke_tray,
            tutup_satu_klien,
            hotkey_darurat,
            set_hotkey_darurat,
            jendela_kecil,
            jendela_normal,
            susun_kecil,
            semua_jendela,
            pratinjau_tampil,
            pratinjau_tutup,
            set_kecil_akun,
            taruh_akun,
            cadangan_buat,
            cadangan_pilih,
            cadangan_pulihkan,
            salin_teks,
            set_hello_salin,
            hapus_akun_banyak,
            ubah_alias,
            set_catatan,
            set_akun_utama,
            set_kualitas_penuh,
            performance_policy_status,
            set_anggaran_ram,
            cek_anggaran,
            argumen_luncur,
            set_argumen_luncur,
            set_argumen_akun,
            ekspor_profil,
            impor_profil_pilih,
            impor_profil_terapkan,
            discord_status,
            set_discord_webhook,
            hapus_discord_webhook,
            set_discord_acara,
            set_discord_kehadiran,
            kehadiran_halaman,
            atur_bahasa,
            uji_discord,
            kabari_batch,
            set_favorit,
            segarkan_akun,
            avatar_3d,
            avatar_3d_periksa,
            avatar_badan,
            multi_instance_status,
            set_multi_instance,
            ambil_alih_multi,
            jumlah_klien_roblox,
            jumlah_join_sejak,
            cari_game,
            jelajah_game,
            detail_game,
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
            status_pantau,
            target_terakhir,
            simpan_target_terakhir,
            daftar_server_tersimpan,
            simpan_server_tersimpan,
            ubah_nama_server_tersimpan,
            hapus_server_tersimpan,
            login_browser,
            login_terputus,
            diagnosa,
            simpan_diagnosa,
            tutup_login_browser,
            set_hemat_akun,
            jendela_hemat,
            periksa_versi_hemat,
            daftar_folder,
            buat_folder,
            ubah_folder,
            hapus_folder,
            urutkan_folder,
            pindah_akun,
            terapkan_preset_folder,
            set_klien_path,
            tambah_klien_kustom,
            hapus_klien_kustom,
            hapus_versi_roblox,
            hapus_versi_roblox_lama,
            fflag_daftar,
            jendela_aksi,
            jendela_maks,
            jendela_penuh,
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
            status_proteksi,
            status_muat,
            akui_status_muat,
            set_rejoin_akun,
            set_afk_akun,
            afk_menit,
            set_afk_menit,
            grafis_ringan,
            set_grafis_ringan,
            trim_latar,
            set_trim_latar,
            set_antrean_luncur,
            set_proteksi_sesi,
            periksa_akun_join,
            daftar_server,
            wilayah_server_banyak,
            periksa_server,
            versi_place_terbaru,
            atur_target_akun,
            siapkan_pribadi_sendiri,
            buat_server_gratis,
            daftar_pribadi_milik_semua,
            detail_server_pribadi,
            ubah_server_pribadi,
            info_server_pribadi,
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
