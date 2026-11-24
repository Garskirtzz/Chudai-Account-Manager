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
