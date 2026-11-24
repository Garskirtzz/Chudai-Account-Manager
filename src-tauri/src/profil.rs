use serde::{Deserialize, Serialize};

use crate::store::{lebar_kecil_sah, nama_folder_sah, Folder, PresetHemat};

pub const EKSTENSI: &str = "camprofile";
const FORMAT: &str = "chudai-folder-profile";
const MAKS_BYTE: usize = 64 * 1024;
const MAKS_PROFIL: usize = 50;

#[derive(Serialize, Deserialize)]
struct Berkas {
    format: String,
    versi: u32,
    profil: Vec<Profil>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Profil {
    pub nama: String,
    #[serde(default)]
    pub warna: String,
    #[serde(default)]
    pub ikon: String,
    #[serde(default)]
    pub preset: Option<PresetHemat>,
}

pub fn ekspor(folder: &[&Folder]) -> String {
    let b = Berkas {
        format: FORMAT.into(),
        versi: 1,
        profil: folder
            .iter()
            .map(|f| Profil { nama: f.nama.clone(), warna: f.warna.clone(), ikon: f.ikon.clone(), preset: f.preset.clone() })
            .collect(),
    };
    serde_json::to_string_pretty(&b).unwrap_or_default()
}

fn kunci_ui(s: &str) -> String {
    if s.len() <= 24 && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-') {
        s.to_owned()
    } else {
        String::new()
    }
}

fn preset_sah(p: PresetHemat) -> PresetHemat {
    PresetHemat {
        fps: crate::hemat::fps_hemat_sah(p.fps),
        ram_mb: if p.ram_mb == 0 { 0 } else { p.ram_mb.clamp(128, 4096) },
        mulai_kecil: lebar_kecil_sah(p.mulai_kecil),
        ..p
    }
}

pub fn urai(teks: &str) -> Result<Vec<Profil>, String> {
    let bukan = || "This isn't a Chudai folder profile (.camprofile), or the file is damaged.".to_string();
    if teks.len() > MAKS_BYTE {
        return Err(bukan());
    }
    let b: Berkas = serde_json::from_str(teks.trim_start_matches('\u{feff}')).map_err(|_| bukan())?;
    if b.format != FORMAT {
        return Err(bukan());
    }
    if b.versi > 1 {
        return Err("This profile was made by a newer version of Chudai Account Manager. Update the app first.".into());
    }
    if b.profil.is_empty() || b.profil.len() > MAKS_PROFIL {
        return Err(bukan());
    }
    let mut hasil: Vec<Profil> = Vec::new();
    for p in b.profil {
        let nama = nama_folder_sah(&p.nama)?;
        if hasil.iter().any(|x| x.nama.eq_ignore_ascii_case(&nama)) {
            continue;
        }
        hasil.push(Profil { nama, warna: kunci_ui(&p.warna), ikon: kunci_ui(&p.ikon), preset: p.preset.map(preset_sah) });
    }
    Ok(hasil)
}

pub fn akan_ditimpa<'a>(folder: &'a [Folder], profil: &'a [Profil]) -> Vec<(&'a Folder, &'a Profil)> {
    profil.iter().filter_map(|p| folder.iter().find(|f| f.nama.eq_ignore_ascii_case(&p.nama)).map(|f| (f, p))).collect()
}

pub fn tampilan_berubah(f: &Folder, p: &Profil) -> bool {
    f.warna != p.warna || f.ikon != p.ikon
}

pub fn gabung(folder: &mut Vec<Folder>, profil: Vec<Profil>, buat_id: impl Fn() -> String) -> (usize, Vec<String>) {
    let mut baru = 0;
    let mut diperbarui = Vec::new();
    for p in profil {
        match folder.iter_mut().find(|f| f.nama.eq_ignore_ascii_case(&p.nama)) {
            Some(f) => {
                f.warna = p.warna;
                f.ikon = p.ikon;
                f.preset = p.preset;
                diperbarui.push(f.id.clone());
            }
            None => {
                folder.push(Folder { id: buat_id(), nama: p.nama, warna: p.warna, ikon: p.ikon, preset: p.preset });
                baru += 1;
            }
        }
    }
    (baru, diperbarui)
}

#[cfg(test)]
mod tes {
    use super::*;

    fn f(id: &str, nama: &str) -> Folder {
        Folder { id: id.into(), nama: nama.into(), warna: "biru".into(), ikon: "bot".into(), preset: Some(PresetHemat { hemat: true, fps: 10, ram_mb: 512, ..Default::default() }) }
    }

    #[test]
    fn pulang_pergi_tanpa_id() {
        let a = f("rahasia-id-123", "Farming");
        let teks = ekspor(&[&a]);
        assert!(!teks.contains("rahasia-id-123"), "id folder tidak ikut");
        let p = urai(&teks).unwrap();
        assert_eq!(p, [Profil { nama: "Farming".into(), warna: "biru".into(), ikon: "bot".into(), preset: a.preset.clone() }]);
    }

    #[test]
    fn isi_berkas_tidak_dipercaya() {
        assert!(urai("{}").is_err());
        assert!(urai("bukan json").is_err());
        assert!(urai(r#"{"format":"lain","versi":1,"profil":[{"nama":"A"}]}"#).is_err());
        assert!(urai(r#"{"format":"chudai-folder-profile","versi":2,"profil":[{"nama":"A"}]}"#).unwrap_err().contains("newer"));
        assert!(urai(r#"{"format":"chudai-folder-profile","versi":1,"profil":[]}"#).is_err());
        assert!(urai(&"x".repeat(MAKS_BYTE + 1)).is_err());
        let p = urai(r#"{"format":"chudai-folder-profile","versi":1,"profil":[
            {"nama":"  Farm  ","warna":"<script>","ikon":"bot","preset":{"hemat":true,"fps":9999,"ram_mb":5,"mulai_kecil":10}},
            {"nama":"farm"}]}"#)
        .unwrap();
        assert_eq!(p.len(), 1, "nama kembar dibuang");
        assert_eq!(p[0].nama, "Farm");
        assert_eq!(p[0].warna, "", "kunci UI aneh -> bawaan");
        let ps = p[0].preset.clone().unwrap();
        assert_eq!((ps.fps, ps.ram_mb, ps.mulai_kecil), (240, 128, 160));
        let p = urai(r#"{"format":"chudai-folder-profile","versi":1,"profil":[{"nama":"A\nB","preset":{"hemat":true,"fps":1}}]}"#).unwrap();
        assert_eq!(p[0].nama, "A B", "karakter kontrol dibuang");
        assert_eq!(p[0].preset.as_ref().unwrap().fps, 3, "minimum yang sama dengan saver");
    }

    #[test]
    fn yang_akan_ditimpa_hanya_nama_sama() {
        let daftar = vec![f("1", "Farming")];
        let p = vec![
            Profil { nama: "FARMING".into(), warna: "".into(), ikon: "".into(), preset: None },
            Profil { nama: "Baru".into(), warna: "".into(), ikon: "".into(), preset: None },
        ];
        let t = akan_ditimpa(&daftar, &p);
        assert_eq!(t.len(), 1);
        assert_eq!((t[0].0.id.as_str(), t[0].1.nama.as_str()), ("1", "FARMING"));
        assert!(tampilan_berubah(t[0].0, t[0].1), "warna/ikon kosong != biru/bot");
        let sama = Profil { nama: "Farming".into(), warna: "biru".into(), ikon: "bot".into(), preset: None };
        assert!(!tampilan_berubah(&daftar[0], &sama));
    }

    #[test]
    fn gabung_perbarui_atau_buat() {
        let mut daftar = vec![f("1", "Farming")];
        let p = vec![
            Profil { nama: "farming".into(), warna: "hijau".into(), ikon: "".into(), preset: None },
            Profil { nama: "Boosting".into(), warna: "".into(), ikon: "".into(), preset: None },
        ];
        let (baru, diperbarui) = gabung(&mut daftar, p, || "baru".into());
        assert_eq!((baru, diperbarui), (1, vec!["1".to_string()]));
        assert_eq!(daftar[0].nama, "Farming", "nama lama dipertahankan");
        assert_eq!((daftar[0].warna.as_str(), daftar[0].preset.is_none()), ("hijau", true));
        assert_eq!(daftar[1].id, "baru");
    }
}
