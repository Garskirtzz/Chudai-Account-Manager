use std::path::Path;
use std::time::{Duration, Instant};

use crate::hemat;

pub static KUNCI: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

const MAKS_KAMI: usize = 16;
const PENANDA: [&str; 2] = ["SceneManager: resizing main targets", "[FLog::Network] Replicator created"];
const BATAS_LOG: Duration = Duration::from_secs(60);
const BATAS_PENANDA: Duration = Duration::from_secs(15);
const SETELAH_BACA: Duration = Duration::from_secs(1);

pub fn catat_milik(v: i32, asli: Option<i32>, kami: &[i32]) -> Option<i32> {
    if kami.contains(&v) { asli } else { Some(v) }
}

pub fn nilai_pulih(v: i32, asli: Option<i32>, kami: &[i32]) -> Option<i32> {
    if !kami.contains(&v) {
        return None;
    }
    let p = asli.unwrap_or(-1);
    (p != v).then_some(p)
}

pub fn tambah_kami(kami: &mut Vec<i32>, x: i32) {
    kami.retain(|&k| k != x);
    kami.push(x);
    if kami.len() > MAKS_KAMI {
        let lebih = kami.len() - MAKS_KAMI;
        kami.drain(..lebih);
    }
}

fn baca(berkas: &Path) -> Option<String> {
    for _ in 0..10 {
        match std::fs::read_to_string(berkas) {
            Ok(s) if s.trim_end().ends_with("</roblox>") => return Some(s),
            Ok(_) => return None,
            Err(_) => std::thread::sleep(Duration::from_millis(50)),
        }
    }
    None
}

fn tulis(berkas: &Path, xml: &str, cap: i32) -> Result<(), String> {
    if std::fs::metadata(berkas).map(|m| m.permissions().readonly()).unwrap_or(false) {
        return Err("Roblox's settings file is read-only".into());
    }
    let baru = hemat::ganti_cap(xml, cap).ok_or("FramerateCap is missing from Roblox settings")?;
    let tmp = berkas.with_extension("xml.cam-tmp");
    let mut galat = String::new();
    for _ in 0..10 {
        match std::fs::write(&tmp, &baru).and_then(|_| std::fs::rename(&tmp, berkas)) {
            Ok(()) => return Ok(()),
            Err(e) => {
                galat = e.to_string();
                std::thread::sleep(Duration::from_millis(50));
            }
        }
    }
    let _ = std::fs::remove_file(&tmp);
    Err(format!("could not write Roblox settings: {galat}"))
}

pub(crate) fn cap_sekarang() -> Option<(std::path::PathBuf, String, i32)> {
    let berkas = hemat::berkas_pengaturan()?;
    let xml = baca(&berkas)?;
    let v = hemat::baca_cap(&xml)?;
    Some((berkas, xml, v))
}

pub fn tulis_peluncuran(target: Option<i32>, asli: &mut Option<i32>, kami: &mut Vec<i32>) -> Result<Option<i32>, String> {
    let (berkas, xml, v) = cap_sekarang().ok_or("Roblox settings file not found or incomplete")?;
    *asli = catat_milik(v, *asli, kami);
    match target {
        Some(x) => {
            if x != v {
                tulis(&berkas, &xml, x)?;
            }
            tambah_kami(kami, x);
            Ok(Some(x))
        }
        None => {
            if let Some(p) = nilai_pulih(v, *asli, kami) {
                tulis(&berkas, &xml, p)?;
            }
            Ok(None)
        }
    }
}

pub fn pulihkan(asli: Option<i32>, kami: &[i32]) -> bool {
    let Some((berkas, xml, v)) = cap_sekarang() else { return false };
    match nilai_pulih(v, asli, kami) {
        Some(p) => tulis(&berkas, &xml, p).is_ok(),
        None => false,
    }
}

pub async fn tunggu_lalu_pulihkan(
    _kunci: tokio::sync::MutexGuard<'static, ()>,
    btid: u64,
    sejak: i64,
    cap: Option<i32>,
    asli: Option<i32>,
    kami: Vec<i32>,
    pulih_flag: impl FnOnce() + Send + 'static,
) -> &'static str {
    let mulai = Instant::now();
    let mut log: Option<std::path::PathBuf> = None;
    let mut sejak_log: Option<Instant> = None;
    let hasil = loop {
        tokio::time::sleep(Duration::from_millis(100)).await;
        if let Some(x) = cap {
            if let Some((berkas, xml, v)) = cap_sekarang() {
                if v != x {
                    let _ = tulis(&berkas, &xml, x);
                }
            }
        }
        if log.is_none() {
            log = crate::pantau::dir_log().and_then(|d| crate::pantau::cari_log(&d, btid, sejak));
            if log.is_some() {
                sejak_log = Some(Instant::now());
            } else if mulai.elapsed() > BATAS_LOG {
                break "client log not found";
            }
            continue;
        }
        if let Some(p) = &log {
            let isi = std::fs::read(p).map(|b| String::from_utf8_lossy(&b).to_string()).unwrap_or_default();
            if PENANDA.iter().any(|m| isi.contains(m)) {
                tokio::time::sleep(SETELAH_BACA).await;
                break "read";
            }
        }
        if sejak_log.is_some_and(|t| t.elapsed() > BATAS_PENANDA) {
            break "no read mark";
        }
    };
    pulihkan(asli, &kami);
    pulih_flag();
    hasil
}

pub fn sapu_flag_hemat(milik_pemakai: &crate::fps::Flags) -> usize {
    let Some(versi) = dirs::data_local_dir().map(|d| d.join("Roblox").join("Versions")) else { return 0 };
    let Ok(rd) = std::fs::read_dir(versi) else { return 0 };
    let kunci: Vec<String> = hemat::flag_hemat().keys().filter(|k| !milik_pemakai.contains_key(*k)).cloned().collect();
    let mut n = 0;
    for e in rd.flatten() {
        if sapu_berkas(&e.path().join("ClientSettings").join("ClientAppSettings.json"), &kunci) {
            n += 1;
        }
    }
    n
}

fn sapu_berkas(berkas: &Path, kunci: &[String]) -> bool {
    let Ok(teks) = std::fs::read_to_string(berkas) else { return false };
    let Ok(serde_json::Value::Object(mut isi)) = serde_json::from_str::<serde_json::Value>(&teks) else { return false };
    let awal = isi.len();
    for k in kunci {
        isi.remove(k);
    }
    if isi.len() == awal {
        return false;
    }
    if isi.is_empty() {
        return std::fs::remove_file(berkas).is_ok();
    }
    serde_json::to_string_pretty(&isi).map(|s| std::fs::write(berkas, s + "\n").is_ok()).unwrap_or(false)
}

#[cfg(test)]
mod tes {
    use super::*;

    #[test]
    fn nilai_pemakai_dan_milik_cam() {
        assert_eq!(catat_milik(60, None, &[]), Some(60));
        assert_eq!(catat_milik(10, Some(60), &[10]), Some(60));
        assert_eq!(catat_milik(144, Some(60), &[10]), Some(144));
    }

    #[test]
    fn pulihkan_hanya_nilai_cam() {
        assert_eq!(nilai_pulih(10, Some(60), &[10]), Some(60));
        assert_eq!(nilai_pulih(10, None, &[10]), Some(-1), "nilai pemakai tak diketahui = bawaan Roblox (-1)");
        assert_eq!(nilai_pulih(144, Some(60), &[10]), None, "pilihan pemakai tidak disentuh");
        assert_eq!(nilai_pulih(60, Some(60), &[60]), None, "sudah sama");
    }

    #[test]
    fn kami_dibatasi_dan_terbaru_di_belakang() {
        let mut k = Vec::new();
        for x in 0..20 {
            tambah_kami(&mut k, x);
        }
        tambah_kami(&mut k, 10);
        assert_eq!(k.len(), MAKS_KAMI);
        assert_eq!(*k.last().unwrap(), 10);
        assert_eq!(k.iter().filter(|&&x| x == 10).count(), 1);
    }

    #[test]
    fn sapuan_hanya_membuang_kunci_hemat() {
        let dir = std::env::temp_dir().join(format!("cam-uji-sapu-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let f = dir.join("ClientAppSettings.json");
        std::fs::write(&f, r#"{"FIntFRMMinGrassDistance":0,"FFlagMilikPemakai":"True","DFIntTextureQualityOverride":0}"#).unwrap();
        let kunci = vec!["FIntFRMMinGrassDistance".to_string(), "DFIntTextureQualityOverride".to_string()];
        assert!(sapu_berkas(&f, &kunci));
        assert_eq!(std::fs::read_to_string(&f).unwrap().trim(), "{\n  \"FFlagMilikPemakai\": \"True\"\n}");
        assert!(!sapu_berkas(&f, &kunci), "tidak ditulis bila tak berubah");
        std::fs::write(&f, r#"{"FIntFRMMinGrassDistance":0}"#).unwrap();
        assert!(sapu_berkas(&f, &kunci) && !f.exists(), "berkas yang jadi kosong dihapus");
    }

    #[test]
    fn berkas_ditulis_atomik_dan_yang_belum_utuh_dibiarkan() {
        let dir = std::env::temp_dir().join(format!("cam-uji-setelan-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let f = dir.join("GlobalBasicSettings_13.xml");
        let xml = "<roblox>\n<int name=\"FramerateCap\">60</int>\n</roblox>\n";
        std::fs::write(&f, xml).unwrap();
        tulis(&f, &baca(&f).unwrap(), 10).unwrap();
        assert_eq!(hemat::baca_cap(&std::fs::read_to_string(&f).unwrap()), Some(10));
        assert!(!dir.join("GlobalBasicSettings_13.xml.cam-tmp").exists());
        std::fs::write(&f, "<roblox>\n<int name=\"FramerateCap\">60</int>").unwrap();
        assert!(baca(&f).is_none(), "berkas yang sedang ditulis Roblox tidak dibaca");
    }
}
