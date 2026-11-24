use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::{Deserialize, Serialize};
use std::ffi::c_void;
use std::path::PathBuf;

#[repr(C)]
struct DataBlob {
    cb_data: u32,
    pb_data: *mut u8,
}

const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

#[link(name = "crypt32")]
extern "system" {
    fn CryptProtectData(
        p_data_in: *const DataBlob,
        sz_data_descr: *const u16,
        p_optional_entropy: *const DataBlob,
        pv_reserved: *mut c_void,
        p_prompt_struct: *mut c_void,
        dw_flags: u32,
        p_data_out: *mut DataBlob,
    ) -> i32;

    fn CryptUnprotectData(
        p_data_in: *const DataBlob,
        pp_sz_data_descr: *mut *mut u16,
        p_optional_entropy: *const DataBlob,
        pv_reserved: *mut c_void,
        p_prompt_struct: *mut c_void,
        dw_flags: u32,
        p_data_out: *mut DataBlob,
    ) -> i32;
}

#[link(name = "kernel32")]
extern "system" {
    fn LocalFree(h_mem: *mut c_void) -> *mut c_void;
    fn GetLastError() -> u32;
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Account {
    pub id: String,
    pub alias: String,
    pub username: String,
    pub display_name: String,
    pub user_id: u64,
    pub robux: i64,
    pub premium: bool,
    #[serde(default)]
    pub plus: bool,
    #[serde(default)]
    pub avatar_url: String,
    #[serde(default)]
    pub last_refreshed: i64,
    #[serde(default)]
    pub last_launched: i64,
    #[serde(default)]
    pub fps_cap: u32,
    pub cookie_enc: String,
    pub browser_tracker_id: u64,
    pub last_error: String,
    #[serde(default)]
    pub hemat: bool,
    #[serde(default)]
    pub hemat_minimize: bool,
    #[serde(default)]
    pub hemat_ram_mb: u32,
    #[serde(default)]
    pub hemat_fps: u32,
    #[serde(default)]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub auto_rejoin: bool,
    #[serde(default)]
    pub anti_afk: bool,
    #[serde(default)]
    pub catatan: String,
    #[serde(default)]
    pub favorit: bool,
    #[serde(default)]
    pub server_terakhir: Option<ServerTerakhir>,
    #[serde(default)]
    pub mulai_kecil: u32,
    #[serde(default)]
    pub banned: Option<bool>,
    #[serde(default)]
    pub email_ok: Option<bool>,
    #[serde(default)]
    pub dua_langkah: Option<Vec<String>>,
    #[serde(default)]
    pub argumen_luncur: Option<String>,
    #[serde(default)]
    pub utama: bool,
    #[serde(default)]
    pub kualitas_penuh: bool,
    #[serde(default)]
    pub pembatasan: Option<Pembatasan>,
    #[serde(default)]
    pub target_sendiri: Option<TargetLuncur>,
}

impl Account {
    pub fn dikecualikan_afk(&self) -> bool {
        self.utama || self.kualitas_penuh
    }

    pub fn pasang_status(&mut self, banned: Option<bool>, email: Option<bool>, dua: Option<Vec<String>>) {
        self.banned = banned.or(self.banned);
        self.email_ok = email.or(self.email_ok);
        if dua.is_some() {
            self.dua_langkah = dua;
        }
    }

    pub fn pasang_pembatasan_sehat(&mut self, baca: Option<Option<Pembatasan>>) {
        match baca {
            Some(p) => self.pembatasan = p,
            None => {
                if self.pembatasan.as_ref().is_some_and(|p| matches!(p.jenis.as_str(), "ban" | "terminated" | "lock")) {
                    self.pembatasan = None;
                }
            }
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq)]
pub struct Pembatasan {
    pub jenis: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub mulai: String,
    #[serde(default)]
    pub berakhir: String,
    #[serde(default)]
    pub sumber: u32,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq)]
pub struct ServerTerakhir {
    pub place_id: u64,
    pub job_id: String,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub pribadi: bool,
    #[serde(default)]
    pub at: i64,
}

impl Account {
    pub fn terapkan_preset(&mut self, p: &PresetHemat) {
        self.auto_rejoin = p.auto_rejoin;
        self.anti_afk = p.anti_afk;
        if self.dikecualikan_afk() {
            return;
        }
        self.hemat = p.hemat;
        self.hemat_minimize = p.minimize;
        self.hemat_ram_mb = if p.ram_mb == 0 { 0 } else { p.ram_mb.clamp(128, 4096) };
        self.hemat_fps = crate::hemat::fps_hemat_sah(p.fps);
        self.mulai_kecil = lebar_kecil_sah(p.mulai_kecil);
    }

    pub fn sesuai_preset(&self, p: &PresetHemat) -> bool {
        let mut x = self.clone();
        x.terapkan_preset(p);
        (x.hemat, x.hemat_minimize, x.hemat_ram_mb, x.hemat_fps, x.auto_rejoin, x.anti_afk, x.mulai_kecil)
            == (self.hemat, self.hemat_minimize, self.hemat_ram_mb, self.hemat_fps, self.auto_rejoin, self.anti_afk, self.mulai_kecil)
    }
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq)]
pub struct PresetHemat {
    #[serde(default)]
    pub hemat: bool,
    #[serde(default)]
    pub fps: u32,
    #[serde(default)]
    pub ram_mb: u32,
    #[serde(default)]
    pub minimize: bool,
    #[serde(default)]
    pub auto_rejoin: bool,
    #[serde(default)]
    pub anti_afk: bool,
    #[serde(default)]
    pub mulai_kecil: u32,
}

pub fn lebar_kecil_sah(w: u32) -> u32 {
    if w == 0 { 0 } else { w.clamp(160, 1280) }
}

pub const KECIL_HEMAT: u32 = 320;

pub fn kecil_saat_hemat(hemat_lama: bool, hemat_baru: bool, mulai_kecil: u32) -> u32 {
    if hemat_baru && !hemat_lama && mulai_kecil == 0 {
        KECIL_HEMAT
    } else {
        mulai_kecil
    }
}

pub fn tinggi_kecil(w: u32) -> u32 {
    (w * 9).div_ceil(16)
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq)]
pub struct Folder {
    pub id: String,
    pub nama: String,
    #[serde(default)]
    pub warna: String,
    #[serde(default)]
    pub ikon: String,
    #[serde(default)]
    pub preset: Option<PresetHemat>,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct CatatanMasalah {
    pub akun_id: String,
    pub alias: String,
    pub at: i64,
    pub jenis: String,
    pub teks: String,
    #[serde(default)]
    pub place_id: u64,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub umur_dtk: i64,
    #[serde(default)]
    pub rincian: String,
}

pub const MAKS_MASALAH: usize = 200;

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Riwayat {
    pub place_id: u64,
    pub game_name: String,
    pub icon_url: String,
    pub account_id: String,
    pub alias: String,
    pub avatar_url: String,
    pub at: i64,
}

#[derive(Serialize, Deserialize, Default)]
pub struct Store {
    pub accounts: Vec<Account>,
    #[serde(default)]
    pub riwayat: Vec<Riwayat>,
    #[serde(default)]
    pub auto_refresh: bool,
    #[serde(default)]
    pub sembunyikan_username: bool,
    #[serde(default)]
    pub klien_path: String,
    #[serde(default)]
    pub klien_kustom: Vec<String>,
    #[serde(default)]
    pub riwayat_diperbaiki: bool,
    #[serde(default)]
    pub fflags: serde_json::Map<String, serde_json::Value>,
    #[serde(default)]
    pub fflags_pernah: Vec<String>,
    #[serde(default)]
    pub tema: Tema,
    #[serde(default)]
    pub target_terakhir: Option<TargetLuncur>,
    #[serde(default)]
    pub server_tersimpan: Vec<ServerTersimpan>,
    #[serde(default)]
    pub cap_asli: Option<i32>,
    #[serde(default)]
    pub cap_tulis: Option<i32>,
    #[serde(default)]
    pub cap_kami: Vec<i32>,
    #[serde(default)]
    pub versi_alih: Option<(String, String)>,
    #[serde(default)]
    pub folder: Vec<Folder>,
    #[serde(default)]
    pub proteksi_sesi_mati: bool,
    #[serde(default)]
    pub afk_menit: u32,
    #[serde(default)]
    pub grafis_ringan: bool,
    #[serde(default)]
    pub anggaran_ram_mb: u32,
    #[serde(default)]
    pub hello_salin: bool,
    #[serde(default)]
    pub hotkey_darurat: bool,
    #[serde(default)]
    pub trim_latar: bool,
    #[serde(default)]
    pub tutup_ke_tray: bool,
    #[serde(default)]
    pub argumen_luncur: String,
    #[serde(default)]
    pub discord_webhook: String,
    #[serde(default)]
    pub discord_id: String,
    #[serde(default)]
    pub discord_acara: crate::discord::Acara,
    #[serde(default)]
    pub discord_kehadiran_mati: bool,
    #[serde(default)]
    pub matikan_pada: Option<i64>,
    #[serde(default)]
    pub masalah: Vec<CatatanMasalah>,
    #[serde(skip)]
    pub muat: StatusMuat,
}

#[derive(Serialize, Clone, Default, Debug, PartialEq)]
#[serde(tag = "jenis", rename_all = "snake_case")]
pub enum StatusMuat {
    #[default]
    Baik,
    Dipulihkan { cadangan: String, hilang: Vec<String> },
    TakTerbaca { cadangan: String, sebab: String },
}

fn toleran<T>(v: &serde_json::Value, jalur: &str, hilang: &mut Vec<String>) -> T
where
    T: Serialize + serde::de::DeserializeOwned + Default,
{
    if let Ok(x) = serde_json::from_value::<T>(v.clone()) {
        return x;
    }
    let serde_json::Value::Object(isi) = v else {
        hilang.push(jalur.to_string());
        return T::default();
    };
    let mut baik = serde_json::to_value(T::default()).unwrap_or_else(|_| serde_json::json!({}));
    for (k, nilai) in isi {
        let mut coba = baik.clone();
        coba[k.as_str()] = nilai.clone();
        if serde_json::from_value::<T>(coba.clone()).is_ok() {
            baik = coba;
        } else {
            hilang.push(format!("{jalur}.{k}"));
        }
    }
    serde_json::from_value(baik).unwrap_or_default()
}

fn toleran_daftar<T>(v: &serde_json::Value, jalur: &str, hilang: &mut Vec<String>) -> serde_json::Value
where
    T: Serialize + serde::de::DeserializeOwned + Default,
{
    let Some(butir) = v.as_array() else {
        hilang.push(jalur.to_string());
        return serde_json::json!([]);
    };
    let mut hasil = Vec::new();
    for (i, b) in butir.iter().enumerate() {
        if !b.is_object() {
            hilang.push(format!("{jalur}[{i}]"));
            continue;
        }
        let x: T = toleran(b, &format!("{jalur}[{i}]"), hilang);
        if let Ok(j) = serde_json::to_value(x) {
            hasil.push(j);
        }
    }
    serde_json::Value::Array(hasil)
}

fn baca_toleran(v: &serde_json::Value, hilang: &mut Vec<String>) -> Option<Store> {
    let mut isi = v.as_object()?.clone();
    if let Some(x) = isi.get("accounts").cloned() {
        isi.insert("accounts".into(), toleran_daftar::<Account>(&x, "accounts", hilang));
    }
    if let Some(x) = isi.get("riwayat").cloned() {
        isi.insert("riwayat".into(), toleran_daftar::<Riwayat>(&x, "riwayat", hilang));
    }
    if let Some(x) = isi.get("folder").cloned() {
        isi.insert("folder".into(), toleran_daftar::<Folder>(&x, "folder", hilang));
    }
    if let Some(x) = isi.get("server_tersimpan").cloned() {
        isi.insert("server_tersimpan".into(), toleran_daftar::<ServerTersimpan>(&x, "server_tersimpan", hilang));
    }
    let mut s: Store = toleran(&serde_json::Value::Object(isi), "store", hilang);
    for a in s.accounts.iter_mut().filter(|a| a.id.trim().is_empty()) {
        a.id = uuid::Uuid::new_v4().to_string();
    }
    Some(s)
}

fn salin_cadangan(path: &std::path::Path) -> Option<String> {
    let detik = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let tujuan = path.with_extension(format!("json.rusak-{detik}"));
    std::fs::copy(path, &tujuan).ok()?;
    Some(tujuan.display().to_string())
}

const AWALAN_KODE: &str = "dpapi:";

fn tiap_kode(v: &mut serde_json::Value, f: &dyn Fn(&str) -> Option<String>) {
    let ubah = |x: Option<&mut serde_json::Value>| {
        if let Some(serde_json::Value::String(s)) = x {
            if let Some(baru) = f(s) {
                *s = baru;
            }
        }
    };
    ubah(v.get_mut("target_terakhir").and_then(|t| t.get_mut("link_code")));
    if let Some(serde_json::Value::Array(a)) = v.get_mut("server_tersimpan") {
        for s in a {
            ubah(s.get_mut("link_code"));
        }
    }
    if let Some(serde_json::Value::Array(a)) = v.get_mut("accounts") {
        for akun in a {
            ubah(akun.get_mut("target_sendiri").and_then(|t| t.get_mut("link_code")));
        }
    }
}

fn kode_ke_disk(v: &mut serde_json::Value) -> Result<(), String> {
    let galat = std::cell::RefCell::new(None);
    tiap_kode(v, &|s| {
        if s.is_empty() || s.starts_with(AWALAN_KODE) {
            return None;
        }
        match encrypt(s) {
            Ok(e) => Some(format!("{AWALAN_KODE}{e}")),
            Err(e) => {
                *galat.borrow_mut() = Some(e);
                None
            }
        }
    });
    match galat.into_inner() {
        Some(e) => Err(format!("could not encrypt a private server code: {e}")),
        None => Ok(()),
    }
}

fn kode_dari_disk(v: &mut serde_json::Value) {
    tiap_kode(v, &|s| s.strip_prefix(AWALAN_KODE).map(|e| decrypt(e).unwrap_or_default()));
}

fn muat_teks(teks: &str, path: &std::path::Path) -> Store {
    let nilai = serde_json::from_str::<serde_json::Value>(teks).map(|mut v| {
        kode_dari_disk(&mut v);
        v
    });
    if let Some(s) = nilai.as_ref().ok().and_then(|v| serde_json::from_value::<Store>(v.clone()).ok()) {
        return s;
    }
    let cadangan = salin_cadangan(path);
    let mut hilang = Vec::new();
    let pulih = nilai.as_ref().ok().and_then(|v| baca_toleran(v, &mut hilang));
    match (pulih, cadangan) {
        (Some(mut s), Some(cadangan)) => {
            s.muat = if hilang.is_empty() {
                StatusMuat::Baik
            } else {
                StatusMuat::Dipulihkan { cadangan, hilang }
            };
            s
        }
        (pulih, cadangan) => Store {
            muat: StatusMuat::TakTerbaca {
                cadangan: cadangan.unwrap_or_default(),
                sebab: match (&pulih, nilai) {
                    (Some(_), _) => "the backup copy could not be written".into(),
                    (None, Err(e)) => format!("not valid JSON ({e})"),
                    (None, Ok(_)) => "not an accounts file".into(),
                },
            },
            ..Default::default()
        },
    }
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq)]
pub struct TargetLuncur {
    #[serde(default)]
    pub place_id: String,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub game_icon: String,
    #[serde(default)]
    pub job_id: String,
    #[serde(default)]
    pub link_code: String,
    #[serde(default)]
    pub ikuti: String,
    #[serde(default)]
    pub jeda: String,
    #[serde(default)]
    pub sama: String,
    #[serde(default)]
    pub fps: String,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
pub struct ServerTersimpan {
    pub id: String,
    pub nama: String,
    #[serde(default)]
    pub place_id: String,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub game_icon: String,
    #[serde(default)]
    pub job_id: String,
    #[serde(default)]
    pub link_code: String,
    #[serde(default)]
    pub dibuat: i64,
}

impl ServerTersimpan {
    pub fn kunci(&self) -> (String, String, String) {
        (
            self.place_id.trim().to_string(),
            self.link_code.trim().to_string(),
            self.job_id.trim().to_string(),
        )
    }
}

pub fn upsert_server(daftar: &mut Vec<ServerTersimpan>, mut s: ServerTersimpan, sekarang: i64) -> String {
    if let Some(lama) = daftar.iter_mut().find(|x| x.kunci() == s.kunci()) {
        lama.game_name = s.game_name;
        lama.game_icon = s.game_icon;
        lama.dibuat = sekarang;
        let id = lama.id.clone();
        daftar.sort_by(|a, b| b.dibuat.cmp(&a.dibuat));
        return id;
    }
    if s.id.is_empty() {
        s.id = uuid::Uuid::new_v4().to_string();
    }
    s.nama = s.nama.trim().chars().take(80).collect();
    s.dibuat = sekarang;
    let id = s.id.clone();
    daftar.insert(0, s);
    id
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Tema {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub aksen: String,
    #[serde(default)]
    pub latar: String,
    #[serde(default)]
    pub kartu: String,
    #[serde(default)]
    pub sisi: String,
}

const RIWAYAT_MAKS: usize = 60;

fn data_dir() -> PathBuf {
    let mut p = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("RobloxAccountManager");
    p
}

pub fn pasang_catatan_crash(versi: &'static str) {
    let bawaan = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let pesan = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "(no message)".into());
        let pesan = samarkan_cookie(&pesan);
        let lokasi = info.location().map(|l| format!("{}:{}", l.file(), l.line())).unwrap_or_default();
        let detik = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let utas = std::thread::current().name().unwrap_or("?").to_string();
        tulis_crash_log(&format!("[{detik}] v{versi} panic on thread '{utas}' at {lokasi}: {pesan}\n"));
        bawaan(info);
    }));
}

fn tulis_crash_log(baris: &str) {
    let _ = std::fs::create_dir_all(data_dir());
    let berkas = data_dir().join("crash.log");
    if std::fs::metadata(&berkas).map(|m| m.len() > 256 * 1024).unwrap_or(false) {
        let _ = std::fs::remove_file(&berkas);
    }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&berkas) {
        use std::io::Write;
        let _ = f.write_all(baris.as_bytes());
    }
}

pub fn catat_kejadian(pesan: &str) {
    let detik = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    tulis_crash_log(&format!("[{detik}] v{} {}\n", env!("CARGO_PKG_VERSION"), samarkan_cookie(pesan)));
}

pub fn samarkan_cookie(teks: &str) -> String {
    match teks.find("_|WARNING") {
        Some(i) => format!("{}[redacted]", &teks[..i]),
        None => teks.to_string(),
    }
}

pub fn berkas_data(nama: &str) -> PathBuf {
    data_dir().join(nama)
}

fn data_file() -> PathBuf {
    let mut p = data_dir();
    p.push("accounts.json");
    p
}

pub fn encrypt(plain: &str) -> Result<String, String> {
    unsafe {
        let mut input = plain.as_bytes().to_vec();
        let in_blob = DataBlob {
            cb_data: input.len() as u32,
            pb_data: input.as_mut_ptr(),
        };
        let mut out = DataBlob {
            cb_data: 0,
            pb_data: std::ptr::null_mut(),
        };

        let ok = CryptProtectData(
            &in_blob,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out,
        );
        if ok == 0 {
            return Err(format!("CryptProtectData failed (code {})", GetLastError()));
        }

        let slice = std::slice::from_raw_parts(out.pb_data, out.cb_data as usize);
        let encoded = B64.encode(slice);
        LocalFree(out.pb_data as *mut c_void);
        Ok(encoded)
    }
}

pub fn dpapi_buka(data: &[u8], entropi: &[u8]) -> Result<Vec<u8>, String> {
    dpapi(data, entropi, false, CRYPTPROTECT_UI_FORBIDDEN)
}

#[allow(dead_code)]
pub fn dpapi_tutup(data: &[u8], entropi: &[u8]) -> Result<Vec<u8>, String> {
    dpapi(data, entropi, true, CRYPTPROTECT_UI_FORBIDDEN)
}

#[cfg(test)]
pub fn dpapi_tutup_mesin(data: &[u8], entropi: &[u8]) -> Result<Vec<u8>, String> {
    const CRYPTPROTECT_LOCAL_MACHINE: u32 = 0x4;
    dpapi(data, entropi, true, CRYPTPROTECT_UI_FORBIDDEN | CRYPTPROTECT_LOCAL_MACHINE)
}

fn dpapi(data: &[u8], entropi: &[u8], tutup: bool, tanda: u32) -> Result<Vec<u8>, String> {
    let mut masuk = data.to_vec();
    let mut ent = entropi.to_vec();
    unsafe {
        let in_blob = DataBlob { cb_data: masuk.len() as u32, pb_data: masuk.as_mut_ptr() };
        let ent_blob = DataBlob { cb_data: ent.len() as u32, pb_data: ent.as_mut_ptr() };
        let mut out = DataBlob { cb_data: 0, pb_data: std::ptr::null_mut() };
        let ok = if tutup {
            CryptProtectData(&in_blob, std::ptr::null(), &ent_blob, std::ptr::null_mut(), std::ptr::null_mut(), tanda, &mut out)
        } else {
            CryptUnprotectData(&in_blob, std::ptr::null_mut(), &ent_blob, std::ptr::null_mut(), std::ptr::null_mut(), tanda, &mut out)
        };
        if ok == 0 {
            return Err(format!("DPAPI failed (code {})", GetLastError()));
        }
        let hasil = std::slice::from_raw_parts(out.pb_data, out.cb_data as usize).to_vec();
        LocalFree(out.pb_data as *mut c_void);
        Ok(hasil)
    }
}

pub fn decrypt(encoded: &str) -> Result<String, String> {
    let mut raw = B64
        .decode(encoded)
        .map_err(|e| format!("corrupt base64: {e}"))?;
    unsafe {
        let in_blob = DataBlob {
            cb_data: raw.len() as u32,
            pb_data: raw.as_mut_ptr(),
        };
        let mut out = DataBlob {
            cb_data: 0,
            pb_data: std::ptr::null_mut(),
        };

        let ok = CryptUnprotectData(
            &in_blob,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out,
        );
        if ok == 0 {
            return Err(format!(
                "CryptUnprotectData failed (code {}). The accounts file was likely \
                 created by another Windows user or on another machine -- DPAPI \
                 deliberately cannot open it.",
                GetLastError()
            ));
        }

        let slice = std::slice::from_raw_parts(out.pb_data, out.cb_data as usize);
        let text = String::from_utf8_lossy(slice).to_string();
        LocalFree(out.pb_data as *mut c_void);
        Ok(text)
    }
}

impl Store {
    pub fn hapus_akun(&mut self, ids: &[String]) -> Vec<Account> {
        let (hapus, sisa): (Vec<Account>, Vec<Account>) =
            std::mem::take(&mut self.accounts).into_iter().partition(|a| ids.contains(&a.id));
        self.accounts = sisa;
        self.riwayat.retain(|r| !ids.contains(&r.account_id));
        self.masalah.retain(|m| !ids.contains(&m.akun_id));
        if let Some(t) = self.target_terakhir.as_mut() {
            let ikuti = t.ikuti.trim();
            if !ikuti.is_empty() && hapus.iter().any(|a| !a.username.is_empty() && a.username.eq_ignore_ascii_case(ikuti)) {
                t.ikuti.clear();
            }
        }
        hapus
    }

    pub fn hapus_akun_lalu(&mut self, ids: &[String], simpan: impl FnOnce(&Store) -> Result<(), String>) -> Result<Vec<Account>, String> {
        let cadangan = (self.accounts.clone(), self.riwayat.clone(), self.masalah.clone(), self.target_terakhir.clone());
        let hapus = self.hapus_akun(ids);
        if hapus.is_empty() {
            return Ok(hapus);
        }
        if let Err(e) = simpan(self) {
            (self.accounts, self.riwayat, self.masalah, self.target_terakhir) = cadangan;
            return Err(e);
        }
        Ok(hapus)
    }

    pub fn load() -> Self {
        let path = data_file();
        match std::fs::read(&path) {
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Self { grafis_ringan: true, ..Self::default() },
            Err(e) => Store {
                muat: StatusMuat::TakTerbaca { cadangan: String::new(), sebab: format!("could not open it ({e})") },
                ..Default::default()
            },
            Ok(b) => {
                let mut s = muat_teks(&String::from_utf8_lossy(&b), &path);
                if let Some(t) = s.cap_tulis.take() {
                    if !s.cap_kami.contains(&t) {
                        s.cap_kami.push(t);
                    }
                }
                s
            }
        }
    }

    pub fn save(&self) -> Result<(), String> {
        if let StatusMuat::TakTerbaca { .. } = self.muat {
            return Err("CAM could not read its accounts file, so nothing is saved yet. \
                        Choose Start fresh in the banner at the top, or restore the file and restart CAM."
                .into());
        }
        std::fs::create_dir_all(data_dir())
            .map_err(|e| format!("could not create the data folder: {e}"))?;
        let mut v = serde_json::to_value(self).map_err(|e| format!("could not build the JSON: {e}"))?;
        kode_ke_disk(&mut v)?;
        let text = serde_json::to_string_pretty(&v)
            .map_err(|e| format!("could not build the JSON: {e}"))?;
        let path = data_file();
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, text).map_err(|e| format!("write failed: {e}"))?;
        std::fs::rename(&tmp, &path).map_err(|e| format!("could not replace the file: {e}"))?;
        Ok(())
    }

    pub fn find(&self, id: &str) -> Option<&Account> {
        self.accounts.iter().find(|a| a.id == id)
    }

    pub fn find_mut(&mut self, id: &str) -> Option<&mut Account> {
        self.accounts.iter_mut().find(|a| a.id == id)
    }

    pub fn catat_riwayat(&mut self, r: Riwayat) {
        self.riwayat
            .retain(|x| !(x.place_id == r.place_id && x.account_id == r.account_id));
        self.riwayat.insert(0, r);
        self.riwayat.truncate(RIWAYAT_MAKS);
    }

    pub fn storage_path() -> String {
        data_file().to_string_lossy().to_string()
    }

    pub fn pindah_akun(&mut self, ids: &[String], folder_id: Option<&str>) -> Result<usize, String> {
        let preset = match folder_id {
            Some(f) => self.folder.iter().find(|x| x.id == f).ok_or("Folder not found.")?.preset.clone(),
            None => None,
        };
        let mut n = 0;
        for a in self.accounts.iter_mut().filter(|a| ids.contains(&a.id)) {
            a.folder_id = folder_id.map(str::to_string);
            if let Some(p) = &preset {
                a.terapkan_preset(p);
            }
            n += 1;
        }
        Ok(n)
    }

    pub fn taruh_akun(&mut self, ids: &[String], sasaran: &str, setelah: bool) -> Result<usize, String> {
        if ids.iter().any(|i| i == sasaran) {
            return Ok(0);
        }
        let t = self.accounts.iter().find(|a| a.id == sasaran).ok_or("Account not found.")?;
        let folder_t = t.folder_id.clone().filter(|f| self.folder.iter().any(|x| &x.id == f));
        let sah = |f: &Option<String>| f.clone().filter(|f| self.folder.iter().any(|x| &x.id == f));
        let lain: Vec<String> = self
            .accounts
            .iter()
            .filter(|a| ids.contains(&a.id) && sah(&a.folder_id) != folder_t)
            .map(|a| a.id.clone())
            .collect();
        let n = if lain.is_empty() { 0 } else { self.pindah_akun(&lain, folder_t.as_deref())? };
        let (pindah, sisa): (Vec<Account>, Vec<Account>) = std::mem::take(&mut self.accounts).into_iter().partition(|a| ids.contains(&a.id));
        self.accounts = sisa;
        let i = self.accounts.iter().position(|a| a.id == sasaran).unwrap_or(self.accounts.len());
        let di = if setelah { (i + 1).min(self.accounts.len()) } else { i };
        self.accounts.splice(di..di, pindah);
        Ok(n)
    }

    pub fn hapus_folder(&mut self, id: &str) -> Result<usize, String> {
        let awal = self.folder.len();
        self.folder.retain(|f| f.id != id);
        if self.folder.len() == awal {
            return Err("Folder not found.".into());
        }
        let mut n = 0;
        for a in self.accounts.iter_mut().filter(|a| a.folder_id.as_deref() == Some(id)) {
            a.folder_id = None;
            n += 1;
        }
        Ok(n)
    }

    pub fn urutkan_folder(&mut self, ids: &[String]) {
        let mut baru: Vec<Folder> = ids.iter().filter_map(|i| self.folder.iter().find(|f| &f.id == i).cloned()).collect();
        for f in &self.folder {
            if !ids.contains(&f.id) {
                baru.push(f.clone());
            }
        }
        self.folder = baru;
    }

    pub fn terapkan_preset_folder(&mut self, id: &str) -> usize {
        let Some(p) = self.folder.iter().find(|f| f.id == id).and_then(|f| f.preset.clone()) else { return 0 };
        let mut n = 0;
        for a in self.accounts.iter_mut().filter(|a| a.folder_id.as_deref() == Some(id)) {
            if !a.sesuai_preset(&p) {
                a.terapkan_preset(&p);
                n += 1;
            }
        }
        n
    }
}

pub fn nama_folder_sah(nama: &str) -> Result<String, String> {
    let bersih: String = nama.chars().map(|c| if c.is_control() { ' ' } else { c }).collect();
    let n: String = bersih.trim().chars().take(40).collect();
    if n.is_empty() {
        return Err("Give the folder a name.".into());
    }
    Ok(n)
}

#[cfg(test)]
mod tes_crash {
    #[test]
    fn cookie_disamarkan_di_catatan_crash() {
        assert_eq!(super::samarkan_cookie("gagal: _|WARNING:-DO-NOT-SHARE-THIS.--abc"), "gagal: [redacted]");
        assert_eq!(super::samarkan_cookie("biasa"), "biasa");
    }
}

#[cfg(test)]
mod tes_folder {
    use super::*;

    fn akun(id: &str, folder: Option<&str>) -> Account {
        Account { id: id.into(), alias: id.into(), folder_id: folder.map(str::to_string), ..Default::default() }
    }

    fn store() -> Store {
        let mut s = Store::default();
        s.folder = vec![
            Folder { id: "t".into(), nama: "Farming".into(), preset: Some(PresetHemat { hemat: true, fps: 5, ram_mb: 512, minimize: false, auto_rejoin: true, anti_afk: false, mulai_kecil: 0 }), ..Default::default() },
            Folder { id: "j".into(), nama: "Boosting".into(), ..Default::default() },
        ];
        s.accounts = vec![akun("a", None), akun("b", Some("j")), akun("c", Some("t"))];
        s
    }

    #[test]
    fn berkas_lama_tanpa_folder_tetap_terbaca() {
        let s: Store = serde_json::from_str(r#"{"accounts":[{"id":"x","alias":"X","username":"u","display_name":"d","user_id":1,"robux":0,"premium":false,"avatar_url":"","created":0,"last_launched":0,"cookie_enc":"e","browser_tracker_id":1,"last_error":""}]}"#).unwrap();
        assert!(s.folder.is_empty());
        assert_eq!(s.accounts[0].folder_id, None);
        assert!(!s.accounts[0].auto_rejoin, "data lama: auto-rejoin mati");
    }

    #[test]
    fn pindah_ke_folder_berpreset_memasang_saver() {
        let mut s = store();
        assert_eq!(s.pindah_akun(&["a".into()], Some("t")).unwrap(), 1);
        let a = s.find("a").unwrap();
        assert_eq!((a.folder_id.as_deref(), a.hemat, a.hemat_fps, a.hemat_ram_mb), (Some("t"), true, 5, 512));
        assert!(a.auto_rejoin, "preset folder ikut memasang auto-rejoin");
        s.pindah_akun(&["a".into()], Some("j")).unwrap();
        assert!(s.find("a").unwrap().hemat);
        assert!(s.pindah_akun(&["a".into()], Some("tidak-ada")).is_err());
        s.pindah_akun(&["a".into()], None).unwrap();
        assert_eq!(s.find("a").unwrap().folder_id, None);
    }

    #[test]
    fn hapus_folder_menjaga_akun() {
        let mut s = store();
        assert_eq!(s.hapus_folder("j").unwrap(), 1);
        assert_eq!(s.accounts.len(), 3);
        assert_eq!(s.find("b").unwrap().folder_id, None);
        assert!(s.hapus_folder("j").is_err());
    }

    #[test]
    fn preset_tidak_menurunkan_akun_yang_dikecualikan() {
        let p = PresetHemat { hemat: true, fps: 3, ram_mb: 128, minimize: true, auto_rejoin: true, anti_afk: true, mulai_kecil: 320 };
        for (utama, penuh) in [(true, false), (false, true)] {
            let mut a = Account { utama, kualitas_penuh: penuh, ..Default::default() };
            a.terapkan_preset(&p);
            assert_eq!((a.hemat, a.hemat_fps, a.hemat_ram_mb, a.hemat_minimize, a.mulai_kecil), (false, 0, 0, false, 0));
            assert!(a.auto_rejoin && a.anti_afk, "yang bukan penurunan performa tetap ikut");
            assert!(a.sesuai_preset(&p), "tidak ditandai berbeda dari preset");
        }
        let mut biasa = Account::default();
        biasa.terapkan_preset(&p);
        assert!(biasa.hemat && biasa.hemat_fps == 3);
    }

    #[test]
    fn urutkan_dan_terapkan_preset() {
        let mut s = store();
        s.urutkan_folder(&["j".into()]);
        assert_eq!(s.folder.iter().map(|f| f.id.as_str()).collect::<Vec<_>>(), ["j", "t"]);
        assert_eq!(s.terapkan_preset_folder("t"), 1);
        assert_eq!(s.terapkan_preset_folder("t"), 0);
        assert!(nama_folder_sah("   ").is_err());
        assert_eq!(nama_folder_sah("  Farming  ").unwrap(), "Farming");
    }
}

#[cfg(test)]
mod tes_server {
    use super::*;

    fn s(place: &str, link: &str, job: &str, nama: &str) -> ServerTersimpan {
        ServerTersimpan { place_id: place.into(), link_code: link.into(), job_id: job.into(), nama: nama.into(), ..Default::default() }
    }

    #[test]
    fn kombinasi_sama_tidak_digandakan() {
        let mut d = Vec::new();
        let a = upsert_server(&mut d, s("111", "abc", "", "VD private"), 10);
        let b = upsert_server(&mut d, s(" 111 ", "abc ", "", "nama lain"), 20);
        assert_eq!(a, b);
        assert_eq!(d.len(), 1);
        assert_eq!(d[0].nama, "VD private");
        upsert_server(&mut d, s("111", "", "job-1", "VD server"), 30);
        assert_eq!(d.len(), 2);
        assert_eq!(d[0].job_id, "job-1");
    }
}

#[cfg(test)]
mod tes_muat {
    use super::*;

    #[test]
    fn data_lama_tidak_mendapat_grafis_ringan() {
        let s: Store = serde_json::from_str(r#"{"accounts":[]}"#).unwrap();
        assert!(!s.grafis_ringan, "instalasi yang sudah ada tidak berubah diam-diam");
    }

    fn berkas(nama: &str, isi: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("cam-uji-muat-{}-{nama}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("accounts.json");
        std::fs::write(&p, isi).unwrap();
        p
    }

    fn akun_json(id: &str, fps: &str) -> String {
        format!(r#"{{"id":"{id}","alias":"{id}","username":"u","display_name":"d","user_id":1,"robux":0,"premium":false,"avatar_url":"","created":0,"last_launched":0,"fps_cap":{fps},"cookie_enc":"e-{id}","browser_tracker_id":1,"last_error":""}}"#)
    }

    #[test]
    fn satu_kolom_rusak_hanya_mengorbankan_kolom_itu() {
        let teks = format!(r#"{{"accounts":[{},{},{}],"auto_refresh":true}}"#, akun_json("a", "30"), akun_json("b", "\"tiga puluh\""), akun_json("c", "60"));
        let p = berkas("kolom", &teks);
        let s = muat_teks(&teks, &p);
        assert_eq!(s.accounts.len(), 3, "akun lain tidak boleh hilang");
        assert_eq!(s.accounts[0].fps_cap, 30);
        assert_eq!(s.accounts[1].fps_cap, 0, "nilai rusak kembali ke bawaan");
        assert_eq!(s.accounts[1].cookie_enc, "e-b", "kolom lain akun itu tetap");
        assert_eq!(s.accounts[2].fps_cap, 60);
        assert!(s.auto_refresh);
        match &s.muat {
            StatusMuat::Dipulihkan { cadangan, hilang } => {
                assert_eq!(hilang, &vec!["accounts[1].fps_cap".to_string()]);
                assert_eq!(std::fs::read_to_string(cadangan).unwrap(), teks, "salinan = berkas asli");
            }
            m => panic!("status {m:?}"),
        }
        assert!(s.muat != StatusMuat::Baik);
    }

    #[test]
    fn kolom_atas_rusak_tidak_membuang_akun() {
        let teks = format!(r#"{{"accounts":[{}],"proteksi_sesi_mati":"ya","tema":5}}"#, akun_json("a", "30"));
        let s = muat_teks(&teks, &berkas("atas", &teks));
        assert_eq!(s.accounts.len(), 1);
        assert!(!s.proteksi_sesi_mati);
        let StatusMuat::Dipulihkan { hilang, .. } = &s.muat else { panic!("{:?}", s.muat) };
        assert!(hilang.contains(&"store.proteksi_sesi_mati".to_string()) && hilang.contains(&"store.tema".to_string()), "{hilang:?}");
    }

    #[test]
    fn akun_bukan_objek_dibuang_akun_tanpa_id_dapat_id_baru() {
        let teks = r#"{"accounts":[42,{"alias":"Tanpa id","cookie_enc":"e","fps_cap":"x"}]}"#;
        let s = muat_teks(teks, &berkas("id", teks));
        assert_eq!(s.accounts.len(), 1);
        assert_eq!(s.accounts[0].alias, "Tanpa id");
        assert!(!s.accounts[0].id.is_empty());
        let StatusMuat::Dipulihkan { hilang, .. } = &s.muat else { panic!() };
        assert!(hilang.contains(&"accounts[0]".to_string()), "{hilang:?}");
    }

    #[test]
    fn berkas_rusak_total_menolak_simpan() {
        let teks = r#"{"accounts":[{"id":"a"#;
        let p = berkas("rusak", teks);
        let s = muat_teks(teks, &p);
        assert!(s.accounts.is_empty());
        let StatusMuat::TakTerbaca { cadangan, .. } = &s.muat else { panic!("{:?}", s.muat) };
        assert_eq!(std::fs::read_to_string(cadangan).unwrap(), teks);
        assert!(s.save().is_err(), "tidak boleh menimpa berkas asli");
        assert_eq!(std::fs::read_to_string(&p).unwrap(), teks);
    }

    #[test]
    fn berkas_utuh_tanpa_cadangan() {
        let teks = format!(r#"{{"accounts":[{}]}}"#, akun_json("a", "30"));
        let p = berkas("utuh", &teks);
        let s = muat_teks(&teks, &p);
        assert_eq!(s.muat, StatusMuat::Baik);
        let n = std::fs::read_dir(p.parent().unwrap()).unwrap().count();
        assert_eq!(n, 1, "tidak ada salinan untuk berkas yang sehat");
    }
}

#[cfg(test)]
mod tes_kode {
    use super::*;

    #[test]
    fn kode_server_terenkripsi_di_disk_dan_terbaca_kembali() {
        let mut s = Store::default();
        s.target_terakhir = Some(TargetLuncur { place_id: "1".into(), link_code: "58201880850229913874098176522742".into(), ..Default::default() });
        s.server_tersimpan = vec![ServerTersimpan { id: "s1".into(), nama: "VIP".into(), link_code: "123456".into(), ..Default::default() }];
        let mut v = serde_json::to_value(&s).unwrap();
        kode_ke_disk(&mut v).unwrap();
        let disk = serde_json::to_string(&v).unwrap();
        assert!(!disk.contains("58201880850229913874098176522742") && !disk.contains("\"123456\""), "tidak ada kode polos di disk");
        assert!(disk.contains("dpapi:"));
        let p = std::env::temp_dir().join("cam-uji-kode-accounts.json");
        let kembali = muat_teks(&disk, &p);
        assert_eq!(kembali.target_terakhir.unwrap().link_code, "58201880850229913874098176522742");
        assert_eq!(kembali.server_tersimpan[0].link_code, "123456");
        assert_eq!(kembali.muat, StatusMuat::Baik);
    }

    #[test]
    fn kode_target_sendiri_terenkripsi_juga() {
        let mut s = Store::default();
        s.accounts.push(Account {
            id: "a".into(),
            target_sendiri: Some(TargetLuncur { place_id: "2".into(), link_code: "accessCode=44444444-d9f8-497a-b266-7bd9d7060a4c".into(), ..Default::default() }),
            ..Default::default()
        });
        let mut v = serde_json::to_value(&s).unwrap();
        kode_ke_disk(&mut v).unwrap();
        let disk = serde_json::to_string(&v).unwrap();
        assert!(!disk.contains("44444444-d9f8"), "kode akses target sendiri tidak polos di disk");
        let kembali = muat_teks(&disk, &std::env::temp_dir().join("cam-uji-kode-target-sendiri.json"));
        assert_eq!(kembali.accounts[0].target_sendiri.as_ref().unwrap().link_code, "accessCode=44444444-d9f8-497a-b266-7bd9d7060a4c");
    }

    #[test]
    fn kode_lama_teks_biasa_tetap_terbaca() {
        let lama = r#"{"accounts":[],"target_terakhir":{"place_id":"1","link_code":"999"},"server_tersimpan":[{"id":"a","nama":"x","link_code":"777"}]}"#;
        let s = muat_teks(lama, &std::env::temp_dir().join("cam-uji-kode-lama.json"));
        assert_eq!(s.target_terakhir.unwrap().link_code, "999");
        assert_eq!(s.server_tersimpan[0].link_code, "777");
        assert_eq!(s.muat, StatusMuat::Baik);
    }
}

#[cfg(test)]
mod tes_taruh {
    use super::*;

    fn s() -> Store {
        let mut s = Store::default();
        s.folder.push(Folder { id: "F".into(), nama: "Farming".into(), preset: Some(PresetHemat { hemat: true, ..Default::default() }), ..Default::default() });
        for (id, f) in [("a", None), ("b", None), ("c", Some("F")), ("d", Some("F")), ("e", Some("hilang"))] {
            s.accounts.push(Account { id: id.into(), folder_id: f.map(str::to_string), ..Default::default() });
        }
        s
    }
    fn urut(s: &Store) -> String {
        s.accounts.iter().map(|a| a.id.as_str()).collect()
    }

    #[test]
    fn taruh_sebelum_sesudah_dan_adopsi_folder() {
        let mut x = s();
        assert_eq!(x.taruh_akun(&["b".into()], "a", false).unwrap(), 0);
        assert_eq!(urut(&x), "bacde");
        let mut x = s();
        x.taruh_akun(&["a".into()], "b", true).unwrap();
        assert_eq!(urut(&x), "bacde");
        let mut x = s();
        assert_eq!(x.taruh_akun(&["a".into(), "b".into()], "d", true).unwrap(), 2);
        assert_eq!(urut(&x), "cdabe");
        assert!(x.accounts.iter().filter(|a| a.id == "a" || a.id == "b").all(|a| a.folder_id.as_deref() == Some("F") && a.hemat));
        let mut x = s();
        assert_eq!(x.taruh_akun(&["a".into()], "e", false).unwrap(), 0);
        assert_eq!(urut(&x), "bcdae");
        let mut x = s();
        x.taruh_akun(&["c".into()], "c", true).unwrap();
        assert_eq!(urut(&x), "abcde");
        assert!(s().taruh_akun(&["a".into()], "zzz", true).is_err());
    }
}

#[cfg(test)]
mod tes_kecil_hemat {
    use super::{kecil_saat_hemat, KECIL_HEMAT};

    #[test]
    fn menyalakan_penghemat_memasang_mungil_bila_mati() {
        assert_eq!(kecil_saat_hemat(false, true, 0), KECIL_HEMAT, "dinyalakan, Start tiny mati -> 320");
        assert_eq!(kecil_saat_hemat(false, true, 160), 160, "ukuran pilihan pemakai dipertahankan");
        assert_eq!(kecil_saat_hemat(true, true, 0), 0, "penghemat sudah nyala (ubah FPS/RAM): Off dihormati");
        assert_eq!(kecil_saat_hemat(true, false, 320), 320, "mematikan penghemat tidak menyentuh Start tiny");
        assert_eq!(kecil_saat_hemat(false, false, 0), 0);
    }
}

#[cfg(test)]
mod uji_hapus_akun {
    use super::*;

    fn akun(id: &str, username: &str, uid: u64) -> Account {
        Account { id: id.into(), alias: id.into(), username: username.into(), user_id: uid, ..Default::default() }
    }

    #[test]
    fn hapus_akun_membuang_akun_dan_semua_jejaknya() {
        let mut s = Store::default();
        s.accounts = vec![akun("a", "Satu", 1), akun("b", "Dua", 2), akun("c", "Tiga", 3)];
        for id in ["a", "b", "c"] {
            s.riwayat.push(Riwayat { account_id: id.into(), place_id: 9, ..Default::default() });
            s.masalah.push(CatatanMasalah { akun_id: id.into(), ..Default::default() });
        }
        s.target_terakhir = Some(TargetLuncur { ikuti: " dua ".into(), place_id: "9".into(), ..Default::default() });
        let hapus = s.hapus_akun(&["b".to_string(), "c".to_string(), "tidak-ada".to_string()]);
        assert_eq!(hapus.iter().map(|a| a.id.as_str()).collect::<Vec<_>>(), ["b", "c"]);
        assert_eq!(s.accounts.iter().map(|a| a.id.as_str()).collect::<Vec<_>>(), ["a"]);
        assert!(s.riwayat.iter().all(|r| r.account_id == "a") && s.riwayat.len() == 1);
        assert!(s.masalah.iter().all(|m| m.akun_id == "a") && s.masalah.len() == 1);
        let t = s.target_terakhir.as_ref().unwrap();
        assert!(t.ikuti.is_empty(), "Follow pointed at a deleted account's username");
        assert_eq!(t.place_id, "9", "the rest of the launch target stays");
    }

    #[test]
    fn hapus_akun_lalu_memulihkan_memori_bila_simpan_gagal() {
        let mut s = Store::default();
        s.accounts = vec![akun("a", "Satu", 1), akun("b", "Dua", 2)];
        s.riwayat.push(Riwayat { account_id: "b".into(), ..Default::default() });
        s.masalah.push(CatatanMasalah { akun_id: "b".into(), ..Default::default() });
        s.target_terakhir = Some(TargetLuncur { ikuti: "Dua".into(), ..Default::default() });
        let e = s.hapus_akun_lalu(&["b".to_string()], |_| Err("disk full".into()));
        assert_eq!(e.err().as_deref(), Some("disk full"));
        assert_eq!(s.accounts.len(), 2, "accounts restored");
        assert_eq!((s.riwayat.len(), s.masalah.len()), (1, 1), "history and notes restored");
        assert_eq!(s.target_terakhir.as_ref().unwrap().ikuti, "Dua", "Follow restored");
        let mut disimpan = 0;
        let ok = s.hapus_akun_lalu(&["b".to_string()], |st| { disimpan = st.accounts.len(); Ok(()) }).unwrap();
        assert_eq!((ok.len(), disimpan, s.accounts.len()), (1, 1, 1), "saved without the deleted account");
    }

    #[test]
    fn hapus_akun_membiarkan_follow_ke_orang_lain() {
        let mut s = Store::default();
        s.accounts = vec![akun("a", "Satu", 1)];
        s.target_terakhir = Some(TargetLuncur { ikuti: "TemanLain".into(), ..Default::default() });
        s.hapus_akun(&["a".to_string()]);
        assert!(s.accounts.is_empty());
        assert_eq!(s.target_terakhir.as_ref().unwrap().ikuti, "TemanLain");
    }
}
