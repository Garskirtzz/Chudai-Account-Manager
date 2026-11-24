use serde::Serialize;

const TITIK_MB: [(f64, f64); 3] = [(128.0, 760.0), (256.0, 900.0), (512.0, 1130.0)];
const TANPA_BATAS_MB: f64 = 2200.0;
const SISA_SISTEM_MB: f64 = 1024.0;

pub const ANGGARAN_MIN_MB: u32 = 1024;
pub const ANGGARAN_MAKS_MB: u32 = 1024 * 1024;

pub fn perkiraan_mb(batas: Option<u32>) -> f64 {
    let Some(b) = batas else { return TANPA_BATAS_MB };
    let b = f64::from(b);
    let mut kiri = TITIK_MB[0];
    if b <= kiri.0 {
        return kiri.1;
    }
    for kanan in TITIK_MB[1..].iter().copied().chain([(TANPA_BATAS_MB, TANPA_BATAS_MB)]) {
        if b <= kanan.0 {
            return kiri.1 + (b - kiri.0) / (kanan.0 - kiri.0) * (kanan.1 - kiri.1);
        }
        kiri = kanan;
    }
    TANPA_BATAS_MB
}

pub fn pakai_klien_mb(batas: Option<u32>, terpasang: bool, ws_mb: f64) -> f64 {
    match batas {
        Some(_) if terpasang => perkiraan_mb(batas).max(ws_mb),
        _ => ws_mb,
    }
}

pub fn muat_lagi(dipakai_mb: f64, anggaran_mb: u32, tersedia_mb: Option<f64>, per_klien_mb: f64) -> Option<u32> {
    let dari_anggaran = (anggaran_mb > 0).then(|| f64::from(anggaran_mb) - dipakai_mb);
    let dari_pc = tersedia_mb.map(|t| t - SISA_SISTEM_MB);
    let ruang = match (dari_anggaran, dari_pc) {
        (Some(a), Some(b)) => a.min(b),
        (a, b) => a.or(b)?,
    };
    Some((ruang / per_klien_mb).floor().max(0.0) as u32)
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Muat {
    pub per_klien_mb: f64,
    pub jumlah: Option<u32>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Kapasitas {
    pub anggaran_mb: Option<u32>,
    pub dipakai_mb: f64,
    pub jumlah_klien: usize,
    pub tersedia_mb: Option<f64>,
    pub normal: Muat,
    pub balanced_afk: Muat,
    pub deep_afk: Muat,
}

pub fn kapasitas(anggaran_mb: u32, dipakai_mb: f64, jumlah_klien: usize, tersedia_mb: Option<f64>) -> Kapasitas {
    let muat = |batas| {
        let per_klien_mb = perkiraan_mb(batas);
        Muat { per_klien_mb, jumlah: muat_lagi(dipakai_mb, anggaran_mb, tersedia_mb, per_klien_mb) }
    };
    Kapasitas {
        anggaran_mb: (anggaran_mb > 0).then_some(anggaran_mb),
        dipakai_mb,
        jumlah_klien,
        tersedia_mb,
        normal: muat(None),
        balanced_afk: muat(Some(512)),
        deep_afk: muat(Some(256)),
    }
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct CekAnggaran {
    pub lewat: bool,
    pub anggaran_mb: Option<u32>,
    pub dipakai_mb: f64,
    pub tambahan_mb: f64,
}

pub fn cek(anggaran_mb: u32, dipakai_mb: f64, tambahan_mb: f64) -> CekAnggaran {
    CekAnggaran {
        lewat: anggaran_mb > 0 && tambahan_mb > 0.0 && dipakai_mb + tambahan_mb > f64::from(anggaran_mb),
        anggaran_mb: (anggaran_mb > 0).then_some(anggaran_mb),
        dipakai_mb,
        tambahan_mb,
    }
}

pub fn anggaran_sah(mb: u32) -> bool {
    mb == 0 || (ANGGARAN_MIN_MB..=ANGGARAN_MAKS_MB).contains(&mb)
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn perkiraan_mengikuti_titik_ukur() {
        assert_eq!(perkiraan_mb(None), 2200.0);
        assert_eq!(perkiraan_mb(Some(512)), 1130.0);
        assert_eq!(perkiraan_mb(Some(256)), 900.0);
        assert_eq!(perkiraan_mb(Some(128)), 760.0);
        assert_eq!(perkiraan_mb(Some(64)), 760.0, "di bawah titik terendah tidak diekstrapolasi");
        assert_eq!(perkiraan_mb(Some(384)), 1015.0);
        assert_eq!(perkiraan_mb(Some(4096)), 2200.0);
        let tengah = perkiraan_mb(Some(1024));
        assert!(tengah > 1130.0 && tengah < 2200.0, "{tengah}");
    }

    #[test]
    fn klien_berbatas_tidak_dihitung_sebesar_batasnya() {
        assert_eq!(pakai_klien_mb(Some(512), true, 511.0), 1130.0);
        assert_eq!(pakai_klien_mb(Some(512), true, 1500.0), 1500.0, "WS nyata lebih besar menang");
        assert_eq!(pakai_klien_mb(Some(512), false, 2100.0), 2100.0, "batas gagal: WS apa adanya");
        assert_eq!(pakai_klien_mb(None, false, 2100.0), 2100.0);
    }

    #[test]
    fn ruang_memakai_batas_terketat() {
        assert_eq!(muat_lagi(4000.0, 8000, Some(20000.0), 1000.0), Some(4), "anggaran lebih ketat");
        assert_eq!(muat_lagi(4000.0, 8000, Some(3024.0), 1000.0), Some(2), "RAM PC lebih ketat");
        assert_eq!(muat_lagi(4000.0, 0, Some(5024.0), 1000.0), Some(4), "anggaran mati");
        assert_eq!(muat_lagi(9000.0, 8000, Some(5000.0), 1000.0), Some(0), "tidak pernah negatif");
        assert_eq!(muat_lagi(0.0, 8000, None, 1000.0), Some(8), "RAM PC tak terbaca");
        assert_eq!(muat_lagi(0.0, 0, None, 1000.0), None, "tanpa dasar bukan nol");
    }

    #[test]
    fn cek_hanya_lewat_bila_anggaran_menyala_dan_terlampaui() {
        assert!(!cek(0, 90000.0, 5000.0).lewat, "mati");
        assert!(!cek(8000, 6000.0, 2000.0).lewat, "tepat di batas masih boleh");
        assert!(cek(8000, 6000.0, 2001.0).lewat);
        assert!(!cek(8000, 9000.0, 0.0).lewat, "tidak menambah klien baru");
        assert_eq!(cek(0, 1.0, 2.0).anggaran_mb, None);
    }

    #[test]
    fn rentang_anggaran() {
        assert!(anggaran_sah(0));
        assert!(!anggaran_sah(1023));
        assert!(anggaran_sah(1024));
        assert!(anggaran_sah(1024 * 1024));
        assert!(!anggaran_sah(1024 * 1024 + 1));
    }

    #[test]
    fn kapasitas_memuat_tiga_profil() {
        let k = kapasitas(0, 2000.0, 2, Some(6024.0));
        assert_eq!(k.anggaran_mb, None);
        assert_eq!(k.normal.jumlah, Some(2));
        assert_eq!(k.balanced_afk.jumlah, Some(4));
        assert_eq!(k.deep_afk.jumlah, Some(5));
    }
}
