use std::path::PathBuf;

fn folder_versi() -> Option<PathBuf> {
    let mut dir = dirs::data_local_dir()?;
    dir.push("Roblox");
    dir.push("Versions");

    let mut kandidat: Option<(std::time::SystemTime, PathBuf)> = None;
    for e in std::fs::read_dir(&dir).ok()?.flatten() {
        let p = e.path();
        if !p.join("RobloxPlayerBeta.exe").exists() {
            continue;
        }
        let waktu = e
            .metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        if kandidat.as_ref().map_or(true, |(t, _)| waktu > *t) {
            kandidat = Some((waktu, p));
        }
    }
    kandidat.map(|(_, p)| p)
}

pub(crate) fn berkas_setting(klien_path: &str) -> Option<PathBuf> {
    let dari_pilihan = PathBuf::from(klien_path.trim())
        .parent()
        .filter(|p| !klien_path.trim().is_empty() && p.is_dir())
        .map(|p| p.to_path_buf());
    let mut p = dari_pilihan.or_else(folder_versi)?;
    p.push("ClientSettings");
    Some(p)
}

const KUNCI: &str = "DFIntTaskSchedulerTargetFps";

fn baca_objek(berkas: &std::path::Path) -> serde_json::Map<String, serde_json::Value> {
    std::fs::read_to_string(berkas)
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default()
}

pub type Flags = serde_json::Map<String, serde_json::Value>;

pub fn terapkan(fps: Option<u32>, klien_path: &str, kelola: &Flags, pernah: &[String]) -> Result<(), String> {
    let dir = berkas_setting(klien_path)
        .ok_or("Roblox client version folder not found. Is Roblox installed?")?;
    let berkas = dir.join("ClientAppSettings.json");

    let asli = baca_objek(&berkas);
    let mut isi = asli.clone();
    for k in pernah {
        if !kelola.contains_key(k) {
            isi.remove(k);
        }
    }
    for (k, v) in kelola {
        isi.insert(k.clone(), v.clone());
    }
    match fps {
        Some(n) if n > 0 => {
            isi.insert(KUNCI.into(), n.into());
        }
        Some(_) if !kelola.contains_key(KUNCI) => {
            isi.remove(KUNCI);
        }
        _ => {}
    }

    if isi == asli {
        return Ok(());
    }
    if isi.is_empty() {
        return std::fs::remove_file(&berkas)
            .map_err(|e| format!("could not remove ClientAppSettings.json: {e}"));
    }
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("could not create the ClientSettings folder: {e}"))?;
    let teks = serde_json::to_string_pretty(&isi)
        .map_err(|e| format!("could not build ClientAppSettings.json: {e}"))?;
    std::fs::write(&berkas, teks + "
")
        .map_err(|e| format!("could not write ClientAppSettings.json: {e}"))?;
    Ok(())
}

pub fn isi_berkas(klien_path: &str) -> (String, Flags) {
    match berkas_setting(klien_path) {
        Some(dir) => {
            let b = dir.join("ClientAppSettings.json");
            (b.to_string_lossy().to_string(), baca_objek(&b))
        }
        None => (String::new(), Flags::new()),
    }
}


#[cfg(test)]
mod uji {
    use super::*;
    use serde_json::json;

    fn klien_tiruan(nama: &str) -> (std::path::PathBuf, String) {
        let dir = std::env::temp_dir().join(format!("chudai-uji-fps-{nama}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("ClientSettings")).unwrap();
        let exe = dir.join("RobloxPlayerBeta.exe");
        (dir, exe.to_string_lossy().to_string())
    }

    fn baca(dir: &std::path::Path) -> Flags {
        baca_objek(&dir.join("ClientSettings").join("ClientAppSettings.json"))
    }

    fn tulis(dir: &std::path::Path, v: serde_json::Value) {
        std::fs::write(dir.join("ClientSettings").join("ClientAppSettings.json"), v.to_string()).unwrap();
    }

    fn peta(v: serde_json::Value) -> Flags {
        v.as_object().unwrap().clone()
    }

    #[test]
    fn kunci_tool_lain_tidak_disentuh_dan_flag_dihapus_ikut_hilang() {
        let (dir, exe) = klien_tiruan("a");
        tulis(&dir, json!({ "FFlagMilikBloxstrap": "True" }));

        let kelola = peta(json!({ "FFlagA": true, "FIntB": 3 }));
        let pernah = vec!["FFlagA".to_string(), "FIntB".to_string()];
        terapkan(Some(0), &exe, &kelola, &pernah).unwrap();
        assert_eq!(baca(&dir), peta(json!({ "FFlagMilikBloxstrap": "True", "FFlagA": true, "FIntB": 3 })));

        let kelola = peta(json!({ "FIntB": 3 }));
        terapkan(Some(0), &exe, &kelola, &pernah).unwrap();
        assert_eq!(baca(&dir), peta(json!({ "FFlagMilikBloxstrap": "True", "FIntB": 3 })));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn fps_per_akun_dan_fps_dari_editor() {
        let (dir, exe) = klien_tiruan("b");
        let kosong = Flags::new();

        terapkan(Some(60), &exe, &kosong, &[]).unwrap();
        assert_eq!(baca(&dir).get(KUNCI), Some(&json!(60)));
        terapkan(Some(0), &exe, &kosong, &[]).unwrap();
        assert_eq!(baca(&dir).get(KUNCI), None);

        let kelola = peta(json!({ KUNCI: 144 }));
        let pernah = vec![KUNCI.to_string()];
        terapkan(Some(0), &exe, &kelola, &pernah).unwrap();
        assert_eq!(baca(&dir).get(KUNCI), Some(&json!(144)));
        terapkan(Some(30), &exe, &kelola, &pernah).unwrap();
        assert_eq!(baca(&dir).get(KUNCI), Some(&json!(30)));

        terapkan(None, &exe, &kosong, &[]).unwrap();
        assert_eq!(baca(&dir).get(KUNCI), Some(&json!(30)));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn berkas_kosong_dihapus_dan_tidak_ditulis_kalau_tak_berubah() {
        let (dir, exe) = klien_tiruan("c");
        let berkas = dir.join("ClientSettings").join("ClientAppSettings.json");
        let kelola = peta(json!({ "FFlagA": true }));
        let pernah = vec!["FFlagA".to_string()];
        terapkan(None, &exe, &kelola, &pernah).unwrap();
        let waktu = std::fs::metadata(&berkas).unwrap().modified().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(30));
        terapkan(None, &exe, &kelola, &pernah).unwrap();
        assert_eq!(std::fs::metadata(&berkas).unwrap().modified().unwrap(), waktu);

        terapkan(None, &exe, &Flags::new(), &pernah).unwrap();
        assert!(!berkas.exists(), "berkas yang jadi kosong harus dihapus");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
