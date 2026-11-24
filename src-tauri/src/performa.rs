use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;

use crate::hemat;
use crate::store::Account;

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Profil {
    Normal,
    BalancedAfk,
    DeepAfk,
    Custom,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum Sumber {
    Akun,
    Game,
    Folder,
    Global,
    Bawaan,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Bidang<T> {
    pub nilai: T,
    pub sumber: Sumber,
}

pub fn pilih<T: Clone>(dikecualikan: bool, akun: Option<T>, lapisan: &[(Sumber, Option<T>)], aman: T) -> Bidang<T> {
    if let Some(nilai) = akun {
        return Bidang { nilai, sumber: Sumber::Akun };
    }
    if !dikecualikan {
        for (sumber, nilai) in lapisan {
            if let Some(nilai) = nilai {
                return Bidang { nilai: nilai.clone(), sumber: *sumber };
            }
        }
    }
    Bidang { nilai: aman, sumber: Sumber::Bawaan }
}

pub fn profil_lama(a: &Account) -> Profil {
    if !a.hemat {
        return if a.fps_cap == 0 && a.hemat_ram_mb == 0 { Profil::Normal } else { Profil::Custom };
    }
    match (if a.hemat_fps == 0 { hemat::FPS_HEMAT } else { a.hemat_fps }, a.hemat_ram_mb) {
        (10, 512) => Profil::BalancedAfk,
        (3, 256) | (3, 512) => Profil::DeepAfk,
        _ => Profil::Custom,
    }
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Jendela {
    Normal,
    Mungil { lebar: u32 },
    Minimize,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct KebijakanEfektif {
    pub profil: Profil,
    pub fps: Bidang<Option<u32>>,
    pub grafis_rendah: Bidang<bool>,
    pub ws_mb: Bidang<Option<u32>>,
    pub prioritas_rendah: Bidang<bool>,
    pub jendela: Bidang<Jendela>,
}

pub fn kebijakan_akun(a: &Account, grafis_ringan: bool) -> KebijakanEfektif {
    let kecuali = a.dikecualikan_afk();
    let fps = hemat::target_cap(a.fps_cap, a.hemat, a.hemat_fps).map(|f| f as u32);
    let ws = (a.hemat && a.hemat_ram_mb > 0).then_some(a.hemat_ram_mb);
    let jendela = if a.hemat && a.hemat_minimize {
        Some(Jendela::Minimize)
    } else if a.mulai_kecil > 0 {
        Some(Jendela::Mungil { lebar: a.mulai_kecil })
    } else {
        None
    };
    KebijakanEfektif {
        profil: profil_lama(a),
        fps: pilih(kecuali, fps.map(Some), &[], None),
        grafis_rendah: pilih(kecuali, a.hemat.then_some(true), &[(Sumber::Global, grafis_ringan.then_some(true))], false),
        ws_mb: pilih(kecuali, ws.map(Some), &[], None),
        prioritas_rendah: pilih(kecuali, a.hemat.then_some(true), &[], false),
        jendela: pilih(kecuali, jendela, &[], Jendela::Normal),
    }
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StatusKolom {
    Diminta,
    Terpasang,
    Gagal,
    Hilang,
    TidakBerlaku,
    TidakDiketahui,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CatatanKebijakan {
    pub pid: u32,
    pub mulai: u64,
    pub ws_mb: Option<u32>,
    pub ws_terpasang: bool,
    pub prioritas_rendah: bool,
}

#[derive(Clone, Copy, Debug)]
pub struct ProsesKini {
    pub pid: u32,
    pub mulai: u64,
    pub ws_mb: f64,
    pub prioritas: i32,
}

const PRIORITAS_BELOW_NORMAL: i32 = 6;

fn proses_sama(c: &CatatanKebijakan, k: ProsesKini) -> bool {
    c.pid == k.pid && c.mulai == k.mulai
}

pub fn status_ws(diminta: Option<u32>, c: Option<&CatatanKebijakan>, k: ProsesKini) -> StatusKolom {
    let Some(mb) = diminta else { return StatusKolom::TidakBerlaku };
    let Some(c) = c else { return StatusKolom::TidakDiketahui };
    if !proses_sama(c, k) {
        return StatusKolom::Hilang;
    }
    if c.ws_mb != Some(mb) {
        return StatusKolom::Diminta;
    }
    if !c.ws_terpasang {
        return StatusKolom::Gagal;
    }
    if k.ws_mb > mb as f64 * 1.1 + 32.0 {
        return StatusKolom::Hilang;
    }
    StatusKolom::Terpasang
}

pub fn status_prioritas(diminta: bool, c: Option<&CatatanKebijakan>, k: ProsesKini) -> StatusKolom {
    if !diminta {
        return StatusKolom::TidakBerlaku;
    }
    let Some(c) = c else { return StatusKolom::TidakDiketahui };
    if !proses_sama(c, k) || !c.prioritas_rendah || k.prioritas != PRIORITAS_BELOW_NORMAL {
        return StatusKolom::Hilang;
    }
    StatusKolom::Terpasang
}

#[derive(Serialize, Clone, Debug)]
pub struct StatusKlien {
    pub akun_id: String,
    pub pid: u32,
    pub mulai_proses: u64,
    pub diminta: KebijakanEfektif,
    pub ws: StatusKolom,
    pub prioritas: StatusKolom,
    pub fps: StatusKolom,
    pub ws_aktual_mb: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct StatusPerforma {
    pub sistem: crate::sumber::MemoriSistem,
    pub klien: Vec<StatusKlien>,
    pub kapasitas: crate::anggaran::Kapasitas,
    pub diukur_pada: i64,
}

pub fn status_klien(a: &Account, grafis_ringan: bool, c: Option<&CatatanKebijakan>, k: ProsesKini) -> StatusKlien {
    let diminta = kebijakan_akun(a, grafis_ringan);
    StatusKlien {
        akun_id: a.id.clone(),
        pid: k.pid,
        mulai_proses: k.mulai,
        ws: status_ws(diminta.ws_mb.nilai, c, k),
        prioritas: status_prioritas(diminta.prioritas_rendah.nilai, c, k),
        fps: if diminta.fps.nilai.is_some() { StatusKolom::Diminta } else { StatusKolom::TidakBerlaku },
        ws_aktual_mb: k.ws_mb,
        diminta,
    }
}

fn catatan() -> &'static Mutex<HashMap<u64, CatatanKebijakan>> {
    static C: std::sync::OnceLock<Mutex<HashMap<u64, CatatanKebijakan>>> = std::sync::OnceLock::new();
    C.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn catat(btid: u64, c: CatatanKebijakan) {
    catatan().lock().unwrap_or_else(|e| e.into_inner()).insert(btid, c);
}

pub fn catatan_salinan() -> HashMap<u64, CatatanKebijakan> {
    catatan().lock().unwrap_or_else(|e| e.into_inner()).clone()
}

pub fn catatan_hidup(btid_hidup: &[u64]) -> HashMap<u64, CatatanKebijakan> {
    let mut m = catatan().lock().unwrap_or_else(|e| e.into_inner());
    m.retain(|b, _| btid_hidup.contains(b));
    m.clone()
}
