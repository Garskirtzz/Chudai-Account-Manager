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
}

impl Account {
    pub fn terapkan_preset(&mut self, p: &PresetHemat) {
        self.hemat = p.hemat;
        self.hemat_minimize = p.minimize;
        self.hemat_ram_mb = if p.ram_mb == 0 { 0 } else { p.ram_mb.clamp(128, 4096) };
        self.hemat_fps = crate::hemat::fps_hemat_sah(p.fps);
    }

    pub fn sesuai_preset(&self, p: &PresetHemat) -> bool {
        let mut x = self.clone();
        x.terapkan_preset(p);
        (x.hemat, x.hemat_minimize, x.hemat_ram_mb, x.hemat_fps) == (self.hemat, self.hemat_minimize, self.hemat_ram_mb, self.hemat_fps)
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
    pub versi_alih: Option<(String, String)>,
    #[serde(default)]
    pub folder: Vec<Folder>,
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
    pub fn load() -> Self {
        let path = data_file();
        let Ok(text) = std::fs::read_to_string(&path) else {
            return Self::default();
        };
        match serde_json::from_str(&text) {
            Ok(s) => s,
            Err(_) => {
                let detik = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let _ = std::fs::copy(&path, path.with_extension(format!("json.rusak-{detik}")));
                Self::default()
            }
        }
    }

    pub fn save(&self) -> Result<(), String> {
        std::fs::create_dir_all(data_dir())
            .map_err(|e| format!("could not create the data folder: {e}"))?;
        let text = serde_json::to_string_pretty(self)
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
    let n: String = nama.trim().chars().take(40).collect();
    if n.is_empty() {
        return Err("Give the folder a name.".into());
    }
    Ok(n)
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
            Folder { id: "t".into(), nama: "Farming".into(), preset: Some(PresetHemat { hemat: true, fps: 5, ram_mb: 512, minimize: false }), ..Default::default() },
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
    }

    #[test]
    fn pindah_ke_folder_berpreset_memasang_saver() {
        let mut s = store();
        assert_eq!(s.pindah_akun(&["a".into()], Some("t")).unwrap(), 1);
        let a = s.find("a").unwrap();
        assert_eq!((a.folder_id.as_deref(), a.hemat, a.hemat_fps, a.hemat_ram_mb), (Some("t"), true, 5, 512));
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
