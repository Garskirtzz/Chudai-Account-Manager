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

#[cfg(test)]
mod tes {
    use super::*;

    fn akun(hemat: bool, fps: u32, ram: u32, fps_cap: u32) -> Account {
        Account { hemat, hemat_fps: fps, hemat_ram_mb: ram, fps_cap, ..Default::default() }
    }

    #[test]
    fn profil_hanya_pola_persis() {
        assert_eq!(profil_lama(&akun(false, 0, 0, 0)), Profil::Normal);
        assert_eq!(profil_lama(&akun(true, 10, 512, 0)), Profil::BalancedAfk);
        assert_eq!(profil_lama(&akun(true, 0, 512, 0)), Profil::BalancedAfk, "0 berarti 10");
        assert_eq!(profil_lama(&akun(true, 3, 512, 0)), Profil::DeepAfk);
        assert_eq!(profil_lama(&akun(true, 3, 256, 0)), Profil::DeepAfk);
        for a in [akun(true, 5, 512, 0), akun(true, 10, 0, 0), akun(true, 10, 256, 0), akun(true, 3, 128, 0), akun(false, 0, 0, 60)] {
            assert_eq!(profil_lama(&a), Profil::Custom, "{} {} {}", a.hemat_fps, a.hemat_ram_mb, a.fps_cap);
        }
    }

    #[test]
    fn urutan_sumber_dan_pengecualian() {
        let lain = [(Sumber::Game, None), (Sumber::Folder, Some(5)), (Sumber::Global, Some(9))];
        assert_eq!(pilih(false, Some(1), &lain, 0), Bidang { nilai: 1, sumber: Sumber::Akun });
        assert_eq!(pilih(false, None, &lain, 0), Bidang { nilai: 5, sumber: Sumber::Folder });
        assert_eq!(pilih(false, None, &[], 7), Bidang { nilai: 7, sumber: Sumber::Bawaan });
        assert_eq!(pilih(true, None, &lain, 0), Bidang { nilai: 0, sumber: Sumber::Bawaan }, "lapisan otomatis dilewati");
        assert_eq!(pilih(true, Some(1), &lain, 0).sumber, Sumber::Akun, "manual tetap boleh");
    }

    #[test]
    fn kebijakan_sama_dengan_aturan_peluncuran() {
        let k = kebijakan_akun(&akun(true, 0, 512, 60), false);
        assert_eq!(k.fps.nilai, Some(10), "saver mengalahkan fps_cap");
        assert_eq!((k.ws_mb.nilai, k.prioritas_rendah.nilai, k.grafis_rendah.nilai), (Some(512), true, true));
        let k = kebijakan_akun(&akun(false, 3, 512, 60), false);
        assert_eq!((k.fps.nilai, k.ws_mb.nilai, k.prioritas_rendah.nilai), (Some(60), None, false));
        let tiny = Account { mulai_kecil: 320, ..Default::default() };
        assert_eq!(kebijakan_akun(&tiny, false).jendela.nilai, Jendela::Mungil { lebar: 320 });
    }

    #[test]
    fn grafis_ringan_global_hanya_grafis_dan_melewati_akun_utama() {
        let biasa = akun(false, 0, 0, 0);
        assert_eq!(kebijakan_akun(&biasa, false).grafis_rendah, Bidang { nilai: false, sumber: Sumber::Bawaan });
        let k = kebijakan_akun(&biasa, true);
        assert_eq!(k.grafis_rendah, Bidang { nilai: true, sumber: Sumber::Global });
        assert_eq!((k.fps.nilai, k.ws_mb.nilai, k.prioritas_rendah.nilai), (None, None, false), "FPS, RAM, prioritas tidak ikut berubah");

        for a in [Account { utama: true, ..Default::default() }, Account { kualitas_penuh: true, ..Default::default() }] {
            assert_eq!(kebijakan_akun(&a, true).grafis_rendah.nilai, false, "utama/Full quality tetap grafis sendiri");
        }
        let utama_hemat = Account { utama: true, hemat: true, ..Default::default() };
        assert_eq!(kebijakan_akun(&utama_hemat, false).grafis_rendah.sumber, Sumber::Akun, "pilihan manual tetap berlaku");
    }

    fn catat_uji() -> CatatanKebijakan {
        CatatanKebijakan { pid: 10, mulai: 77, ws_mb: Some(512), ws_terpasang: true, prioritas_rendah: true }
    }
    fn kini(pid: u32, mulai: u64, ws: f64, prioritas: i32) -> ProsesKini {
        ProsesKini { pid, mulai, ws_mb: ws, prioritas }
    }

    #[test]
    fn status_working_set() {
        let c = catat_uji();
        let k = kini(10, 77, 500.0, 6);
        assert_eq!(status_ws(None, Some(&c), k), StatusKolom::TidakBerlaku);
        assert_eq!(status_ws(Some(512), None, k), StatusKolom::TidakDiketahui);
        assert_eq!(status_ws(Some(512), Some(&c), k), StatusKolom::Terpasang);
        assert_eq!(status_ws(Some(256), Some(&c), k), StatusKolom::Diminta, "diubah sesudah peluncuran");
        assert_eq!(status_ws(Some(512), Some(&c), kini(11, 77, 500.0, 6)), StatusKolom::Hilang, "PID lain");
        assert_eq!(status_ws(Some(512), Some(&c), kini(10, 78, 500.0, 6)), StatusKolom::Hilang, "PID dipakai ulang");
        assert_eq!(status_ws(Some(512), Some(&c), kini(10, 77, 2800.0, 6)), StatusKolom::Hilang, "melewati batas");
        let gagal = CatatanKebijakan { ws_terpasang: false, ..c };
        assert_eq!(status_ws(Some(512), Some(&gagal), k), StatusKolom::Gagal);
    }

    #[test]
    fn status_prioritas_dari_snapshot() {
        let c = catat_uji();
        assert_eq!(status_prioritas(false, Some(&c), kini(10, 77, 1.0, 8)), StatusKolom::TidakBerlaku);
        assert_eq!(status_prioritas(true, Some(&c), kini(10, 77, 1.0, 6)), StatusKolom::Terpasang);
        assert_eq!(status_prioritas(true, Some(&c), kini(10, 77, 1.0, 8)), StatusKolom::Hilang);
        assert_eq!(status_prioritas(true, None, kini(10, 77, 1.0, 6)), StatusKolom::TidakDiketahui);
    }

    #[test]
    fn status_tanpa_rahasia() {
        let a = Account { id: "a".into(), cookie_enc: "RAHASIA-COOKIE".into(), hemat: true, hemat_ram_mb: 512, ..Default::default() };
        let teks = serde_json::to_string(&status_klien(&a, false, Some(&catat_uji()), kini(10, 77, 500.0, 6))).unwrap();
        assert!(!teks.contains("RAHASIA"), "{teks}");
        for k in ["cookie", "ticket", "job_id", "access_code", "exe"] {
            assert!(!teks.contains(k), "{k}: {teks}");
        }
    }
}
